import { Hono } from 'hono';
import type { Context, Next } from 'hono';
import { and, desc, eq, notInArray, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { backups, userData } from '../../db/schema.js';
import { verifyUser, type AuthedUser } from './lib/auth.js';
import { countStats, sanitizeState } from '../../src/services/storage.js';
const toCloudDoc = (raw: unknown) => sanitizeState(raw).state;

type Env = { Variables: { user: AuthedUser } };

const MAX_BODY_BYTES = 4 * 1024 * 1024;
const AUTO_BACKUP_EVERY_MS = 6 * 60 * 60 * 1000;
const KEEP_AUTO_BACKUPS = 30;
const KEEP_OTHER_BACKUPS = 30;

const app = new Hono<Env>();

app.onError((err, c) => {
  console.error('api error', err);
  if (err.message === 'identity-unreachable') return c.json({ error: 'Sign-in service unavailable. Try again shortly.' }, 503);
  return c.json({ error: 'Something went wrong on the server.' }, 500);
});

app.get('/api/health', (c) => c.json({ ok: true }));

// Every other endpoint needs a signed-in user.
app.use('/api/*', async (c: Context<Env>, next: Next) => {
  c.header('Cache-Control', 'no-store');
  if (c.req.method !== 'GET') {
    // CSRF protection for cookie-authenticated writes: a custom header can only be sent by
    // same-origin scripts, and a present Origin must match this host.
    if (c.req.header('x-set-client') !== '1') return c.json({ error: 'Bad request' }, 400);
    const origin = c.req.header('origin');
    if (origin && new URL(origin).host !== new URL(c.req.url).host) return c.json({ error: 'Forbidden' }, 403);
  }
  const user = await verifyUser(c.req.raw);
  if (!user) return c.json({ error: 'Please sign in again.' }, 401);
  c.set('user', user);
  await next();
});

async function readJson(c: Context<Env>): Promise<any> {
  const len = Number(c.req.header('content-length') ?? 0);
  if (len > MAX_BODY_BYTES) throw Object.assign(new Error('too-large'), { status: 413 });
  const text = await c.req.text();
  if (text.length > MAX_BODY_BYTES) throw Object.assign(new Error('too-large'), { status: 413 });
  return JSON.parse(text);
}

const stats = (doc: any) => {
  try { return countStats(doc); } catch { return { months: 0, expenses: 0 }; }
};

async function current(userId: string) {
  const [row] = await db.select().from(userData).where(eq(userData.userId, userId)).limit(1);
  return row ?? null;
}

async function addBackup(userId: string, data: unknown, revision: number, reason: string) {
  const s = stats(data);
  await db.insert(backups).values({ userId, data, revision, reason, months: s.months, expenses: s.expenses });
  // Prune old copies, keeping the newest N of each kind.
  for (const [kind, keep] of [['auto', KEEP_AUTO_BACKUPS], ['other', KEEP_OTHER_BACKUPS]] as const) {
    const cond = kind === 'auto' ? eq(backups.reason, 'auto') : sql`${backups.reason} <> 'auto'`;
    const keepIds = db
      .select({ id: backups.id })
      .from(backups)
      .where(and(eq(backups.userId, userId), cond))
      .orderBy(desc(backups.createdAt))
      .limit(keep);
    await db.delete(backups).where(and(eq(backups.userId, userId), cond, notInArray(backups.id, keepIds)));
  }
}

/** Decide whether the version about to be replaced deserves a safety copy. */
async function maybeBackupBeforeSave(userId: string, prev: { data: unknown; revision: number }, next: unknown) {
  const before = stats(prev.data);
  const after = stats(next);
  const bigDelete = after.months < before.months || before.expenses - after.expenses >= 3;
  if (bigDelete) return addBackup(userId, prev.data, prev.revision, 'before-large-delete');

  const [last] = await db
    .select({ createdAt: backups.createdAt })
    .from(backups)
    .where(eq(backups.userId, userId))
    .orderBy(desc(backups.createdAt))
    .limit(1);
  if (!last || Date.now() - new Date(last.createdAt).getTime() > AUTO_BACKUP_EVERY_MS) {
    return addBackup(userId, prev.data, prev.revision, 'auto');
  }
}

const out = (row: { data: unknown; revision: number; updatedAt: Date | string }) => ({
  revision: row.revision,
  data: row.data,
  updatedAt: new Date(row.updatedAt).toISOString(),
});

// ---- State ---------------------------------------------------------------

app.get('/api/state', async (c) => {
  const row = await current(c.get('user').id);
  return c.json(row ? out(row) : { revision: 0, data: null, updatedAt: null });
});

/**
 * Save the whole document. `baseRevision` is the revision the client last saw; if the
 * server has moved on, nothing is written and 409 returns the newer copy so the client
 * can merge and retry. This is what stops one device overwriting another's changes.
 */
app.put('/api/state', async (c) => {
  const userId = c.get('user').id;
  let body: any;
  try { body = await readJson(c); } catch (e: any) {
    return c.json({ error: e?.status === 413 ? 'Data is too large to sync.' : 'Invalid JSON.' }, e?.status === 413 ? 413 : 400);
  }
  const baseRevision = Number(body?.baseRevision);
  if (!Number.isInteger(baseRevision) || baseRevision < 0) return c.json({ error: 'baseRevision is required.' }, 400);

  let doc;
  try { doc = toCloudDoc(body?.data); } catch (e: any) {
    return c.json({ error: e?.message || 'Invalid data.' }, 422);
  }
  const deviceId = typeof body?.deviceId === 'string' ? body.deviceId.slice(0, 64) : null;

  const prev = await current(userId);
  if (!prev) {
    if (baseRevision !== 0) {
      // The client thinks data exists but it does not (e.g. account was wiped): ask it to re-upload.
      return c.json({ error: 'conflict', current: { revision: 0, data: null, updatedAt: null } }, 409);
    }
    const inserted = await db
      .insert(userData)
      .values({ userId, data: doc, revision: 1, deviceId })
      .onConflictDoNothing()
      .returning();
    if (inserted[0]) return c.json(out(inserted[0]));
    const now = await current(userId);
    return c.json({ error: 'conflict', current: now ? out(now) : null }, 409);
  }

  if (prev.revision !== baseRevision) return c.json({ error: 'conflict', current: out(prev) }, 409);

  const updated = await db
    .update(userData)
    .set({ data: doc, revision: prev.revision + 1, deviceId, updatedAt: new Date() })
    .where(and(eq(userData.userId, userId), eq(userData.revision, baseRevision)))
    .returning();

  if (!updated[0]) {
    const now = await current(userId);
    return c.json({ error: 'conflict', current: now ? out(now) : null }, 409);
  }

  try { await maybeBackupBeforeSave(userId, prev, doc); } catch (e) { console.error('backup failed', e); }
  return c.json(out(updated[0]));
});

// ---- Backups ---------------------------------------------------------------

app.get('/api/backups', async (c) => {
  const rows = await db
    .select({ id: backups.id, reason: backups.reason, revision: backups.revision, months: backups.months, expenses: backups.expenses, createdAt: backups.createdAt })
    .from(backups)
    .where(eq(backups.userId, c.get('user').id))
    .orderBy(desc(backups.createdAt))
    .limit(60);
  return c.json({ backups: rows.map((r) => ({ ...r, createdAt: new Date(r.createdAt).toISOString() })) });
});

app.post('/api/backups', async (c) => {
  const userId = c.get('user').id;
  const row = await current(userId);
  if (!row) return c.json({ error: 'Nothing has been synced yet.' }, 404);
  await addBackup(userId, row.data, row.revision, 'manual');
  return c.json({ ok: true }, 201);
});

app.get('/api/backups/:id', async (c) => {
  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id)) return c.json({ error: 'Not found' }, 404);
  const [row] = await db.select().from(backups).where(and(eq(backups.id, id), eq(backups.userId, c.get('user').id))).limit(1);
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json({ id: row.id, createdAt: new Date(row.createdAt).toISOString(), data: row.data });
});

/** Replace the account's data with a backup. The current version is backed up first. */
app.post('/api/backups/:id/restore', async (c) => {
  const userId = c.get('user').id;
  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id)) return c.json({ error: 'Not found' }, 404);
  const [b] = await db.select().from(backups).where(and(eq(backups.id, id), eq(backups.userId, userId))).limit(1);
  if (!b) return c.json({ error: 'Not found' }, 404);

  const prev = await current(userId);
  if (prev) await addBackup(userId, prev.data, prev.revision, 'before-restore');

  const doc = toCloudDoc(b.data);
  const [row] = prev
    ? await db.update(userData).set({ data: doc, revision: prev.revision + 1, updatedAt: new Date() }).where(eq(userData.userId, userId)).returning()
    : await db.insert(userData).values({ userId, data: doc, revision: 1 }).returning();
  return c.json(out(row));
});

app.all('/api/*', (c) => c.json({ error: 'Not found' }, 404));

export default app;

export const config = {
  path: '/api/*',
};

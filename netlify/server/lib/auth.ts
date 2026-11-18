// Verifies the Netlify Identity session that the browser sends as the `nf_jwt` cookie
// (set by @netlify/identity on login) or as an `Authorization: Bearer` header.
// The token is checked against the site's own Identity service, so a forged or expired
// token is always rejected. Verified tokens are cached briefly to keep requests fast.

export interface AuthedUser {
  id: string;
  email?: string;
}

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { user: AuthedUser; until: number }>();

function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

export function tokenFrom(req: Request): string | null {
  const auth = req.headers.get('authorization');
  if (auth?.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim() || null;
  return readCookie(req.headers.get('cookie'), 'nf_jwt');
}

function identityBase(req: Request): string {
  // URL is the site's main address on Netlify; fall back to the request's own origin.
  const origin = process.env.URL || new URL(req.url).origin;
  return `${origin.replace(/\/$/, '')}/.netlify/identity`;
}

export async function verifyUser(req: Request): Promise<AuthedUser | null> {
  const token = tokenFrom(req);
  if (!token || token.length > 8192) return null;

  const now = Date.now();
  const hit = cache.get(token);
  if (hit && hit.until > now) return hit.user;

  let res: Response;
  try {
    res = await fetch(`${identityBase(req)}/user`, {
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new Error('identity-unreachable');
  }
  if (res.status === 401 || res.status === 403 || res.status === 404) return null;
  if (!res.ok) throw new Error('identity-unreachable');

  const body = (await res.json()) as { id?: string; email?: string };
  if (!body?.id) return null;
  const user = { id: body.id, email: body.email };

  if (cache.size > 500) cache.clear();
  cache.set(token, { user, until: now + CACHE_TTL_MS });
  return user;
}

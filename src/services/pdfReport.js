// Monthly PDF report, drawn directly with jsPDF (text stays selectable, nothing is rasterised,
// and it behaves the same on desktop and mobile browsers).
//
// jsPDF's built-in Helvetica has no ₹ glyph, so INR is printed as "Rs." in the PDF.

import { categoryStats, dailySpending, monthTotals, topCategories } from '../utils/calc.js';
import { CATEGORY_COLORS } from '../utils/colors.js';
import { daysInMonth, formatDate, monthFileLabel, monthLabel, todayISO } from '../utils/dates.js';
import { formatMoney, round2 } from '../utils/money.js';

const BRAND = [11, 110, 92];
const INK = [15, 27, 23];
const MUTED = [88, 104, 97];
const LINE = [218, 226, 222];
const SOFT = [243, 246, 244];
const BAD = [180, 35, 24];
const WARN = [143, 84, 5];

const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** Helvetica only covers Latin-1; anything else (emoji, Indic scripts) would print as garbage. */
export const pdfSafe = (s) => String(s ?? '').replace(/[^\x20-\x7E\xA0-\xFF]/g, '?');

export function pdfMoney(amount, currency) {
  const text = formatMoney(amount, currency);
  if (currency === 'INR') return text.replace('₹', 'Rs. ');
  if (currency === 'EUR') return text.replace(/ ?€ ?/, 'EUR ').replace(/ /g, ' ');
  return text.replace(/ /g, ' ');
}

export function reportFilename(monthKey) {
  return `Expense_Report_${monthFileLabel(monthKey)}.pdf`;
}

export async function buildMonthlyReport({ monthKey, month, currency }) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  doc.setProperties({ title: `Monthly Expense Report - ${monthLabel(monthKey)}`, creator: 'Smart Expense Tracker' });

  const W = 210, H = 297, M = 14, BOTTOM = H - 18;
  const CW = W - M * 2;
  const money = (n) => pdfMoney(n, currency);
  const stats = categoryStats(month);
  const totals = monthTotals(month, stats);
  const catName = new Map(month.categories.map((c) => [c.id, c.name]));
  const catColor = new Map(month.categories.map((c, i) => [c.id, hexToRgb(CATEGORY_COLORS.light[i] ?? '#8a9791')]));
  let y = 0;

  const color = (c) => doc.setTextColor(c[0], c[1], c[2]);
  const font = (size, style = 'normal', c = INK) => { doc.setFont('helvetica', style); doc.setFontSize(size); color(c); };
  const fill = (c) => doc.setFillColor(c[0], c[1], c[2]);
  const stroke = (c, w = 0.2) => { doc.setDrawColor(c[0], c[1], c[2]); doc.setLineWidth(w); };

  /** Truncate to a width in mm with an ellipsis (current font settings). */
  function fit(text, width) {
    let t = pdfSafe(text);
    if (doc.getTextWidth(t) <= width) return t;
    while (t.length > 1 && doc.getTextWidth(`${t}...`) > width) t = t.slice(0, -1);
    return `${t.trimEnd()}...`;
  }

  function newPage() {
    doc.addPage();
    y = M;
    font(9, 'normal', MUTED);
    doc.text(`Monthly Expense Report - ${monthLabel(monthKey)}`, M, y);
    stroke(LINE);
    doc.line(M, y + 2.5, W - M, y + 2.5);
    y += 9;
  }
  const ensure = (h) => { if (y + h > BOTTOM) newPage(); };

  function heading(text) {
    ensure(22);
    font(13, 'bold', INK);
    doc.text(text, M, y);
    stroke(BRAND, 0.6);
    doc.line(M, y + 2, M + 12, y + 2);
    y += 8;
  }

  // ---- Title band ---------------------------------------------------------------------------
  fill(BRAND);
  doc.rect(0, 0, W, 36, 'F');
  font(21, 'bold', [255, 255, 255]);
  doc.text('Monthly Expense Report', M, 17);
  font(12, 'normal', [255, 255, 255]);
  doc.text(`Month: ${monthLabel(monthKey)}`, M, 26);
  font(9, 'normal', [220, 240, 234]);
  doc.text(`Generated ${formatDate(todayISO(), { withYear: true })}`, W - M, 26, { align: 'right' });
  y = 46;

  // ---- Budget summary -----------------------------------------------------------------------
  heading('Budget Summary');
  const boxes = [
    ['Total Budget', money(totals.allocated), 'Allocated to categories', INK],
    ['Total Spent', money(totals.spent), `${Math.round(totals.percentUsed)}% of budget`, INK],
    [totals.remaining < 0 ? 'Over Budget' : 'Remaining Balance', money(Math.abs(totals.remaining)), totals.remaining < 0 ? 'Spending exceeds budget' : 'Left to spend', totals.remaining < 0 ? BAD : BRAND],
    ['Savings', totals.savingsBudget > 0 ? money(totals.savingsRemaining) : '-', totals.savingsBudget > 0 ? `of ${money(totals.savingsBudget)} set aside` : 'No savings category', INK],
  ];
  const gap = 3;
  const bw = (CW - gap * 3) / 4;
  boxes.forEach(([label, value, sub, c], i) => {
    const x = M + i * (bw + gap);
    fill(SOFT); stroke(LINE);
    doc.roundedRect(x, y, bw, 22, 2, 2, 'FD');
    font(8, 'normal', MUTED); doc.text(label, x + 3, y + 6);
    font(12, 'bold', c); doc.text(fit(value, bw - 6), x + 3, y + 13);
    font(7.5, 'normal', MUTED); doc.text(fit(sub, bw - 6), x + 3, y + 19);
  });
  y += 28;

  if (totals.income > 0 || month.fixedExpenses.length) {
    font(9, 'normal', MUTED);
    const parts = [`Income ${money(totals.income)}`];
    month.fixedExpenses.forEach((f) => parts.push(`${pdfSafe(f.name)} ${money(f.amount)}`));
    parts.push(`Spending budget ${money(totals.spendingBudget)}`);
    const lines = doc.splitTextToSize(parts.join('   |   '), CW);
    doc.text(lines, M, y);
    y += lines.length * 4.5 + 3;
  }

  // ---- Category breakdown -------------------------------------------------------------------
  heading('Category Breakdown');
  const col = { name: M + 3, budget: M + 88, spent: M + 118, remaining: M + 150, used: W - M - 2 };
  const tableHead = (cols) => {
    fill(SOFT); doc.rect(M, y, CW, 8, 'F');
    font(8.5, 'bold', MUTED);
    cols.forEach(([t, x, align]) => doc.text(t, x, y + 5.4, { align }));
    y += 8;
  };
  tableHead([['Category', col.name], ['Budget', col.budget, 'right'], ['Spent', col.spent, 'right'], ['Remaining', col.remaining, 'right'], ['Used', col.used, 'right']]);
  stats.forEach((c, i) => {
    ensure(9);
    if (i % 2) { fill([250, 251, 250]); doc.rect(M, y, CW, 8, 'F'); }
    fill(catColor.get(c.id)); doc.circle(M + 3.2, y + 4, 1.1, 'F');
    font(9.5, 'normal', INK); doc.text(fit(c.name, 70), col.name + 3, y + 5.4);
    doc.text(money(c.budget), col.budget, y + 5.4, { align: 'right' });
    doc.text(money(c.spent), col.spent, y + 5.4, { align: 'right' });
    font(9.5, c.remaining < 0 ? 'bold' : 'normal', c.remaining < 0 ? BAD : INK);
    doc.text(c.remaining < 0 ? `-${money(-c.remaining)}` : money(c.remaining), col.remaining, y + 5.4, { align: 'right' });
    font(9, c.status === 'exceeded' ? 'bold' : 'normal', c.status === 'exceeded' ? BAD : c.status === 'ok' ? MUTED : WARN);
    doc.text(`${Math.round(c.percent)}%${c.status === 'exceeded' ? ' Exceeded' : ''}`, col.used, y + 5.4, { align: 'right' });
    y += 8;
  });
  ensure(10);
  stroke(INK, 0.3); doc.line(M, y, W - M, y);
  font(9.5, 'bold', INK);
  doc.text('Total', col.name, y + 6);
  doc.text(money(totals.allocated), col.budget, y + 6, { align: 'right' });
  doc.text(money(totals.spent), col.spent, y + 6, { align: 'right' });
  color(totals.remaining < 0 ? BAD : INK);
  doc.text(totals.remaining < 0 ? `-${money(-totals.remaining)}` : money(totals.remaining), col.remaining, y + 6, { align: 'right' });
  y += 14;

  // ---- Analytics summary --------------------------------------------------------------------
  heading('Analytics Summary');
  const spentCats = stats.filter((c) => c.spent > 0).sort((a, b) => b.spent - a.spent);
  if (!spentCats.length) {
    font(10, 'normal', MUTED);
    doc.text('No expenses recorded this month.', M, y + 2);
    y += 10;
  } else {
    font(10, 'bold', INK); ensure(10); doc.text('Spending by category', M, y); y += 5;
    const max = spentCats[0].spent;
    const barX = M + 42, barW = CW - 42 - 38;
    spentCats.forEach((c) => {
      ensure(8);
      font(9, 'normal', INK); doc.text(fit(c.name, 38), M, y + 4);
      fill(SOFT); doc.roundedRect(barX, y + 1, barW, 4.2, 1, 1, 'F');
      fill(catColor.get(c.id)); doc.roundedRect(barX, y + 1, Math.max(1.5, (c.spent / max) * barW), 4.2, 1, 1, 'F');
      font(9, 'normal', INK);
      doc.text(`${money(c.spent)}  (${Math.round((c.spent / totals.spent) * 100)}%)`, W - M, y + 4.4, { align: 'right' });
      y += 7;
    });
    y += 4;

    // Daily spending bars
    const daily = dailySpending(month, monthKey);
    const peak = Math.max(...daily.map((d) => d.amount));
    const chartH = 34;
    ensure(chartH + 16);
    font(10, 'bold', INK); doc.text('Daily spending', M, y); y += 4;
    const gx = M + 12, gw = CW - 12, base = y + chartH;
    font(7.5, 'normal', MUTED);
    doc.text(money(peak), gx - 2, y + 2.5, { align: 'right' });
    doc.text(money(0), gx - 2, base, { align: 'right' });
    stroke(LINE); doc.line(gx, base, gx + gw, base); doc.line(gx, y, gx + gw, y);
    const slot = gw / daily.length;
    daily.forEach((d, i) => {
      if (d.amount > 0) {
        const h = Math.max(0.8, (d.amount / peak) * (chartH - 1));
        fill(hexToRgb(CATEGORY_COLORS.light[0]));
        doc.rect(gx + i * slot + slot * 0.15, base - h, slot * 0.7, h, 'F');
      }
      if (d.day === 1 || d.day % 5 === 0 || d.day === daily.length) {
        font(7, 'normal', MUTED);
        doc.text(String(d.day), gx + i * slot + slot / 2, base + 4, { align: 'center' });
      }
    });
    y = base + 10;

    // Highlights
    const elapsed = monthKey === todayISO().slice(0, 7) ? Number(todayISO().slice(8, 10)) : daysInMonth(monthKey);
    const busiest = daily.reduce((b, d) => (d.amount > b.amount ? d : b), { amount: 0 });
    const topCat = topCategories(stats, 1)[0];
    const facts = [
      topCat && `Top category: ${pdfSafe(topCat.name)} (${money(topCat.spent)}, ${Math.round((topCat.spent / totals.spent) * 100)}% of spending)`,
      `Average spending per day: ${money(round2(totals.spent / elapsed))}`,
      busiest.amount > 0 && `Highest spending day: ${formatDate(busiest.date, { withYear: true })} (${money(busiest.amount)})`,
      `Number of expenses: ${totals.expenseCount}`,
      ...stats.filter((c) => c.status === 'exceeded').map((c) => `Budget exceeded: ${pdfSafe(c.name)} by ${money(c.exceededBy)}`),
    ].filter(Boolean);
    ensure(facts.length * 5.5 + 4);
    facts.forEach((f) => { font(9.5, 'normal', f.startsWith('Budget exceeded') ? BAD : INK); doc.text(`-  ${f}`, M, y); y += 5.5; });
    y += 6;
  }

  // ---- Expense history ----------------------------------------------------------------------
  heading('Expense History');
  const ex = { date: M + 3, name: M + 27, cat: M + 80, notes: M + 112, amt: W - M - 2 };
  const head = () => tableHead([['Date', ex.date], ['Expense', ex.name], ['Category', ex.cat], ['Notes', ex.notes], ['Amount', ex.amt, 'right']]);
  if (!month.expenses.length) {
    font(10, 'normal', MUTED);
    doc.text('No expenses recorded this month.', M, y + 2);
  } else {
    head();
    const sorted = [...month.expenses].sort((a, b) => a.date.localeCompare(b.date) || (a.createdAt ?? 0) - (b.createdAt ?? 0));
    sorted.forEach((e, i) => {
      if (y + 8 > BOTTOM) { newPage(); head(); }
      if (i % 2) { fill([250, 251, 250]); doc.rect(M, y, CW, 8, 'F'); }
      font(9, 'normal', INK);
      doc.text(formatDate(e.date, { withYear: true }), ex.date, y + 5.4);
      doc.text(fit(e.name, 50), ex.name, y + 5.4);
      doc.text(fit(catName.get(e.categoryId) ?? 'Uncategorised', 30), ex.cat, y + 5.4);
      font(9, 'normal', MUTED); doc.text(fit(e.notes || '-', 42), ex.notes, y + 5.4);
      font(9, 'bold', INK); doc.text(money(e.amount), ex.amt, y + 5.4, { align: 'right' });
      y += 8;
    });
    ensure(10);
    stroke(INK, 0.3); doc.line(M, y, W - M, y);
    font(10, 'bold', INK);
    doc.text(`Total (${month.expenses.length})`, ex.date, y + 6);
    doc.text(money(totals.spent), ex.amt, y + 6, { align: 'right' });
  }

  // ---- Footer on every page -----------------------------------------------------------------
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    stroke(LINE); doc.line(M, H - 13, W - M, H - 13);
    font(8, 'normal', MUTED);
    doc.text('Smart Expense Tracker', M, H - 8);
    doc.text(`Page ${p} of ${pages}`, W - M, H - 8, { align: 'right' });
  }

  return { doc, filename: reportFilename(monthKey) };
}

export async function downloadMonthlyReport(args) {
  const { doc, filename } = await buildMonthlyReport(args);
  doc.save(filename);
  return filename;
}

// Picks the lots for the weekly "auctions this week" email: a few standouts for each day, Monday to Sunday.
const TZ = "America/New_York";
const CATEGORY_WEIGHT = { boats: 3, trucks: 2, equipment: 2, buses: 2, emergency: 1.5, powersports: 1.5, cars: 1, trailers: 1 };
const EASE_WEIGHT = { easy: 2, moderate: 1 };

// "2026-11-24" for the Eastern-time day a timestamp falls on.
export function easternDay(ts) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ts));
}

export function dayLabel(day) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" });
}

function score(l) {
  return (CATEGORY_WEIGHT[l.category] ?? 0) + (EASE_WEIGHT[l.sell_ease] ?? 0) + (l.current_bid > 0 ? 0.5 : 0) + (l.spread > 0 ? Math.min(l.spread / 10000, 1.5) : 0);
}

// Groups open lots by the day they close and picks up to `perDay` standouts, preferring different categories.
export function planWeek(rows, { now = new Date(), days = 7, perDay = 3 } = {}) {
  const wanted = new Set(Array.from({ length: days }, (_, i) => easternDay(now.getTime() + i * 86_400_000)));
  const byDay = new Map();
  for (const l of rows) {
    if (!l.end_time || new Date(l.end_time) <= now) continue;
    const day = easternDay(l.end_time);
    if (!wanted.has(day)) continue;
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day).push(l);
  }
  return [...byDay.keys()].sort().map((day) => {
    const all = byDay.get(day).filter((l) => l.photo_url).sort((a, b) => score(b) - score(a) || (CATEGORY_WEIGHT[b.category] ?? 0) - (CATEGORY_WEIGHT[a.category] ?? 0));
    const picks = [];
    const cats = new Set();
    for (const l of all) { if (picks.length < perDay && !cats.has(l.category)) { picks.push(l); cats.add(l.category); } }
    for (const l of all) { if (picks.length < perDay && !picks.includes(l)) picks.push(l); }
    return { day, label: dayLabel(day), total: byDay.get(day).length, lots: picks };
  }).filter((d) => d.lots.length);
}

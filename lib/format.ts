export function money(n: number | null | undefined) {
  if (n === null || n === undefined) return null;
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

// $8,500 -> "$8.5k", $22,000 -> "$22k"
export function shortMoney(n: number | null | undefined) {
  if (n === null || n === undefined) return "";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, "")}k`;
  return `$${Math.round(n)}`;
}

export type TimeLeft = { text: string; urgency: "ended" | "now" | "today" | "soon" | "later" | "unknown" };

export function timeLeft(end: string | null | undefined, now = Date.now()): TimeLeft {
  if (!end) return { text: "No end date", urgency: "unknown" };
  const ms = new Date(end).getTime() - now;
  if (Number.isNaN(ms)) return { text: "No end date", urgency: "unknown" };
  if (ms <= 0) return { text: "Ended", urgency: "ended" };
  const mins = Math.floor(ms / 60_000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (hours < 1) return { text: `${mins}m left`, urgency: "now" };
  if (hours < 6) return { text: `${hours}h ${mins % 60}m left`, urgency: "now" };
  if (hours < 24) return { text: `${hours}h ${mins % 60}m left`, urgency: "today" };
  if (days < 3) return { text: `${days}d ${hours % 24}h left`, urgency: "soon" };
  return { text: `${days}d ${hours % 24}h left`, urgency: "later" };
}

export function closesAt(end: string | null | undefined, dateOnly = false) {
  if (!end) return null;
  const d = new Date(end);
  if (Number.isNaN(d.getTime())) return null;
  return dateOnly
    ? d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "America/New_York" })
    : d.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York", timeZoneName: "short" });
}

export function titleCase(raw: string | null | undefined) {
  if (!raw) return "";
  // Drop auction-house prefixes like "LOT 176 " or "Lot 47RL " ahead of the real title.
  const s = raw.replace(/^lot(?:\s*#\s*|\s+)(?=[\w-]{0,7}\d)[\w-]{1,8}[\s:.-]+(?=\S)/i, "").replace(/^(\d{4})-\s*/, "$1 ") || raw;
  // Leave mixed-case titles alone; soften ALL-CAPS ones so cards read evenly.
  if (s !== s.toUpperCase()) return s;
  return s.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase())
    .replace(/\b(Ii|Iii|Iv|Usa|Us|Ac|Atv|Utv|Suv|Vin|Awd|4wd|2wd|4x4|4x2|Hd|Sd|Gmc|Bmw|Cng|Lpg|Pd|Dot|Ups|Led|Lcd|Tv|Pc|Hp|Cat|Jcb)\b/g, (m) => m.toUpperCase());
}

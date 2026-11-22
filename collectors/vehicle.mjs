// Pulls year / make / model out of an auction title like "2017 FORD TRANSIT CONNECT VAN".

const MAKES = {
  acura: "Acura", audi: "Audi", bmw: "BMW", buick: "Buick", cadillac: "Cadillac",
  chevrolet: "Chevrolet", chevy: "Chevrolet", chrysler: "Chrysler", dodge: "Dodge",
  ford: "Ford", freightliner: "Freightliner", gmc: "GMC", honda: "Honda", hyundai: "Hyundai",
  infiniti: "Infiniti", international: "International", isuzu: "Isuzu", jeep: "Jeep",
  kia: "Kia", lexus: "Lexus", lincoln: "Lincoln", mazda: "Mazda", mercedes: "Mercedes-Benz",
  "mercedes-benz": "Mercedes-Benz", mercury: "Mercury", mini: "MINI", mitsubishi: "Mitsubishi",
  nissan: "Nissan", pontiac: "Pontiac", ram: "Ram", saturn: "Saturn", subaru: "Subaru",
  tesla: "Tesla", toyota: "Toyota", volkswagen: "Volkswagen", vw: "Volkswagen", volvo: "Volvo",
  hino: "Hino", "land rover": "Land Rover", porsche: "Porsche", genesis: "Genesis", fiat: "Fiat",
};

// Models that are two words, so we don't cut them in half.
const TWO_WORD_MODELS = [
  "crown victoria", "grand caravan", "grand cherokee", "transit connect", "grand marquis",
  "town car", "town & country", "e series", "ram promaster", "promaster city", "santa fe",
  "model 3", "model s", "model x", "model y", "monte carlo", "grand prix", "land cruiser",
  "express 2500", "express 3500", "savana 2500", "savana 3500", "sierra 1500", "sierra 2500",
  "silverado 1500", "silverado 2500", "silverado 3500", "ram 1500", "ram 2500", "ram 3500",
];

// Words that describe the vehicle but aren't the model.
const NOISE = new Set(["4x4", "4wd", "awd", "2wd", "fwd", "rwd", "4dr", "2dr", "sedan", "suv", "pickup",
  "truck", "van", "cargo", "passenger", "crew", "cab", "extended", "regular", "-", "–", "w/", "with", "and"]);

export function parseVehicle(title) {
  const t = ` ${(title ?? "").toLowerCase().replace(/[(),#*]/g, " ").replace(/\s+/g, " ")} `;
  const year = Number(t.match(/\b(19[89]\d|20[0-3]\d)\b/)?.[1]) || null;

  let make = null;
  let afterMake = "";
  for (const key of Object.keys(MAKES).sort((a, b) => b.length - a.length)) {
    const idx = t.search(new RegExp(`[\\s-]${key.replace(/[-]/g, "\\-")}[\\s-]`));
    if (idx >= 0) {
      make = MAKES[key];
      afterMake = t.slice(idx + key.length + 2).trim();
      break;
    }
  }
  if (!year || !make) return null;

  let model = null;
  for (const two of TWO_WORD_MODELS) {
    if (afterMake.startsWith(two)) { model = two; break; }
  }
  if (!model) {
    const first = afterMake.split(" ").find((w) => w && !NOISE.has(w) && !/^\d{4}$/.test(w));
    model = first ?? null;
  }
  if (!model) return null;
  model = model.replace(/(^|[\s-])(\w)/g, (m) => m.toUpperCase()).replace(/^F(\d)/, "F-$1");
  if (/^f-?\d{3}$/i.test(model)) model = model.toUpperCase().replace(/^F(\d)/, "F-$1");
  return { year, make, model };
}

export function vehicleKey(v) {
  return `${v.year}|${v.make}|${v.model}`.toLowerCase();
}

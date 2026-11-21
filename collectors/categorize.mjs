// Assigns a simple category from an item's title and description.
// Order matters: more specific categories are checked first.

const RULES = [
  ["golf carts", [/\bgolf\s*carts?\b/, /\bclub\s*car\b/, /\bezgo\b/, /\be-z-go\b/, /\butility\s*carts?\b/]],
  ["boats", [/\bboats?\b/, /\bvessels?\b/, /\boutboards?\b/, /\bpontoon\b/, /\bskiff\b/, /\bjon\s*boat\b/, /\bcenter\s*console\b/, /\bpersonal\s*watercraft\b/, /\bjet\s*ski\b/, /\bbarge\b/]],
  ["buses", [/\bbus(es)?\b/, /\bschool\s*bus\b/, /\bshuttle\b/, /\bcoach\b/]],
  ["trucks", [/\btrucks?\b/, /\bpickup\b/, /\bdump\b/, /\btractor\s*trailer\b/, /\bsemi\b/, /\bf-?150\b/, /\bf-?250\b/, /\bf-?350\b/, /\bsilverado\b/, /\bsierra\b/, /\bram\s*\d{4}\b/, /\btacoma\b/, /\btundra\b/, /\bbox\s*van\b/, /\bcargo\s*van\b/, /\bvan\b/]],
  ["equipment", [/\bexcavator\b/, /\bbackhoe\b/, /\bloader\b/, /\bbulldozer\b/, /\bdozer\b/, /\bforklift\b/, /\bgenerator\b/, /\bcrane\b/, /\bcompressor\b/, /\bmower\b/, /\btractor\b/, /\bskid\s*steer\b/, /\bgrader\b/, /\btrailer\b/]],
  ["cars", [/\bsedan\b/, /\bsuv\b/, /\bcoupe\b/, /\bvehicle\b/, /\bautomobile\b/, /\bcar\b/, /\btaurus\b/, /\bimpala\b/, /\bcamry\b/, /\bcorolla\b/, /\bfusion\b/, /\bmalibu\b/, /\bexplorer\b/, /\btahoe\b/, /\bcharger\b/, /\bcrown\s*victoria\b/, /\bprius\b/, /\baltima\b/, /\bcivic\b/, /\baccord\b/]],
];

export const CATEGORIES = RULES.map(([name]) => name).concat("other");

export function categorize(title = "", description = "") {
  const text = `${title} ${description}`.toLowerCase();
  for (const [name, patterns] of RULES) {
    if (patterns.some((p) => p.test(text))) return name;
  }
  return "other";
}

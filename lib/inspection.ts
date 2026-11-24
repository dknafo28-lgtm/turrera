// Local inspection service: a Turrera rep looks at the lot in person before the buyer bids.

// Things with an engine take longer to check (start-up, walk-around), so they cost more.
export const ENGINE_CATEGORIES = new Set(["boats", "trucks", "cars", "equipment", "buses", "powersports", "emergency", "aircraft"]);
const VEHICLE_FEE = Number(process.env.INSPECTION_FEE_VEHICLE) > 0 ? Number(process.env.INSPECTION_FEE_VEHICLE) : 249;
const OTHER_FEE = Number(process.env.INSPECTION_FEE) > 0 ? Number(process.env.INSPECTION_FEE) : 200;

export function inspectionFee(category: string | null | undefined) {
  return ENGINE_CATEGORIES.has(category ?? "") ? VEHICLE_FEE : OTHER_FEE;
}

// No inspections on auctions closing within this many hours: not enough time to send someone.
export const INSPECTION_CUTOFF_HOURS = 36;

export function canInspect(endTime: string | null | undefined, now = Date.now()) {
  if (!endTime) return false;
  return new Date(endTime).getTime() - now > INSPECTION_CUTOFF_HOURS * 3_600_000;
}

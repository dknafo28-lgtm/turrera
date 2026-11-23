// Local inspection service: a Turrera rep looks at the lot in person before the buyer bids.
export const INSPECTION_FEE = Number(process.env.INSPECTION_FEE) > 0 ? Number(process.env.INSPECTION_FEE) : 200;

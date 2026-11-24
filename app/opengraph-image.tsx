import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "Turrera: government surplus boats, trucks and equipment";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The default preview card when a Turrera page is shared on WhatsApp, Facebook, iMessage and so on.
export default async function Image() {
  const dir = join(process.cwd(), "app", "_og");
  const [display, body] = await Promise.all([readFile(join(dir, "saira-semi-condensed-latin-800-normal.woff")), readFile(join(dir, "public-sans-latin-400-normal.woff"))]);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#162e51", color: "#fff", padding: "72px 80px", fontFamily: "Public Sans" }}>
        <div style={{ display: "flex", fontSize: 48, fontFamily: "Saira", letterSpacing: 1, color: "#9fd0dc" }}>Turrera</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 92, fontFamily: "Saira", lineHeight: 1 }}>Direct from government agencies</div>
          <div style={{ fontSize: 36, marginTop: 24, color: "#dfe7ef" }}>Boats, trucks and equipment from public auctions. We can inspect, buy and ship it for you, worldwide.</div>
        </div>
        <div style={{ display: "flex", fontSize: 30, color: "#9fd0dc" }}>turrera.com</div>
      </div>
    ),
    { ...size, fonts: [{ name: "Saira", data: display, weight: 800, style: "normal" }, { name: "Public Sans", data: body, weight: 400, style: "normal" }] },
  );
}

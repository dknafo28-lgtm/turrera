"use client";

import { useState } from "react";
import { CATEGORIES } from "@/lib/lots";

// Shrinks phone photos (often 4-8 MB) to about 1600px JPEGs before uploading, so a dozen fit in one request.
async function shrink(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return await new Promise((res) => canvas.toBlob((b) => res(b ?? file), "image/jpeg", 0.82));
}

export default function ShowcaseForm() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg("Preparing photos…");
    const form = e.currentTarget;
    const fd = new FormData(form);
    const files = (fd.getAll("photos") as File[]).filter((f) => f.size > 0).slice(0, 12);
    fd.delete("photos");
    for (const [i, f] of files.entries()) fd.append("photos", await shrink(f), `photo-${i}.jpg`);
    setMsg("Uploading…");
    const res = await fetch("/api/admin/showcase", { method: "POST", body: fd, redirect: "follow" });
    window.location.href = res.url || "/admin#showcase";
  }
  return (
    <form className="form-grid" onSubmit={submit}>
      <label className="span-2">What was it<input name="title" required placeholder="2002 Angler 22 center console with 2018 Yamaha 150" /></label>
      <label>Type of sale
        <select name="kind" defaultValue="flip"><option value="flip">We bought and resold it</option><option value="customer">We bought it for a customer</option></select>
      </label>
      <label>Category
        <select name="category" defaultValue="boats">{CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select>
      </label>
      <label>Won at auction for (USD)<input name="bought_price" inputMode="numeric" placeholder="5,000" /></label>
      <label>Sold for / worth (USD)<input name="sold_price" inputMode="numeric" placeholder="18,500" /></label>
      <label>Bought from<input name="bought_from" placeholder="GSA Auctions, Florida" /></label>
      <label>Went to<input name="sold_to" placeholder="Nassau, Bahamas" /></label>
      <label>Date sold<input name="sold_on" type="date" /></label>
      <label>Photos (up to 12)<input name="photos" type="file" accept="image/*" multiple /></label>
      <label className="span-2">The story (optional)<textarea name="story" rows={3} placeholder="Needed a fuel tank and a tune-up; delivered by barge two weeks later." /></label>
      <label className="span-2">Customer review (their exact words, with permission)<textarea name="review" rows={3} /></label>
      <label>Customer name as shown<input name="customer_name" placeholder="Marcus T., Nassau" /></label>
      <label>Stars
        <select name="rating" defaultValue=""><option value="">No rating</option><option value="5">5</option><option value="4">4</option><option value="3">3</option><option value="2">2</option><option value="1">1</option></select>
      </label>
      <div className="span-2 form-actions">
        <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? msg : "Add to Our sales"}</button>
        <span className="fine">Only post real sales and real reviews you have permission to use.</span>
      </div>
    </form>
  );
}

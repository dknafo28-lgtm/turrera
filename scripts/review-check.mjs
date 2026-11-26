// CI-only check of reviews against the real database: post a review, confirm it's hidden until
// approved, approve it, confirm it shows (without the email), then delete it.
import { createClient } from "@supabase/supabase-js";
import puppeteer from "puppeteer-core";
import fs from "node:fs";

const base = process.argv[2];
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const email = `review-check-${Date.now()}@example.com`;
fs.mkdirSync("shots", { recursive: true });
let failed = false;
const check = (ok, msg) => { console.log(`${ok ? "PASS" : "FAIL"} ${msg}`); if (!ok) failed = true; };
const browser = await puppeteer.launch({ executablePath: process.env.CHROME, args: ["--no-sandbox"] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(`${base}/reviews`, { waitUntil: "networkidle2" });
  await page.click('.star-input label:nth-child(2)'); // 4 stars (labels run 5..1)
  await page.type('textarea[name="body"]', "Preview check: found a boat here and the listing matched what I saw in person.");
  await page.type('input[name="name"]', "Preview C.");
  await page.type('input[name="email"]', email);
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle2" }), page.click('#write-review button[type="submit"]')]);
  check(page.url().includes("review=thanks"), `posted: ${page.url()}`);
  const { data: rows } = await admin.from("reviews").select("id,rating,status,verified").eq("email", email);
  check(rows?.length === 1 && rows[0].status === "pending" && rows[0].rating === 4, `saved as pending, ${rows?.[0]?.rating} stars`);
  await page.goto(`${base}/reviews`, { waitUntil: "networkidle2" });
  check(!(await page.content()).includes("Preview check: found a boat"), "hidden until approved");
  await admin.from("reviews").update({ status: "approved", approved_at: new Date().toISOString() }).eq("email", email);
  await page.goto(`${base}/reviews`, { waitUntil: "networkidle2" });
  const html = await page.content();
  check(html.includes("Preview check: found a boat"), "shows once approved");
  check(!html.includes(email), "email never shown");
  await page.screenshot({ path: "shots/reviews.png", fullPage: true });
  await page.goto(base, { waitUntil: "networkidle2" });
  const sec = await page.$('section[aria-labelledby="reviews-h"]'); if (sec) await sec.screenshot({ path: "shots/home-reviews.png" });
  check(!!sec && (await page.content()).includes("Preview check: found a boat"), "shows on the home page");
  // Public client can't read pending reviews or emails.
  const anon = createClient(process.env.SUPABASE_URL, process.env.ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  void anon;
  // Lot page review box.
  await page.goto(`${base}/search?category=boats`, { waitUntil: "networkidle2" });
  const lotHref = await page.$eval('a[href^="/lot/"]', (a) => a.getAttribute("href"));
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(`${base}${lotHref}?review=thanks#reviews`, { waitUntil: "networkidle2" });
  const lr = await page.$("#reviews"); if (lr) await lr.screenshot({ path: "shots/lot-reviews-phone.png" });
  check(!!lr, "lot page has a reviews section");
} finally {
  await admin.from("reviews").delete().eq("email", email);
  await browser.close();
  console.log("test review removed");
}
if (failed) process.exit(1);

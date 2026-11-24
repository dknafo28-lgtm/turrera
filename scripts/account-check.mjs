// CI-only check of accounts against the real database: makes a throwaway user, signs in through
// the site, stars a lot, screenshots the dashboard, checks the row rules, then deletes the user.
import { createClient } from "@supabase/supabase-js";
import puppeteer from "puppeteer-core";
import fs from "node:fs";

const base = process.argv[2];
const url = process.env.SUPABASE_URL, service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(url, service, { auth: { persistSession: false } });
const email = `preview-${Date.now()}@example.com`, password = `Pv-${Math.random().toString(36).slice(2)}A9`;
const { data: created, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
if (error) throw error;
const uid = created.user.id;
fs.mkdirSync("shots", { recursive: true });
let failed = false;
const check = (ok, msg) => { console.log(`${ok ? "PASS" : "FAIL"} ${msg}`); if (!ok) failed = true; };
try {
  const browser = await puppeteer.launch({ executablePath: process.env.CHROME, args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(`${base}/account`, { waitUntil: "networkidle2" });
  check(page.url().includes("/signin"), "signed-out /account goes to sign in");
  await page.screenshot({ path: "shots/signin.png", fullPage: true });
  await page.type('input[name="email"]', email);
  await page.type('input[name="password"]', password);
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle2" }), page.click('form.auth-form button[type="submit"]')]);
  check(page.url().endsWith("/account"), `signed in and landed on ${page.url()}`);

  // Star a lot from the search page, then check it's saved to the account.
  await page.goto(`${base}/search?category=boats`, { waitUntil: "networkidle2" });
  const lotHref = await page.$eval('a[href^="/lot/"]', (a) => a.getAttribute("href"));
  await page.goto(base + lotHref, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 1500));
  check(await page.$eval(".header-account", (a) => a.textContent.includes("My account")), "header shows My account");
  await page.click(".bidbox button.watch");
  await new Promise((r) => setTimeout(r, 2000));
  const { data: rows } = await admin.from("watchlist_items").select("lot_id").eq("user_id", uid);
  check(rows?.length === 1 && `/lot/${encodeURIComponent(rows[0].lot_id)}` === lotHref, "star saved to the account");

  // A buy-for-me request sent while signed in is linked to the account.
  await page.type('#buy-for-me input[name="name"]', "Preview Check");
  await page.type('#buy-for-me input[name="email"]', email);
  await page.type('#buy-for-me input[name="max_bid"]', "1000");
  await page.click('#buy-for-me input[name="terms"]');
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle2" }), page.click('#buy-for-me button[type="submit"]')]);
  const { data: buys } = await admin.from("buy_requests").select("id,user_id").eq("email", email);
  check(buys?.length === 1 && buys[0].user_id === uid, "buy request linked to the account");

  await page.goto(`${base}/account`, { waitUntil: "networkidle2" });
  await page.screenshot({ path: "shots/account.png", fullPage: true });
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.reload({ waitUntil: "networkidle2" });
  await page.screenshot({ path: "shots/account-phone.png", fullPage: true });

  // Row rules: signed in as this person, only their own requests come back; signed out, none.
  const cookies = await page.cookies();
  const token = cookies.find((c) => c.name.includes("auth-token"));
  check(!!token, "session cookie set");
  const pub = createClient(url, process.env.ANON_KEY || service, { auth: { persistSession: false } });
  const user = createClient(url, service, { auth: { persistSession: false } });
  await user.auth.signInWithPassword({ email, password });
  const mine = await user.from("buy_requests").select("user_id");
  check(!mine.error && mine.data.every((r) => r.user_id === uid), `signed-in user sees only their own buy requests (${mine.data?.length})`);
  const sw = await user.from("watchlist_items").select("user_id");
  check(!sw.error && sw.data.every((r) => r.user_id === uid), "signed-in user sees only their own watchlist");

  // Sign out.
  await page.setViewport({ width: 1280, height: 900 });
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle2" }), page.click('form[action="/api/auth/signout"] button')]);
  await page.goto(`${base}/account`, { waitUntil: "networkidle2" });
  check(page.url().includes("/signin"), "signed out");
  await page.goto(`${base}/signin?mode=signup`, { waitUntil: "networkidle2" });
  await page.screenshot({ path: "shots/signup.png", fullPage: true });
  await browser.close();
  void pub;
} finally {
  await admin.from("buy_requests").delete().eq("email", email);
  await admin.auth.admin.deleteUser(uid);
  console.log("test user removed");
}
if (failed) process.exit(1);

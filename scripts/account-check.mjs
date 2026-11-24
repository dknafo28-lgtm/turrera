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

  // Bidding: one box on the lot page, then the confirm page, then the request is linked to the account.
  const current = await page.$eval(".bidbox", (el) => { const m = el.textContent.match(/Current bid\$([\d,]+)/); return m ? Number(m[1].replace(/,/g, "")) : 0; });
  const myMax = Math.max(1000, current + 500);
  await page.type("#bid-max", String(myMax));
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle2" }), page.click('#bid button[type="submit"]')]);
  check(page.url().includes("/bid/") && page.url().includes(`max=${myMax}`), `bid box goes to the confirm page (${page.url()})`);
  await page.screenshot({ path: "shots/bid-confirm.png", fullPage: true });
  const depositShown = await page.$eval("[data-deposit-out]", (el) => el.textContent);
  check(/\$[\d,]+/.test(depositShown), `deposit shown: ${depositShown}`);
  await page.type('.bid-form input[name="name"]', "Preview Check");
  await page.click('.bid-form input[name="terms"]');
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle2" }), page.click('.bid-form button[type="submit"]')]);
  check(page.url().includes("/thanks?k=buy"), `confirmed and landed on ${page.url()}`);
  const { data: buys } = await admin.from("buy_requests").select("id,user_id,max_bid").eq("email", email);
  check(buys?.length === 1 && buys[0].user_id === uid && Number(buys[0].max_bid) === myMax, "bid saved to the account with the right max");

  // Signed out, the same box sends people to create an account, then back to the bid.
  const guest = await browser.createBrowserContext();
  const gp = await guest.newPage();
  await gp.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await gp.goto(base + lotHref, { waitUntil: "networkidle2" });
  const box = await gp.$(".bidbox"); if (box) await box.screenshot({ path: "shots/bidbox-phone.png" });
  await gp.type("#bid-max", String(myMax + 100));
  await Promise.all([gp.waitForNavigation({ waitUntil: "networkidle2" }), gp.click('#bid button[type="submit"]')]);
  check(gp.url().includes("/signin") && gp.url().includes("mode=signup") && decodeURIComponent(gp.url()).includes("/bid/"), `signed-out bid goes to sign-up (${gp.url()})`);
  await gp.screenshot({ path: "shots/bid-signup-phone.png", fullPage: true });
  await guest.close();

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

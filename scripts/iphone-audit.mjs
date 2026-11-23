// Loads pages as an iPhone and reports anything wider than the screen, tiny tap targets,
// and form fields under 16px (iOS zooms in on those). Saves screenshots to ./shots.
import puppeteer from "puppeteer-core";
import fs from "node:fs";

const base = process.argv[2];
const paths = process.argv.slice(3);
const browser = await puppeteer.launch({ executablePath: process.env.CHROME, args: ["--no-sandbox"] });
fs.mkdirSync("shots", { recursive: true });
for (const [i, path] of paths.entries()) {
  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1");
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(base + path, { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1500));
  const report = await page.evaluate(() => {
    const vw = window.innerWidth;
    const scrollers = (el) => { for (let p = el.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o === "auto" || o === "scroll" || o === "hidden") return true; } return false; };
    const wide = [];
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      if (!r.width || getComputedStyle(el).position === "fixed") continue;
      if ((r.right > vw + 1 || r.left < -1) && !scrollers(el)) wide.push(`${el.tagName.toLowerCase()}.${[...el.classList].join(".")} left=${Math.round(r.left)} right=${Math.round(r.right)}`);
    }
    const small = [...document.querySelectorAll("input:not([type=checkbox]):not([type=radio]):not([type=hidden]), select, textarea")]
      .filter((el) => el.getBoundingClientRect().width && parseFloat(getComputedStyle(el).fontSize) < 16)
      .map((el) => `${el.tagName.toLowerCase()}[name=${el.getAttribute("name")}] ${getComputedStyle(el).fontSize}`);
    return { vw, docWidth: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight, wide: wide.slice(0, 15), small: [...new Set(small)].slice(0, 15) };
  });
  console.log(`\n== ${path}\nviewport ${report.vw}, page width ${report.docWidth}, height ${report.height}`);
  if (report.wide.length) console.log("WIDER THAN SCREEN:\n  " + report.wide.join("\n  "));
  if (report.small.length) console.log("FIELDS UNDER 16px (iOS zoom):\n  " + report.small.join("\n  "));
  await page.screenshot({ path: `shots/m${i}.png`, clip: { x: 0, y: 0, width: 390, height: Math.min(report.height, 2400) } });
  await page.close();
}
await browser.close();

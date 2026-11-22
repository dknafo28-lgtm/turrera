// Checks Claude's extraction on a sample alert email (no inbox needed).
import { SYSTEM_PROMPT, emailToPrompt, extractLinks, extractImages, parseListings, toLot, SITES } from "../collectors/email-alerts.mjs";
const html = `<p>New items match your saved search "trucks florida"</p>
<table><tr><td><img src="https://webassets.govdeals.com/photos/4321/1.jpg"></td><td><a href="https://www.govdeals.com/en/asset/4321/1187">2015 Ford F-250 Super Duty 4x4</a><br>Current Bid: $3,450.00<br>Closes: 11/30/2026 6:15 PM ET<br>Location: Ocala, FL<br>Seller: City of Ocala</td></tr>
<tr><td><img src="https://webassets.govdeals.com/photos/4321/2.jpg"></td><td><a href="https://www.govdeals.com/en/asset/4321/1190">2012 Chevrolet Tahoe Police Package</a><br>Current Bid: $1,900.00<br>Closes: 12/01/2026 7:00 PM ET<br>Location: Tampa, FL</td></tr></table>
<a href="https://www.govdeals.com/en/account/saved-searches">Manage saved searches</a> <a href="https://www.govdeals.com/unsubscribe?x=1">Unsubscribe</a>`;
const text = html.replace(/<[^>]+>/g, " ");
const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
  body: JSON.stringify({ model: "claude-haiku-5-5", max_tokens: 8000, system: SYSTEM_PROMPT, messages: [{ role: "user", content: emailToPrompt({ subject: "Saved search alert", from: "GovDeals <noreply@govdeals.com>", date: new Date().toISOString(), text, links: extractLinks(html), images: extractImages(html) }) }] }) });
const j = await res.json();
const reply = j.content?.filter((c) => c.type === "text").map((c) => c.text).join("\n");
const lots = parseListings(reply).map((l) => toLot(SITES[0], l));
console.log("EXTRACTED", JSON.stringify(lots.map((l) => ({ id: l.id, title: l.title, bid: l.current_bid, end: l.end_time, city: l.city, state: l.state, cat: l.category, photo: l.photo_url })), null, 0));

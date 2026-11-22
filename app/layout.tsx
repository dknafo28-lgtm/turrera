import type { Metadata, Viewport } from "next";
import "@fontsource/public-sans/400.css";
import "@fontsource/public-sans/500.css";
import "@fontsource/public-sans/600.css";
import "@fontsource/public-sans/700.css";
import "@fontsource/saira-semi-condensed/700.css";
import "@fontsource/saira-semi-condensed/800.css";
import "./globals.css";
import Logo from "@/components/Logo";
import NewsletterForm from "@/components/NewsletterForm";

export const metadata: Metadata = {
  title: "Turrera: government surplus auctions in one place",
  description: "Search government surplus lots from GSA Auctions, Public Surplus, Municibid and JJ Kane, with condition notes and resale estimates.",
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = { themeColor: "#162e51" };

const SCRIPT = `document.addEventListener("error", function (e) {
  var img = e.target;
  if (!img || img.tagName !== "IMG" || !img.parentElement) return;
  var p = img.parentElement;
  if (p.classList.contains("card-media") || p.classList.contains("gallery-item") || p.classList.contains("cat-tile-photo") || p.classList.contains("gallery-thumb")) p.classList.add("photo-missing");
}, true);
document.querySelectorAll(".card-media img, .cat-tile-photo img").forEach(function (img) {
  if (img.complete && img.naturalWidth === 0) img.parentElement.classList.add("photo-missing");
});
document.addEventListener("change", function (e) {
  var el = e.target;
  if (el && el.hasAttribute && el.hasAttribute("data-autosubmit") && el.form) el.form.submit();
});
document.addEventListener("click", function (e) {
  var a = e.target && e.target.closest ? e.target.closest(".gallery-thumb") : null;
  if (!a) return;
  var target = document.getElementById(a.getAttribute("href").slice(1));
  if (!target) return;
  e.preventDefault();
  target.parentElement.scrollTo({ left: target.offsetLeft - target.parentElement.offsetLeft, behavior: "smooth" });
  document.querySelectorAll(".gallery-thumb").forEach(function (t) { t.removeAttribute("aria-current"); });
  a.setAttribute("aria-current", "true");
});
document.addEventListener("keydown", function (e) {
  var t = document.getElementById("filters-open");
  if (e.key === "Escape" && t && t.checked) t.checked = false;
});`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#content" className="skip">Skip to results</a>
        <div id="content">{children}</div>
        <footer className="site-footer">
          <div className="site-footer-inner">
            <div className="footer-col">
              <Logo tone="dark" className="footer-logo" />
              <nav className="footer-links" aria-label="Footer">
                <a href="/search">Search lots</a>
                <a href="/buy-for-me">We buy it for you</a>
                <a href="/sell">Sell your fleet</a>
                <a href="/watchlist">Watchlist</a>
              </nav>
            </div>
            <div className="footer-col">
              <h2>Weekly deals list</h2>
              <NewsletterForm source="footer" tone="dark" />
            <p>Listings come from GSA Auctions, Public Surplus, Municibid, JJ Kane government sellers and your auction alerts. Turrera isn&apos;t affiliated with the selling agencies. Values and resale notes are estimates, so check the listing and recent sales before you bid.</p>
            </div>
          </div>
        </footer>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />
      </body>
    </html>
  );
}

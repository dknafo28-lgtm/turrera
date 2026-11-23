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
  description: "Search government surplus lots from GSA Auctions, Public Surplus, Municibid and JJ Kane, with condition notes and recent sold prices.",
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = { themeColor: "#162e51" };

const SCRIPT = `document.addEventListener("error", function (e) {
  var img = e.target;
  if (!img || img.tagName !== "IMG" || !img.parentElement) return;
  var p = img.parentElement;
  if (p.tagName === "A" && p.parentElement && p.parentElement.classList.contains("gallery-item")) p = p.parentElement;
  if (p.classList.contains("card-media") || p.classList.contains("gallery-item") || p.classList.contains("cat-tile-photo") || p.classList.contains("gallery-thumb")) p.classList.add("photo-missing");
}, true);
document.querySelectorAll(".card-media img, .cat-tile-photo img").forEach(function (img) {
  if (img.complete && img.naturalWidth === 0) img.parentElement.classList.add("photo-missing");
});
document.addEventListener("change", function (e) {
  var el = e.target;
  if (!el || !el.hasAttribute || !el.form) return;
  var clear = el.getAttribute("data-autosubmit-clear");
  if (clear) {
    clear.split(",").forEach(function (n) { var f = el.form.elements[n]; if (f && f.length && !f.tagName) { for (var i = 0; i < f.length; i++) f[i].disabled = true; } else if (f) f.disabled = true; });
    el.form.submit();
    return;
  }
  // In the phone filter panel, wait for "Show results"; everywhere else, apply right away.
  var inPanel = el.closest(".sidebar") && !window.matchMedia("(min-width: 861px)").matches;
  if (el.hasAttribute("data-autosubmit") && !inPanel) el.form.submit();
});
function galleryGo(strip, index) {
  var items = strip.children;
  if (!items.length) return;
  index = Math.max(0, Math.min(items.length - 1, index));
  strip.scrollTo({ left: items[index].offsetLeft - strip.offsetLeft, behavior: "smooth" });
}
function galleryIndex(strip) { return Math.round(strip.scrollLeft / Math.max(1, strip.clientWidth)); }
document.addEventListener("click", function (e) {
  var t = e.target && e.target.closest ? e.target : null;
  if (!t) return;
  var thumb = t.closest(".gallery-thumb");
  if (thumb) {
    var strip = document.querySelector("[data-gallery]");
    var n = Array.prototype.indexOf.call(thumb.parentElement.children, thumb);
    if (strip) { e.preventDefault(); galleryGo(strip, n); }
    return;
  }
  var step = t.closest("[data-gallery-step]");
  if (step) {
    var s2 = document.querySelector("[data-gallery]");
    if (s2) galleryGo(s2, galleryIndex(s2) + Number(step.getAttribute("data-gallery-step")));
    return;
  }
  if (t.closest("[data-close-menu]")) { var m = t.closest("details"); if (m) m.open = false; return; }
  document.querySelectorAll("details.catmenu[open]").forEach(function (d) { if (!d.contains(t)) d.open = false; });
});
(function () {
  var strip = document.querySelector("[data-gallery]");
  if (!strip) return;
  var counter = document.querySelector("[data-gallery-counter]");
  var thumbs = document.querySelectorAll(".gallery-thumb");
  var total = strip.children.length;
  var last = -1;
  strip.addEventListener("scroll", function () {
    var i = galleryIndex(strip);
    if (i === last) return;
    last = i;
    if (counter) counter.textContent = (i + 1) + " / " + total;
    thumbs.forEach(function (th, k) {
      if (k === i) { th.setAttribute("aria-current", "true"); th.scrollIntoView({ block: "nearest", inline: "nearest" }); }
      else th.removeAttribute("aria-current");
    });
  }, { passive: true });
  document.addEventListener("keydown", function (e) {
    if (document.activeElement && /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
    if (e.key === "ArrowRight") galleryGo(strip, galleryIndex(strip) + 1);
    if (e.key === "ArrowLeft") galleryGo(strip, galleryIndex(strip) - 1);
  });
})();
document.addEventListener("toggle", function (e) {
  var d = e.target;
  if (!d || !d.classList || !d.classList.contains("catmenu")) return;
  document.documentElement.classList.toggle("menu-open", d.open && !window.matchMedia("(min-width: 861px)").matches);
}, true);
document.addEventListener("keydown", function (e) {
  var t = document.getElementById("filters-open");
  if (e.key === "Escape" && t && t.checked) t.checked = false;
  if (e.key === "Escape") {
    document.querySelectorAll("details.catmenu[open]").forEach(function (d) { d.open = false; });
    if (location.hash === "#all-photos") location.hash = "gallery";
  }
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
                <a href="/financing">Financing</a>
                <a href="/watchlist">Watchlist</a>
              </nav>
            </div>
            <div className="footer-col">
              <h2>Weekly deals list</h2>
              <NewsletterForm source="footer" tone="dark" />
            <p>Listings come from GSA Auctions, Public Surplus, Municibid, JJ Kane government sellers and your auction alerts. Turrera isn&apos;t affiliated with the selling agencies. Check the listing and recent sales before you bid.</p>
            </div>
          </div>
        </footer>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />
      </body>
    </html>
  );
}

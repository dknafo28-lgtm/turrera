import type { Metadata, Viewport } from "next";
import "@fontsource/public-sans/400.css";
import "@fontsource/public-sans/500.css";
import "@fontsource/public-sans/600.css";
import "@fontsource/public-sans/700.css";
import "@fontsource/saira-semi-condensed/700.css";
import "@fontsource/saira-semi-condensed/800.css";
import "./globals.css";
import Logo from "@/components/Logo";

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
            <Logo tone="dark" className="footer-logo" />
            <p>Listings come from GSA Auctions, Public Surplus, Municibid, JJ Kane government sellers and your auction alerts. Turrera isn&apos;t affiliated with the selling agencies. Values and resale notes are estimates, so check the listing and recent sales before you bid.</p>
          </div>
        </footer>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />
      </body>
    </html>
  );
}

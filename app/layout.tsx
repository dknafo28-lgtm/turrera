import type { Metadata, Viewport } from "next";
import "@fontsource/barlow/400.css";
import "@fontsource/barlow/500.css";
import "@fontsource/barlow/600.css";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Turrera: government surplus auctions in one place",
  description: "Search GSA Auctions and Public Surplus lots: trucks, boats, equipment and more, with condition notes and resale estimates.",
};

export const viewport: Viewport = { themeColor: "#14213d" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <footer className="site-footer">
          <p>Listings link to the original auction. Turrera isn&apos;t affiliated with the selling agencies. Market values and resale notes are estimates; check the listing and real sales before you bid.</p>
        </footer>
        <script
          dangerouslySetInnerHTML={{
            __html: `document.addEventListener("error", function (e) {
  var img = e.target;
  if (img && img.tagName === "IMG" && img.parentElement && (img.parentElement.classList.contains("lot-photo") || img.parentElement.classList.contains("gallery-item"))) img.parentElement.classList.add("photo-missing");
}, true);
document.querySelectorAll(".lot-photo img").forEach(function (img) {
  if (img.complete && img.naturalWidth === 0) img.parentElement.classList.add("photo-missing");
});
document.addEventListener("click", function (e) {
  var a = e.target && e.target.closest ? e.target.closest("a[data-back]") : null;
  if (a && document.referrer && new URL(document.referrer).origin === location.origin && history.length > 1) { e.preventDefault(); history.back(); }
});
document.addEventListener("change", function (e) {
  var el = e.target;
  if (!el || !el.name || !el.form || !el.form.classList.contains("toolbar")) return;
  var drawer = document.getElementById("filters-toggle");
  if (drawer && drawer.checked) return; // on phones, wait for the Apply button

  if (el.tagName === "SELECT" || el.type === "checkbox") el.form.submit();
});`,
          }}
        />
      </body>
    </html>
  );
}

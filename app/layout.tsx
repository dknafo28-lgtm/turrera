import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Turrera — Government surplus, all in one place",
  description: "Search government surplus auctions for trucks, boats, buses, equipment and more.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <a href="/" className="logo">Turrera</a>
          <span className="tagline">Government surplus, all in one place</span>
        </header>
        <main>{children}</main>
        <script
          dangerouslySetInnerHTML={{
            __html: `document.addEventListener("change", function (e) {
  var el = e.target;
  if (el && el.tagName === "SELECT" && el.form && el.form.classList.contains("filters")) el.form.submit();
});`,
          }}
        />
        <footer className="site-footer">
          Listings link to the original auction. Turrera is not affiliated with the listing agencies.
        </footer>
      </body>
    </html>
  );
}

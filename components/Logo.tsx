import paths from "./logo-paths.json";

// Turrera logo, drawn from vector paths (cleaned-up version of the original mark and wordmark).
export default function Logo({ tone = "dark", className = "" }: { tone?: "dark" | "light"; className?: string }) {
  const mark = tone === "dark" ? "#9fd0dc" : "#3d7f93";
  const word = tone === "dark" ? "#ffffff" : "#162e51";
  return (
    <svg className={`logo ${className}`} viewBox={paths.viewBox} role="img" aria-label="Turrera">
      <path d={paths.mark} fill={mark} />
      <path d={paths.word} fill={word} />
    </svg>
  );
}

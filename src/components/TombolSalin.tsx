"use client";

import { useState } from "react";

export function TombolSalin({ teks, label = "Salin", className = "" }: { teks: string; label?: string; className?: string }) {
  const [tersalin, setTersalin] = useState(false);

  async function salin() {
    try {
      await navigator.clipboard.writeText(teks);
    } catch {
      // Cadangan untuk konteks tanpa izin clipboard (mis. http non-lokal).
      const ta = Object.assign(document.createElement("textarea"), { value: teks });
      document.body.append(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setTersalin(true);
    setTimeout(() => setTersalin(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={salin}
      className={`rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition hover:border-fg/40 hover:bg-sunken ${
        tersalin ? "text-ok" : ""
      } ${className}`}
    >
      <span aria-live="polite">{tersalin ? "Tersalin ✓" : label}</span>
    </button>
  );
}

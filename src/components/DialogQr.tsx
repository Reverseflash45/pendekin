"use client";

import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";

/** Dialog QR code untuk satu tautan pendek. `url` null berarti tertutup. */
export function DialogQr({ url, onTutup }: { url: string | null; onTutup: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [gambar, setGambar] = useState<{ url: string; data: string } | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (url) {
      if (!d.open) d.showModal();
      QRCode.toDataURL(url, { width: 640, margin: 2, errorCorrectionLevel: "M" }).then((data) =>
        setGambar({ url, data }),
      );
    } else if (d.open) {
      d.close();
    }
  }, [url]);

  const siap = gambar && gambar.url === url ? gambar.data : null;
  const namaBerkas = `qr-${url?.split("/").pop() ?? "tautan"}.png`;

  return (
    <dialog
      ref={ref}
      onClose={onTutup}
      onClick={(e) => e.target === ref.current && onTutup()}
      className="m-auto w-[min(92vw,360px)] rounded-2xl border border-border bg-surface p-5 text-fg shadow-2xl"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-lg font-extrabold">QR code</p>
          <p className="truncate font-mono text-sm text-muted">{url?.replace(/^https?:\/\//, "")}</p>
        </div>
        <button onClick={onTutup} className="rounded-lg px-2 py-1 text-muted hover:bg-sunken" aria-label="Tutup">
          ✕
        </button>
      </div>
      <div className="mt-4 grid aspect-square place-items-center rounded-xl bg-white p-2">
        {siap ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={siap} alt={`QR code untuk ${url}`} className="size-full" />
        ) : (
          <span className="text-sm text-neutral-500">Membuat QR…</span>
        )}
      </div>
      <a
        href={siap ?? undefined}
        download={namaBerkas}
        aria-disabled={!siap}
        className="mt-4 block rounded-xl bg-fg py-2.5 text-center font-semibold text-bg transition hover:opacity-90 aria-disabled:pointer-events-none aria-disabled:opacity-50"
      >
        Unduh PNG
      </a>
    </dialog>
  );
}

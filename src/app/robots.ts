import type { MetadataRoute } from "next";

// Tanpa berkas ini, /robots.txt tertangkap rute [kode] dan dialihkan ke /hilang.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // statistik tiap tautan dan halaman "tidak ada" tidak perlu muncul di mesin pencari
      disallow: ["/stats/", "/hilang", "/api/"],
    },
  };
}

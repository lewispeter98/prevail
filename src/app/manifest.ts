import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Prevail",
    short_name: "Prevail",
    description: "Weight, goals and journal.",
    start_url: "/weight",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F5F0E6",
    theme_color: "#F5F0E6",
    icons: [{ src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" }],
  };
}

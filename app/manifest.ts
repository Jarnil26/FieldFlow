import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FieldFlow",
    short_name: "FieldFlow",
    description:
      "Mobile-first field sales management app with GPS tracking, visit analytics, and real-time reporting",

    start_url: "/",
    scope: "/",

    display: "standalone",
    display_override: ["standalone", "fullscreen"],

    background_color: "#ffffff",
    theme_color: "#2563eb",
    orientation: "portrait",

    lang: "en-IN",
    dir: "ltr",

    icons: [
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
      {
        src: "/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png",
      },
    ],

    categories: ["business", "productivity"],

    shortcuts: [
      {
        name: "Salesman",
        short_name: "Salesman",
        description: "Open Salesman Dashboard",
        url: "/salesman",
        icons: [{ src: "/android-chrome-192x192.png", sizes: "192x192" }],
      },
      {
        name: "Distributor",
        short_name: "Distributor",
        description: "Open Distributor Dashboard",
        url: "/distributor",
        icons: [{ src: "/android-chrome-192x192.png", sizes: "192x192" }],
      },
      {
        name: "Owner",
        short_name: "Owner",
        description: "Open Owner Dashboard",
        url: "/owner",
        icons: [{ src: "/android-chrome-192x192.png", sizes: "192x192" }],
      },
    ],
  }
}

import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Betinapp",
    short_name: "Betinapp",
    description: "Shared household management dashboard",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#1a1464",
    theme_color: "#1a1464",
    orientation: "portrait",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  }
}

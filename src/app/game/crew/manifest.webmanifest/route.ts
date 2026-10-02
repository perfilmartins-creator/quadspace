import { crew } from "@/lib/content";

export const dynamic = "force-static";

// Manifest próprio do jogo (o site institucional não vira app).
export function GET() {
  return Response.json(
    {
      name: crew.name,
      short_name: crew.shortName,
      description: crew.description,
      id: "/game/crew",
      start_url: "/game/crew",
      scope: "/game/crew",
      display: "standalone",
      orientation: "portrait",
      background_color: "#050505",
      theme_color: "#050505",
      lang: "pt-BR",
      icons: [
        { src: "/game/crew/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/game/crew/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/game/crew/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json" } },
  );
}

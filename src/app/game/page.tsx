import type { Metadata, Viewport } from "next";
import { QuadBounce } from "@/components/game/QuadBounce";
import { site } from "@/config/site";
import { game } from "@/lib/content";

export const metadata: Metadata = {
  title: { absolute: game.title },
  description: game.description,
  alternates: { canonical: "/game" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: `${site.url}/game`,
    siteName: site.name,
    title: game.title,
    description: game.description,
  },
  twitter: {
    card: "summary_large_image",
    title: game.title,
    description: game.description,
  },
};

// Só nesta rota: tela cheia escura e sem zoom (pinça ou duplo toque).
export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function GamePage() {
  return <QuadBounce />;
}

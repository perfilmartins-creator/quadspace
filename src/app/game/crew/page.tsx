import type { Metadata, Viewport } from "next";
import { CrewApp } from "@/components/crew/CrewApp";
import { site } from "@/config/site";
import { crew } from "@/lib/content";

export const metadata: Metadata = {
  title: { absolute: crew.name },
  description: crew.description,
  alternates: { canonical: "/game/crew" },
  manifest: "/game/crew/manifest.webmanifest",
  applicationName: crew.name,
  appleWebApp: {
    capable: true,
    title: crew.shortName,
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: "/game/crew/icon-180.png",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: `${site.url}/game/crew`,
    siteName: site.name,
    title: crew.name,
    description: crew.description,
  },
  twitter: {
    card: "summary_large_image",
    title: crew.name,
    description: crew.description,
  },
};

// Tela cheia escura, sem zoom, respeitando o notch (safe areas).
export const viewport: Viewport = {
  themeColor: "#050505",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function CrewPage() {
  return <CrewApp />;
}

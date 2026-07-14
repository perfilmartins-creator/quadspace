import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { address, site } from "@/config/site";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const siteUrl = site.url;
const siteTitle = site.seoTitle;
const siteDescription = site.seoDescription;

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CreativeWork",
  name: site.name,
  url: siteUrl,
  description: siteDescription,
  address: {
    "@type": "PostalAddress",
    streetAddress: address.street,
    addressLocality: address.city,
    addressRegion: address.state,
    addressCountry: address.country,
  },
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteTitle,
    template: "%s — QUAD SPACE",
  },
  description: siteDescription,
  keywords: [
    "estúdio de fotografia",
    "espaço para criação",
    "estúdio audiovisual",
    "aluguel de estúdio",
    "produção de conteúdo",
    "direção de arte",
    "QUAD SPACE",
  ],
  authors: [{ name: site.name }],
  creator: site.name,
  applicationName: site.name,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: siteUrl,
    siteName: site.name,
    title: siteTitle,
    description: siteDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf9f4" },
    { media: "(prefers-color-scheme: dark)", color: "#15140f" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="min-h-screen bg-paper font-sans text-ink antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-full focus:bg-ink focus:px-5 focus:py-2.5 focus:text-sm focus:text-paper"
        >
          Pular para o conteúdo
        </a>
        {children}
      </body>
    </html>
  );
}

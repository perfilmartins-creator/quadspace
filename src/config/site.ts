// Configuração central da marca QUAD SPACE.
// Campos marcados com PLACEHOLDER precisam do dado real antes de publicar.

export const site = {
  name: "QUAD SPACE",
  domain: "quadspace.com.br",
  url: "https://quadspace.com.br",
  tagline: "Suas ideias encontraram um lugar.",
  seoTitle: "QUAD SPACE — Estúdio de fotografia e criação em Recife",
  seoDescription:
    "Estúdio criativo em Recife para fotografia, vídeo, campanhas, conteúdo e workshops. Suas ideias encontraram um lugar.",
  areaM2: 30,
};

export const address = {
  street: "Av. Conselheiro Aguiar, 231, Sala 202",
  neighborhood: "Pina",
  city: "Recife",
  state: "PE",
  country: "BR",
  full: "Av. Conselheiro Aguiar, 231, Sala 202 — Pina, Recife/PE",
};

export const contact = {
  // PLACEHOLDER — confirmar e-mail oficial da QUAD SPACE
  email: "contato@quadspace.com.br",
  // PLACEHOLDER — confirmar @ oficial do Instagram
  instagramHandle: "@quadspace",
  instagramUrl: "https://instagram.com/quadspace",
  // PLACEHOLDER — número oficial de WhatsApp, apenas dígitos com DDI+DDD (ex: 5581999999999).
  // Deixado em branco de propósito: sem o número real, um link wa.me poderia
  // acidentalmente notificar um número de terceiro. Preencha antes de publicar.
  whatsappNumber: "",
  whatsappMessageBooking:
    "Olá! Vim pelo site da QUAD SPACE e gostaria de consultar a disponibilidade do estúdio.",
  whatsappMessageQuestion:
    "Olá! Vim pelo site da QUAD SPACE e queria tirar uma dúvida sobre o espaço.",
  // PLACEHOLDER — link oficial do Google Maps (Google Maps → Compartilhar → Copiar link).
  // Deixado em branco: preferimos não linkar um local aproximado/errado.
  mapsUrl: "",
};

export function buildWhatsappLink(message: string): string | null {
  if (!contact.whatsappNumber) return null;
  return `https://wa.me/${contact.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

export const nav = [
  { label: "O Espaço", href: "#espaco" },
  { label: "Estrutura", href: "#estrutura" },
  { label: "Possibilidades", href: "#possibilidades" },
  { label: "Galeria", href: "#galeria" },
  { label: "FAQ", href: "#faq" },
  { label: "Localização", href: "#localizacao" },
] as const;

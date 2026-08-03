// Configuração central da marca QUAD SPACE.
// Campos marcados com PLACEHOLDER precisam do dado real antes de publicar.

export const site = {
  name: "QUAD SPACE",
  domain: "quadspace.com.br",
  url: "https://quadspace.com.br",
  tagline: "Suas ideias encontraram um lugar.",
  seoTitle: "QUAD SPACE — Estúdio para fotografia e vídeo em Recife",
  seoDescription:
    "Estúdio criativo no Pina, Recife, para fotografia, vídeo, campanhas, conteúdo e workshops. Locações a partir de R$ 90.",
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
  whatsappNumber: "5581994494037",
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

export type PricingPlan = {
  hours: number;
  label: string;
  price: number;
  hourlyRate: number;
  savings: number;
  featured?: boolean;
};

// Centralizado aqui para facilitar alteração — não duplicar valores em componentes.
export const pricing: PricingPlan[] = [
  { hours: 1, label: "1 hora", price: 90, hourlyRate: 90, savings: 0 },
  { hours: 2, label: "2 horas", price: 170, hourlyRate: 85, savings: 10 },
  { hours: 3, label: "3 horas", price: 240, hourlyRate: 80, savings: 30 },
  {
    hours: 4,
    label: "4 horas",
    price: 300,
    hourlyRate: 75,
    savings: 60,
    featured: true,
  },
  { hours: 6, label: "6 horas", price: 420, hourlyRate: 70, savings: 120 },
  { hours: 8, label: "8 horas", price: 520, hourlyRate: 65, savings: 200 },
];

export const startingPrice = pricing[0].price;

export function buildPlanWhatsappLink(plan: PricingPlan): string | null {
  const message = `Olá! Vim pelo site da QUAD SPACE e gostaria de consultar disponibilidade para uma locação de ${plan.label}.`;
  return buildWhatsappLink(message);
}

export type EquipmentCategory = {
  number: string;
  title: string;
  items: { qty?: number; name: string }[];
};

export const equipment: EquipmentCategory[] = [
  {
    number: "01",
    title: "Iluminação",
    items: [
      { qty: 2, name: "Godox MS300" },
      { qty: 1, name: "Nanlite FS-300B RGB" },
      { qty: 1, name: "Sokani X100 RGB LED" },
      { qty: 2, name: "Tripés de aço inox para iluminação" },
      { qty: 1, name: "Softbox Triopo 90" },
      { qty: 1, name: "Softbox Triopo 120" },
    ],
  },
  {
    number: "02",
    title: "Fundos",
    items: [
      { qty: 1, name: "Fundo branco" },
      { qty: 1, name: "Fundo preto" },
      { qty: 1, name: "Tecido marrom" },
    ],
  },
  {
    number: "03",
    title: "Apoio e conforto",
    items: [
      { name: "Mesa de apoio para edição" },
      { name: "Sala de estar com televisão" },
      { name: "Ar-condicionado" },
      { name: "Café disponível" },
      { name: "Água disponível" },
      { name: "Wi-Fi" },
      { name: "Estacionamento no local" },
    ],
  },
];

export const nav = [
  { label: "O Espaço", href: "#espaco" },
  { label: "Estrutura", href: "#estrutura" },
  { label: "Valores", href: "#valores" },
  { label: "Possibilidades", href: "#possibilidades" },
  { label: "Galeria", href: "#galeria" },
  { label: "FAQ", href: "#faq" },
  { label: "Localização", href: "#localizacao" },
] as const;

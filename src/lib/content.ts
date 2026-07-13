export const site = {
  name: "QUAD SPACE",
  tagline: "Suas ideias encontraram um lugar.",
  // PLACEHOLDER — confirmar endereço real antes de publicar
  address: "Rua Placeholder, 000 — São Paulo, SP",
  email: "contato@quadspace.com.br",
  phone: "+55 (11) 00000-0000",
  instagram: "@quadspace",
  instagramUrl: "https://instagram.com/quadspace",
};

export const nav = [
  { label: "Manifesto", href: "#manifesto" },
  { label: "O Espaço", href: "#espaco" },
  { label: "Estrutura", href: "#estrutura" },
  { label: "Galeria", href: "#galeria" },
  { label: "FAQ", href: "#faq" },
  { label: "Reserva", href: "#reserva" },
];

export const manifesto = {
  kicker: "Manifesto",
  lines: [
    "Não somos um estúdio fotográfico.",
    "Somos um espaço para criação.",
  ],
  body: [
    "QUAD SPACE existe para quem precisa de um lugar sério para fazer o trabalho acontecer — da primeira reunião de pauta ao último frame da campanha.",
    "Fotografia, audiovisual, direção de arte, produção de conteúdo, workshops e reuniões criativas dividem o mesmo endereço. Não porque tudo cabe em qualquer lugar, mas porque toda ideia boa precisa de espaço, luz e silêncio para virar resultado.",
  ],
};

export const spaceSection = {
  kicker: "O Espaço",
  title: "Um endereço para múltiplas formas de criar.",
  intro:
    "Quatro ambientes, uma mesma intenção: remover tudo que atrapalha e deixar a ideia no centro.",
  items: [
    {
      title: "Fotografia",
      description:
        "Ciclorama, luz natural controlável e infraestrutura para still e still-life.",
    },
    {
      title: "Audiovisual",
      description:
        "Isolamento acústico, ponto de energia trifásico e espaço para equipe reduzida ou set completo.",
    },
    {
      title: "Campanhas & Marcas",
      description:
        "Ambientes neutros e versáteis, prontos para receber cenografia própria.",
    },
    {
      title: "Reuniões & Workshops",
      description:
        "Sala reservada para pauta, direção de arte e apresentações a clientes.",
    },
  ],
};

export const structure = {
  kicker: "Estrutura",
  title: "O essencial, bem resolvido.",
  categories: [
    {
      title: "Espaço",
      items: [
        "220 m² divididos em 4 ambientes", // PLACEHOLDER — confirmar metragem real
        "Pé-direito de 4,5 m",
        "Ciclorama branco 6 x 4 m",
        "Isolamento acústico",
        "Ar-condicionado em todos os ambientes",
      ],
    },
    {
      title: "Equipamentos",
      items: [
        "Iluminação contínua e flash profissional",
        "Ponto de energia trifásica",
        "Wi-Fi de alta velocidade",
        "Suporte técnico durante a locação",
      ],
    },
    {
      title: "Conforto",
      items: [
        "Camarim e sala de apoio",
        "Copa equipada",
        "Estacionamento no local", // PLACEHOLDER — confirmar disponibilidade
        "Acesso facilitado para carga e descarga",
      ],
    },
  ],
};

export const gallery = {
  kicker: "Galeria",
  title: "Registros de quem já esteve aqui.",
  // PLACEHOLDER — substituir por fotografias reais do espaço e das produções
  items: [
    { label: "Estúdio A — Fotografia", ratio: "portrait" as const },
    { label: "Estúdio B — Audiovisual", ratio: "landscape" as const },
    { label: "Sala de Reunião", ratio: "landscape" as const },
    { label: "Produção de Campanha", ratio: "portrait" as const },
    { label: "Detalhe — Iluminação", ratio: "square" as const },
    { label: "Backstage", ratio: "landscape" as const },
  ],
};

export const faq = {
  kicker: "FAQ",
  title: "Perguntas frequentes.",
  items: [
    {
      question: "Como funciona a reserva do espaço?",
      answer:
        "Você envia a data e o tipo de produção pelo formulário de reserva. Nossa equipe confirma disponibilidade e retorna com uma proposta em até 24h úteis.",
    },
    {
      question: "É possível visitar antes de fechar?",
      answer:
        "Sim. Recomendamos agendar uma visita para conhecer os ambientes, a luz e a estrutura antes da produção.",
    },
    {
      question: "O QUAD SPACE fornece equipe técnica?",
      answer:
        "Oferecemos suporte técnico do espaço durante toda a locação. Equipe de produção (fotógrafo, diretor, assistentes) fica a cargo do cliente ou pode ser indicada sob consulta.",
    },
    {
      question: "Quais horários estão disponíveis?",
      answer:
        "Funcionamos todos os dias, incluindo períodos estendidos para produções que exigem virada. Horários fora da janela padrão são combinados na reserva.",
    },
    {
      question: "Posso montar cenografia própria?",
      answer:
        "Sim, os ambientes são neutros e preparados para receber cenografia, fundos e mobiliário próprios.",
    },
  ],
};

export const booking = {
  kicker: "Reserva",
  title: "Vamos colocar sua ideia de pé.",
  body: "Conte um pouco sobre a produção — data, formato e equipe — e retornamos com disponibilidade e proposta.",
};

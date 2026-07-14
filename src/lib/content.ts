// Copy do site. Dados de marca/contato ficam em src/config/site.ts.

export const hero = {
  eyebrow: "Estúdio & espaço para criação — Recife",
  headline: ["Suas ideias", "encontraram", "um lugar."],
  body: "A QUAD é um estúdio em Recife para fotografia, vídeo, conteúdo, campanhas, workshops e projetos criativos.",
  ctaPrimary: { label: "Conheça o espaço", href: "#espaco" },
  ctaSecondary: { label: "Reservar horário", href: "#reserva" },
};

export const spaceSection = {
  kicker: "O Espaço",
  lines: [
    "Um espaço de 30 m² pensado para criar,",
    "produzir, testar e transformar ideias em imagem.",
  ],
  body: "Fotografia, vídeo, campanhas e conteúdo dividem o mesmo endereço na Av. Conselheiro Aguiar, no Pina — sem sobrar nada entre a ideia e o resultado.",
};

export const structure = {
  kicker: "Estrutura",
  title: "O essencial, bem resolvido.",
  categories: [
    {
      title: "Espaço",
      items: ["30 m²", "Ar-condicionado", "Fundos fotográficos", "Mesa de apoio"],
    },
    {
      title: "Equipamentos",
      items: [
        "Flashes de estúdio",
        "Equipamentos de iluminação",
        "Estrutura para fotografia e vídeo",
        "Internet Wi-Fi",
      ],
    },
    {
      title: "Conforto",
      items: [
        "Sala de apoio com sofá e TV",
        "Estacionamento no local",
      ],
    },
  ],
};

export const possibilities = {
  kicker: "Possibilidades",
  title: "Um espaço. Várias direções.",
  intro: "Da primeira referência ao último take.",
  tagline: "Monte, mova, teste, fotografe, grave.",
  items: [
    "Moda",
    "Retratos",
    "Publicidade",
    "E-commerce",
    "Campanhas",
    "Vídeos",
    "Videoclipes",
    "Produção de conteúdo",
    "Entrevistas",
    "Workshops",
    "Direção de arte",
    "Testes criativos",
  ],
};

export const gallery = {
  kicker: "Galeria",
  title: "Registros de quem já esteve aqui.",
  // PLACEHOLDER — substituir por fotografias reais do espaço e das produções.
  // Ver public/gallery/README.md para nomes, proporções e formatos esperados.
  items: [
    { label: "Estúdio — Fotografia", ratio: "portrait" as const },
    { label: "Estúdio — Vídeo", ratio: "landscape" as const },
    { label: "Sala de apoio", ratio: "landscape" as const },
    { label: "Produção de campanha", ratio: "portrait" as const },
    { label: "Detalhe — Iluminação", ratio: "square" as const },
    { label: "Backstage", ratio: "landscape" as const },
  ],
};

export const location = {
  kicker: "Localização",
  title: "Av. Conselheiro Aguiar, 231, Sala 202",
  subtitle: "Pina — Recife/PE",
  body: "No coração do Pina, perto de tudo e fácil de chegar de carro.",
};

export const faq = {
  kicker: "FAQ",
  title: "Perguntas frequentes.",
  items: [
    {
      question: "Como funciona a reserva?",
      answer:
        "Você entra em contato pelo WhatsApp com a data e o tipo de produção. Confirmamos disponibilidade e alinhamos os detalhes por lá.",
    },
    {
      question: "O que está incluso na locação?",
      answer:
        "Espaço de 30 m², ar-condicionado, flashes e iluminação de estúdio, fundos fotográficos, mesa de apoio, Wi-Fi e sala de apoio com sofá e TV.",
    },
    {
      question: "Qual é o tamanho do estúdio?",
      answer: "30 m².",
    },
    {
      question: "O espaço possui ar-condicionado?",
      answer: "Sim, o ambiente é climatizado.",
    },
    {
      question: "Posso levar meus próprios equipamentos?",
      answer:
        "Sim. O espaço é preparado para receber equipamento próprio, cenografia e fundos adicionais.",
    },
    {
      question: "Posso levar minha equipe?",
      answer: "Sim, sem restrição de número de pessoas combinado previamente pelo WhatsApp.",
    },
    {
      question: "O espaço serve para vídeo?",
      answer:
        "Sim. A estrutura atende tanto fotografia quanto produções em vídeo, incluindo videoclipes e entrevistas.",
    },
    {
      question: "É possível realizar workshops?",
      answer: "Sim, o espaço recebe workshops e encontros criativos.",
    },
    {
      question: "O estacionamento está incluso?",
      answer: "Sim, há estacionamento no local.",
    },
    {
      question: "Como consultar datas disponíveis?",
      answer: "Fale com a gente pelo WhatsApp — é o canal mais rápido para checar a agenda.",
    },
    {
      question: "Como funciona cancelamento ou reagendamento?",
      answer:
        "Condições de cancelamento e reagendamento são combinadas na confirmação da reserva. Confirme os detalhes diretamente pelo WhatsApp.",
    },
  ],
};

export const booking = {
  kicker: "Reserva",
  title: "Seu próximo projeto pode começar aqui.",
  body: "Conte pra gente o que você quer criar e consulte as datas disponíveis.",
  ctaBooking: "Reservar pelo WhatsApp",
  ctaQuestion: "Tirar dúvidas",
};

export const footer = {
  tagline: "Um espaço para criar.",
  rights: "Todos os direitos reservados.",
};

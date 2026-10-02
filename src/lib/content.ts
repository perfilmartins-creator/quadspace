// Copy do site. Dados de marca/contato ficam em src/config/site.ts.

export const hero = {
  eyebrow: "Estúdio & espaço para criação — Recife",
  headline: ["Suas ideias", "encontraram", "um lugar."],
  body: "Estúdio em Recife para fotografia, vídeo, conteúdo, campanhas, workshops e projetos criativos.",
  priceHint: "Locações a partir de R$ 90.",
  ctaPrimary: { label: "Ver valores", href: "#valores" },
  ctaSecondary: { label: "Reservar horário", href: "#reserva" },
  image: {
    src: "/hero/hero.jpg",
    alt: "Vista geral do estúdio QUAD SPACE, com softboxes, fundo infinito e a sala de apoio ao fundo",
  },
};

export const structure = {
  kicker: "Estrutura",
  title: "Tudo que entra em cena.",
  subtitle:
    "Equipamentos, fundos e espaços de apoio disponíveis para a sua produção.",
  intro:
    "Uma estrutura compacta, flexível e pronta para receber ensaios, campanhas, vídeos, conteúdo e workshops — na Av. Conselheiro Aguiar, no Pina.",
};

export const pricing = {
  kicker: "Valores",
  title: "Seu tempo. Seu projeto. Seu espaço.",
  body: "Escolha o período que faz sentido para a sua produção. Quanto mais horas, menor o valor por hora.",
  highlight: "A partir de R$ 90.",
  featuredLabel: "Mais escolhido",
  ctaPlan: "Reservar este período",
  note: "Consulte disponibilidade, condições de reserva e períodos adicionais pelo WhatsApp.",
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
  items: [
    {
      label: "Sala de apoio",
      src: "/gallery/gallery-01.jpg",
      ratio: "portrait" as const,
    },
    {
      label: "Estúdio — luz e fundo infinito",
      src: "/gallery/gallery-02.jpg",
      ratio: "landscape" as const,
    },
    {
      label: "Setup de iluminação",
      src: "/gallery/gallery-03.jpg",
      ratio: "landscape" as const,
    },
    {
      label: "Identidade QUAD no espaço",
      src: "/gallery/gallery-04.jpg",
      ratio: "portrait" as const,
    },
    {
      label: "Detalhe — marca QUAD",
      src: "/gallery/gallery-05.jpg",
      ratio: "square" as const,
    },
    {
      label: "Detalhe — softbox aceso",
      src: "/gallery/gallery-06.jpg",
      ratio: "landscape" as const,
    },
    {
      label: "Vista geral — sofá e identidade QUAD",
      src: "/gallery/gallery-07.jpg",
      ratio: "portrait" as const,
    },
    {
      label: "Fundo infinito e identidade QUAD",
      src: "/gallery/gallery-08.jpg",
      ratio: "portrait" as const,
    },
    {
      label: "Setup de iluminação — outro ângulo",
      src: "/gallery/gallery-09.jpg",
      ratio: "landscape" as const,
    },
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
      question: "Qual é o valor da locação?",
      answer:
        "As locações começam em R$ 90 por uma hora. Também oferecemos períodos maiores com desconto progressivo. Consulte a tabela de valores ou fale com a gente pelo WhatsApp.",
    },
    {
      question: "Existem descontos para períodos maiores?",
      answer:
        "Sim. O valor médio por hora diminui nos planos com maior duração. Os valores atualizados estão disponíveis na seção de preços.",
    },
    {
      question: "Quais equipamentos estão disponíveis?",
      answer:
        "Iluminação Godox, Nanlite e Sokani, softboxes Triopo e tripés de aço inox. A lista completa está na seção Estrutura.",
    },
    {
      question: "Os equipamentos estão inclusos na locação?",
      answer: "Sim, todos os equipamentos listados na seção Estrutura estão inclusos no valor da locação.",
    },
    {
      question: "Quais fundos estão disponíveis?",
      answer: "O estúdio conta com fundo branco, fundo preto e tecido marrom.",
    },
    {
      question: "O estúdio possui ar-condicionado?",
      answer: "Sim, o ambiente é climatizado.",
    },
    {
      question: "O espaço possui Wi-Fi?",
      answer: "Sim, Wi-Fi disponível durante toda a locação.",
    },
    {
      question: "O estúdio oferece café e água?",
      answer: "Sim. Café e água ficam disponíveis durante a locação.",
    },
    {
      question: "Existe estacionamento no local?",
      answer: "Sim, há estacionamento no local.",
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
      question: "O espaço serve para gravação de vídeo?",
      answer:
        "Sim. A estrutura atende tanto fotografia quanto produções em vídeo, incluindo videoclipes e entrevistas.",
    },
    {
      question: "É possível realizar workshops?",
      answer: "Sim, o espaço recebe workshops e encontros criativos.",
    },
    {
      question: "Como consultar disponibilidade?",
      answer: "Fale com a gente pelo WhatsApp — é o canal mais rápido para checar a agenda.",
    },
    {
      question: "Como funcionam cancelamento e reagendamento?",
      answer:
        "As condições de cancelamento e reagendamento devem ser confirmadas no momento da reserva pelo WhatsApp.",
    },
  ],
};

export const booking = {
  kicker: "Reserva",
  title: "Seu próximo projeto pode começar aqui.",
  body: "Escolha o período, consulte a data e fale diretamente com a QUAD.",
  highlight: "A partir de R$ 90.",
  dateLabel: "Data desejada",
  timeLabel: "Horário",
  ctaBooking: "Reservar pelo WhatsApp",
  ctaQuestion: "Tirar dúvidas",
  paymentTerms: "50% do valor confirma a reserva. O restante é pago no dia.",
};

export const footer = {
  tagline: "Um espaço para criar.",
  rights: "Todos os direitos reservados.",
};

export const game = {
  title: "QUAD BOUNCE",
  description:
    "Minigame da QUAD SPACE: toque para criar plataformas e leve a bola o mais alto que conseguir.",
  brand: "QUAD",
  name: "BOUNCE",
  tagline: "Toque para criar plataformas.\nSuba o mais alto que conseguir.",
  play: "JOGAR",
  playAgain: "JOGAR NOVAMENTE",
  gameOver: "GAME OVER",
  score: "SCORE",
  best: "BEST",
  newBest: "NOVO RECORDE",
  personalBest: "Seu recorde:",
  hint: "Toque na tela para criar uma plataforma",
  paused: "PAUSADO",
  resume: "Toque para continuar",
  backToSite: "quadspace.com.br",
};

export const crew = {
  name: "AMOUNG QUAD",
  shortName: "QUAD CREW",
  description:
    "Jogo multiplayer de dedução social da QUAD SPACE: entre numa sala com seus amigos, cumpra tarefas pelo estúdio e descubra o infiltrado.",
  tagline: "Dedução social na QUAD. Cada um no seu celular, todos na mesma sala.",
};

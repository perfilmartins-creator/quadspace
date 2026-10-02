# QUAD SPACE — Website

Site institucional da QUAD SPACE, estúdio e espaço para criação (fotografia,
vídeo, campanhas, produção de conteúdo, direção de arte e workshops) em
Recife, PE.

> "Suas ideias encontraram um lugar."

## Stack

- [Next.js 16](https://nextjs.org) (App Router)
- TypeScript
- Tailwind CSS v4
- Framer Motion (revelação de conteúdo ao rolar a página)

## Desenvolvimento local

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

Outros comandos:

```bash
npm run lint         # ESLint
npx tsc --noEmit     # checagem de tipos
npm run build        # build de produção
npm run start        # serve o build de produção
```

## Estrutura do projeto

```
src/
  app/
    layout.tsx          # fontes, metadata/SEO, JSON-LD, viewport
    page.tsx             # composição das seções da home
    privacidade/         # página de política de privacidade
    game/                # minigame QUAD BOUNCE (/game)
    game/crew/           # AMOUNG QUAD — multiplayer de dedução social (/game/crew)
    globals.css          # design tokens (Tailwind v4 @theme)
    sitemap.ts / robots.ts
  config/
    site.ts               # marca, endereço, contato, WhatsApp, Maps, nav
  components/
    Header.tsx / Footer.tsx
    sections/              # Hero, Space, Structure, Possibilities, Gallery,
                            # Location, FAQ, Booking
    ui/                     # Reveal (animação), Placeholder (imagem placeholder)
    game/                   # QUAD BOUNCE: engine (física), renderer (canvas),
                            # config (ajustes de dificuldade), QuadBounce (UI)
  lib/
    content.ts               # todo o copy do site
```

## Conteúdo, contato e placeholders

- **Dados de marca e contato** (endereço, e-mail, Instagram, WhatsApp, link
  do Google Maps) ficam centralizados em `src/config/site.ts`. Campos ainda
  não confirmados estão marcados com `// PLACEHOLDER` — preencha antes de
  publicar.
- **Copy de cada seção** (títulos, textos, perguntas do FAQ) fica em
  `src/lib/content.ts`.
- **Fotos**: Hero e Galeria já usam fotos reais do estúdio (`public/hero/`,
  `public/gallery/`). Só a seção Localização ainda usa o componente
  `Placeholder` (`src/components/ui/Placeholder.tsx`), esperando uma foto de
  fachada/entrada. Ver `public/gallery/README.md` para nomes de arquivo,
  proporções e onde trocar cada imagem.
- **Reserva** funciona por WhatsApp: os botões da seção "Reserva" abrem
  `https://wa.me/<numero>?text=...` usando `contact.whatsappNumber` e as
  mensagens padrão definidas em `src/config/site.ts`. Enquanto o número não
  for preenchido, os botões caem para `mailto:` como alternativa segura (para
  não enviar mensagens a um número de terceiros por engano).

## AMOUNG QUAD (`/game/crew`)

Jogo multiplayer de dedução social. O cliente fica neste app Next.js; o
servidor de tempo real é um processo Node + WebSocket separado, autoritativo
(papéis, eliminações, votos, tarefas e vitória são decididos no servidor).

```
server/crew/index.ts       # servidor WebSocket (salas, senhas com scrypt, limites)
server/crew/room.ts        # regras do jogo
server/crew/smoke-test.ts  # teste ponta a ponta com vários clientes
src/lib/crew/              # mapa da QUAD, colisão/visão e protocolo (compartilhados)
src/components/crew/       # cliente: canvas, HUD, reunião, tarefas, sons
```

Rodar localmente (dois terminais):

```bash
npm run crew:server   # ws://localhost:3030
npm run dev           # http://localhost:3000/game/crew
```

Teste do servidor: `PORT=3031 npm run crew:server` e, em outro terminal,
`CREW_URL=ws://localhost:3031 npx tsx server/crew/smoke-test.ts`.

Em produção o cliente conecta em `NEXT_PUBLIC_CREW_SERVER_URL` (ex.:
`wss://quad-crew.onrender.com`). Ver DEPLOY.md.

## Deploy

Veja [DEPLOY.md](./DEPLOY.md) para o passo a passo de publicação (Vercel +
domínio `quadspace.com.br` via Hostinger).

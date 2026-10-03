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
server/crew/hub.ts         # salas, senhas (scrypt), limites e roteamento de mensagens
server/crew/room.ts        # estados da sala (lobby → countdown → playing → meeting → ended) e regras
server/crew/modes.ts       # regras por modo: Clássico, Esconde-esconde, Infecção
server/crew/lobby.ts       # lobby jogável: física da bola (autoritativa), missões
server/crew/smoke-test.ts  # teste ponta a ponta do modo clássico (vários clientes)
server/crew/lobby-test.ts  # teste do lobby, bola, READY, modos, AFK e troca de host
src/lib/crew/              # mapas (partida e lobby), modos, missões, colisão e protocolo
src/components/crew/       # cliente: canvas, HUD minimalista, painéis, reunião, tarefas, sons
```

Fluxo: o lobby é um mapa jogável (bola com gols e placar, Safe Zone, Ready Zone,
missões, emotes, totens de modo/configuração e o Júlio, a cabra). O host escolhe o
modo e as configurações (com presets), todos ficam READY, a contagem de 5 s roda no
próprio lobby (cancelável) e a partida começa sem recarregar a página. No fim, todos
voltam ao mesmo lobby com a bola resetada e as configurações mantidas.

Rodar localmente (dois terminais):

```bash
npm run crew:server   # ws://localhost:3030
npm run dev           # http://localhost:3000/game/crew
```

Testes do servidor: `PORT=3031 npm run crew:server` e, em outro terminal,
`CREW_URL=ws://localhost:3031 npx tsx server/crew/smoke-test.ts`. Para o lobby,
suba o servidor com `CREW_AFK_MS=4000 CREW_AFK_SAFE_MS=7000` e rode
`CREW_URL=ws://localhost:3031 npx tsx server/crew/lobby-test.ts`.

Em produção o cliente conecta em `NEXT_PUBLIC_CREW_SERVER_URL` (ex.:
`wss://quad-crew.onrender.com`). Ver DEPLOY.md.

## Deploy

Veja [DEPLOY.md](./DEPLOY.md) para o passo a passo de publicação (Vercel +
domínio `quadspace.com.br` via Hostinger).

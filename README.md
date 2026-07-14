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
    globals.css          # design tokens (Tailwind v4 @theme)
    sitemap.ts / robots.ts
  config/
    site.ts               # marca, endereço, contato, WhatsApp, Maps, nav
  components/
    Header.tsx / Footer.tsx
    sections/              # Hero, Space, Structure, Possibilities, Gallery,
                            # Location, FAQ, Booking
    ui/                     # Reveal (animação), Placeholder (imagem placeholder)
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
- **Fotos** ainda não existem — o componente `Placeholder`
  (`src/components/ui/Placeholder.tsx`) renderiza um bloco identificado com a
  etiqueta "Placeholder" e uma legenda descrevendo qual foto deve entrar ali.
  Ver `public/gallery/README.md` para nomes de arquivo, proporções e onde
  trocar `<Placeholder />` por `next/image` em cada componente.
- **Reserva** funciona por WhatsApp: os botões da seção "Reserva" abrem
  `https://wa.me/<numero>?text=...` usando `contact.whatsappNumber` e as
  mensagens padrão definidas em `src/config/site.ts`. Enquanto o número não
  for preenchido, os botões caem para `mailto:` como alternativa segura (para
  não enviar mensagens a um número de terceiros por engano).

## Deploy

Veja [DEPLOY.md](./DEPLOY.md) para o passo a passo de publicação (Vercel +
domínio `quadspace.com.br` via Hostinger).

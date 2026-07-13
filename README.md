# QUAD SPACE — Website

Site institucional da QUAD SPACE, estúdio e espaço para criação (fotografia, audiovisual, campanhas, produção de conteúdo, direção de arte e workshops).

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
npm run lint    # ESLint
npm run build   # build de produção
npm run start   # serve o build de produção
```

## Estrutura do projeto

```
src/
  app/
    layout.tsx       # fontes, metadata/SEO, viewport
    page.tsx          # composição das seções da home
    globals.css        # design tokens (Tailwind v4 @theme)
    sitemap.ts / robots.ts
  components/
    Header.tsx / Footer.tsx
    sections/          # Hero, Manifesto, Space, Structure, Gallery, FAQ, Booking
    ui/                 # Reveal (animação), Placeholder (imagem placeholder)
  lib/
    content.ts          # todo o copy do site em um único lugar
```

## Conteúdo e placeholders

Todo o texto do site está centralizado em `src/lib/content.ts`. Campos marcados
com `// PLACEHOLDER` (endereço, metragem, telefone etc.) precisam ser
confirmados/substituídos pelos dados reais da QUAD SPACE antes de publicar.

As imagens ainda não existem — o componente `Placeholder`
(`src/components/ui/Placeholder.tsx`) renderiza um bloco identificado com a
etiqueta "Placeholder" e uma legenda descrevendo qual foto deve entrar ali.
Para substituir por fotos reais, troque o uso de `<Placeholder />` por
`next/image` apontando para o arquivo em `public/`.

O formulário de "Reserva" não tem backend: ao enviar, ele monta um link
`mailto:` com os dados preenchidos e abre o cliente de e-mail do usuário. Se
quiser um formulário com envio direto (ex.: Resend, Formspree, API route
própria), é só trocar o `handleSubmit` em
`src/components/sections/Booking.tsx`.

## Deploy

Veja [DEPLOY.md](./DEPLOY.md) para o passo a passo de publicação (GitHub +
Vercel).

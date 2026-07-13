# Deploy — QUAD SPACE

## 1. GitHub

Este repositório já está versionado. Para publicar em produção a partir de um
branch estável:

1. Abra um Pull Request do branch de desenvolvimento para `main` (ou o branch
   padrão do repositório).
2. Revise o diff e faça o merge.

Se ainda não existir remote configurado localmente:

```bash
git remote add origin git@github.com:<owner>/<repo>.git
git push -u origin main
```

## 2. Vercel

O projeto é um Next.js padrão — não exige configuração extra.

### Opção A — pelo dashboard (recomendado)

1. Acesse [vercel.com/new](https://vercel.com/new).
2. Importe o repositório `quadspace` (ou `quad-space-website`) do GitHub.
3. Framework Preset: **Next.js** (detectado automaticamente).
4. Build Command: `next build` (padrão).
5. Output: gerenciado automaticamente pelo preset Next.js.
6. Clique em **Deploy**.

Cada push para `main` gera um deploy de produção automático; pushes em outros
branches geram Preview Deployments.

### Opção B — pela CLI

```bash
npm i -g vercel
vercel login
vercel        # cria o projeto e faz um deploy de preview
vercel --prod # deploy de produção
```

## 3. Antes de publicar em produção

- [ ] Substituir todos os campos marcados como `PLACEHOLDER` em
      `src/lib/content.ts` (endereço, telefone, metragem etc.) pelos dados
      reais da QUAD SPACE.
- [ ] Substituir os blocos `<Placeholder />` pelas fotos reais do espaço
      (`next/image`).
- [ ] Adicionar um arquivo `public/og-image.jpg` (1200×630) para as prévias em
      redes sociais — referenciado em `src/app/layout.tsx`.
- [ ] Confirmar o domínio final e atualizar `siteUrl` em
      `src/app/layout.tsx`, `src/app/sitemap.ts` e `src/app/robots.ts`.
- [ ] Configurar o domínio próprio (ex. `quadspace.com.br`) em
      **Vercel → Project Settings → Domains**.
- [ ] Decidir o destino real do formulário de "Reserva" (hoje ele abre um
      `mailto:` — ver README).

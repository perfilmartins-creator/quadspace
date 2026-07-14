# Imagens do site — guia de substituição

Todas as fotos do site hoje são blocos `<Placeholder />` (cinza, com legenda).
Quando as fotos reais estiverem prontas, salve os arquivos nesta pasta
(`public/gallery/`) — ou em `public/hero/` e `public/location/` conforme
indicado abaixo — seguindo os nomes e proporções sugeridos, depois troque o
componente `<Placeholder />` pelo componente `next/image` do Next.js no
arquivo correspondente.

## Formato recomendado

- Prefira `.jpg` ou `.webp` (o Next.js já converte automaticamente para
  AVIF/WebP em produção via `next/image`, então o arquivo de origem pode ser
  `.jpg`).
- Comprima antes de subir (ex. Squoosh, ImageOptim) — alvo: menos de 300 KB
  por imagem.
- Não é necessário gerar múltiplos tamanhos manualmente; `next/image` faz o
  `srcset` automaticamente a partir de um arquivo grande o bastante (largura
  mínima recomendada: 2000px no lado maior).

## Hero — `public/hero/hero.jpg`

- Proporção: paisagem larga (ideal 16:9 a 21:9)
- Dimensão mínima: 2400×1350px
- Onde trocar: `src/components/sections/Hero.tsx`, substituir
  `<Placeholder label="QUAD SPACE — Vista geral do estúdio" ... />` por
  `<Image src="/hero/hero.jpg" alt="Vista geral do estúdio QUAD SPACE" ... />`

## Localização — `public/location/location.jpg`

- Proporção: paisagem (4:3)
- Dimensão mínima: 1600×1200px
- Conteúdo sugerido: fachada do prédio ou foto do bairro/entrada
- Onde trocar: `src/components/sections/Location.tsx`

## Galeria — `public/gallery/`

A seção Galeria usa 6 imagens com proporções variadas (grid editorial, não
todas iguais). Nomes sugeridos e proporção de cada posição, na ordem em que
aparecem em `src/lib/content.ts` (`gallery.items`):

| Arquivo sugerido       | Legenda atual              | Proporção        | Dimensão mínima |
| ---------------------- | --------------------------- | ---------------- | --------------- |
| `gallery-01.jpg`        | Estúdio — Fotografia         | retrato (3:4)     | 1200×1600px     |
| `gallery-02.jpg`        | Estúdio — Vídeo               | paisagem (4:3)    | 1600×1200px     |
| `gallery-03.jpg`        | Sala de apoio                | paisagem (4:3)    | 1600×1200px     |
| `gallery-04.jpg`        | Produção de campanha         | retrato (3:4)     | 1200×1600px     |
| `gallery-05.jpg`        | Detalhe — Iluminação          | quadrada (1:1)    | 1400×1400px     |
| `gallery-06.jpg`        | Backstage                    | paisagem (4:3)    | 1600×1200px     |

Para trocar: em `src/components/sections/Gallery.tsx`, cada item do array
`gallery.items` (definido em `src/lib/content.ts`) vira um `<Placeholder />`.
Adicione um campo `src` a cada item e renderize `<Image src={item.src} .../>`
no lugar de `<Placeholder />`, mantendo o `alt` com a legenda (`item.label`).

## Acessibilidade e performance

- Toda imagem precisa de `alt` descritivo (não deixe `alt=""` a menos que a
  imagem seja puramente decorativa).
- Use `loading="lazy"` (padrão do `next/image` fora da primeira dobra) e
  marque a imagem do Hero com `priority` para evitar layout shift.
- Sempre informe `width`/`height` (ou `fill` com contêiner de proporção
  fixa, como já fazem os componentes `Placeholder`) para não gerar CLS.

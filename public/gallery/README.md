# Imagens do site — guia de substituição

O Hero e a Galeria já usam fotos reais do estúdio (de `FOTOS ESPAÇO/` no
Google Drive/iCloud da QUAD). A única seção que ainda usa `<Placeholder />`
é **Localização**, que precisa de uma foto de fachada/entrada — não incluída
no lote atual de fotos (todas são do interior do estúdio).

Para trocar qualquer foto por uma nova versão, salve o arquivo em
`public/hero/`, `public/gallery/` ou `public/location/` seguindo os nomes
abaixo e os componentes já vão pegá-la (basta manter o mesmo nome de
arquivo, ou atualizar o campo `src` correspondente em `src/lib/content.ts`).

## Formato recomendado

- Prefira `.jpg` ou `.webp` (o Next.js já converte automaticamente para
  AVIF/WebP em produção via `next/image`, então o arquivo de origem pode ser
  `.jpg`).
- Comprima antes de subir (ex. Squoosh, ImageOptim) — alvo: menos de 300 KB
  por imagem.
- Não é necessário gerar múltiplos tamanhos manualmente; `next/image` faz o
  `srcset` automaticamente a partir de um arquivo grande o bastante (largura
  mínima recomendada: 2000px no lado maior).

## Hero — `public/hero/hero.jpg` ✅ já usa foto real

- Proporção: paisagem larga (ideal 16:9 a 21:9)
- Onde trocar: `hero.image.src` em `src/lib/content.ts`

## Localização — `public/location/location.jpg` — PENDENTE

- Proporção: paisagem (4:3)
- Dimensão mínima: 1600×1200px
- Conteúdo sugerido: fachada do prédio ou foto do bairro/entrada
- Onde trocar: `src/components/sections/Location.tsx` (troca o bloco
  `<Placeholder />` por `<Image src="/location/location.jpg" ... />`)

## Galeria — `public/gallery/` ✅ já usa fotos reais

6 imagens com proporções variadas (grid editorial, não todas iguais):

| Arquivo             | Conteúdo                     | Proporção      |
| ------------------- | ----------------------------- | --------------- |
| `gallery-01.jpg`     | Sala de apoio                  | retrato (3:4)    |
| `gallery-02.jpg`     | Estúdio — luz e fundo infinito | paisagem (4:3)   |
| `gallery-03.jpg`     | Setup de iluminação            | paisagem (4:3)   |
| `gallery-04.jpg`     | Identidade QUAD no espaço      | retrato (3:4)    |
| `gallery-05.jpg`     | Detalhe — marca QUAD           | quadrada (1:1)   |
| `gallery-06.jpg`     | Detalhe — softbox aceso        | paisagem (4:3)   |

Para trocar: edite o array `gallery.items` em `src/lib/content.ts` (campos
`src`, `label`, `ratio`) — `src/components/sections/Gallery.tsx` já
renderiza qualquer item desse array via `next/image`.

## Marca — `public/brand/`

Recortes da marca de estrelas (`MARCA/ESTRELAS PRETO.png` e
`ESTRELAS BRANCO.png` originais), já cortados sem a margem em branco:

- `estrelas-preto.png` / `estrelas-branco.png` — versão retangular, usada
  inline no Header e Footer.
- `estrelas-square.png` — versão com padding quadrado, usada no favicon
  (`icon.tsx`) e apple-icon.

Os arquivos de logo completos ("QUAD ESTÚDIO", com a palavra) não são
usados no site — o nome visível é "QUAD SPACE", conforme domínio
`quadspace.com.br`; ver decisão registrada na conversa.

## Acessibilidade e performance

- Toda imagem precisa de `alt` descritivo (não deixe `alt=""` a menos que a
  imagem seja puramente decorativa).
- Use `loading="lazy"` (padrão do `next/image` fora da primeira dobra) e
  marque a imagem do Hero com `priority` para evitar layout shift.
- Sempre informe `width`/`height` (ou `fill` com contêiner de proporção
  fixa) para não gerar CLS. No mobile (grid de 1 coluna), os itens da
  Galeria dependem de uma classe `aspect-*` explícita — se adicionar novos
  itens, mantenha o mapeamento em `aspectClasses` (`Gallery.tsx`).

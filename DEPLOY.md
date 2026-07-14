# Deploy — QUAD SPACE

## 1. GitHub

Este repositório já está versionado. Para publicar em produção a partir de um
branch estável:

1. Abra um Pull Request do branch de desenvolvimento para `main` (ou o branch
   padrão do repositório).
2. Revise o diff e faça o merge.

## 2. Vercel — importar o projeto

1. Acesse [vercel.com/new](https://vercel.com/new) e conecte sua conta
   GitHub, se ainda não estiver conectada.
2. Importe o repositório `quadspace`.
3. Framework Preset: **Next.js** (detectado automaticamente).
4. Build Command: `next build` (padrão) — não é necessário alterar nada.
5. Clique em **Deploy**.

Cada push para `main` gera um deploy de produção automático; pushes em outros
branches geram Preview Deployments.

### Pela CLI (alternativa)

```bash
npm i -g vercel
vercel login
vercel        # cria o projeto e faz um deploy de preview
vercel --prod # deploy de produção
```

## 3. Domínio — apontar quadspace.com.br (Hostinger → Vercel)

O domínio é registrado na Hostinger. A aplicação roda na Vercel. Passos:

### 3.1. Adicionar o domínio no projeto Vercel

1. No projeto, vá em **Settings → Domains**.
2. Adicione `quadspace.com.br` como domínio principal.
3. Adicione também `www.quadspace.com.br` e configure como **redirect** para
   `quadspace.com.br` (a Vercel oferece essa opção automaticamente na tela de
   Domains — escolha "Redirect to quadspace.com.br").
4. A Vercel vai mostrar os registros DNS exatos que espera (eles podem variar
   ligeiramente por conta/região — sempre confira o valor mostrado na tela de
   Domains, os abaixo são os valores padrão atuais da Vercel):
   - **Domínio raiz (`quadspace.com.br`)**: registro `A` apontando para
     `76.76.21.21`
   - **Subdomínio `www`**: registro `CNAME` apontando para
     `cname.vercel-dns.com`

### 3.2. Configurar DNS na Hostinger

1. Acesse **Hostinger → Domínios → quadspace.com.br → DNS / Nameservers**.
2. **Não apague registros existentes de e-mail** (`MX`, `SPF`/`TXT`,
   `DKIM`, `DMARC`) — eles não têm relação com o site e precisam continuar
   ativos para que e-mails do domínio continuem funcionando.
3. Se já existir um registro `A` ou `CNAME` para `@` (raiz) ou `www`
   apontando para outro lugar (ex. hospedagem compartilhada antiga da
   Hostinger), esse é o conflito — edite (não apenas adicione) esses
   registros para os valores da Vercel:
   - Tipo `A`, Nome `@`, Valor `76.76.21.21`
   - Tipo `CNAME`, Nome `www`, Valor `cname.vercel-dns.com`
4. Salve. Propagação de DNS costuma levar de alguns minutos a 24-48h.

### 3.3. Validar SSL

- A Vercel emite certificado SSL automaticamente (Let's Encrypt) assim que o
  DNS propaga e o domínio é verificado — não é preciso fazer nada manual.
- Em **Settings → Domains**, o status ao lado do domínio muda para
  "Valid Configuration" com um cadeado quando o SSL está ativo.
- Se ficar em "Invalid Configuration" por mais de algumas horas, confira se o
  registro DNS na Hostinger está exatamente igual ao exigido pela Vercel.

### 3.4. Verificar propagação DNS

```bash
dig quadspace.com.br A +short
dig www.quadspace.com.br CNAME +short
```

Ou use [dnschecker.org](https://dnschecker.org) para ver a propagação por
região. O valor retornado deve bater com o configurado na Hostinger.

### 3.5. Testar o redirecionamento do www

Depois que o DNS propagar:

```bash
curl -I https://www.quadspace.com.br
```

O `Location` da resposta (redirect 3xx) deve apontar para
`https://quadspace.com.br`. Também confira manualmente no navegador.

### 3.6. Remover conflitos com registros antigos

Se o domínio hoje aponta para hospedagem compartilhada da Hostinger (site
antigo) ou outro provedor:

- Identifique os registros `A`/`AAAA`/`CNAME` de `@` e `www` que apontam para
  o IP/host antigo.
- Substitua (não delete tudo às cegas) apenas esses registros pelos valores
  da Vercel acima.
- Não delete zonas DNS inteiras nem registros que você não reconhece — se
  houver dúvida sobre o que um registro faz, confirme antes de remover.

## 4. Antes de publicar em produção

- [ ] Preencher `contact.whatsappNumber` em `src/config/site.ts` com o número
      oficial de WhatsApp (formato `55DDDNUMERO`, só dígitos).
- [ ] Confirmar `contact.email` e `contact.instagramHandle`/`instagramUrl`
      em `src/config/site.ts`.
- [ ] Preencher `contact.mapsUrl` em `src/config/site.ts` com o link oficial
      do Google Maps (Google Maps → Compartilhar → Copiar link).
- [ ] Hero e Galeria já usam fotos reais do estúdio. Falta apenas uma foto
      de fachada/entrada para a seção Localização (`public/location/`) —
      ver `public/gallery/README.md`.
- [ ] Configurar o domínio `quadspace.com.br` + redirect de `www` na Vercel
      (seção 3 acima).
- [ ] Rodar `npm run lint`, `npx tsc --noEmit` e `npm run build` uma última
      vez antes do merge para `main`.

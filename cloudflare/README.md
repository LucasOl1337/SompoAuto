# Cloudflare Deploy (Sem Quebrar o Backend Atual)

Este diretório adiciona uma camada Cloudflare em paralelo:

- `frontend` em **Cloudflare Pages**
- `api-gateway` em **Cloudflare Workers**
- backend Python atual continua igual (pode ficar em qualquer origem HTTP)

Assim voce evita refatoracao arriscada agora e preserva escalabilidade para migrar depois para D1/R2.

## 1) API Gateway Worker

Diretorio: `cloudflare/api-gateway`

Comandos:

```bash
cd cloudflare/api-gateway
npm install
npx wrangler login
npx wrangler secret put BACKEND_ORIGIN
npm run deploy
```

No `BACKEND_ORIGIN`, informe a URL publica do backend atual (ex.: `https://seu-backend.exemplo.com`).

## 2) Frontend no Pages

No Cloudflare Pages:

- Project: repo `LucasOl1337/SompoAuto`
- Root directory: `frontend`
- Build command: `npm ci && npm run build`
- Build output directory: `dist`
- Environment variable:
  - `VITE_API_BASE_URL=https://<url-do-worker-gateway>`

## 3) Validacao rapida

Depois do deploy:

- `GET <worker-url>/health`
- Abrir o frontend do Pages
- Confirmar carregamento de `Runs`, `Run Detail`, `Portfolio Overview` e `Hourly Reports`

## Proxima fase (100% Cloudflare-native)

Quando quiser remover dependencia do backend externo:

- Banco em D1
- Artefatos em R2
- Logica de orquestracao diretamente no Worker

Essa fase pode ser feita sem quebra, mantendo as mesmas rotas HTTP.

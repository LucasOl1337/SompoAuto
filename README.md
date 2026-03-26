# SOMPO Agentic Prototype

Base do primeiro prototipo agentico com:

- OpenClaw como runtime central via adapter local
- backend Python/FastAPI
- painel tecnico em React/TypeScript
- PostgreSQL para persistencia
- MinIO para artifacts
- Docker Compose para rodar em Windows, WSL ou Linux

## Subir com Docker

```bash
cp .env.example .env
docker compose up --build
```

Servicos:

- frontend: http://localhost:5173
- backend: http://localhost:8000
- minio console: http://localhost:9001

## Subir local com um comando

Pela raiz do projeto:

```bash
npm run dev
```

Isso encerra qualquer processo antigo nas portas `8000` e `5173` e abre backend e frontend em duas janelas visiveis no Windows.

Comandos uteis na raiz:

```bash
npm run build
npm run lint
npm run dev:stop
```

## Modo de runtime

Por padrao, o projeto sobe em `OPENCLAW_RUNTIME_MODE=mock`.

Para tentar usar OpenClaw de verdade:

```bash
OPENCLAW_RUNTIME_MODE=auto
OPENAI_API_KEY=...
docker compose up --build
```

## Demo rapida

1. Abra `Scenario Upload`
2. Use o preset `Baixo risco` ou `Alto risco`
3. Opcionalmente anexe uma imagem para acionar o `Vision Agent` stub
4. Inicie o run
5. Acompanhe a timeline em `Run Detail`
6. Gere o consolidado em `Hourly Reports`

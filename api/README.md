# Artify AI API

Cloudflare Worker compartilhado entre React e Flutter.

```bash
npm install
npx wrangler dev
```

Deploy: `npx wrangler deploy`.

A rota `GET /health` verifica disponibilidade. `POST /generate` valida a solicitação e responde `501` até que um provedor real seja implementado e configurado. Não há geração simulada. Configure segredos com `wrangler secret put NOME`, nunca no frontend.

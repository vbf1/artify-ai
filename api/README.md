# Artify AI API

API compartilhada entre React e Flutter, executada em Cloudflare Workers com Workers AI.

## Desenvolvimento local

```bash
npm install
npx wrangler dev
```

## Publicação

1. Crie ou acesse uma conta Cloudflare e confirme que Workers AI está disponível no plano Free.
2. No painel Cloudflare, associe Workers AI ao Worker ou publique com Wrangler autenticado.
3. Execute `npx wrangler deploy`.
4. Configure `VITE_API_BASE_URL` na compilação web com a URL do Worker.
5. Configure a mesma URL em `mobile/lib/config.dart` para o Flutter.

O binding `AI` usa `@cf/runwayml/stable-diffusion-v1-5-img2img`. A rota `POST /generate` processa as imagens sequencialmente e devolve somente imagens efetivamente retornadas pelo modelo. A cota gratuita atual é limitada; não existe fallback pago automático.

## Limitações importantes

O modelo img2img altera a imagem inteira e não garante preservação perfeita do produto. O prompt e a intensidade baixa tentam manter forma, cores e componentes, mas é obrigatório revisar cada resultado. O modelo está em beta e a disponibilidade pode variar.

A API aceita JPG, PNG e WEBP até 10 MB. Não coloque tokens Cloudflare no frontend. O Worker usa binding de IA e não precisa expor credenciais de conta no navegador.

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

A rota `POST /generate` usa o modelo `@cf/black-forest-labs/flux-2-klein-4b` pela REST API oficial da Cloudflare, enviando a referência como `multipart/form-data` no campo binário `input_image_0`. Esse modelo unifica geração e edição, aceita até quatro imagens de referência e exige que cada imagem de entrada tenha dimensões inferiores a 512×512. Por isso, os clientes Web e Android redimensionam a foto antes do envio. A API processa as saídas sequencialmente e só devolve imagens efetivamente retornadas pelo modelo.

## Limitações importantes

O modelo img2img altera a imagem inteira e não garante preservação perfeita do produto. O prompt e a intensidade baixa tentam manter forma, cores e componentes, mas é obrigatório revisar cada resultado. O modelo FLUX.2 Klein 4B é cobrado por imagem de entrada e saída em Neurons. A alocação gratuita de Workers AI é de 10.000 Neurons por dia; ela é compartilhada pela conta e pode acabar conforme o uso. Não há upgrade ou fallback pago automático. Consulte o painel de uso e a página oficial de preços antes de ampliar o volume.

A API aceita JPG, PNG e WEBP até 10 MB. A referência é redimensionada pelos clientes para ficar abaixo de 512×512, limite documentado para imagens de entrada do modelo. As imagens finais são solicitadas em 1440×1440 (1:1), 1080×1350 (4:5) ou 1920×1080 (16:9), dentro do limite máximo de 1920 px por dimensão. O modelo 4B usa inferência destilada fixa em 4 passos; a resolução maior aumenta o consumo de cota. A qualidade final depende também da foto de referência e o modelo não garante preservação pixel a pixel do produto. A interface oferece 16 cenários prontos e um campo de cenário personalizado de até 160 caracteres. Não coloque tokens Cloudflare no frontend. O Worker usa binding de IA e não precisa expor credenciais de conta no navegador.

## Publicação automatizada pelo GitHub

Configure os seguintes **Secrets** no repositório (Settings → Secrets and variables → Actions):
- `CLOUDFLARE_API_TOKEN`: token restrito à conta, com permissões para editar Workers Scripts e acessar Workers AI.
- `CLOUDFLARE_ACCOUNT_ID`: identificador da conta Cloudflare.

Depois, execute manualmente o workflow **Deploy Artify AI API** na aba Actions.

Adicione também a variável de repositório `VITE_API_BASE_URL` com a URL HTTPS do Worker (Settings → Secrets and variables → Actions → Variables). O workflow do GitHub Pages injeta essa variável no build web.

Não use tokens com permissão global nem compartilhe esses valores no chat.

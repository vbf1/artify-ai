const allowedScenes = new Set(['Festa infantil','Escola','Parque','Espaço de eventos','Quintal','Evento comunitário','Área de lazer','Cenário clean','Salão de festas','Buffet infantil','Brinquedoteca','Condomínio','Clube','Jardim','Evento ao ar livre','Estúdio profissional']);
const allowedFormats = new Set(['1:1','4:5','16:9']);
const allowedTypes = new Set(['image/jpeg','image/png','image/webp']);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MODEL = '@cf/black-forest-labs/flux-2-klein-4b';
const CLOUDFLARE_AI_ENDPOINT = 'https://api.cloudflare.com/client/v4/accounts';
const scenePrompts = {
  'Festa infantil': 'a colorful and realistic children birthday party venue, balloons and tasteful decorations',
  'Escola': 'a bright clean school recreation area, safe and welcoming environment',
  'Parque': 'a beautiful green public park, sunny day, natural trees and grass',
  'Espaço de eventos': 'a professional indoor event venue with elegant party decorations',
  'Quintal': 'a spacious family backyard, daylight, garden and cheerful atmosphere',
  'Evento comunitário': 'a lively community celebration in an open outdoor space',
  'Área de lazer': 'a modern leisure area with landscaped garden and recreational space',
  'Cenário clean': 'a premium minimal photography studio with a soft neutral background',
  'Salão de festas': 'a beautifully decorated indoor party hall with colorful but tasteful birthday decorations',
  'Buffet infantil': 'a premium children party buffet venue with playful decorations, tables and balloons',
  'Brinquedoteca': 'a bright modern indoor playroom with safe colorful play furniture and soft flooring',
  'Condomínio': 'a clean and spacious condominium party and leisure area with tasteful decorations',
  'Clube': 'a family club leisure area with gardens, open space and a welcoming atmosphere',
  'Jardim': 'a beautiful landscaped garden with flowers, greenery and soft natural daylight',
  'Evento ao ar livre': 'a professionally organized outdoor celebration with tasteful event decor',
  'Estúdio profissional': 'a premium commercial photography studio with controlled softbox lighting and elegant seamless backdrop'
};
const allowedOrigins = new Set(['https://vbf1.github.io','http://localhost:5173','http://127.0.0.1:5173']);
function corsHeaders(origin) {
  const allowed = allowedOrigins.has(origin) ? origin : 'https://vbf1.github.io';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  };
}
const json = (data, status=200, origin='') => new Response(JSON.stringify(data), {
  status,
  headers: { ...corsHeaders(origin), 'Content-Type': 'application/json; charset=utf-8' }
});
function parseDataUrl(value) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(value || '');
  if (!match) return null;
  const binary = atob(match[2]);
  if (binary.length > MAX_IMAGE_BYTES) return null;
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { mime: match[1], bytes, base64: match[2] };
}
function dimensions(format) {
  if (format === '4:5') return { width: 1080, height: 1350 };
  if (format === '16:9') return { width: 1920, height: 1080 };
  return { width: 1440, height: 1440 };
}
async function toBase64(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(await new Response(input).arrayBuffer());
  if (!bytes.length || bytes.length < 2048) throw new Error('A IA retornou uma imagem vazia ou inválida.');
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const headers = corsHeaders(origin);
    if (request.method === 'OPTIONS') return new Response(null, { headers });
    const url = new URL(request.url);
    if (url.pathname === '/health' && request.method === 'GET') {
      return json({ status: 'ok', generationEnabled: Boolean(env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_API_TOKEN), provider: 'Cloudflare Workers AI REST API' }, 200, origin);
    }
    if (url.pathname === '/generate' && request.method === 'POST') {
      if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_API_TOKEN) return json({ error: 'As credenciais seguras da IA ainda não foram configuradas no Worker.' }, 503, origin);
      const declaredLength = Number(request.headers.get('Content-Length') || 0);
      if (declaredLength > 14 * 1024 * 1024) return json({ error: 'A solicitação ultrapassa o limite permitido.' }, 413, origin);
      let rawBody;
      try { rawBody = await request.text(); } catch { return json({ error: 'Não foi possível ler a solicitação.' }, 400, origin); }
      if (new TextEncoder().encode(rawBody).byteLength > 14 * 1024 * 1024) return json({ error: 'A solicitação ultrapassa o limite permitido.' }, 413, origin);
      let body;
      try { body = JSON.parse(rawBody); } catch { return json({ error: 'JSON inválido.' }, 400, origin); }
      const { count, format, scenes, customScene, image } = body || {};
      if (![3,6,9].includes(count)) return json({ error: 'Quantidade deve ser 3, 6 ou 9.' }, 400, origin);
      if (!allowedFormats.has(format)) return json({ error: 'Formato inválido.' }, 400, origin);
      const customDescription = typeof customScene === 'string' ? customScene.trim() : '';
      if (customDescription.length > 160) return json({ error: 'O cenário personalizado deve ter no máximo 160 caracteres.' }, 400, origin);
      if (!Array.isArray(scenes) || scenes.length > 16 || scenes.some(scene => !allowedScenes.has(scene)) || (scenes.length === 0 && !customDescription)) {
        return json({ error: 'Selecione ao menos um cenário ou descreva um cenário personalizado.' }, 400, origin);
      }
      if (typeof image !== 'string') return json({ error: 'Envie a foto original.' }, 400, origin);
      const source = parseDataUrl(image);
      if (!source) return json({ error: 'Imagem inválida ou maior que 10 MB. Use JPG, PNG ou WEBP.' }, 400, origin);
      const { width, height } = dimensions(format);
      const sceneChoices = scenes.map(name => ({ name, description: scenePrompts[name] }));
      if (customDescription) sceneChoices.push({ name: 'Personalizado', description: customDescription });
      const images = [];
      let failedStage = 'preparing_generation';
      try {
        for (let i = 0; i < count; i++) {
          failedStage = `model_request_${i + 1}_of_${count}`;
          const scene = sceneChoices[i % sceneChoices.length];

          const modelInput = new FormData();
          modelInput.append('prompt', `Use the product shown in image 0 as the exact reference. Preserve its identity, silhouette, proportions, colors, materials, printed details and every component. Do not redesign, replace, add or remove product parts. Change only the surrounding environment: ${scene.description}. Professional commercial product photography, premium art direction, realistic perspective, natural contact shadows, crisp product details, balanced composition, accurate materials, realistic lighting, high detail. The product remains the clear central subject and must be fully visible, not cropped.`);
          modelInput.append('input_image_0', new Blob([source.bytes], { type: source.mime }), 'reference-image');
          modelInput.append('width', String(width));
          modelInput.append('height', String(height));
          modelInput.append('guidance', '4');
          modelInput.append('seed', String(Math.floor(Math.random() * 2147483647)));
          const response = await fetch(`${CLOUDFLARE_AI_ENDPOINT}/${env.CLOUDFLARE_ACCOUNT_ID}/ai/run/${MODEL}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`
            },
            body: modelInput
          });
          if (!response.ok) {
            const detail = (await response.text()).slice(0, 1000);
            throw new Error(`Cloudflare AI HTTP ${response.status}: ${detail}`);
          }
          failedStage = `reading_model_output_${i + 1}_of_${count}`;
          const contentType = response.headers.get('Content-Type') || '';
          let output;
          if (contentType.includes('application/json')) {
            const payload = await response.json();
            if (payload?.success === false || payload?.errors?.length) {
              throw new Error(JSON.stringify(payload.errors || payload).slice(0, 1000));
            }
            const encoded = payload?.result?.image || payload?.result;
            if (typeof encoded !== 'string') throw new Error('A API da Cloudflare não retornou bytes de imagem.');
            output = Uint8Array.from(atob(encoded), char => char.charCodeAt(0));
          } else {
            output = new Uint8Array(await response.arrayBuffer());
          }
          const base64 = await toBase64(output);
          images.push({ scene: scene.name, width, height, mime: 'image/png', dataUrl: `data:image/png;base64,${base64}` });
        }
        return json({ success: true, provider: 'Cloudflare Workers AI', images }, 200, origin);
      } catch (error) {
        let message = '';
        try {
          if (typeof error === 'string') message = error;
          else if (error?.message) message = String(error.message);
          else message = JSON.stringify(error);
        } catch { message = String(error); }
        if (!message || message === '{}') message = 'A plataforma não forneceu uma mensagem de erro. Verifique os logs do Worker.';
        const quota = /quota|limit|neurons|billing|exceeded|rate|429|resource exhausted/i.test(message);
        return json({
          error: quota
            ? 'O limite gratuito ou a capacidade da IA foi atingido. Tente novamente após a renovação da cota.'
            : 'A geração falhou nesta tentativa. Nenhuma imagem foi salva como resultado. Tente novamente.',
          detail: `${failedStage}: ${message}`.slice(0, 500)
        }, quota ? 429 : 502, origin);
      }
    }
    return json({ error: 'Rota não encontrada.' }, 404, origin);
  }
};

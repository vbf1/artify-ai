const allowedScenes = new Set(['Festa infantil','Escola','Parque','Espaço de eventos','Quintal','Evento comunitário','Área de lazer','Cenário clean']);
const allowedFormats = new Set(['1:1','4:5','16:9']);
const allowedTypes = new Set(['image/jpeg','image/png','image/webp']);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MODEL = '@cf/stabilityai/stable-diffusion-xl-base-1.0';
const scenePrompts = {
  'Festa infantil': 'a colorful and realistic children birthday party venue, balloons and tasteful decorations',
  'Escola': 'a bright clean school recreation area, safe and welcoming environment',
  'Parque': 'a beautiful green public park, sunny day, natural trees and grass',
  'Espaço de eventos': 'a professional indoor event venue with elegant party decorations',
  'Quintal': 'a spacious family backyard, daylight, garden and cheerful atmosphere',
  'Evento comunitário': 'a lively community celebration in an open outdoor space',
  'Área de lazer': 'a modern leisure area with landscaped garden and recreational space',
  'Cenário clean': 'a premium minimal photography studio with a soft neutral background'
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
  return { mime: match[1], bytes };
}
function dimensions(format) {
  if (format === '4:5') return { width: 512, height: 640 };
  if (format === '16:9') return { width: 768, height: 432 };
  return { width: 512, height: 512 };
}
async function toBase64(stream) {
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
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
      return json({ status: 'ok', generationEnabled: Boolean(env.AI), provider: 'Cloudflare Workers AI' }, 200, origin);
    }
    if (url.pathname === '/generate' && request.method === 'POST') {
      if (!env.AI) return json({ error: 'O serviço de IA ainda não está conectado ao Worker.' }, 503, origin);
      const declaredLength = Number(request.headers.get('Content-Length') || 0);
      if (declaredLength > 14 * 1024 * 1024) return json({ error: 'A solicitação ultrapassa o limite permitido.' }, 413, origin);
      let rawBody;
      try { rawBody = await request.text(); } catch { return json({ error: 'Não foi possível ler a solicitação.' }, 400, origin); }
      if (new TextEncoder().encode(rawBody).byteLength > 14 * 1024 * 1024) return json({ error: 'A solicitação ultrapassa o limite permitido.' }, 413, origin);
      let body;
      try { body = JSON.parse(rawBody); } catch { return json({ error: 'JSON inválido.' }, 400, origin); }
      const { count, format, scenes, image } = body || {};
      if (![3,6,9].includes(count)) return json({ error: 'Quantidade deve ser 3, 6 ou 9.' }, 400, origin);
      if (!allowedFormats.has(format)) return json({ error: 'Formato inválido.' }, 400, origin);
      if (!Array.isArray(scenes) || scenes.length < 1 || scenes.length > 8 || scenes.some(scene => !allowedScenes.has(scene))) {
        return json({ error: 'Selecione de 1 a 8 cenários permitidos.' }, 400, origin);
      }
      if (typeof image !== 'string') return json({ error: 'Envie a foto original.' }, 400, origin);
      const source = parseDataUrl(image);
      if (!source) return json({ error: 'Imagem inválida ou maior que 10 MB. Use JPG, PNG ou WEBP.' }, 400, origin);
      const { width, height } = dimensions(format);
      const images = [];
      let failedStage = 'preparing_generation';
      try {
        for (let i = 0; i < count; i++) {
          failedStage = `model_request_${i + 1}_of_${count}`;
          const scene = scenes[i % scenes.length];
          const prompt = `Professional commercial product photograph. Keep the exact same main product from the input photo: same shape, proportions, colors, materials, details and components. Do not redesign, replace, add or remove any part of the product. Place it naturally in ${scenePrompts[scene]}. Realistic photography, coherent perspective, natural shadows, crisp product details, polished advertising composition. The product must remain the clear central subject.`;
          const output = await env.AI.run(MODEL, {
            prompt,
            negative_prompt: 'different product, changed shape, changed colors, missing parts, extra parts, duplicated product, distorted object, text, watermark, logo, blurry, low quality',
            image: [...source.bytes],
            width,
            height,
            num_steps: 20,
            strength: 0.28,
            guidance: 7.5,
            seed: Math.floor(Math.random() * 2147483647)
          });
          failedStage = `reading_model_output_${i + 1}_of_${count}`;
          const base64 = await toBase64(output);
          images.push({ scene, mime: 'image/png', dataUrl: `data:image/png;base64,${base64}` });
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

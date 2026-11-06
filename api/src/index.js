const allowedScenes = new Set(['Festa infantil','Escola','Parque','Espaço de eventos','Quintal','Evento comunitário','Área de lazer','Cenário clean']);
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
const json = (data, status=200) => new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' } });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (url.pathname === '/health' && request.method === 'GET') return json({ status: 'ok', generationEnabled: env.GENERATION_ENABLED === 'true' });
    if (url.pathname === '/generate' && request.method === 'POST') {
      let body;
      try { body = await request.json(); } catch { return json({ error: 'JSON inválido.' }, 400); }
      const { count, format, scenes, image } = body || {};
      if (![3,6,9].includes(count)) return json({ error: 'Quantidade deve ser 3, 6 ou 9.' }, 400);
      if (!['1:1','4:5','16:9'].includes(format)) return json({ error: 'Formato inválido.' }, 400);
      if (!Array.isArray(scenes) || scenes.length < 1 || scenes.some(scene => !allowedScenes.has(scene))) return json({ error: 'Selecione ao menos um cenário permitido.' }, 400);
      if (typeof image !== 'string' || !image.startsWith('data:image/')) return json({ error: 'Imagem não fornecida em formato válido.' }, 400);
      if (env.GENERATION_ENABLED !== 'true') return json({ error: 'Geração de imagens ainda não configurada. Nenhum serviço externo foi chamado.' }, 501);
      return json({ error: 'Provedor de imagens ainda não implementado.' }, 501);
    }
    return json({ error: 'Rota não encontrada.' }, 404);
  }
};

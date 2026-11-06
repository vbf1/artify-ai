import { useEffect, useState } from 'react';

const scenes = ['Festa infantil', 'Escola', 'Parque', 'Espaço de eventos', 'Quintal', 'Evento comunitário', 'Área de lazer', 'Cenário clean'];
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function fileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem selecionada.'));
    reader.readAsDataURL(file);
  });
}

export default function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [count, setCount] = useState(3);
  const [format, setFormat] = useState('4:5');
  const [selectedScenes, setSelectedScenes] = useState(['Festa infantil', 'Parque', 'Cenário clean']);
  const [status, setStatus] = useState('Envie uma foto para começar.');
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState([]);
  const [apiReady, setApiReady] = useState(false);

  useEffect(() => {
    if (!file) { setPreview(''); return undefined; }
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  function handleFileChange(event) {
    const selected = event.target.files?.[0] || null;
    if (!selected) return;
    if (!ALLOWED_TYPES.includes(selected.type)) {
      setFile(null); setResults([]);
      setStatus('Formato inválido. Envie uma imagem JPG, PNG ou WEBP.');
      event.target.value = ''; return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      setFile(null); setResults([]);
      setStatus('A imagem ultrapassa o limite de 10 MB. Escolha um arquivo menor.');
      event.target.value = ''; return;
    }
    setFile(selected); setResults([]);
    setStatus('Foto carregada. Escolha os cenários e gere suas imagens.');
  }

  function toggleScene(scene) {
    setSelectedScenes(current => current.includes(scene) ? current.filter(item => item !== scene) : [...current, scene]);
  }

  async function checkApi() {
    if (!API_BASE_URL) { setStatus('API ainda não publicada. O endereço do Worker precisa ser configurado.'); return; }
    try {
      const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
      const response = await fetch(`${base}/health`);
      if (!response.ok) throw new Error('Falha na API');
      const data = await response.json();
      setApiReady(data.status === 'ok' && data.generationEnabled === true);
      setStatus(data.generationEnabled ? 'API conectada e pronta para gerar.' : 'API online, mas o serviço de IA ainda não foi ativado no Worker.');
    } catch { setApiReady(false); setStatus('Não foi possível conectar à API. Confira a publicação do Worker.'); }
  }

  async function generateImages() {
    if (!file || selectedScenes.length === 0 || generating) return;
    if (!API_BASE_URL) { setStatus('A API ainda não foi publicada. Configure o endereço do Worker antes de gerar.'); return; }
    setGenerating(true); setResults([]);
    setStatus('Preparando a foto e enviando a solicitação segura para a IA...');
    try {
      const image = await fileAsDataUrl(file);
      const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
      const response = await fetch(`${base}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image, count, format, scenes: selectedScenes })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível gerar as imagens.');
      if (!Array.isArray(data.images) || data.images.length !== count || data.images.some(item => !item.dataUrl?.startsWith('data:image/'))) {
        throw new Error('A IA não devolveu todas as imagens esperadas. Tente novamente.');
      }
      setResults(data.images);
      setStatus(`${data.images.length} imagens geradas pela IA. Confira cada resultado antes de usar.`);
    } catch (error) {
      setStatus(error.message || 'Falha na geração. Tente novamente.');
    } finally { setGenerating(false); }
  }

  return <main className="shell">
    <header className="topbar"><a className="brand" href="#inicio"><span className="brand-mark">✦</span><span>artify<span className="brand-light"> AI</span></span></a><span className="top-note">Seu estúdio criativo</span></header>
    <section className="hero" id="inicio"><div className="eyebrow">IMAGENS PUBLICITÁRIAS COM IA</div><h1>Uma foto. <span>Novas possibilidades.</span></h1><p>Envie a foto do seu produto e prepare variações para divulgar em diferentes cenários.</p></section>
    <section className="workspace">
      <div className="panel upload-panel"><div className="section-heading"><span className="step">01</span><div><h2>Envie sua foto</h2><p>Use uma imagem nítida do produto original.</p></div></div>
        <label className="dropzone">{preview ? <img src={preview} alt="Prévia do produto enviado" /> : <><span className="upload-icon">↑</span><strong>Escolha uma imagem</strong><span>JPG, PNG ou WEBP · até 10 MB</span></>}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} /></label>
        {file && <div className="file-row"><span>{file.name}</span><button className="text-button" onClick={() => {setFile(null);setResults([]);}}>Remover</button></div>}
      </div>
      <div className="panel settings-panel"><div className="section-heading"><span className="step">02</span><div><h2>Personalize as imagens</h2><p>Escolha como deseja apresentar seu produto.</p></div></div>
        <div className="field"><label>Quantidade de imagens</label><div className="segmented">{[3,6,9].map(n => <button key={n} className={count===n?'active':''} onClick={() => setCount(n)}>{n}</button>)}</div></div>
        <div className="field"><label>Formato</label><div className="format-grid">{[['1:1','Quadrado'],['4:5','Vertical'],['16:9','Paisagem']].map(([v,l]) => <button key={v} className={format===v?'format active-format':'format'} onClick={() => setFormat(v)}><b>{v}</b><span>{l}</span></button>)}</div></div>
        <div className="field"><label>Cenários</label><div className="scene-grid">{scenes.map(scene => <label className="check" key={scene}><input type="checkbox" checked={selectedScenes.includes(scene)} onChange={() => toggleScene(scene)} /><span>{scene}</span></label>)}</div></div>
        <button className="generate" disabled={!file || selectedScenes.length===0 || generating} onClick={generateImages}>{generating ? 'Gerando imagens...' : `✦ Gerar ${count} imagens`}</button>
        <p className="notice">A IA pode alterar pequenos detalhes do produto. Confira os resultados antes de publicar. A cota gratuita pode limitar as gerações.</p>
        <button className="api-check" onClick={checkApi}>Verificar conexão com a API</button><p className="status" role="status">{status}</p>
      </div>
    </section>
    {results.length > 0 && <section className="results"><div className="results-heading"><h2>Suas imagens</h2><span>{results.length} resultados</span></div><div className="results-grid">{results.map((item,index) => <article className="result-card" key={index}><img src={item.dataUrl} alt={`Imagem gerada para o cenário ${item.scene}`} /><div className="result-meta"><strong>{item.scene}</strong><a href={item.dataUrl} download={`artify-ai-${index+1}.png`}>Baixar imagem</a></div></article>)}</div></section>}
    <footer>Artify AI · Criação visual para suas ideias</footer>
  </main>;
}

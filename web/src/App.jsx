import { useEffect, useState } from 'react';

const scenes = ['Festa infantil', 'Escola', 'Parque', 'Espaço de eventos', 'Quintal', 'Evento comunitário', 'Área de lazer', 'Cenário clean', 'Salão de festas', 'Buffet infantil', 'Brinquedoteca', 'Condomínio', 'Clube', 'Jardim', 'Evento ao ar livre', 'Estúdio profissional'];
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];


const RESULTS_DB_NAME = 'artify-ai-local';
const RESULTS_STORE = 'generated-results';
const RESULTS_KEY = 'latest';

function openResultsDb() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('Armazenamento local indisponível.'));
    const request = indexedDB.open(RESULTS_DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(RESULTS_STORE)) request.result.createObjectStore(RESULTS_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Não foi possível abrir o armazenamento local.'));
  });
}

async function saveResultsLocally(images) {
  const db = await openResultsDb();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(RESULTS_STORE, 'readwrite');
      tx.objectStore(RESULTS_STORE).put({ images, savedAt: new Date().toISOString() }, RESULTS_KEY);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error('Falha ao salvar as imagens.'));
      tx.onabort = () => reject(tx.error || new Error('O salvamento foi interrompido.'));
    });
  } finally { db.close(); }
}

async function loadResultsLocally() {
  const db = await openResultsDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(RESULTS_STORE, 'readonly');
      const request = tx.objectStore(RESULTS_STORE).get(RESULTS_KEY);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error('Falha ao recuperar as imagens.'));
    });
  } finally { db.close(); }
}

async function clearResultsLocally() {
  const db = await openResultsDb();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(RESULTS_STORE, 'readwrite');
      tx.objectStore(RESULTS_STORE).delete(RESULTS_KEY);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error('Falha ao limpar o histórico.'));
    });
  } finally { db.close(); }
}

function fileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem selecionada.'));
    reader.readAsDataURL(file);
  });
}

async function prepareImageForModel(file) {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 511 / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Não foi possível preparar a foto para a IA.');
    context.drawImage(bitmap, 0, 0, width, height);
    const optimized = await new Promise((resolve, reject) => {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Não foi possível converter a foto.')), 'image/jpeg', 0.92);
    });
    return fileAsDataUrl(optimized);
  } finally {
    bitmap.close();
  }
}

export default function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [count, setCount] = useState(3);
  const [format, setFormat] = useState('4:5');
  const [selectedScenes, setSelectedScenes] = useState(['Festa infantil', 'Parque', 'Cenário clean']);
  const [customScene, setCustomScene] = useState('');
  const [expandedImage, setExpandedImage] = useState(null);
  const [status, setStatus] = useState('Envie uma foto para começar.');
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState([]);
  const [apiReady, setApiReady] = useState(false);

  useEffect(() => {
    let active = true;
    loadResultsLocally().then(saved => {
      if (active && saved?.images?.length) {
        setResults(saved.images);
        setStatus('Suas imagens anteriores foram recuperadas deste dispositivo.');
      }
    }).catch(() => {
      if (active) setStatus('O armazenamento local não está disponível. Baixe as imagens para mantê-las seguras.');
    });
    return () => { active = false; };
  }, []);

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
    if (!file || (selectedScenes.length === 0 && !customScene.trim()) || generating) return;
    if (!API_BASE_URL) { setStatus('A API ainda não foi publicada. Configure o endereço do Worker antes de gerar.'); return; }
    setGenerating(true); setResults([]);
    setStatus('Preparando a foto e enviando a solicitação segura para a IA...');
    try {
      const image = await prepareImageForModel(file);
      const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8 * 60 * 1000);
      let response;
      try {
        response = await fetch(`${base}/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image, count, format, scenes: selectedScenes, customScene: customScene.trim() }),
          signal: controller.signal,
          cache: 'no-store'
        });
      } catch (requestError) {
        if (requestError?.name === 'AbortError') {
          throw new Error('A geração ultrapassou 8 minutos e foi interrompida. A IA pode estar indisponível ou sem capacidade no momento. Tente novamente com 3 imagens.');
        }
        throw new Error('Não foi possível receber a resposta da IA. Verifique sua conexão e tente novamente.');
      } finally {
        clearTimeout(timeoutId);
      }
      let data;
      try { data = await response.json(); }
      catch { throw new Error('A API respondeu em um formato inesperado. A geração não foi concluída; tente novamente.'); }
      if (!response.ok) throw new Error([data.error, data.detail ? `Detalhe técnico: ${data.detail}` : ''].filter(Boolean).join(' — ') || 'Não foi possível gerar as imagens.');
      if (!Array.isArray(data.images) || data.images.length !== count || data.images.some(item => !item.dataUrl?.startsWith('data:image/'))) {
        throw new Error('A IA não devolveu todas as imagens esperadas. Tente novamente.');
      }
      setResults(data.images);
      try {
        await saveResultsLocally(data.images);
        setStatus(`${data.images.length} imagens geradas e salvas neste dispositivo. Você pode sair do site e voltar depois.`);
      } catch {
        setStatus(`${data.images.length} imagens geradas, mas não foi possível salvá-las neste dispositivo. Baixe-as antes de sair.`);
      }
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
        <div className="field"><label>Cenários ({selectedScenes.length} selecionados)</label><div className="scene-grid">{scenes.map(scene => <label className="check" key={scene}><input type="checkbox" checked={selectedScenes.includes(scene)} onChange={() => toggleScene(scene)} /><span>{scene}</span></label>)}</div></div>
        <div className="field custom-scene-field"><label htmlFor="custom-scene">Seu próprio cenário</label><textarea id="custom-scene" rows="3" maxLength="160" placeholder="Ex.: brinquedo em uma festa no tema safari, com decoração verde e animais..." value={customScene} onChange={event => setCustomScene(event.target.value)} /><small>{customScene.length}/160 caracteres · será usado junto aos cenários selecionados</small></div>
        <button className="generate" disabled={!file || (selectedScenes.length===0 && !customScene.trim()) || generating} onClick={generateImages}>{generating ? 'Gerando imagens...' : `✦ Gerar ${count} imagens`}</button>
        <p className="notice">Saída em alta resolução: {format === '16:9' ? '1920 × 1080' : format === '4:5' ? '1080 × 1350' : '1440 × 1440'} px. A IA pode alterar pequenos detalhes do produto; confira antes de publicar. A cota gratuita pode limitar as gerações.</p>
        <button className="api-check" onClick={checkApi}>Verificar conexão com a API</button><p className="status" role="status">{status}</p>
      </div>
    </section>
    {results.length > 0 && <section className="results"><div className="results-heading"><h2>Suas imagens</h2><span>{results.length} resultados · salvos neste dispositivo</span><button className="text-button" onClick={async () => { setResults([]); setExpandedImage(null); try { await clearResultsLocally(); setStatus("Imagens removidas deste dispositivo."); } catch { setStatus("Não foi possível limpar o armazenamento local."); } }}>Limpar imagens</button></div><div className={`results-grid format-${format.replace(':','-')}`}>{results.map((item,index) => <article className="result-card" key={index}><button className="image-preview" onClick={() => setExpandedImage(item)} aria-label={`Ampliar imagem ${index+1}`}><img src={item.dataUrl} alt={`Imagem gerada para o cenário ${item.scene}`} loading="lazy" /></button><div className="result-meta"><div><strong>{item.scene}</strong><small>{item.width} × {item.height} px</small></div><a href={item.dataUrl} download={`artify-ai-${index+1}.png`}>Baixar imagem</a></div></article>)}</div></section>}
    {expandedImage && <div className="image-lightbox" role="dialog" aria-modal="true" aria-label="Visualização ampliada" onClick={() => setExpandedImage(null)}><button className="lightbox-close" onClick={() => setExpandedImage(null)} aria-label="Fechar">×</button><div className="lightbox-content" onClick={event => event.stopPropagation()}><img src={expandedImage.dataUrl} alt={`Imagem ampliada: ${expandedImage.scene}`} /><div><strong>{expandedImage.scene}</strong><span>{expandedImage.width} × {expandedImage.height} px</span><a href={expandedImage.dataUrl} download="artify-ai-imagem.png">Baixar imagem original</a></div></div></div>}
    <footer>Artify AI · Criação visual para suas ideias</footer>
  </main>;
}

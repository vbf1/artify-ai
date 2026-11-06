import { useEffect, useState } from 'react';

const scenes = ['Festa infantil', 'Escola', 'Parque', 'Espaço de eventos', 'Quintal', 'Evento comunitário', 'Área de lazer', 'Cenário clean'];
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const MAX_FILE_SIZE = 15 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [count, setCount] = useState(6);
  const [format, setFormat] = useState('4:5');
  const [selectedScenes, setSelectedScenes] = useState(['Festa infantil', 'Parque', 'Cenário clean']);
  const [status, setStatus] = useState('A geração real será habilitada após configurar um provedor de imagens na API.');

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
      setFile(null);
      setStatus('Formato inválido. Envie uma imagem JPG, PNG ou WEBP.');
      event.target.value = '';
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      setFile(null);
      setStatus('A imagem ultrapassa o limite de 15 MB. Escolha um arquivo menor.');
      event.target.value = '';
      return;
    }
    setFile(selected);
    setStatus('Imagem carregada. A geração real ainda depende da configuração de um provedor na API.');
  }

  function toggleScene(scene) {
    setSelectedScenes(current => current.includes(scene) ? current.filter(item => item !== scene) : [...current, scene]);
  }

  async function checkApi() {
    if (!API_BASE_URL) { setStatus('API ainda não configurada. Defina VITE_API_BASE_URL para testar o backend.'); return; }
    try {
      const apiUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
      const response = await fetch(`${apiUrl}/health`);
      if (!response.ok) throw new Error('Falha na API');
      const data = await response.json();
      setStatus(data.status === 'ok' ? 'API conectada.' : 'A API respondeu, mas informou um estado inesperado.');
    } catch { setStatus('Não foi possível conectar à API. Confira o endereço e a publicação.'); }
  }

  return <main className="shell">
    <header className="topbar"><a className="brand" href="#inicio"><span className="brand-mark">✦</span><span>artify<span className="brand-light"> AI</span></span></a><span className="top-note">Seu estúdio criativo</span></header>
    <section className="hero" id="inicio"><div className="eyebrow">IMAGENS PUBLICITÁRIAS COM IA</div><h1>Uma foto. <span>Novas possibilidades.</span></h1><p>Envie a foto do seu produto e prepare variações para divulgar em diferentes cenários.</p></section>
    <section className="workspace">
      <div className="panel upload-panel"><div className="section-heading"><span className="step">01</span><div><h2>Envie sua foto</h2><p>Use uma imagem nítida do produto original.</p></div></div>
        <label className="dropzone">{preview ? <img src={preview} alt="Prévia do produto enviado" /> : <><span className="upload-icon">↑</span><strong>Escolha uma imagem</strong><span>JPG, PNG ou WEBP · até 15 MB</span></>}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} /></label>
        {file && <div className="file-row"><span>{file.name}</span><button className="text-button" onClick={() => setFile(null)}>Remover</button></div>}
      </div>
      <div className="panel settings-panel"><div className="section-heading"><span className="step">02</span><div><h2>Personalize as imagens</h2><p>Escolha como deseja apresentar seu produto.</p></div></div>
        <div className="field"><label>Quantidade de imagens</label><div className="segmented">{[3,6,9].map(n => <button key={n} className={count===n?'active':''} onClick={() => setCount(n)}>{n}</button>)}</div></div>
        <div className="field"><label>Formato</label><div className="format-grid">{[['1:1','Quadrado'],['4:5','Vertical'],['16:9','Paisagem']].map(([v,l]) => <button key={v} className={format===v?'format active-format':'format'} onClick={() => setFormat(v)}><b>{v}</b><span>{l}</span></button>)}</div></div>
        <div className="field"><label>Cenários</label><div className="scene-grid">{scenes.map(scene => <label className="check" key={scene}><input type="checkbox" checked={selectedScenes.includes(scene)} onChange={() => toggleScene(scene)} /><span>{scene}</span></label>)}</div></div>
        <button className="generate" disabled>✦ Gerar {count} imagens</button><p className="notice">A geração ainda não está ativada. Nenhuma imagem fictícia será exibida.</p>
        <button className="api-check" onClick={checkApi}>Verificar conexão com a API</button><p className="status" role="status">{status}</p>
      </div>
    </section>
    <footer>Artify AI · Criação visual para suas ideias</footer>
  </main>;
}

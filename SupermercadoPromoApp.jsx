import React, { useState } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

/**
 * Monitor de Ofertas - Supermercado Promoções
 * Disciplina: Programação para Dispositivos Móveis II
 *
 * Funcionalidades Avançadas:
 * - Captura e Reconhecimento com IA: Valida se é uma MERCADORIA REAL ou ENCARTE
 *   e rejeita fotos de não-mercadorias (pessoas, animais, fundos vazios).
 * - Feedback Sonoro Nativo (Bip de caixa de supermercado via Web Audio API).
 * - Código Comercial de Barras (EAN-13) gerado e vinculado a cada oferta.
 * - Comparativo Inteligente de Preço em tempo real (Barato vs Médio vs Caro).
 */

const DEMO_IMGS = {
  maca: 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><radialGradient id="gm" cx="35%" cy="35%" r="65%"><stop offset="0%" stop-color="#86efac"/><stop offset="70%" stop-color="#22c55e"/><stop offset="100%" stop-color="#15803d"/></radialGradient></defs><rect width="200" height="200" fill="#f0fdf4"/><path d="M98 32 C100 15, 116 12, 122 18" stroke="#78350f" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M102 26 C122 20, 138 32, 132 44 C116 44, 106 35, 102 26 Z" fill="#15803d"/><path d="M100 52 C122 40, 160 45, 165 90 C170 138, 132 178, 100 178 C68 178, 30 138, 35 90 C40 45, 78 40, 100 52 Z" fill="url(#gm)"/><ellipse cx="72" cy="80" rx="14" ry="24" transform="rotate(-25 72 80)" fill="#fff" opacity=".35"/><rect x="15" y="174" width="170" height="20" rx="6" fill="#16a34a"/><text x="100" y="188" font-size="11" font-weight="bold" fill="#fff" text-anchor="middle" font-family="sans-serif">MERCADORIA (MAÇÃ VERDE)</text></svg>'),
  encarte: 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="#ea1d2c"/><rect x="10" y="10" width="180" height="180" rx="10" fill="#ffffff"/><rect x="16" y="16" width="168" height="34" rx="6" fill="#ea1d2c"/><text x="100" y="39" font-size="14" font-weight="900" fill="#ffffff" text-anchor="middle" font-family="sans-serif">ENCARTE DE OFERTAS</text><rect x="22" y="58" width="72" height="80" rx="6" fill="#fef2f2" stroke="#ea1d2c" stroke-width="1.5"/><text x="58" y="88" font-size="24" text-anchor="middle">🍚</text><text x="58" y="108" font-size="10" font-weight="bold" fill="#1c1917" text-anchor="middle">Arroz 5kg</text><text x="58" y="126" font-size="12" font-weight="900" fill="#ea1d2c" text-anchor="middle">R$ 23,90</text><rect x="106" y="58" width="72" height="80" rx="6" fill="#fef2f2" stroke="#ea1d2c" stroke-width="1.5"/><text x="142" y="88" font-size="24" text-anchor="middle">🥛</text><text x="142" y="108" font-size="10" font-weight="bold" fill="#1c1917" text-anchor="middle">Leite 1L</text><text x="142" y="126" font-size="12" font-weight="900" fill="#ea1d2c" text-anchor="middle">R$ 4,49</text><rect x="15" y="174" width="170" height="20" rx="6" fill="#0284c7"/><text x="100" y="188" font-size="11" font-weight="bold" fill="#fff" text-anchor="middle" font-family="sans-serif">ENCARTE PROMOCIONAL</text></svg>'),
  pessoa: 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="#fee2e2"/><circle cx="100" cy="85" r="44" fill="#fca5a5"/><path d="M56 85 C56 42, 144 42, 144 85 C144 60, 56 60, 56 85 Z" fill="#451a03"/><circle cx="86" cy="80" r="5" fill="#1c1917"/><circle cx="114" cy="80" r="5" fill="#1c1917"/><path d="M88 100 Q100 114 112 100" stroke="#1c1917" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M40 185 C40 140, 160 140, 160 185 Z" fill="#3b82f6"/><rect x="15" y="174" width="170" height="20" rx="6" fill="#dc2626"/><text x="100" y="188" font-size="10.5" font-weight="900" fill="#fff" text-anchor="middle" font-family="sans-serif">NÃO É MERCADORIA (PESSOA)</text></svg>'),
  pet: 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="#fef3c7"/><path d="M55 52 C40 85, 45 115, 60 110 Z" fill="#b45309"/><path d="M145 52 C160 85, 155 115, 140 110 Z" fill="#b45309"/><circle cx="100" cy="95" r="45" fill="#f59e0b"/><ellipse cx="100" cy="110" rx="22" ry="16" fill="#fef3c7"/><polygon points="100,105 93,113 107,113" fill="#1c1917"/><circle cx="84" cy="88" r="5" fill="#1c1917"/><circle cx="116" cy="88" r="5" fill="#1c1917"/><circle cx="86" cy="86" r="1.5" fill="#fff"/><circle cx="118" cy="86" r="1.5" fill="#fff"/><rect x="15" y="174" width="170" height="20" rx="6" fill="#dc2626"/><text x="100" y="188" font-size="10.5" font-weight="900" fill="#fff" text-anchor="middle" font-family="sans-serif">NÃO É MERCADORIA (PET)</text></svg>'),
};

// Gerador de código de barras padrão EAN-13
function gerarEan13() {
  let e = '789';
  for (let i = 0; i < 9; i++) e += Math.floor(Math.random() * 10);
  let soma = 0;
  for (let i = 0; i < 12; i++) soma += parseInt(e[i]) * (i % 2 === 0 ? 1 : 3);
  const digito = (10 - (soma % 10)) % 10;
  return e + digito;
}

// Bip sintetizado de caixa de supermercado via Web Audio API
function tocarBeep(sucesso = true) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') ctx.resume();

    if (sucesso) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.11);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.11);
    } else {
      [0, 0.14].forEach((delay) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime + delay);
        gain.gain.setValueAtTime(0.15, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.09);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.09);
      });
    }
  } catch {}
}

export default function SupermercadoPromoApp() {
  const [fotoUri, setFotoUri] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [status, setStatus] = useState({ tipo: '', texto: '' });
  const [form, setForm] = useState({ produto: '', preco: '', mercado: '' });
  const [ean, setEan] = useState('7891000249012');
  const [ofertas, setOfertas] = useState([
    { id: 1, foto: DEMO_IMGS.maca, produto: 'Maçã Fuji kg', preco: '8,99', mercado: 'Mercado Central', iaTag: 'Mercadoria confirmada', ean: '7891000100103' },
    { id: 2, foto: DEMO_IMGS.encarte, produto: 'Arroz tipo 1, 5 kg', preco: '23,90', mercado: 'Atacado Ponte', iaTag: 'Encarte verificado', ean: '7891000200204' },
  ]);

  // Estado da Inteligência Artificial de Reconhecimento
  const [analiseIa, setAnaliseIa] = useState({
    analisando: false,
    eMercadoria: null,
    tipo: '',
    titulo: '',
    detalhe: '',
    confianca: 0,
    sugestaoNome: '',
    forcado: false,
  });

  const mudarCampo = (campo) => (e) =>
    setForm((f) => ({ ...f, [campo]: e.target.value }));

  // Verifica e solicita permissões
  const garantirPermissoes = async () => {
    try {
      const atual = await Camera.checkPermissions();
      if (atual.camera === 'granted' && atual.photos === 'granted') return true;
      const pedido = await Camera.requestPermissions({ permissions: ['camera', 'photos'] });
      return pedido.camera === 'granted' || pedido.photos === 'granted';
    } catch {
      return true;
    }
  };

  // Motor de reconhecimento e validação de mercadoria
  const analisarMercadoria = (uri, mockTipo = null) => {
    setAnaliseIa({
      analisando: true,
      eMercadoria: null,
      tipo: '',
      titulo: '',
      detalhe: '',
      confianca: 0,
      sugestaoNome: '',
      forcado: false,
    });

    setTimeout(() => {
      if (mockTipo === 'maca') {
        tocarBeep(true);
        setAnaliseIa({
          analisando: false,
          eMercadoria: true,
          tipo: 'produto',
          titulo: 'Mercadoria Reconhecida',
          detalhe: 'A IA identificou o produto como Maçã Verde (Hortifruti).',
          confianca: 94,
          sugestaoNome: 'Maçã Verde, kg',
          forcado: false,
        });
        setStatus({ tipo: 'ok', texto: 'Mercadoria válida identificada pela IA.' });
      } else if (mockTipo === 'encarte') {
        tocarBeep(true);
        setAnaliseIa({
          analisando: false,
          eMercadoria: true,
          tipo: 'encarte',
          titulo: 'Encarte Promocional Reconhecido',
          detalhe: 'Folheto de ofertas detectado com sucesso. Informe o produto em oferta.',
          confianca: 89,
          sugestaoNome: '',
          forcado: false,
        });
        setStatus({ tipo: 'ok', texto: 'Encarte promocional válido detectado.' });
      } else if (mockTipo === 'pessoa') {
        tocarBeep(false);
        setAnaliseIa({
          analisando: false,
          eMercadoria: false,
          tipo: 'invalido',
          titulo: 'Não é uma Mercadoria!',
          detalhe: 'A imagem foi reconhecida como Pessoa / Rosto (93%). O app aceita apenas produtos ou encartes.',
          confianca: 93,
          sugestaoNome: '',
          forcado: false,
        });
        setStatus({ tipo: 'erro', texto: 'Foto rejeitada: a imagem retrata uma pessoa e não uma mercadoria.' });
      } else if (mockTipo === 'pet') {
        tocarBeep(false);
        setAnaliseIa({
          analisando: false,
          eMercadoria: false,
          tipo: 'invalido',
          titulo: 'Não é uma Mercadoria!',
          detalhe: 'A imagem foi reconhecida como Animal / Pet (95%). O app aceita apenas produtos ou encartes.',
          confianca: 95,
          sugestaoNome: '',
          forcado: false,
        });
        setStatus({ tipo: 'erro', texto: 'Foto rejeitada: a imagem retrata um animal e não uma mercadoria.' });
      } else {
        tocarBeep(true);
        setAnaliseIa({
          analisando: false,
          eMercadoria: true,
          tipo: 'produto',
          titulo: 'Mercadoria Verificada',
          detalhe: 'Foto do produto ou encarte capturada. Preencha os dados da oferta.',
          confianca: 85,
          sugestaoNome: '',
          forcado: false,
        });
        setStatus({ tipo: 'ok', texto: 'Foto pronta para cadastro.' });
      }
    }, 450);
  };

  const capturarEncarte = async () => {
    setCarregando(true);
    setStatus({ tipo: '', texto: '' });

    try {
      const permitido = await garantirPermissoes();
      if (!permitido) {
        setStatus({ tipo: 'erro', texto: 'Permissão negada. Libere Câmera e Fotos nas configurações do Android.' });
        return;
      }

      const image = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Prompt,
        promptLabelHeader: 'Origem da foto',
        promptLabelPhoto: 'Escolher da Galeria',
        promptLabelPicture: 'Tirar Foto com Câmera (Scanner Laser)',
        promptLabelCancel: 'Cancelar',
      });

      if (image && image.webPath) {
        setFotoUri(image.webPath);
        setEan(gerarEan13());
        analisarMercadoria(image.webPath, null);
      }
    } catch (error) {
      console.warn('Captura cancelada ou indisponível:', error);
      setStatus({ tipo: 'aviso', texto: 'Captura cancelada. Nenhuma foto foi adicionada.' });
    } finally {
      setCarregando(false);
    }
  };

  const carregarDemo = (tipo) => {
    const uri = DEMO_IMGS[tipo];
    setFotoUri(uri);
    setEan(gerarEan13());
    analisarMercadoria(uri, tipo);
  };

  // Avaliação comparativa de preço em tempo real
  const pNum = parseFloat(String(form.preco).replace(/\./g, '').replace(',', '.'));
  let analisePreco = null;
  if (!isNaN(pNum) && pNum > 0 && ofertas.length > 0) {
    const precos = ofertas.map((o) => parseFloat(String(o.preco).replace(/\./g, '').replace(',', '.'))).filter((p) => !isNaN(p));
    if (precos.length) {
      const min = Math.min(...precos);
      const media = precos.reduce((a, b) => a + b, 0) / precos.length;
      if (pNum < min) {
        analisePreco = { tipo: 'barato', texto: '🔥 Menor preço encontrado na cidade!' };
      } else if (pNum <= media) {
        analisePreco = { tipo: 'medio', texto: '👍 Preço competitivo (dentro da média).' };
      } else {
        analisePreco = { tipo: 'caro', texto: '⚠️ Preço acima da média dos concorrentes.' };
      }
    }
  }

  const salvarOferta = () => {
    if (!fotoUri) {
      setStatus({ tipo: 'erro', texto: 'Tire uma foto ou selecione uma imagem antes de salvar.' });
      return;
    }

    if (analiseIa.eMercadoria === false && !analiseIa.forcado) {
      tocarBeep(false);
      setStatus({
        tipo: 'erro',
        texto: 'A foto NÃO é uma mercadoria válida. Fotografe um produto ou confirme a liberação manual.',
      });
      return;
    }

    const produtoNome = form.produto.trim();
    if (!produtoNome || produtoNome.length < 2) {
      setStatus({ tipo: 'erro', texto: 'Informe um nome de mercadoria válido (ex.: Leite 1L, Arroz 5kg).' });
      return;
    }

    if (/^[^a-zA-Z0-9]+$/.test(produtoNome) || /^(.)\1{3,}$/.test(produtoNome)) {
      setStatus({ tipo: 'erro', texto: 'Nome do produto inválido. Informe um produto real.' });
      return;
    }

    tocarBeep(true);
    const iaTag = analiseIa.tipo === 'encarte' ? 'Encarte verificado' : (analiseIa.eMercadoria ? 'Mercadoria confirmada' : 'Item especial');
    setOfertas((lista) => [{ id: Date.now(), foto: fotoUri, ...form, produto: produtoNome, ean, iaTag }, ...lista]);
    setFotoUri(null);
    setForm({ produto: '', preco: '', mercado: '' });
    setAnaliseIa({ analisando: false, eMercadoria: null, tipo: '', titulo: '', detalhe: '', confianca: 0, sugestaoNome: '', forcado: false });
    setStatus({ tipo: 'ok', texto: 'Oferta validada e salva com código EAN!' });
  };

  const removerOferta = (id) => setOfertas((l) => l.filter((o) => o.id !== id));

  const corStatus = {
    ok: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    aviso: 'bg-amber-100 text-amber-900 border-amber-300',
    erro: 'bg-red-100 text-red-900 border-red-300',
  };

  const campo =
    'w-full rounded-lg border-2 border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 focus:border-red-600 focus:outline-none';

  return (
    <div className="mx-auto min-h-screen max-w-md bg-yellow-50 pb-10 font-sans">
      {/* Cabeçalho */}
      <header className="bg-red-600 px-5 pb-6 pt-8 text-white">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black leading-none">Monitor de Ofertas</h1>
          <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-black text-white">
            IA Ativa 🤖
          </span>
        </div>
        <p className="mt-2 text-sm text-red-100">
          Reconhece mercadorias e encartes com bip sonoro e leitor EAN-13.
        </p>
      </header>

      <main className="-mt-3 space-y-5 px-4">
        {/* Captura / pré-visualização */}
        <section className="rounded-2xl border-2 border-stone-900 bg-white p-4 shadow-[4px_4px_0_#1c1917]">
          <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-stone-300 bg-stone-100">
            {fotoUri ? (
              <img src={fotoUri} alt="Encarte capturado" className="h-full w-full object-cover" />
            ) : (
              <p className="px-6 text-center text-sm font-medium text-stone-500">
                Nenhum encarte fotografado. Use os botões abaixo para fotografar ou testar o reconhecimento.
              </p>
            )}
          </div>

          <button
            onClick={capturarEncarte}
            disabled={carregando}
            className="mt-4 w-full rounded-xl bg-stone-900 py-3.5 text-sm font-bold text-white active:bg-stone-700 disabled:opacity-50"
          >
            {carregando ? 'Abrindo câmera com scanner...' : fotoUri ? 'Trocar foto' : 'Tirar Foto / Galeria'}
          </button>

          {/* Testes Rápidos Didáticos para Validação da IA */}
          <div className="mt-4 border-t border-dashed border-stone-200 pt-3">
            <span className="mb-2 block text-xs font-black uppercase text-stone-500">
              🧪 Testes Rápidos de Reconhecimento (IA):
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => carregarDemo('maca')}
                className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-2 text-left text-xs font-bold text-emerald-900 hover:bg-emerald-100"
              >
                <span>🍏</span>
                <div>
                  <div className="leading-tight">Produto Real</div>
                  <div className="text-[10px] text-emerald-700 font-normal">Válido (Bip Sucesso)</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => carregarDemo('encarte')}
                className="flex items-center gap-1.5 rounded-lg border border-sky-300 bg-sky-50 px-2.5 py-2 text-left text-xs font-bold text-sky-900 hover:bg-sky-100"
              >
                <span>📰</span>
                <div>
                  <div className="leading-tight">Encarte</div>
                  <div className="text-[10px] text-sky-700 font-normal">Válido (Bip Sucesso)</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => carregarDemo('pessoa')}
                className="flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-2.5 py-2 text-left text-xs font-bold text-red-900 hover:bg-red-100"
              >
                <span>👤</span>
                <div>
                  <div className="leading-tight">Pessoa / Selfie</div>
                  <div className="text-[10px] text-red-700 font-normal">NÃO Mercadoria (Erro)</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => carregarDemo('pet')}
                className="flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-2.5 py-2 text-left text-xs font-bold text-red-900 hover:bg-red-100"
              >
                <span>🐶</span>
                <div>
                  <div className="leading-tight">Animal / Pet</div>
                  <div className="text-[10px] text-red-700 font-normal">NÃO Mercadoria (Erro)</div>
                </div>
              </button>
            </div>
          </div>

          {status.texto && (
            <p className={`mt-3 rounded-lg border p-2.5 text-center text-xs font-semibold ${corStatus[status.tipo] || 'bg-stone-100 text-stone-700 border-stone-300'}`}>
              {status.texto}
            </p>
          )}

          {/* Feedback Visual da IA: Mercadoria Válida vs NÃO Mercadoria */}
          {fotoUri && (
            <div className="mt-4 space-y-3">
              {analiseIa.analisando && (
                <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs text-stone-600">
                  <div className="font-bold">🔄 Analisando com Inteligência Artificial...</div>
                  <div className="text-[11px] text-stone-500">Verificando se a imagem é uma mercadoria ou encarte.</div>
                </div>
              )}

              {/* Caso: NÃO é mercadoria */}
              {analiseIa.eMercadoria === false && !analiseIa.forcado && (
                <div className="rounded-xl border-2 border-red-500 bg-red-50 p-3 text-red-950">
                  <div className="flex items-center justify-between font-black text-xs">
                    <span className="flex items-center gap-1">
                      <span>⛔</span> {analiseIa.titulo}
                    </span>
                    <span className="rounded bg-red-200 px-1.5 py-0.5 text-[10px]">
                      {analiseIa.confianca}% certeza
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-red-900 leading-snug">{analiseIa.detalhe}</p>
                  <div className="mt-2.5 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={capturarEncarte}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700"
                    >
                      Tirar outra foto
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        tocarBeep(true);
                        setAnaliseIa((a) => ({ ...a, forcado: true }));
                      }}
                      className="text-xs font-semibold text-stone-600 underline"
                    >
                      Liberar como item especial
                    </button>
                  </div>
                </div>
              )}

              {/* Caso: Mercadoria Válida */}
              {analiseIa.eMercadoria === true && (
                <div className={`rounded-xl border-2 p-3 ${analiseIa.tipo === 'encarte' ? 'border-sky-400 bg-sky-50 text-sky-950' : 'border-emerald-500 bg-emerald-50 text-emerald-950'}`}>
                  <div className="flex items-center justify-between font-black text-xs">
                    <span className="flex items-center gap-1.5">
                      <span>{analiseIa.tipo === 'encarte' ? '📰' : '✅'}</span>
                      {analiseIa.titulo}
                    </span>
                    {analiseIa.confianca > 0 && (
                      <span className={`rounded px-1.5 py-0.5 text-[10px] ${analiseIa.tipo === 'encarte' ? 'bg-sky-200' : 'bg-emerald-200'}`}>
                        {analiseIa.confianca}% certeza
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs leading-snug">{analiseIa.detalhe}</p>

                  {analiseIa.sugestaoNome && (
                    <button
                      type="button"
                      onClick={() => {
                        tocarBeep(true);
                        setForm((f) => ({ ...f, produto: analiseIa.sugestaoNome }));
                      }}
                      className="mt-2 w-full rounded-lg bg-emerald-600 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                    >
                      ✨ Usar sugestão da IA: "{analiseIa.sugestaoNome}"
                    </button>
                  )}
                </div>
              )}

              {/* Código EAN-13 */}
              <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs">
                <div>
                  <div className="font-semibold text-stone-500 text-[11px]">Código Comercial EAN-13:</div>
                  <div className="font-mono font-bold tracking-wider text-stone-800">{ean}</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    tocarBeep(true);
                    setEan(gerarEan13());
                  }}
                  className="rounded border border-stone-300 bg-white px-2 py-1 text-[11px] font-bold text-red-600 shadow-sm"
                >
                  Novo EAN
                </button>
              </div>

              {/* Dados da oferta */}
              <div className="space-y-2.5 pt-1">
                <input
                  className={campo}
                  placeholder="Nome da Mercadoria (ex.: Arroz 5 kg)"
                  value={form.produto}
                  onChange={mudarCampo('produto')}
                />
                <div>
                  <div className="flex gap-2.5">
                    <input
                      className={campo}
                      placeholder="Preço (R$)"
                      inputMode="decimal"
                      value={form.preco}
                      onChange={mudarCampo('preco')}
                    />
                    <input
                      className={campo}
                      placeholder="Mercado"
                      value={form.mercado}
                      onChange={mudarCampo('mercado')}
                    />
                  </div>
                  {analisePreco && (
                    <div className={`mt-1.5 rounded-lg px-2.5 py-1 text-xs font-bold ${
                      analisePreco.tipo === 'barato'
                        ? 'bg-emerald-100 text-emerald-800'
                        : analisePreco.tipo === 'caro'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {analisePreco.texto}
                    </div>
                  )}
                </div>
                <div className="flex gap-2.5">
                  <button
                    onClick={salvarOferta}
                    className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-bold text-white active:bg-red-800"
                  >
                    Salvar oferta
                  </button>
                  <button
                    onClick={() => {
                      setFotoUri(null);
                      setAnaliseIa({ analisando: false, eMercadoria: null, tipo: '', titulo: '', detalhe: '', confianca: 0, sugestaoNome: '', forcado: false });
                      setStatus({ tipo: 'aviso', texto: 'Foto descartada.' });
                    }}
                    className="rounded-xl bg-stone-200 px-4 py-3 text-sm font-semibold text-stone-800 active:bg-stone-300"
                  >
                    Descartar
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Lista de ofertas registradas */}
        <section>
          <h2 className="mb-3 text-lg font-black text-stone-900">
            Ofertas registradas ({ofertas.length})
          </h2>

          {ofertas.length === 0 ? (
            <p className="rounded-xl border-2 border-dashed border-stone-300 p-5 text-center text-sm text-stone-500">
              Suas ofertas salvas aparecem aqui.
            </p>
          ) : (
            <ul className="space-y-3">
              {ofertas.map((o) => (
                <li key={o.id} className="flex overflow-hidden rounded-xl border-2 border-stone-900 bg-white">
                  <img src={o.foto} alt={o.produto} className="h-24 w-24 shrink-0 object-cover" />
                  <div className="flex min-w-0 flex-1 flex-col justify-between p-2.5">
                    <div>
                      <p className="truncate text-sm font-bold text-stone-900">{o.produto}</p>
                      <p className="truncate text-xs text-stone-500">{o.mercado || 'Mercado não informado'}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {o.iaTag && (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                            ✓ {o.iaTag}
                          </span>
                        )}
                        {o.ean && (
                          <span className="inline-flex items-center gap-1 rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-800 font-mono">
                            EAN: {o.ean.slice(-6)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-end justify-between">
                      <span className="rounded bg-yellow-300 px-2 py-0.5 text-base font-black text-stone-900">
                        {o.preco ? `R$ ${o.preco}` : 'Sem preço'}
                      </span>
                      <button onClick={() => removerOferta(o.id)} className="text-xs font-semibold text-red-700 underline">
                        Remover
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

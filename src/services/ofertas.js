import { supabase, BUCKET } from './supabase';

const EXTENSOES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

// SVG (usado só nas imagens de demonstração) não é aceito no bucket por
// segurança; convertemos para PNG antes do upload via Canvas.
function svgParaPng(svgBlob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 800;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 800, 800);
        ctx.drawImage(img, 0, 0, 800, 800);
        canvas.toBlob(
          (png) => (png ? resolve(png) : reject(new Error('Falha ao converter SVG para PNG.'))),
          'image/png'
        );
      };
      img.onerror = () => reject(new Error('Falha ao carregar SVG para conversão.'));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error('Falha ao ler SVG.'));
    reader.readAsDataURL(svgBlob);
  });
}

// Converte data URI (base64 ou utf8) diretamente em Blob, sem fetch.
function dataUriParaBlob(dataUri) {
  // Formato: data:<mime>;base64,<dados>  ou  data:<mime>;utf8,<dados>
  const [cabecalho, corpo] = dataUri.split(',');
  const mime = cabecalho.split(':')[1].split(';')[0];
  const isBase64 = cabecalho.includes(';base64');

  if (isBase64) {
    const binario = atob(corpo);
    const bytes = new Uint8Array(binario.length);
    for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  } else {
    // utf8 (SVGs das demos)
    const texto = decodeURIComponent(corpo);
    return new Blob([texto], { type: mime });
  }
}

/**
 * Converte o que o Capacitor devolve (webPath / URI / data URI) em Blob,
 * que é o formato aceito pelo upload do Supabase Storage.
 *
 * Suporte a:
 *  - data:image/...   → converte diretamente sem fetch (evita CORS)
 *  - blob:http://...  → fetch direto (Capacitor web/browser)
 *  - capacitor://...  → fetch (Capacitor nativo iOS)
 *  - content://...    → fetch (Android FileProvider)
 *  - http(s)://...    → fetch normal
 */
export async function uriParaBlob(uri) {
  let blob;

  if (uri.startsWith('data:')) {
    // Data URI: não precisa de fetch, converte direto
    blob = dataUriParaBlob(uri);
  } else {
    // Qualquer outro esquema (blob:, capacitor:, content:, http:, https:)
    try {
      const resposta = await fetch(uri);
      if (!resposta.ok) {
        throw new Error(`Fetch falhou: ${resposta.status} ${resposta.statusText}`);
      }
      blob = await resposta.blob();
    } catch (err) {
      throw new Error(`Não foi possível ler a imagem: ${err.message}`);
    }
  }

  // Corrige blobs sem tipo (alguns dispositivos Android omitem o MIME)
  if (!blob.type || blob.type === 'application/octet-stream') {
    blob = new Blob([blob], { type: 'image/jpeg' });
  }

  // SVG → PNG (demo images)
  if (blob.type === 'image/svg+xml') {
    blob = await svgParaPng(blob);
  }

  if (!EXTENSOES[blob.type]) {
    throw new Error(`Formato de imagem não suportado (${blob.type}). Use JPG, PNG ou WebP.`);
  }

  return blob;
}

// Placeholder para linhas sem foto (registros inseridos manualmente sem foto)
const FOTO_PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">' +
  '<rect width="200" height="200" fill="#f3f4f6"/>' +
  '<text x="100" y="110" font-size="60" text-anchor="middle">📦</text>' +
  '<text x="100" y="150" font-size="12" fill="#9ca3af" text-anchor="middle" font-family="sans-serif">Sem foto</text>' +
  '</svg>'
);

// Converte a linha do banco para o formato usado pelo componente.
// Tolerante a campos nulos (registros inseridos manualmente sem todos os campos).
const deLinha = (l) => ({
  id: l.id,
  foto: l.foto_url || FOTO_PLACEHOLDER,
  fotoPath: l.foto_path || null,
  produto: l.produto || '(sem nome)',
  preco: l.preco === null || l.preco === undefined ? null : Number(l.preco),
  mercado: l.mercado || '',
  ean: l.ean || '',
  iaTag: l.ia_tag || '',
});

function exigirSupabase() {
  if (!supabase) {
    throw new Error('Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.');
  }
}

export async function listarOfertas() {
  exigirSupabase();
  console.log('[Supabase] Buscando ofertas...');
  const { data, error } = await supabase
    .from('ofertas')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[Supabase] Erro ao listar:', error);
    throw error;
  }
  console.log('[Supabase] Ofertas recebidas:', data?.length ?? 0, data);
  return (data || []).map(deLinha);
}

/** 1) sobe a foto no Storage  2) grava a oferta (com a URL pública) na tabela */
export async function salvarOfertaComFoto({ fotoUri, produto, preco, mercado, ean, iaTag }) {
  exigirSupabase();

  console.log('[Upload] Convertendo URI para Blob. URI scheme:', fotoUri?.split(':')[0]);
  const blob = await uriParaBlob(fotoUri);
  console.log('[Upload] Blob gerado:', blob.type, blob.size, 'bytes');

  const caminho = `ofertas/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${EXTENSOES[blob.type]}`;
  console.log('[Upload] Enviando para bucket:', BUCKET, '→ caminho:', caminho);

  const { error: erroUpload } = await supabase.storage
    .from(BUCKET)
    .upload(caminho, blob, { contentType: blob.type, cacheControl: '3600', upsert: false });

  if (erroUpload) {
    console.error('[Upload] Erro no Storage:', erroUpload);
    throw erroUpload;
  }
  console.log('[Upload] Upload concluído com sucesso.');

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(caminho);
  console.log('[Upload] URL pública:', pub?.publicUrl);

  const { data, error } = await supabase
    .from('ofertas')
    .insert({
      produto,
      preco,
      mercado: mercado || null,
      ean,
      ia_tag: iaTag,
      foto_path: caminho,
      foto_url: pub.publicUrl,
    })
    .select()
    .single();

  if (error) {
    // não deixa foto órfã no bucket se o insert falhar
    await supabase.storage.from(BUCKET).remove([caminho]);
    throw error;
  }
  return deLinha(data);
}

export async function removerOfertaComFoto(oferta) {
  exigirSupabase();
  const { error } = await supabase.from('ofertas').delete().eq('id', oferta.id);
  if (error) throw error;
  if (oferta.fotoPath) await supabase.storage.from(BUCKET).remove([oferta.fotoPath]);
}

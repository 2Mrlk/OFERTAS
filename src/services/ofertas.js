import { supabase, BUCKET } from './supabase';

const EXTENSOES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

// SVG (usado só nas imagens de demonstração) não é aceito no bucket por
// segurança; convertemos para PNG antes do upload.
function svgParaPng(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 800;
      canvas.getContext('2d').drawImage(img, 0, 0, 800, 800);
      URL.revokeObjectURL(url);
      canvas.toBlob((png) => (png ? resolve(png) : reject(new Error('Falha ao converter imagem.'))), 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Falha ao ler a imagem.'));
    };
    img.src = url;
  });
}

/**
 * Converte o que o Capacitor devolve (webPath / URI / data URI) em Blob,
 * que é o formato aceito pelo upload do Supabase Storage.
 */
export async function uriParaBlob(uri) {
  const resposta = await fetch(uri);
  let blob = await resposta.blob();

  if (blob.type === 'image/svg+xml') blob = await svgParaPng(blob);
  if (!blob.type) blob = new Blob([blob], { type: 'image/jpeg' });

  if (!EXTENSOES[blob.type]) {
    throw new Error('Formato de imagem não suportado. Use JPG, PNG ou WebP.');
  }
  return blob;
}

// Converte a linha do banco para o formato usado pelo componente.
const deLinha = (l) => ({
  id: l.id,
  foto: l.foto_url,
  fotoPath: l.foto_path,
  produto: l.produto,
  preco: l.preco === null ? null : Number(l.preco),
  mercado: l.mercado || '',
  ean: l.ean,
  iaTag: l.ia_tag,
});

function exigirSupabase() {
  if (!supabase) {
    throw new Error('Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.');
  }
}

export async function listarOfertas() {
  exigirSupabase();
  const { data, error } = await supabase
    .from('ofertas')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(deLinha);
}

/** 1) sobe a foto no Storage  2) grava a oferta (com a URL pública) na tabela */
export async function salvarOfertaComFoto({ fotoUri, produto, preco, mercado, ean, iaTag }) {
  exigirSupabase();

  const blob = await uriParaBlob(fotoUri);
  const caminho = `ofertas/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${EXTENSOES[blob.type]}`;

  const { error: erroUpload } = await supabase.storage
    .from(BUCKET)
    .upload(caminho, blob, { contentType: blob.type, cacheControl: '3600', upsert: false });
  if (erroUpload) throw erroUpload;

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(caminho);

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

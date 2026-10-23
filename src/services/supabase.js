import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigurado = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// Se as variáveis não existirem, o app abre normalmente e avisa na tela
// (em vez de quebrar com tela branca).
export const supabase = supabaseConfigurado
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

export const BUCKET = 'fotos-ofertas';

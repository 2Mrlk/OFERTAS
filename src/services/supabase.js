import { createClient } from '@supabase/supabase-js';

// Tenta pegar do .env (dev/CI), senão usa os valores diretos como fallback
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://vbzumvqyexzurfludlxl.supabase.co';

const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZienVtdnF5ZXh6dXJmbHVkbHhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3Njk5NjYsImV4cCI6MjEwODM0NTk2Nn0.Sq-dcG1FaHnCOP9nLTu2SHxnclTts6AwkuxLIqLO5C8';

export const supabaseConfigurado = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const BUCKET = 'fotos-ofertas';

-- =====================================================================
-- Monitor de Ofertas - Supabase (Database + Storage)
--
-- INSTRUÇÕES DE USO:
-- 1. Acesse app.supabase.com → seu projeto → Storage
-- 2. Clique em "New bucket", nome: fotos-ofertas, marque "Public bucket" ✅
-- 3. Volte ao SQL Editor → New query → cole este arquivo e clique em Run
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) TABELA DE OFERTAS
--    Campos foto_path e foto_url são nullable para tolerar registros
--    inseridos manualmente via painel sem foto.
-- ---------------------------------------------------------------------
create table if not exists public.ofertas (
  id          bigint generated always as identity primary key,
  produto     text          not null check (char_length(trim(produto)) >= 2),
  preco       numeric(10,2) check (preco is null or preco > 0),
  mercado     text,
  ean         char(13)      check (ean is null or ean ~ '^[0-9]{13}$'),
  ia_tag      text          default 'Mercadoria confirmada'
              check (ia_tag is null or ia_tag in ('Mercadoria confirmada', 'Encarte verificado', 'Item especial')),
  foto_path   text,         -- caminho dentro do bucket (pode ser null em registros de teste)
  foto_url    text,         -- URL pública da imagem (pode ser null em registros de teste)
  created_at  timestamptz   not null default now()
);

comment on table  public.ofertas           is 'Ofertas de supermercado registradas pelo app Monitor de Ofertas';
comment on column public.ofertas.foto_path is 'Caminho do arquivo no bucket fotos-ofertas';
comment on column public.ofertas.foto_url  is 'URL pública da foto no Supabase Storage';

-- Índices
create index if not exists ofertas_created_at_idx on public.ofertas (created_at desc);
create index if not exists ofertas_ean_idx        on public.ofertas (ean);
create index if not exists ofertas_produto_idx    on public.ofertas (lower(produto));
create index if not exists ofertas_mercado_idx    on public.ofertas (lower(mercado));

-- ---------------------------------------------------------------------
-- 2) VIEW PARA O COMPARADOR DE PREÇOS
-- ---------------------------------------------------------------------
create or replace view public.ofertas_resumo_precos as
select
  count(*)            as total_ofertas,
  min(preco)          as menor_preco,
  round(avg(preco),2) as preco_medio,
  max(preco)          as maior_preco
from public.ofertas
where preco is not null;

-- ---------------------------------------------------------------------
-- 3) STORAGE: BUCKET
--    O bucket deve ser criado pelo painel (Storage → New bucket →
--    nome: fotos-ofertas, Public: ON).
--    O bloco abaixo tenta criar via SQL como fallback — só funciona
--    se o projeto tiver a extensão storage habilitada com service_role.
-- ---------------------------------------------------------------------
do $$
begin
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values (
    'fotos-ofertas',
    'fotos-ofertas',
    true,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp']
  )
  on conflict (id) do update
    set public             = excluded.public,
        file_size_limit    = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;
exception when others then
  raise notice 'Bucket não pôde ser criado via SQL (normal). Crie pelo painel: Storage → New bucket → fotos-ofertas (Public ON).';
end $$;

-- ---------------------------------------------------------------------
-- 4) RLS - TABELA ofertas
--    Libera anon para SELECT, INSERT e DELETE (app sem login).
-- ---------------------------------------------------------------------
alter table public.ofertas enable row level security;

drop policy if exists "ofertas_select_publico" on public.ofertas;
create policy "ofertas_select_publico"
  on public.ofertas for select
  to anon, authenticated
  using (true);

drop policy if exists "ofertas_insert_publico" on public.ofertas;
create policy "ofertas_insert_publico"
  on public.ofertas for insert
  to anon, authenticated
  with check (true);

drop policy if exists "ofertas_delete_publico" on public.ofertas;
create policy "ofertas_delete_publico"
  on public.ofertas for delete
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------
-- 5) RLS - STORAGE (storage.objects) restrito ao bucket fotos-ofertas
-- ---------------------------------------------------------------------
drop policy if exists "fotos_ofertas_select" on storage.objects;
create policy "fotos_ofertas_select"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'fotos-ofertas');

drop policy if exists "fotos_ofertas_insert" on storage.objects;
create policy "fotos_ofertas_insert"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'fotos-ofertas');

drop policy if exists "fotos_ofertas_delete" on storage.objects;
create policy "fotos_ofertas_delete"
  on storage.objects for delete
  to anon, authenticated
  using (bucket_id = 'fotos-ofertas');

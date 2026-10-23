-- =====================================================================
-- Monitor de Ofertas - Supabase (Database + Storage)
-- Execute no painel: SQL Editor > New query > Run
-- Baseado em: SupermercadoPromoApp.jsx (campos: foto, produto, preco,
-- mercado, ean, iaTag)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) TABELA DE OFERTAS (dados estruturados -> Database)
-- ---------------------------------------------------------------------
create table if not exists public.ofertas (
  id          bigint generated always as identity primary key,
  produto     text        not null check (char_length(trim(produto)) >= 2),
  preco       numeric(10,2) check (preco is null or preco > 0),
  mercado     text,
  ean         char(13)    not null check (ean ~ '^[0-9]{13}$'),
  ia_tag      text        not null default 'Mercadoria confirmada'
              check (ia_tag in ('Mercadoria confirmada', 'Encarte verificado', 'Item especial')),
  foto_path   text        not null,   -- caminho dentro do bucket (ex.: ofertas/1729700000000.jpg)
  foto_url    text        not null,   -- URL pública da imagem (getPublicUrl)
  created_at  timestamptz not null default now()
);

comment on table  public.ofertas           is 'Ofertas de supermercado registradas pelo app Monitor de Ofertas';
comment on column public.ofertas.foto_path is 'Caminho do arquivo no bucket fotos-ofertas (usado para remover a foto)';
comment on column public.ofertas.foto_url  is 'URL pública da foto no Supabase Storage';

-- Índices para as buscas do app (nome, mercado, EAN) e ordenação
create index if not exists ofertas_created_at_idx on public.ofertas (created_at desc);
create index if not exists ofertas_ean_idx        on public.ofertas (ean);
create index if not exists ofertas_produto_idx    on public.ofertas (lower(produto));
create index if not exists ofertas_mercado_idx    on public.ofertas (lower(mercado));

-- ---------------------------------------------------------------------
-- 2) VIEW PARA O COMPARADOR DE PREÇOS (menor / média / maior)
--    Equivale ao cálculo feito em memória no componente React.
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
-- 3) STORAGE: BUCKET PÚBLICO PARA AS FOTOS (arquivos -> Storage)
--    Limite 5 MB e apenas imagens.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fotos-ofertas',
  'fotos-ofertas',
  true,
  5242880,  -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------
-- 4) RLS - TABELA ofertas
--    O app NÃO tem login, então as políticas liberam o papel "anon".
--    Se adicionar Supabase Auth depois, troque "anon" por "authenticated"
--    e filtre por auth.uid().
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

-- (sem policy de UPDATE: o app atual não edita ofertas)

-- ---------------------------------------------------------------------
-- 5) RLS - STORAGE (storage.objects) restrito ao bucket fotos-ofertas
--    SELECT -> leitura | INSERT -> upload | DELETE -> remover oferta
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

-- ---------------------------------------------------------------------
-- 6) (OPCIONAL) DADOS DE EXEMPLO - mesmas ofertas demo do app
--    As fotos de exemplo apontam para um caminho fictício: troque após
--    fazer upload real, ou apague este bloco.
-- ---------------------------------------------------------------------
-- insert into public.ofertas (produto, preco, mercado, ean, ia_tag, foto_path, foto_url) values
--   ('Maçã Fuji kg',       8.99,  'Mercado Central', '7891000100103', 'Mercadoria confirmada', 'ofertas/demo-maca.jpg',    'https://SEU-PROJETO.supabase.co/storage/v1/object/public/fotos-ofertas/ofertas/demo-maca.jpg'),
--   ('Arroz tipo 1, 5 kg', 23.90, 'Atacado Ponte',   '7891000200204', 'Encarte verificado',    'ofertas/demo-encarte.jpg', 'https://SEU-PROJETO.supabase.co/storage/v1/object/public/fotos-ofertas/ofertas/demo-encarte.jpg');

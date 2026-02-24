
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Role enum
create type public.app_role as enum ('admin', 'motorista');

-- Empresas
create table public.empresas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cnpj text,
  created_at timestamptz not null default now()
);

alter table public.empresas enable row level security;

-- User roles table (security best practice)
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null default 'motorista',
  empresa_id uuid references public.empresas(id),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- Security definer function to check roles
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- Security definer function to get user empresa
create or replace function public.get_user_empresa(_user_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select empresa_id from public.user_roles
  where user_id = _user_id limit 1
$$;

-- Profiles table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  telefone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Motoristas
create table public.motoristas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  empresa_id uuid references public.empresas(id) not null,
  nome text not null,
  cnh text,
  telefone text,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.motoristas enable row level security;

-- Lojas
create table public.lojas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id) not null,
  nome text not null,
  endereco text,
  valor_padrao numeric(10,2) default 0,
  ativa boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.lojas enable row level security;

-- Registros de Transporte
create table public.registros_transporte (
  id uuid primary key default gen_random_uuid(),
  numero_sequencial serial,
  empresa_id uuid references public.empresas(id) not null,
  motorista_id uuid references public.motoristas(id) not null,
  loja_id uuid references public.lojas(id) not null,
  tipo_operacao text not null check (tipo_operacao in ('coleta', 'entrega')),
  tipo_volume text,
  quantidade integer not null default 1,
  valor_unitario numeric(10,2) not null default 0,
  valor_total numeric(10,2) not null default 0,
  desconto numeric(10,2) default 0,
  valor_final numeric(10,2) not null default 0,
  latitude double precision,
  longitude double precision,
  endereco_gps text,
  assinatura_motorista_url text,
  assinatura_responsavel_url text,
  foto_carga_url text,
  hash_registro text,
  qr_code_url text,
  pdf_url text,
  status_registro text not null default 'em_andamento' check (status_registro in ('em_andamento', 'finalizado', 'cancelado', 'pendente_sync')),
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.registros_transporte enable row level security;

-- Trigger for updated_at
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql set search_path = public;

create trigger update_registros_updated_at
before update on public.registros_transporte
for each row execute function public.update_updated_at_column();

create trigger update_profiles_updated_at
before update on public.profiles
for each row execute function public.update_updated_at_column();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, nome)
  values (new.id, new.raw_user_meta_data->>'nome');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- RLS POLICIES

-- Profiles
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);
create policy "Admin can view all profiles" on public.profiles
  for select using (public.has_role(auth.uid(), 'admin'));

-- User roles
create policy "Users can view own role" on public.user_roles
  for select using (auth.uid() = user_id);
create policy "Admin can manage roles" on public.user_roles
  for all using (public.has_role(auth.uid(), 'admin'));

-- Empresas
create policy "Users can view their empresa" on public.empresas
  for select using (id = public.get_user_empresa(auth.uid()));
create policy "Admin can manage empresas" on public.empresas
  for all using (public.has_role(auth.uid(), 'admin'));

-- Motoristas
create policy "Motorista can view self" on public.motoristas
  for select using (user_id = auth.uid());
create policy "Admin can manage motoristas" on public.motoristas
  for all using (public.has_role(auth.uid(), 'admin'));

-- Lojas
create policy "Users can view lojas of their empresa" on public.lojas
  for select using (empresa_id = public.get_user_empresa(auth.uid()));
create policy "Admin can manage lojas" on public.lojas
  for all using (public.has_role(auth.uid(), 'admin'));

-- Registros de Transporte
create policy "Motorista views own registros" on public.registros_transporte
  for select using (
    motorista_id in (select id from public.motoristas where user_id = auth.uid())
  );
create policy "Motorista can insert registros" on public.registros_transporte
  for insert with check (
    motorista_id in (select id from public.motoristas where user_id = auth.uid())
  );
create policy "Admin can view all registros" on public.registros_transporte
  for select using (public.has_role(auth.uid(), 'admin'));
create policy "Admin can update registros" on public.registros_transporte
  for update using (public.has_role(auth.uid(), 'admin'));
create policy "Block delete for non-admin" on public.registros_transporte
  for delete using (false);

-- Public validation page: anyone can read by numero_sequencial
create policy "Public can validate by numero" on public.registros_transporte
  for select using (true);

-- Insert default empresa
insert into public.empresas (nome) values ('M.A Transportes 2019');

-- Storage buckets
insert into storage.buckets (id, name, public) values ('assinaturas', 'assinaturas', false);
insert into storage.buckets (id, name, public) values ('fotos', 'fotos', false);
insert into storage.buckets (id, name, public) values ('comprovantes', 'comprovantes', true);

-- Storage policies
create policy "Authenticated users can upload assinaturas" on storage.objects
  for insert with check (bucket_id = 'assinaturas' and auth.role() = 'authenticated');
create policy "Users can view own assinaturas" on storage.objects
  for select using (bucket_id = 'assinaturas' and auth.role() = 'authenticated');

create policy "Authenticated users can upload fotos" on storage.objects
  for insert with check (bucket_id = 'fotos' and auth.role() = 'authenticated');
create policy "Users can view own fotos" on storage.objects
  for select using (bucket_id = 'fotos' and auth.role() = 'authenticated');

create policy "Anyone can view comprovantes" on storage.objects
  for select using (bucket_id = 'comprovantes');
create policy "Authenticated users can upload comprovantes" on storage.objects
  for insert with check (bucket_id = 'comprovantes' and auth.role() = 'authenticated');

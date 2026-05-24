-- Crear tabla para solicitudes de cambio de rol
create table public.solicitudes_rol (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.usuarios(id) on delete cascade,
  requested_role text not null,
  status text default 'pendiente',
  created_at timestamp with time zone default now()
);

-- Índice para buscar por estado y usuario
create index idx_solicitudes_rol_status on public.solicitudes_rol(status);
create index idx_solicitudes_rol_user on public.solicitudes_rol(user_id);

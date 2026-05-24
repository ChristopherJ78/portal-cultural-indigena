-- RLS policies for usuarios table (solo permitir que usuarios vean su propio rol)
create policy "select_self" on public.usuarios for select using (auth.uid() = id);
create policy "insert_self" on public.usuarios for insert with check (auth.uid() = id);

-- RLS policies for solicitudes_rol
create policy "select_self" on public.solicitudes_rol for select using (auth.uid() = user_id);
create policy "insert_self" on public.solicitudes_rol for insert with check (auth.uid() = user_id);
create policy "update_moderator" on public.solicitudes_rol for update using (auth.uid() in (select id from public.usuarios where rol = ANY('{moderador,admin}'::text[]));

-- RLS policies for articulos (solo moderador/admin pueden ver pendientes, cualquiera ve publicados)
create policy "select_published" on public.articulos for select using (estado = 'publicado');
create policy "select_pending_moderator" on public.articulos for select using (estado = 'pendiente' and auth.uid() in (select id from public.usuarios where rol = ANY('{moderador,admin}'::text[])));
create policy "update_moderator" on public.articulos for update using (auth.uid() in (select id from public.usuarios where rol = ANY('{moderador,admin}'::text[])));

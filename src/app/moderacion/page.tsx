'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface Articulo {
  id: string;
  titulo: string;
  descripcion: string;
  subtema: string;
  estado: string;
  resumen?: string;
  contenido?: string;
  fecha_creacion: string;
}

interface SolicitudRol {
  id: string;
  user_id: string;
  requested_role: string;
  status: string;
  created_at: string;
  usuarios?: {
    email: string;
  } | null;
}

interface Usuario {
  id: string;
  email: string;
  rol: string;
}

export default function Moderacion() {
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [solicitudes, setSolicitudes] = useState<SolicitudRol[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [verificando, setVerificando] = useState(true);
  const [esAdmin, setEsAdmin] = useState(false);
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    async function verificarRol() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = '/login';
        return;
      }

      const { data, error } = await supabase
        .from('usuarios')
        .select('rol')
        .eq('id', session.user.id)
        .single();

      if (error || !data || (data.rol !== 'moderador' && data.rol !== 'admin')) {
        window.location.href = '/';
        return;
      }

      setEsAdmin(data.rol === 'admin');
      setVerificando(false);
      cargarDatos();
    }

    verificarRol();
  }, []);

  async function cargarDatos() {
    setCargando(true);

    // Artículos pendientes de aprobación
    const { data: artData } = await supabase
      .from('articulos')
      .select('*')
      .eq('estado', 'pendiente')
      .order('fecha_creacion', { ascending: false });

    // Solicitudes de rol pendientes — usa columnas reales: status, requested_role
    const { data: solData } = await supabase
      .from('solicitudes_rol')
      .select('*, usuarios(email)')
      .eq('status', 'pendiente');

    // Lista de usuarios (visible solo para moderadores/admin por RLS)
    const { data: usuariosData } = await supabase
      .from('usuarios')
      .select('id, email, rol')
      .order('email', { ascending: true });

    if (artData) setArticulos(artData as Articulo[]);
    if (solData) {
      // Cast the relations properly to match the interface
      const formattedSolicitudes = (solData as unknown as {
        id: string;
        user_id: string;
        requested_role: string;
        status: string;
        created_at: string;
        usuarios: { email: string } | { email: string }[] | null;
      }[]).map(sol => ({
        ...sol,
        usuarios: Array.isArray(sol.usuarios) ? sol.usuarios[0] : (sol.usuarios || null)
      })) as SolicitudRol[];
      setSolicitudes(formattedSolicitudes);
    }
    if (usuariosData) setUsuarios(usuariosData as Usuario[]);
    setCargando(false);
  }

  async function cambiarEstadoArticulo(id: string, nuevoEstado: string) {
    const { error } = await supabase
      .from('articulos')
      .update({ estado: nuevoEstado })
      .eq('id', id);

    if (error) {
      setMensaje('❌ Error al actualizar artículo: ' + error.message);
    } else {
      setMensaje(`✅ Artículo marcado como "${nuevoEstado}".`);
      cargarDatos();
    }
  }

  async function procesarSolicitudRol(id: string, userId: string, decision: 'aprobado' | 'rechazado', requestedRole: string) {
    // Si se aprueba, actualizar el rol del usuario
    if (decision === 'aprobado') {
      const { error: rolError } = await supabase
        .from('usuarios')
        .update({ rol: requestedRole })
        .eq('id', userId);
      if (rolError) {
        setMensaje('❌ Error al actualizar rol: ' + rolError.message);
        return;
      }
    }

    // Actualizar el estado de la solicitud
    const { error } = await supabase
      .from('solicitudes_rol')
      .update({ status: decision })
      .eq('id', id);

    if (error) {
      setMensaje('❌ Error al procesar solicitud: ' + error.message);
    } else {
      setMensaje(`✅ Solicitud de rol ${decision}.`);
      cargarDatos();
    }
  }

  async function promoverAAdmin(userId: string) {
    const { error } = await supabase
      .from('usuarios')
      .update({ rol: 'admin' })
      .eq('id', userId);

    if (error) {
      setMensaje('❌ Error al promover a admin: ' + error.message);
    } else {
      setMensaje('✅ Usuario promovido a admin.');
      cargarDatos();
    }
  }

  if (verificando) {
    return (
      <main className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>
        <p>Verificando permisos...</p>
      </main>
    );
  }

  return (
    <main className="container">
      <h1 style={{ textAlign: 'center' }}>Panel de Moderación</h1>

      {mensaje && (
        <div className="alert" style={{ marginBottom: '1rem', padding: '1rem', borderRadius: '8px', background: 'var(--glass-border)', color: 'white' }}>
          {mensaje}
        </div>
      )}

      {/* ── Artículos pendientes ── */}
      <section>
        <h2>📄 Artículos Pendientes</h2>
        {cargando ? (
          <p>Cargando...</p>
        ) : articulos.length === 0 ? (
          <p style={{ color: '#94a3b8' }}>No hay artículos pendientes de revisión.</p>
        ) : (
          <div className="grid">
            {articulos.map((art) => (
              <div key={art.id} className="card">
                <h3>{art.titulo}</h3>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{art.resumen || art.contenido?.slice(0, 120) + '…'}</p>
                <div style={{ display: 'flex', gap: '10px', marginTop: '1rem' }}>
                  <button className="btn btn-primary" onClick={() => cambiarEstadoArticulo(art.id, 'aprobado')}>
                    ✅ Publicar
                  </button>
                  <button className="btn btn-secondary" onClick={() => cambiarEstadoArticulo(art.id, 'rechazado')}>
                    ❌ Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Solicitudes de rol ── */}
      <section style={{ marginTop: '3rem' }}>
        <h2>🎭 Solicitudes de Rol</h2>
        {solicitudes.length === 0 ? (
          <p style={{ color: '#94a3b8' }}>No hay solicitudes de rol pendientes.</p>
        ) : (
          <div className="grid">
            {solicitudes.map((sol) => (
              <div key={sol.id} className="card">
                <p><strong>Usuario:</strong> {sol.usuarios?.email ?? sol.user_id}</p>
                <p><strong>Rol solicitado:</strong> {sol.requested_role}</p>
                <div style={{ display: 'flex', gap: '10px', marginTop: '1rem' }}>
                  <button className="btn btn-primary" onClick={() => procesarSolicitudRol(sol.id, sol.user_id, 'aprobado', sol.requested_role)}>
                    ✅ Aprobar
                  </button>
                  <button className="btn btn-secondary" onClick={() => procesarSolicitudRol(sol.id, sol.user_id, 'rechazado', sol.requested_role)}>
                    ❌ Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Lista de usuarios (solo admin) ── */}
      {esAdmin && (
        <section style={{ marginTop: '3rem' }}>
          <h2>👥 Todos los Usuarios</h2>
          {usuarios.length === 0 ? (
            <p style={{ color: '#94a3b8' }}>No hay usuarios registrados.</p>
          ) : (
            <div className="grid">
              {usuarios.map((u) => (
                <div key={u.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontWeight: 'bold' }}>{u.email}</p>
                    <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Rol: <strong>{u.rol}</strong></p>
                  </div>
                  {u.rol !== 'admin' && (
                    <button className="btn btn-secondary" style={{ fontSize: '0.8rem' }} onClick={() => promoverAAdmin(u.id)}>
                      Promover a Admin
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}

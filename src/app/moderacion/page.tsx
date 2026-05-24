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
  fecha_creacion: string;
  autor_id: string;
  imagenes?: { url: string }[];
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

  // Estados para el Modal de Revisión y Edición
  const [articuloSeleccionado, setArticuloSeleccionado] = useState<Articulo | null>(null);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [editTitulo, setEditTitulo] = useState('');
  const [editSubtema, setEditSubtema] = useState('cultura');
  const [editDescripcion, setEditDescripcion] = useState('');
  const [editImagenUrl, setEditImagenUrl] = useState('');
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

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

    // Artículos pendientes con sus imágenes
    const { data: artData } = await supabase
      .from('articulos')
      .select('*, imagenes(url)')
      .eq('estado', 'pendiente')
      .order('fecha_creacion', { ascending: false });

    // Solicitudes de rol pendientes
    const { data: solData } = await supabase
      .from('solicitudes_rol')
      .select('*, usuarios(email)')
      .eq('status', 'pendiente');

    // Lista de usuarios (visible para moderador/admin)
    const { data: usuariosData } = await supabase
      .from('usuarios')
      .select('id, email, rol')
      .order('email', { ascending: true });

    if (artData) setArticulos(artData as Articulo[]);
    if (solData) {
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
      setArticuloSeleccionado(null);
      setModoEdicion(false);
      cargarDatos();
    }
  }

  async function handleEliminarArticulo(id: string) {
    if (!confirm('¿Estás seguro de que deseas eliminar este artículo por completo?')) return;

    const { error } = await supabase
      .from('articulos')
      .delete()
      .eq('id', id);

    if (error) {
      setMensaje('❌ Error al eliminar el artículo: ' + error.message);
    } else {
      setMensaje('✅ Artículo eliminado permanentemente.');
      setArticuloSeleccionado(null);
      setModoEdicion(false);
      cargarDatos();
    }
  }

  async function abrirRevision(art: Articulo) {
    setArticuloSeleccionado(art);
    setEditTitulo(art.titulo);
    setEditSubtema(art.subtema);
    setEditDescripcion(art.descripcion);
    setEditImagenUrl(art.imagenes?.[0]?.url || '');
    setModoEdicion(false);
  }

  async function handleGuardarEdicion() {
    if (!articuloSeleccionado) return;
    setGuardandoEdicion(true);

    try {
      // 1. Actualizar datos básicos del artículo
      const { error: artError } = await supabase
        .from('articulos')
        .update({
          titulo: editTitulo,
          subtema: editSubtema,
          descripcion: editDescripcion
        })
        .eq('id', articuloSeleccionado.id);

      if (artError) throw new Error(artError.message);

      // 2. Actualizar o insertar imagen
      if (editImagenUrl.trim()) {
        const tieneImagenPrevia = articuloSeleccionado.imagenes && articuloSeleccionado.imagenes.length > 0;
        
        if (tieneImagenPrevia) {
          // Actualizar imagen existente
          const { error: imgError } = await supabase
            .from('imagenes')
            .update({ url: editImagenUrl.trim() })
            .eq('articulo_id', articuloSeleccionado.id);
          if (imgError) console.error('Error al actualizar imagen:', imgError.message);
        } else {
          // Insertar nueva imagen
          const { error: imgError } = await supabase
            .from('imagenes')
            .insert({
              url: editImagenUrl.trim(),
              articulo_id: articuloSeleccionado.id,
              descripcion: `Imagen de ${editTitulo}`
            });
          if (imgError) console.error('Error al guardar nueva imagen:', imgError.message);
        }
      }

      setMensaje('✅ Cambios guardados correctamente.');
      
      // Actualizar estado local del artículo seleccionado
      setArticuloSeleccionado({
        ...articuloSeleccionado,
        titulo: editTitulo,
        subtema: editSubtema,
        descripcion: editDescripcion,
        imagenes: editImagenUrl.trim() ? [{ url: editImagenUrl.trim() }] : []
      });
      setModoEdicion(false);
      cargarDatos();
    } catch (err) {
      setMensaje('❌ Error al guardar edición: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setGuardandoEdicion(false);
    }
  }

  async function procesarSolicitudRol(id: string, userId: string, decision: 'aprobado' | 'rechazado', requestedRole: string) {
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
        <div className="alert" style={{ marginBottom: '1.5rem', padding: '1rem', borderRadius: '8px', background: 'var(--glass-border)', color: 'white' }}>
          {mensaje}
        </div>
      )}

      {/* ── Artículos pendientes ── */}
      <section>
        <h2>📄 Artículos Pendientes de Aprobación</h2>
        {cargando ? (
          <p>Cargando...</p>
        ) : articulos.length === 0 ? (
          <p style={{ color: '#94a3b8' }}>No hay artículos pendientes de revisión.</p>
        ) : (
          <div className="grid">
            {articulos.map((art) => (
              <div key={art.id} className="card glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>
                  {art.subtema}
                </span>
                <h3 style={{ margin: '0' }}>{art.titulo}</h3>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8', flex: 1 }}>
                  {art.resumen || (art.descripcion.length > 120 ? art.descripcion.slice(0, 120) + '…' : art.descripcion)}
                </p>
                <div style={{ display: 'flex', gap: '10px', marginTop: '1rem', flexWrap: 'wrap' }}>
                  <button className="btn btn-primary" onClick={() => abrirRevision(art)}>
                    🔎 Revisar
                  </button>
                  <button className="btn btn-secondary" onClick={() => cambiarEstadoArticulo(art.id, 'aprobado')}>
                    ✅ Aprobar
                  </button>
                  <button className="btn btn-secondary" style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgb(239, 68, 68)', color: 'rgb(248, 113, 113)' }} onClick={() => handleEliminarArticulo(art.id)}>
                    ❌ Eliminar
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
              <div key={sol.id} className="card glass-panel">
                <p style={{ margin: '0 0 0.5rem 0' }}><strong>Usuario:</strong> {sol.usuarios?.email ?? sol.user_id}</p>
                <p style={{ margin: '0 0 1rem 0' }}><strong>Rol solicitado:</strong> {sol.requested_role}</p>
                <div style={{ display: 'flex', gap: '10px' }}>
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
                <div key={u.id} className="card glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontWeight: 'bold', margin: '0' }}>{u.email}</p>
                    <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0.25rem 0 0 0' }}>Rol: <strong>{u.rol}</strong></p>
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

      {/* ── MODAL DE REVISIÓN Y EDICIÓN (Glassmorphism) ── */}
      {articuloSeleccionado && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 1000, padding: '1.5rem'
        }}>
          <div className="card glass-panel" style={{
            maxWidth: '750px', width: '100%', maxHeight: '90vh', overflowY: 'auto',
            display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '2rem'
          }}>
            {!modoEdicion ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>
                    Revisión de Contenido ({articuloSeleccionado.subtema})
                  </span>
                  <button className="btn btn-secondary" style={{ padding: '0.2rem 0.6rem' }} onClick={() => setArticuloSeleccionado(null)}>✕</button>
                </div>

                <h2 style={{ fontSize: '2rem', margin: '0' }}>{articuloSeleccionado.titulo}</h2>
                
                {articuloSeleccionado.imagenes && articuloSeleccionado.imagenes.length > 0 && (
                  <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--glass-border)', maxHeight: '250px' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={articuloSeleccionado.imagenes[0].url} 
                      alt={articuloSeleccionado.titulo} 
                      style={{ width: '100%', height: 'auto', maxHeight: '250px', objectFit: 'cover' }} 
                    />
                  </div>
                )}

                <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '1.05rem', margin: '0', color: '#e2e8f0', overflowY: 'auto' }}>
                  {articuloSeleccionado.descripcion}
                </p>

                <div style={{ display: 'flex', gap: '10px', marginTop: '1rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
                  <button className="btn btn-primary" onClick={() => cambiarEstadoArticulo(articuloSeleccionado.id, 'aprobado')}>
                    ✅ Aprobar y Publicar
                  </button>
                  <button className="btn btn-secondary" onClick={() => setModoEdicion(true)}>
                    ✏️ Editar Contenido
                  </button>
                  <button className="btn btn-secondary" style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgb(239, 68, 68)', color: 'rgb(248, 113, 113)' }} onClick={() => handleEliminarArticulo(articuloSeleccionado.id)}>
                    ❌ Eliminar
                  </button>
                  <button className="btn btn-secondary" style={{ marginLeft: 'auto' }} onClick={() => setArticuloSeleccionado(null)}>
                    Cerrar
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: '#eab308', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>
                    Modo Editor de Moderador
                  </span>
                  <button className="btn btn-secondary" style={{ padding: '0.2rem 0.6rem' }} onClick={() => setModoEdicion(false)}>✕</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Título</label>
                    <input 
                      type="text" 
                      value={editTitulo} 
                      onChange={(e) => setEditTitulo(e.target.value)}
                      style={{ padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white', outline: 'none' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Subtema</label>
                    <select 
                      value={editSubtema} 
                      onChange={(e) => setEditSubtema(e.target.value)}
                      style={{ padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white', outline: 'none' }}
                    >
                      <option value="cultura" style={{color: 'black'}}>Cultura</option>
                      <option value="historia" style={{color: 'black'}}>Historia</option>
                      <option value="arte" style={{color: 'black'}}>Arte</option>
                      <option value="arquitectura" style={{color: 'black'}}>Arquitectura</option>
                      <option value="vestimenta" style={{color: 'black'}}>Vestimenta</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>URL de Imagen</label>
                    <input 
                      type="url" 
                      value={editImagenUrl} 
                      onChange={(e) => setEditImagenUrl(e.target.value)}
                      placeholder="https://ejemplo.com/foto.jpg"
                      style={{ padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white', outline: 'none' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Contenido Completo</label>
                    <textarea 
                      value={editDescripcion} 
                      onChange={(e) => setEditDescripcion(e.target.value)}
                      rows={8}
                      style={{ padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white', outline: 'none', resize: 'vertical' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '1rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
                  <button className="btn btn-primary" disabled={guardandoEdicion} onClick={handleGuardarEdicion}>
                    {guardandoEdicion ? 'Guardando...' : '💾 Guardar Cambios'}
                  </button>
                  <button className="btn btn-secondary" onClick={() => setModoEdicion(false)}>
                    Cancelar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

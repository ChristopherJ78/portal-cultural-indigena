'use client';

import { use, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import Link from 'next/link';

interface Articulo {
  id: string;
  titulo: string;
  descripcion: string;
  subtema: string;
  estado: string;
  fecha_creacion: string;
  autor_id: string;
}

interface Imagen {
  id: string;
  url: string;
  descripcion?: string;
}

interface Comentario {
  id: string;
  texto: string;
  usuario_id: string;
  fecha: string;
  usuarios?: {
    nombre: string;
    email: string;
  } | null;
}

export default function DetalleArticulo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [articulo, setArticulo] = useState<Articulo | null>(null);
  const [imagenes, setImagenes] = useState<Imagen[]>([]);
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [usuarioActual, setUsuarioActual] = useState<string | null>(null);
  const [rolUsuario, setRolUsuario] = useState('visitante');
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [publicandoComentario, setPublicandoComentario] = useState(false);

  useEffect(() => {
    async function inicializar() {
      // 1. Obtener sesión y rol del usuario
      const { data: { session } } = await supabase.auth.getSession();
      let userId = '';
      let userRole = 'visitante';
      if (session?.user) {
        userId = session.user.id;
        setUsuarioActual(userId);
        const { data: userData } = await supabase
          .from('usuarios')
          .select('rol')
          .eq('id', userId)
          .single();
        if (userData) {
          userRole = userData.rol;
          setRolUsuario(userRole);
        }
      }

      // 2. Obtener el artículo por ID
      const { data: artData, error: artErr } = await supabase
        .from('articulos')
        .select('*')
        .eq('id', id)
        .single();

      if (artErr || !artData) {
        setErrorMsg('El artículo solicitado no existe o no pudo cargarse.');
        setCargando(false);
        return;
      }

      const art = artData as Articulo;

      // 3. Validar permisos para ver artículos pendientes/rechazados
      const esAutor = art.autor_id === userId;
      const esModOAdmin = userRole === 'moderador' || userRole === 'admin';

      if (art.estado !== 'aprobado' && !esAutor && !esModOAdmin) {
        setErrorMsg('No tienes permisos para visualizar este artículo ya que está pendiente de aprobación.');
        setCargando(false);
        return;
      }

      setArticulo(art);

      // 4. Obtener las imágenes asociadas
      const { data: imgData } = await supabase
        .from('imagenes')
        .select('*')
        .eq('articulo_id', id);

      if (imgData) {
        setImagenes(imgData as Imagen[]);
      }

      // 5. Obtener los comentarios asociados
      const { data: comData } = await supabase
        .from('comentarios')
        .select('*, usuarios(nombre, email)')
        .eq('articulo_id', id)
        .order('fecha', { ascending: true });

      if (comData) {
        const formattedComs = (comData as unknown as {
          id: string;
          texto: string;
          usuario_id: string;
          fecha: string;
          usuarios: { nombre: string; email: string } | { nombre: string; email: string }[] | null;
        }[]).map(c => ({
          ...c,
          usuarios: Array.isArray(c.usuarios) ? c.usuarios[0] : (c.usuarios || null)
        })) as Comentario[];
        setComentarios(formattedComs);
      }

      setCargando(false);
    }

    inicializar();
  }, [id]);

  async function handleEnviarComentario(e: React.FormEvent) {
    e.preventDefault();
    if (!usuarioActual || !nuevoComentario.trim()) return;
    setPublicandoComentario(true);

    try {
      const { data, error } = await supabase
        .from('comentarios')
        .insert({
          texto: nuevoComentario.trim(),
          articulo_id: id,
          usuario_id: usuarioActual
        })
        .select('*, usuarios(nombre, email)');

      if (error) {
        alert('Error al publicar comentario: ' + error.message);
      } else if (data) {
        const insertado = data[0];
        const formatted = {
          ...insertado,
          usuarios: Array.isArray(insertado.usuarios) ? insertado.usuarios[0] : (insertado.usuarios || null)
        } as Comentario;
        setComentarios(prev => [...prev, formatted]);
        setNuevoComentario('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPublicandoComentario(false);
    }
  }

  async function handleEliminarComentario(comId: string) {
    if (!confirm('¿Estás seguro de que deseas eliminar este comentario?')) return;

    const { error } = await supabase
      .from('comentarios')
      .delete()
      .eq('id', comId);

    if (error) {
      alert('Error al eliminar comentario: ' + error.message);
    } else {
      setComentarios(prev => prev.filter(c => c.id !== comId));
    }
  }

  if (cargando) {
    return (
      <main className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>
        <p>Cargando artículo...</p>
      </main>
    );
  }

  if (errorMsg || !articulo) {
    return (
      <main className="container" style={{ textAlign: 'center', marginTop: '4rem', maxWidth: '600px' }}>
        <div className="card glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h2 style={{ color: 'var(--accent)' }}>Acceso Restringido</h2>
          <p>{errorMsg || 'No se pudo cargar la información del artículo.'}</p>
          <Link href="/catalogo" className="btn btn-secondary">
            Volver al Catálogo
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="container" style={{ maxWidth: '800px', marginTop: '2rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/catalogo" className="btn btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
          ← Volver al Catálogo
        </Link>
      </div>

      <article className="card glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '2.5rem' }}>
        <header style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>
              {articulo.subtema}
            </span>
            {articulo.estado !== 'aprobado' && (
              <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: '#eab308', color: 'black', borderRadius: '4px', fontWeight: 'bold' }}>
                Pendiente de Aprobación
              </span>
            )}
          </div>
          <h1 style={{ fontSize: '2.5rem', lineHeight: '1.2', margin: '0' }}>{articulo.titulo}</h1>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0' }}>
            Publicado el {new Date(articulo.fecha_creacion).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </header>

        {/* Galería de Imágenes */}
        {imagenes.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {imagenes.map((img) => (
              <div key={img.id} style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={img.url} 
                  alt={img.descripcion || articulo.titulo} 
                  style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '450px', objectFit: 'cover' }} 
                />
                {img.descripcion && (
                  <p style={{ padding: '0.75rem 1rem', margin: '0', fontSize: '0.85rem', color: '#94a3b8', background: 'rgba(0,0,0,0.3)', borderTop: '1px solid var(--glass-border)' }}>
                    {img.descripcion}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Contenido / Descripción */}
        <section style={{ fontSize: '1.1rem', lineHeight: '1.7', whiteSpace: 'pre-wrap', color: '#e2e8f0', borderBottom: '1px solid var(--glass-border)', paddingBottom: '2.5rem' }}>
          {articulo.descripcion}
        </section>

        {/* Sección de Comentarios */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
          <h3 style={{ fontSize: '1.5rem', margin: '0' }}>💬 Comentarios ({comentarios.length})</h3>

          {/* Listado de comentarios */}
          {comentarios.length === 0 ? (
            <p style={{ color: '#94a3b8', fontStyle: 'italic', margin: '0' }}>Aún no hay comentarios. ¡Sé el primero en opinar!</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {comentarios.map((com) => {
                const esDueno = com.usuario_id === usuarioActual;
                const esModOAdmin = rolUsuario === 'moderador' || rolUsuario === 'admin';
                return (
                  <div key={com.id} className="card glass-panel" style={{ padding: '1rem 1.25rem', background: 'rgba(255,255,255,0.03)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--primary)' }}>
                        {com.usuarios?.nombre || com.usuarios?.email || 'Comentarista'}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        {new Date(com.fecha).toLocaleDateString('es-MX', { hour: '2-digit', minute: '2-digit' } as Intl.DateTimeFormatOptions)}
                      </span>
                    </div>
                    <p style={{ margin: '0', fontSize: '0.95rem', color: '#e2e8f0', whiteSpace: 'pre-wrap' }}>{com.texto}</p>
                    {(esDueno || esModOAdmin) && (
                      <button 
                        onClick={() => handleEliminarComentario(com.id)}
                        style={{
                          alignSelf: 'flex-end', background: 'none', border: 'none', 
                          color: 'rgb(248, 113, 113)', fontSize: '0.8rem', cursor: 'pointer', padding: '0',
                          textDecoration: 'underline'
                        }}
                      >
                        Eliminar comentario
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Formulario para agregar comentarios */}
          {rolUsuario !== 'visitante' ? (
            <form onSubmit={handleEnviarComentario} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
              <label htmlFor="comentarioInput" style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>Escribe un comentario</label>
              <textarea
                id="comentarioInput"
                value={nuevoComentario}
                onChange={(e) => setNuevoComentario(e.target.value)}
                placeholder="Escribe tu opinión o comparte información adicional..."
                required
                rows={3}
                style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white', outline: 'none', resize: 'vertical' }}
              />
              <button type="submit" className="btn btn-primary" disabled={publicandoComentario} style={{ alignSelf: 'flex-start', padding: '0.5rem 1.5rem', fontSize: '0.9rem' }}>
                {publicandoComentario ? 'Publicando...' : 'Enviar Comentario'}
              </button>
            </form>
          ) : (
            <div style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', textAlign: 'center', border: '1px dashed var(--glass-border)' }}>
              <p style={{ margin: '0', fontSize: '0.9rem', color: '#94a3b8' }}>
                ¿Quieres comentar? <Link href="/login" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Inicia sesión</Link> o <Link href="/registro" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Regístrate</Link> para unirte a la conversación.
              </p>
            </div>
          )}
        </section>
      </article>
    </main>
  );
}

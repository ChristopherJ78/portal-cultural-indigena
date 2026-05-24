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

export default function DetalleArticulo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [articulo, setArticulo] = useState<Articulo | null>(null);
  const [imagenes, setImagenes] = useState<Imagen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function inicializar() {
      // 1. Obtener sesión y rol del usuario
      const { data: { session } } = await supabase.auth.getSession();
      let userId = '';
      let userRole = 'visitante';
      if (session?.user) {
        userId = session.user.id;
        const { data: userData } = await supabase
          .from('usuarios')
          .select('rol')
          .eq('id', userId)
          .single();
        if (userData) {
          userRole = userData.rol;
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

      setCargando(false);
    }

    inicializar();
  }, [id]);

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
        <section style={{ fontSize: '1.1rem', lineHeight: '1.7', whiteSpace: 'pre-wrap', color: '#e2e8f0' }}>
          {articulo.descripcion}
        </section>
      </article>
    </main>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';

interface Articulo {
  id: string;
  titulo: string;
  descripcion: string;
  subtema: string;
  resumen?: string;
  fecha_creacion: string;
  imagenes?: { url: string }[];
}

export default function Catalogo() {
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [rol, setRol] = useState('visitante');
  const [cargando, setCargando] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function inicializar() {
      // 1. Obtener sesión y rol de usuario actual
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: userData } = await supabase
          .from('usuarios')
          .select('rol')
          .eq('id', session.user.id)
          .single();
        if (userData) {
          setRol(userData.rol);
        }
      }

      // 2. Cargar artículos con sus imágenes
      const { data, error } = await supabase
        .from('articulos')
        .select('*, imagenes(url)')
        .eq('estado', 'aprobado')
        .order('fecha_creacion', { ascending: false });

      if (error) {
        setErrorMsg(error.message);
      } else if (data) {
        setArticulos(data as Articulo[]);
      }
      setCargando(false);
    }

    inicializar();
  }, []);

  const handleEliminar = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este artículo por completo? Esta acción es irreversible.')) return;
    
    const { error } = await supabase
      .from('articulos')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Error al eliminar el artículo: ' + error.message);
    } else {
      setArticulos(prev => prev.filter(art => art.id !== id));
      alert('Artículo eliminado exitosamente.');
    }
  };

  if (cargando) {
    return (
      <main className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>
        <p>Cargando catálogo...</p>
      </main>
    );
  }

  return (
    <main className="container">
      <h1 style={{ textAlign: 'center' }}>Catálogo Cultural</h1>
      <p style={{ textAlign: 'center', marginBottom: '3rem' }}>
        Explora todos los artículos, tradiciones y conocimientos validados por nuestras comunidades.
      </p>

      {errorMsg && (
        <div style={{ color: 'red', textAlign: 'center', marginBottom: '2rem' }}>
          Ocurrió un error al cargar el catálogo: {errorMsg}
        </div>
      )}

      {articulos.length === 0 ? (
        <div className="card glass-panel" style={{ textAlign: 'center' }}>
          <p>Aún no hay contenido publicado en esta sección. ¡Sé el primero en contribuir!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2">
          {articulos.map((art) => {
            const tieneImagen = art.imagenes && art.imagenes.length > 0;
            return (
              <div key={art.id} className="card glass-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '0' }}>
                {tieneImagen && (
                  <div style={{ width: '100%', height: '200px', overflow: 'hidden', borderBottom: '1px solid var(--glass-border)' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={art.imagenes?.[0].url} 
                      alt={art.titulo} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  </div>
                )}
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1, gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>
                    {art.subtema}
                  </span>
                  <h2 style={{ fontSize: '1.5rem', margin: '0' }}>{art.titulo}</h2>
                  <p style={{ flex: 1, margin: '0' }}>
                    {art.resumen || (art.descripcion.length > 120 ? art.descripcion.substring(0, 120) + '...' : art.descripcion)}
                  </p>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '1rem', flexWrap: 'wrap' }}>
                    <Link href={`/catalogo/${art.id}`} className="btn btn-secondary" style={{ textDecoration: 'none', textAlign: 'center' }}>
                      Leer más
                    </Link>
                    {(rol === 'moderador' || rol === 'admin') && (
                      <button 
                        onClick={() => handleEliminar(art.id)} 
                        className="btn btn-secondary" 
                        style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgb(239, 68, 68)', color: 'rgb(248, 113, 113)' }}
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

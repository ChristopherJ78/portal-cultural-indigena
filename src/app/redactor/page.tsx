'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function Redactor() {
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [subtema, setSubtema] = useState('cultura');
  const [imagenUrl, setImagenUrl] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(false);
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [verificando, setVerificando] = useState(true);

  // Verificar sesión al montar
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        window.location.href = '/login';
      } else {
        setUsuarioId(session.user.id);
        setVerificando(false);
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioId) return;
    setCargando(true);
    setMensaje('');

    try {
      const { data, error } = await supabase
        .from('articulos')
        .insert([
          { titulo, descripcion, subtema, estado: 'pendiente', autor_id: usuarioId }
        ])
        .select();

      if (error) {
        setMensaje('Error al enviar la propuesta: ' + error.message);
      } else {
        const articuloId = data?.[0]?.id;
        if (articuloId && imagenUrl.trim()) {
          const { error: imgError } = await supabase
            .from('imagenes')
            .insert([
              { url: imagenUrl.trim(), articulo_id: articuloId, descripcion: `Imagen de ${titulo}` }
            ]);
          if (imgError) {
            console.error('Error al guardar la imagen:', imgError.message);
          }
        }
        setMensaje('¡Propuesta enviada con éxito! Está en estado Pendiente para moderación.');
        setTitulo('');
        setDescripcion('');
        setImagenUrl('');
      }
    } catch (err) {
      setMensaje('Error inesperado: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setCargando(false);
    }
  };

  if (verificando) {
    return (
      <main className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>
        <p>Verificando permisos...</p>
      </main>
    );
  }

  return (
    <main className="container" style={{ maxWidth: '800px' }}>
      <h1>Zona del Redactor</h1>
      <p>Propón un nuevo artículo cultural. Será enviado al equipo de Moderación antes de publicarse.</p>

      {mensaje && (
        <div style={{ padding: '1rem', background: 'var(--glass-bg)', border: '1px solid var(--accent)', borderRadius: '8px', marginBottom: '2rem', color: 'white' }}>
          {mensaje}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label htmlFor="titulo" style={{ fontWeight: 'bold' }}>Título del Artículo</label>
          <input 
            id="titulo"
            type="text" 
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            required
            style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white', outline: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label htmlFor="subtema" style={{ fontWeight: 'bold' }}>Subtema</label>
          <select 
            id="subtema"
            value={subtema}
            onChange={(e) => setSubtema(e.target.value)}
            style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white', outline: 'none' }}
          >
            <option value="cultura" style={{color: 'black'}}>Cultura</option>
            <option value="historia" style={{color: 'black'}}>Historia</option>
            <option value="arte" style={{color: 'black'}}>Arte</option>
            <option value="arquitectura" style={{color: 'black'}}>Arquitectura</option>
            <option value="vestimenta" style={{color: 'black'}}>Vestimenta</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label htmlFor="imagenUrl" style={{ fontWeight: 'bold' }}>URL de Imagen Ilustrativa (Opcional)</label>
          <input 
            id="imagenUrl"
            type="url" 
            value={imagenUrl}
            onChange={(e) => setImagenUrl(e.target.value)}
            placeholder="https://ejemplo.com/imagen.jpg"
            style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white', outline: 'none' }}
          />
          {imagenUrl.trim() && (
            <div style={{ marginTop: '0.5rem', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--glass-border)', maxHeight: '200px' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagenUrl.trim()} alt="Vista previa" style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '200px', objectFit: 'cover' }} />
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label htmlFor="descripcion" style={{ fontWeight: 'bold' }}>Contenido / Descripción</label>
          <textarea 
            id="descripcion"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            required
            rows={6}
            style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white', outline: 'none', resize: 'vertical' }}
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={cargando}>
          {cargando ? 'Enviando...' : 'Enviar a Moderación'}
        </button>
      </form>
    </main>
  );
}

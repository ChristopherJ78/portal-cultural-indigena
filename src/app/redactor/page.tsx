'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function Redactor() {
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [subtema, setSubtema] = useState('cultura');
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setMensaje('');

    try {
      // Inserción básica a Supabase. Nota: RLS podría fallar si el usuario no está autenticado,
      // pero para la demostración insertaremos de todos modos, asegúrate de tener una política que lo permita
      // o inicia sesión primero.
      const { error } = await supabase
        .from('articulos')
        .insert([
          { titulo, descripcion, subtema, estado: 'pendiente' }
        ]);

      if (error) {
        setMensaje('Error al enviar la propuesta: ' + error.message);
      } else {
        setMensaje('¡Propuesta enviada con éxito! Está en estado Pendiente para moderación.');
        setTitulo('');
        setDescripcion('');
      }
    } catch (err: any) {
      setMensaje('Error inesperado: ' + err.message);
    } finally {
      setCargando(false);
    }
  };

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

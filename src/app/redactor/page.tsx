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

  // Estados para el Asistente de IA (Gemini)
  const [iaCargando, setIaCargando] = useState(false);
  const [iaStatus, setIaStatus] = useState('');
  const [iaError, setIaError] = useState('');

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

  // Función 1: Generar Borrador del Artículo con IA
  const handleGenerarBorrador = async () => {
    if (!titulo.trim()) {
      setIaError('Por favor, escribe un título primero para poder guiar a la IA.');
      return;
    }

    setIaCargando(true);
    setIaError('');
    setIaStatus('Investigando historia y redactando borrador con Gemini...');

    const promptText = `Actúa como un historiador y antropólogo experto en culturas originarias y pueblos indígenas de México. 
Escribe un artículo detallado, respetuoso, culturalmente preciso y educativo titulado "${titulo}" bajo la categoría o subtema de "${subtema}".
Redacta en español, con un tono formal, literario e informativo. Escribe entre 4 y 5 párrafos estructurados que cubran:
1. El origen histórico y geográfico de esta tradición o concepto.
2. Su significado simbólico y elementos representativos.
3. Cómo se vive, practica o preserva en las comunidades indígenas en la actualidad.
4. Su importancia en la identidad cultural de México.

No incluyas introducciones como "Claro, aquí tienes el artículo", ni notas finales, ni títulos internos en formato Markdown. Devuelve directamente los párrafos de texto limpios listos para su publicación.`;

    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: promptText }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al conectar con el servidor de IA.');
      }

      setDescripcion(data.text);
      setIaStatus('¡Borrador generado con éxito! Puedes revisarlo y modificarlo en la caja de abajo.');
    } catch (err: any) {
      setIaError(err.message || 'Error al comunicarse con el Asistente de IA.');
    } finally {
      setIaCargando(false);
    }
  };

  // Función 2: Agregar Glosario en Lengua Indígena con IA
  const handleAgregarGlosario = async () => {
    if (!descripcion.trim()) {
      setIaError('Escribe o genera una descripción primero para poder extraer vocabulario.');
      return;
    }

    setIaCargando(true);
    setIaError('');
    setIaStatus('Analizando el artículo y extrayendo glosario indígena...');

    const promptText = `A partir del siguiente texto sobre cultura o tradiciones mexicanas:
"${descripcion}"

Identifica de 3 a 4 palabras clave o términos culturales en lenguas originarias mexicanas (ej. náhuatl, maya, purépecha, zapoteco, mixteco, etc.) o conceptos históricos relevantes mencionados en el texto.
Genera una sección especial al final del artículo titulada "=== Glosario y Lenguas Originarias ===" que contenga una lista clara con cada concepto.
Para cada término, incluye:
- El término original destacado en negritas.
- Su lengua de origen (por ejemplo: [Náhuatl], [Maya]).
- Su significado exacto y contexto cultural.
- Una guía de pronunciación fonética sencilla.

Devuelve EXCLUSIVAMENTE esta nueva sección de forma limpia en español, sin preámbulos, para poder concatenarla al final del artículo.`;

    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: promptText }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al conectar con el servidor de IA.');
      }

      // Concatenar el glosario generado a la descripción actual
      setDescripcion((prev) => `${prev}\n\n${data.text}`);
      setIaStatus('¡Glosario en lengua originaria agregado al final de tu artículo con éxito!');
    } catch (err: any) {
      setIaError(err.message || 'Error al comunicarse con el Asistente de IA.');
    } finally {
      setIaCargando(false);
    }
  };

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
        setIaStatus('');
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
    <main className="container" style={{ maxWidth: '850px' }}>
      <h1>Zona del Redactor</h1>
      <p>Propón un nuevo artículo cultural. Será enviado al equipo de Moderación antes de publicarse.</p>

      {mensaje && (
        <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--accent)', borderRadius: '8px', marginBottom: '2rem', color: '#10b981', fontWeight: 'bold' }}>
          {mensaje}
        </div>
      )}

      {/* PANEL DEL ASISTENTE DE IA GEMINI */}
      <section className="card glass-panel" style={{ marginBottom: '2rem', border: '1px solid rgba(249, 115, 22, 0.3)', backgroundImage: 'radial-gradient(circle at 100% 0%, rgba(249, 115, 22, 0.15), transparent 40%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '1.75rem' }}>✨</span>
          <div>
            <h2 style={{ fontSize: '1.25rem', margin: 0, background: 'linear-gradient(135deg, #f97316, #fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 'bold' }}>
              Asistente de Redacción Inteligente (Gemini AI)
            </h2>
            <p style={{ fontSize: '0.85rem', margin: 0, color: '#94a3b8' }}>
              Servicio en la nube (SaaS) integrado para enriquecer la memoria de los pueblos indígenas.
            </p>
          </div>
        </div>

        <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
          Usa el poder de la Inteligencia Artificial de Google para estructurar borradores históricos completos basados en tu título, o para extraer y añadir secciones lingüísticas originarias (vocabulario) automáticamente.
        </p>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleGenerarBorrador}
            disabled={iaCargando}
            style={{ fontSize: '0.85rem', padding: '0.5rem 1.25rem', background: 'var(--primary)' }}
          >
            {iaCargando ? '⌛ Procesando...' : '📝 Generar Borrador del Artículo'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleAgregarGlosario}
            disabled={iaCargando}
            style={{ fontSize: '0.85rem', padding: '0.5rem 1.25rem' }}
          >
            {iaCargando ? '⌛ Procesando...' : '🌐 Agregar Glosario Indígena'}
          </button>
        </div>

        {iaCargando && (
          <div style={{ padding: '0.75rem', background: 'rgba(30,41,59,0.4)', borderRadius: '8px', border: '1px dashed #f97316', display: 'flex', alignItems: 'center', gap: '0.75rem', animation: 'pulse 1.5s infinite' }}>
            <div className="spinner" style={{ width: '16px', height: '16px', border: '2px solid transparent', borderTopColor: '#f97316', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ fontSize: '0.85rem', color: '#f97316' }}>{iaStatus}</span>
          </div>
        )}

        {iaStatus && !iaCargando && (
          <div style={{ fontSize: '0.85rem', color: 'var(--accent)', padding: '0.5rem 0' }}>
            {iaStatus}
          </div>
        )}

        {iaError && (
          <div style={{ fontSize: '0.85rem', color: '#f87171', padding: '0.5rem', background: 'rgba(220, 38, 38, 0.1)', border: '1px solid #ef4444', borderRadius: '8px', marginTop: '0.5rem' }}>
            ⚠️ {iaError}
          </div>
        )}
      </section>

      {/* FORMULARIO DE ENVÍO */}
      <form onSubmit={handleSubmit} className="card glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label htmlFor="titulo" style={{ fontWeight: 'bold' }}>Título del Artículo</label>
          <input 
            id="titulo"
            type="text" 
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ej. El simbolismo del Maíz y la ceremonia del Centéotl"
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
            rows={12}
            placeholder="Escribe el contenido de tu artículo aquí o utiliza las herramientas del Asistente Inteligente de arriba para comenzar un borrador guiado..."
            style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={cargando} style={{ marginTop: '1rem' }}>
          {cargando ? 'Enviando...' : '🚀 Enviar a Moderación'}
        </button>
      </form>

      {/* ESTILOS INTERNOS DE ANIMACIÓN DE PULSACIÓN / SPINNER */}
      <style jsx global>{`
        @keyframes pulse {
          0% { opacity: 0.6; }
          50% { opacity: 1; border-color: #fbbf24; }
          100% { opacity: 0.6; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}

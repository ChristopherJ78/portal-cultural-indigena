import { supabase } from '../../lib/supabase'

// Fuerza la recarga de datos al visitar la página
export const revalidate = 0;

export default async function Catalogo() {
  // Obtenemos los artículos públicos (aprobados) desde Supabase
  const { data: articulos, error } = await supabase
    .from('articulos')
    .select('*')
    .eq('estado', 'aprobado')
    .order('fecha_creacion', { ascending: false })

  return (
    <main className="container">
      <h1 style={{ textAlign: 'center' }}>Catálogo Cultural</h1>
      <p style={{ textAlign: 'center', marginBottom: '3rem' }}>
        Explora todos los artículos, tradiciones y conocimientos validados por nuestras comunidades.
      </p>

      {error && (
        <div style={{ color: 'red', textAlign: 'center' }}>
          Ocurrió un error al cargar el catálogo: {error.message}
        </div>
      )}

      {!articulos || articulos.length === 0 ? (
        <div className="card glass-panel" style={{ textAlign: 'center' }}>
          <p>Aún no hay contenido publicado en esta sección. ¡Sé el primero en contribuir!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2">
          {articulos.map((art) => (
            <div key={art.id} className="card glass-panel">
              <span style={{ fontSize: '0.8rem', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                {art.subtema}
              </span>
              <h2 style={{ marginTop: '0.5rem' }}>{art.titulo}</h2>
              <p>{art.resumen || art.descripcion.substring(0, 100) + '...'}</p>
              <button className="btn btn-secondary" style={{ marginTop: '1rem' }}>Leer más</button>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}

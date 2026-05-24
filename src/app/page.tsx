import Link from 'next/link';

export default function Home() {
  return (
    <main className="container">
      <section style={{ textAlign: 'center', padding: '4rem 0' }}>
        <h1>Preservando la Memoria Inmaterial</h1>
        <p style={{ fontSize: '1.25rem', maxWidth: '800px', margin: '0 auto 2rem auto' }}>
          Descubre, aprende y contribuye a la preservación de las lenguas originarias,
          recetas tradicionales y la rica cultura de los pueblos indígenas de México.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link href="/catalogo" className="btn btn-primary">Explorar Catálogo</Link>
          <Link href="/redactor" className="btn btn-secondary">Quiero Contribuir</Link>
        </div>
      </section>

      <section className="grid grid-cols-3" style={{ marginTop: '4rem' }}>
        <div className="card glass-panel">
          <h3 style={{ color: 'var(--primary)' }}>Lenguas Originarias</h3>
          <p>Explora vocabularios, pronunciaciones y oraciones en lenguas como Náhuatl, Maya, Mixteco y más.</p>
        </div>
        <div className="card glass-panel">
          <h3 style={{ color: 'var(--accent)' }}>Recetas Tradicionales</h3>
          <p>Descubre los secretos culinarios transmitidos de generación en generación en nuestras comunidades.</p>
        </div>
        <div className="card glass-panel">
          <h3 style={{ color: '#fbbf24' }}>Cultura e Historia</h3>
          <p>Aprende sobre la vestimenta, arquitectura y tradiciones que forman la identidad mexicana.</p>
        </div>
      </section>
    </main>
  );
}

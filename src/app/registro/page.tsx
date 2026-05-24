'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function Registro() {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleRegistro = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setMensaje('');

    // Al tener confirmación de email desactivada, esto iniciará sesión automáticamente
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nombre: nombre,
        }
      }
    });

    if (error) {
      setMensaje('Error al registrarse: ' + error.message);
    } else {
      setMensaje('¡Registro exitoso! Ya puedes iniciar sesión o explorar la wiki.');
      setTimeout(() => {
        window.location.href = '/catalogo';
      }, 2000);
    }
    setCargando(false);
  };

  return (
    <main className="container" style={{ maxWidth: '400px', marginTop: '4rem' }}>
      <div className="card glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <h1 style={{ fontSize: '2rem', textAlign: 'center' }}>Crear Cuenta</h1>
        <p style={{ textAlign: 'center', fontSize: '0.9rem', marginTop: '-1rem' }}>Únete como Comentarista Cultural</p>
        
        {mensaje && (
          <div style={{ padding: '1rem', background: 'var(--glass-border)', borderRadius: '8px', color: 'white', textAlign: 'center' }}>
            {mensaje}
          </div>
        )}

        <form onSubmit={handleRegistro} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label htmlFor="nombre">Nombre Completo</label>
            <input 
              id="nombre" type="text" required
              value={nombre} onChange={(e) => setNombre(e.target.value)}
              style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label htmlFor="email">Correo Electrónico</label>
            <input 
              id="email" type="email" required
              value={email} onChange={(e) => setEmail(e.target.value)}
              style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white', outline: 'none' }}
            />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label htmlFor="password">Contraseña</label>
            <input 
              id="password" type="password" required minLength={6}
              value={password} onChange={(e) => setPassword(e.target.value)}
              style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white', outline: 'none' }}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={cargando} style={{ marginTop: '1rem' }}>
            {cargando ? 'Creando cuenta...' : 'Registrarse'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '0.9rem', marginTop: '1rem' }}>
          ¿Ya tienes cuenta? <a href="/login" style={{ color: 'var(--primary)' }}>Inicia sesión</a>
        </p>
      </div>
    </main>
  );
}

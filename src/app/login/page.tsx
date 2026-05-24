'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setMensaje('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMensaje('Error al iniciar sesión: ' + error.message);
    } else {
      setMensaje('¡Inicio de sesión exitoso!');
      window.location.href = '/catalogo'; // Redirigir al catálogo
    }
    setCargando(false);
  };

  return (
    <main className="container" style={{ maxWidth: '400px', marginTop: '4rem' }}>
      <div className="card glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <h1 style={{ fontSize: '2rem', textAlign: 'center' }}>Iniciar Sesión</h1>
        
        {mensaje && (
          <div style={{ padding: '1rem', background: 'var(--glass-border)', borderRadius: '8px', color: 'white', textAlign: 'center' }}>
            {mensaje}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
              id="password" type="password" required
              value={password} onChange={(e) => setPassword(e.target.value)}
              style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white', outline: 'none' }}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={cargando} style={{ marginTop: '1rem' }}>
            {cargando ? 'Cargando...' : 'Entrar'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '0.9rem', marginTop: '1rem' }}>
          ¿No tienes cuenta? <a href="/registro" style={{ color: 'var(--primary)' }}>Regístrate aquí</a>
        </p>
      </div>
    </main>
  );
}

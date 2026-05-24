'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import Link from 'next/link';

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [rol, setRol] = useState<string>('visitante');

  async function cargarRol(userId: string) {
    const { data } = await supabase.from('usuarios').select('rol').eq('id', userId).single();
    if (data) setRol(data.rol);
    else setRol('comentario');
  }

  async function solicitarRedactor() {
    if (!user) return;
    const { error } = await supabase.from('solicitudes_rol').insert({
      user_id: user.id,
      requested_role: 'redactor',
    });
    if (error) alert('Error al enviar solicitud: ' + error.message);
    else alert('Solicitud de redactor enviada.');
  }

  useEffect(() => {
    // Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) cargarRol(session.user.id);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) cargarRol(session.user.id);
      else setRol('visitante');
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <nav className="navbar glass-panel">
      <div className="logo" style={{ fontWeight: 'bold', fontSize: '1.25rem', color: '#f97316' }}>
        Portal Cultural
      </div>
      <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <Link href="/" className="nav-link">
          Inicio
        </Link>
        <Link href="/catalogo" className="nav-link">
          Catálogo
        </Link>
        {user ? (
          <>
            {/* Redactar: solo redactores, moderadores y admins */}
            {(rol === 'redactor' || rol === 'moderador' || rol === 'admin') && (
              <Link href="/redactor" className="nav-link">
                Redactar
              </Link>
            )}
            {/* Moderacion: solo moderadores y admins */}
            {(rol === 'moderador' || rol === 'admin') && (
              <Link href="/moderacion" className="nav-link" style={{ color: 'var(--accent)' }}>
                Moderación
              </Link>
            )}
            {/* Solicitar Redactor: solo usuarios con rol comentario */}
            {rol === 'comentario' && (
              <button
                onClick={solicitarRedactor}
                className="btn btn-secondary"
                style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}
              >
                Solicitar Redactor
              </button>
            )}
            <div
              style={{
                borderLeft: '1px solid var(--glass-border)',
                paddingLeft: '2rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
              }}
            >
              <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
                Hola, {user.user_metadata?.nombre || user.email}
              </span>
              <button
                onClick={handleLogout}
                className="btn btn-secondary"
                style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}
              >
                Salir
              </button>
            </div>
          </>
        ) : (
          <div
            style={{
              borderLeft: '1px solid var(--glass-border)',
              paddingLeft: '2rem',
              display: 'flex',
              gap: '1rem',
            }}
          >
            <Link href="/login" className="btn btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>
              Login
            </Link>
            <Link href="/registro" className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>
              Registro
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}

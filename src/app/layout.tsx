import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Portal Cultural Indígena",
  description: "Preservación y visibilización de la Cultura Indígena Mexicana",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <nav className="navbar glass-panel">
          <div className="logo" style={{ fontWeight: 'bold', fontSize: '1.25rem', color: '#f97316' }}>
            Portal Cultural
          </div>
          <div className="nav-links">
            <a href="/" className="nav-link">Inicio</a>
            <a href="/catalogo" className="nav-link">Catálogo</a>
            <a href="/redactor" className="nav-link">Redactores</a>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}

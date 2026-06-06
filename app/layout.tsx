import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import KoreAIChat from "./components/KoreAIChat"
import AuthProvider from "./components/AuthProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "KORE — Performance Integrada",
  description: "Seu coach de performance com IA. Treino, sono, nutrição e recuperação integrados.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col" style={{ background: '#161822', color: '#F5F6F8', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
        {/* Gradiente radial global — aparece em todas as páginas */}
        <div aria-hidden="true" style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: `
            radial-gradient(ellipse 75% 55% at 8% 15%, rgba(255,90,54,0.38) 0%, transparent 55%),
            radial-gradient(ellipse 60% 45% at 92% 10%, rgba(255,138,61,0.22) 0%, transparent 50%),
            radial-gradient(ellipse 80% 55% at 50% 55%, rgba(167,139,250,0.14) 0%, transparent 55%),
            radial-gradient(ellipse 70% 55% at 5% 88%, rgba(96,165,250,0.22) 0%, transparent 50%),
            radial-gradient(ellipse 65% 50% at 95% 92%, rgba(45,212,167,0.16) 0%, transparent 50%)
          `,
        }} />
        {/* Noise overlay sutil */}
        <div aria-hidden="true" style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, opacity: 0.025,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat', backgroundSize: '140px', mixBlendMode: 'overlay',
        }} />
        <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <AuthProvider>
            {children}
            <KoreAIChat />
          </AuthProvider>
        </div>
      </body>
    </html>
  );
}

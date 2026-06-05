import type { Metadata } from "next";
import { Geist_Mono, Sora, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import KoreAIChat from "./components/KoreAIChat"
import AuthProvider from "./components/AuthProvider";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
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
      className={`${sora.variable} ${jakarta.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
        <AuthProvider>
          {children}
          <KoreAIChat />
        </AuthProvider>
      </body>
    </html>
  );
}

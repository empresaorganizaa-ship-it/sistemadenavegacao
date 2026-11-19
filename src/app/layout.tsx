import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";

// IDENTIDADE VISUAL — fontes. Troque aqui para usar outras fontes do Google Fonts.
const fonteTexto = Inter({ variable: "--fonte-texto", subsets: ["latin"] });
const fonteTitulo = Cormorant_Garamond({
  variable: "--fonte-titulo",
  subsets: ["latin"],
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  title: "Acompanhamento Comercial",
  description: "Gestão comercial do consultório",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#faf8f5",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={`${fonteTexto.variable} ${fonteTitulo.variable} antialiased`}>{children}</body>
    </html>
  );
}

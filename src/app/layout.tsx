import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Source_Sans_3 } from "next/font/google";
import "./globals.css";

// IDENTIDADE VISUAL — fontes: Cormorant Garamond (títulos) e Source Sans (textos).
// No Google Fonts, a Source Sans Pro hoje se chama "Source Sans 3" (mesma fonte, versão atualizada).
const fonteTexto = Source_Sans_3({ variable: "--fonte-texto", subsets: ["latin"] });
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
  themeColor: "#f8f4ec",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={`${fonteTexto.variable} ${fonteTitulo.variable} antialiased`}>{children}</body>
    </html>
  );
}

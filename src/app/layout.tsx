import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vórtex Sub - Editor de subtítulos, sin límites",
  description: "Vórtex Sub, de Vortex Company: edita y sincroniza subtítulos SRT y VTT sobre la previsualización del video, con ajuste global de tiempos, renumerado y exportación limpia. Gratis, sin anuncios y 100% local.",
  keywords: ["Vórtex Sub", "editor de subtítulos", "SRT", "VTT", "sincronizar subtítulos", "subtítulos online", "sin anuncios"],
  authors: [{ name: "Vortex Company" }],
  icons: {
    icon:
      "data:image/svg+xml," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="10" fill="#161616"/><circle cx="24" cy="24" r="17" fill="none" stroke="#38bdf8" stroke-width="3.5"/><path d="M24 10a14 14 0 1 1-9.9 4.1" fill="none" stroke="#7dd3fc" stroke-width="3.5" stroke-linecap="round"/><path d="M24 17a7 7 0 1 0 7 7" fill="none" stroke="#7dd3fc" stroke-width="3.5" stroke-linecap="round"/><circle cx="24" cy="24" r="3" fill="#7dd3fc"/></svg>`
      ),
  },
  openGraph: {
    title: "Vórtex Sub - Editor de subtítulos, sin límites",
    description: "Vórtex Sub, de Vortex Company: edita y sincroniza subtítulos SRT y VTT sobre la previsualización del video, con ajuste global de tiempos, renumerado y exportación limpia. Gratis, sin anuncios y 100% local.",
    siteName: "Vórtex Sub - Editor de subtítulos, sin límites",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f0f10",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body className="antialiased bg-[#0f0f10] text-[#ececf1]">{children}</body>
    </html>
  );
}

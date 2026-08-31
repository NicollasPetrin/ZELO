import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

// Geist e a fonte que vem no create-next-app: correta, porem a mesma de todo
// projeto Next recem-criado. Manrope tem contraforma mais aberta e desenho um
// pouco mais caloroso, que combina com um produto vendido para dono de
// microempresa. A Geist Mono saiu junto porque nada no projeto usa font-mono, e
// ela custava uma fonte baixada a toa.
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Zelo",
  description: "Gestao simples de tarefas, setores, metas e equipe para microempresas.",
  icons: {
    icon: "/brand/zelo-icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${manrope.variable} h-full antialiased`}>
      <body className="min-h-full bg-slate-50 text-slate-950">{children}</body>
    </html>
  );
}

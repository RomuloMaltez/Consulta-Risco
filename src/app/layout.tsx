import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import ChatWidget from "@/components/ChatWidget/ChatWidget";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Consulta CNAE - SEMEC Porto Velho",
  description: "Sistema de consulta integrada NFS-e, IBS e CBS - Grau de Risco por CNAE do municipio de Porto Velho/RO",
  icons: {
    icon: "/imagem_icon-removebg-preview.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${poppins.variable} font-poppins antialiased`} suppressHydrationWarning>
        {children}
        <ChatWidget />
      </body>
    </html>
  );
}

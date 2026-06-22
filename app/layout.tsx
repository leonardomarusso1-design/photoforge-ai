import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://app.leonardomarusso.com.br"),
  title: "PhotoForge AI — Ensaios fotográficos realistas com IA",
  description: "Cadastre a cliente, envie as fotos certas e gere ensaios fotográficos realistas com IA em minutos. Sem câmera. Sem estúdio."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

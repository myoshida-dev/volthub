import type { Metadata } from "next";
import { Figtree, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";

import "./globals.css";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: {
    default: "VoltHub",
    template: "%s | VoltHub",
  },
  description: "Portal interno da Volt Distribuidora",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={`${figtree.variable} ${jetbrains.variable} font-sans`}>
        {children}
        <Toaster richColors position="top-right" closeButton />
      </body>
    </html>
  );
}

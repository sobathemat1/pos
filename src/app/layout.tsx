import type { Metadata } from 'next';
import './globals.css';
import { PosProvider } from '@/context/PosContext';
import { AppShell } from '@/components/layout/AppShell';

export const metadata: Metadata = {
  title: 'MyPOS — Universal Cafe POS & Thermal Receipt SaaS',
  description:
    'Sistem Point of Sales universal untuk cafe dengan alur Pay-First, cetak langsung printer thermal ESC/POS, kustomisasi identitas bisnis & struk, serta paket Basic & Pro.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans">
        <PosProvider>
          <AppShell>{children}</AppShell>
        </PosProvider>
      </body>
    </html>
  );
}

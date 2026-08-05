import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import MainLayoutWrapper from '@/components/MainLayoutWrapper';

export const metadata: Metadata = {
  title: 'Villa Rental App',
  description: 'Villa Management & Reservation Portal',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="el" className="dark" suppressHydrationWarning>
      <body className="antialiased">
        <AuthProvider>
          <MainLayoutWrapper>
            {children}
          </MainLayoutWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}

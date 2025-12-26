import type { Metadata } from 'next';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';
import Providers from '@/components/layout/Providers';
import AppLayout from '@/components/layout/AppLayout';

export const metadata: Metadata = {
  title: 'Trading Journal',
  description: 'Track and analyze your trades',
};

export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AppRouterCacheProvider>
          <Providers>
            <AppLayout>{children}</AppLayout>
          </Providers>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}

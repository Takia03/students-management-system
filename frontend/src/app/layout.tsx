import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';
import MainLayout from '@/layout/MainLayout';
import '@/styles/global.css';

export const metadata: Metadata = {
  title: 'Students App',
  description: 'Students CRUD with search',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppRouterCacheProvider>
          <MainLayout>{children}</MainLayout>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
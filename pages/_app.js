import '../styles/globals.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../hooks/useAuth';
import { ThemeProvider } from '../hooks/useTheme';
import ErrorBoundary from '../components/ErrorBoundary';
import { Toaster } from 'react-hot-toast';
import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function App({ Component, pageProps }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 5 * 60 * 1000, // 5 minutes
        cacheTime: 10 * 60 * 1000, // 10 minutes
        refetchOnMount: false,
        refetchOnReconnect: false,
        suspense: false,
        useErrorBoundary: false,
        // Performance optimizations
        structuralSharing: true,
        keepPreviousData: true
      },
      mutations: {
        retry: 2,
        useErrorBoundary: false
      }
    },
  }));

  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Show minimal loading only during initial mount
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-300">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Enterprise Data Platform - Company Information & Analytics</title>
        <meta name="description" content="Professional enterprise platform for company information, document management, and business analytics. Search SIREN, manage documents, and access comprehensive company reports." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="index, follow" />
        <meta name="theme-color" content="#1f2937" />
        <link rel="icon" href="/favicon.ico" />
        <meta property="og:title" content="Enterprise Data Platform" />
        <meta property="og:description" content="Professional enterprise platform for company information and analytics" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Head>
      <ErrorBoundary componentName="Application">
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AuthProvider>
              <ErrorBoundary componentName="Page">
                <Component {...pageProps} />
              </ErrorBoundary>
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  style: {
                    background: '#10b981',
                  },
                },
                error: {
                  style: {
                    background: '#ef4444',
                  },
                },
              }}
            />
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
    </>
  );
}

// pages/_app.js

import '../styles/globals.css';
import '../styles/movieTitle.css';
import ErrorBoundary from '../components/ErrorBoundary';
import { FavoritesProvider } from '../contexts/FavoritesContext';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const [navigationStats, setNavigationStats] = useState({
    totalNavigations: 0,
    lastNavigationTime: null,
    navigationHistory: [],
  });

  // Comprehensive router debugging and scroll management
  useEffect(() => {
    let routeStartTime = null;
    let lastSuccessfulRoute = router.pathname;

    const handleRouteStart = url => {
      routeStartTime = Date.now();
      console.log('🚀 Route change starting:', {
        from: router.pathname,
        to: url,
        timestamp: new Date().toISOString(),
      });
    };

    const handleRouteChange = url => {
      const duration = routeStartTime ? Date.now() - routeStartTime : 'unknown';
      const now = Date.now();
      lastSuccessfulRoute = url;

      // Update navigation statistics
      setNavigationStats(prev => {
        const newStats = {
          totalNavigations: prev.totalNavigations + 1,
          lastNavigationTime: now,
          navigationHistory: [
            ...prev.navigationHistory.slice(-4), // Keep last 5 navigations
            {
              url,
              timestamp: now,
              duration,
              successful: true,
            },
          ],
        };

        // Log warning if navigation count is getting high (potential issue indicator)
        if (newStats.totalNavigations > 10) {
          console.warn('⚠️ High navigation count detected:', newStats.totalNavigations);
        }

        return newStats;
      });

      console.log('✅ Route change completed:', {
        url,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      });

      window.scrollTo(0, 0);
    };

    const handleRouteError = (err, url) => {
      const duration = routeStartTime ? Date.now() - routeStartTime : 'unknown';
      const now = Date.now();

      // Track failed navigation
      setNavigationStats(prev => ({
        ...prev,
        navigationHistory: [
          ...prev.navigationHistory.slice(-4),
          {
            url,
            timestamp: now,
            duration,
            successful: false,
            error: err.message || err,
          },
        ],
      }));

      console.error('❌ Route change error:', {
        error: err.message || err,
        url,
        duration: `${duration}ms`,
        lastSuccessfulRoute,
        stack: err.stack,
        timestamp: new Date().toISOString(),
      });

      // Add error recovery attempt
      console.log('🔄 Attempting error recovery by staying on current route');
    };

    const handleHashChange = url => {
      console.log('🔗 Hash change detected:', url);
    };

    const handleBeforeHistoryChange = url => {
      console.log('📖 Before history change:', {
        from: router.pathname,
        to: url,
        timestamp: new Date().toISOString(),
      });
    };

    // Monitor all router events
    router.events.on('routeChangeStart', handleRouteStart);
    router.events.on('routeChangeComplete', handleRouteChange);
    router.events.on('routeChangeError', handleRouteError);
    router.events.on('hashChangeStart', handleHashChange);
    router.events.on('beforeHistoryChange', handleBeforeHistoryChange);

    // Debug initial route state
    console.log('🏠 App initialized with route:', {
      pathname: router.pathname,
      asPath: router.asPath,
      query: router.query,
      timestamp: new Date().toISOString(),
    });

    // Add keyboard shortcut for debugging (Ctrl+Shift+D)
    const handleKeyDown = e => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        console.log('🐛 Navigation Debug Info:', {
          currentRoute: router.pathname,
          navigationStats,
          routerState: {
            pathname: router.pathname,
            asPath: router.asPath,
            query: router.query,
            isReady: router.isReady,
          },
          timestamp: new Date().toISOString(),
        });
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      router.events.off('routeChangeStart', handleRouteStart);
      router.events.off('routeChangeComplete', handleRouteChange);
      router.events.off('routeChangeError', handleRouteError);
      router.events.off('hashChangeStart', handleHashChange);
      router.events.off('beforeHistoryChange', handleBeforeHistoryChange);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [router]);

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <ErrorBoundary>
        <FavoritesProvider>
          <Component {...pageProps} />
        </FavoritesProvider>
      </ErrorBoundary>
    </>
  );
}

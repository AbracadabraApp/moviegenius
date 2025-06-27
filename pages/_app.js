// pages/_app.js

import '../styles/globals.css';
import '../styles/movieTitle.css';
import ErrorBoundary from '../components/ErrorBoundary';
import Head from 'next/head';

export default function MyApp({ Component, pageProps }) {
  // Admin interface added to pages/admin/
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <ErrorBoundary>
        <Component {...pageProps} />
      </ErrorBoundary>
    </>
  );
}

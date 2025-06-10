// pages/_app.js

import '../styles/globals.css';
import ErrorBoundary from '../components/ErrorBoundary';

export default function MyApp({ Component, pageProps }) {
  // Admin interface added to pages/admin/
  return (
    <ErrorBoundary>
      <Component {...pageProps} />
    </ErrorBoundary>
  );
}

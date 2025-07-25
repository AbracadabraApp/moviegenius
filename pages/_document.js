// pages/_document.js
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Web app optimized for desktop and web browsers */}
        <link rel="icon" href="/favicon.ico" />
        <script src="/js/nextjs-test-framework.js" async></script>
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

// pages/_document.js
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>{/* Web app optimized for desktop and web browsers */}</Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

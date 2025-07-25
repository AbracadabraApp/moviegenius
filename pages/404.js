export default function Custom404() {
  return (
    <html>
      <head>
        <meta name="status" content="404" />
        <title>404 - Page Not Found | MovieGenius</title>
        <script src="/js/nextjs-test-framework.js" async></script>
      </head>
      <body>
        <div id="__next">
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            minHeight: '100vh',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}>
            <h1 style={{ fontSize: '4rem', margin: '0', color: '#333' }}>404</h1>
            <h2 style={{ fontSize: '1.5rem', margin: '1rem 0', color: '#666' }}>Page Not Found</h2>
            <p style={{ color: '#999', textAlign: 'center', maxWidth: '500px' }}>
              The page you're looking for doesn't exist or has been moved.
            </p>
            <a 
              href="/" 
              style={{ 
                marginTop: '2rem', 
                padding: '0.75rem 1.5rem', 
                backgroundColor: '#007acc', 
                color: 'white', 
                textDecoration: 'none', 
                borderRadius: '0.375rem' 
              }}
            >
              Go Home
            </a>
          </div>
        </div>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('load', () => {
                setTimeout(() => {
                  if (window.tester) {
                    window.tester.detect404Page();
                    window.generateNextJsReport();
                  }
                }, 1000);
              });
            `,
          }}
        />
      </body>
    </html>
  );
}
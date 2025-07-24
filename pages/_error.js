// pages/_error.js
function Error({ statusCode, hasGetInitialPropsRun, err }) {
  const errorDetails = {
    statusCode,
    hasGetInitialPropsRun,
    errorMessage: err?.message || 'Unknown error',
    errorStack: err?.stack || 'No stack trace',
    timestamp: new Date().toISOString(),
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Server-side'
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', backgroundColor: '#f5f5f5' }}>
      <h1>Error {statusCode}</h1>
      <h2>Debug Information:</h2>
      <pre style={{ backgroundColor: '#fff', padding: '10px', border: '1px solid #ccc' }}>
        {JSON.stringify(errorDetails, null, 2)}
      </pre>
    </div>
  );
}

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res?.statusCode || err?.statusCode || 404;
  return { 
    statusCode,
    hasGetInitialPropsRun: true,
    err: err ? {
      message: err.message,
      stack: err.stack,
      name: err.name
    } : null
  };
};

export default Error;

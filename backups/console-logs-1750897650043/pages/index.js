import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Immediate client-side redirect
    router.replace('/recs');
  }, [router]);

  // Show minimal loading state
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#666',
      }}
    >
      Redirecting to recommendations...
    </div>
  );
}

// Also do server-side redirect for immediate response
export async function getServerSideProps() {
  console.log('🔄 Homepage redirect triggered at:', new Date().toISOString());
  return {
    redirect: {
      destination: '/recs',
      permanent: true,
    },
  };
}

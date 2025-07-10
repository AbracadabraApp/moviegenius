/**
 * Genius Page Redirect
 * 
 * Redirects /genius to /themes where users can access education content.
 * This fixes the overcomplicated routing system.
 */

export async function getServerSideProps() {
  return {
    redirect: {
      destination: '/themes',
      permanent: false, // Use 302 redirect so we can change this later if needed
    },
  };
}

// This component will never render due to the redirect
export default function GeniusPage() {
  return null;
}
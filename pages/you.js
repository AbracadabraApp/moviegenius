/**
 * Legacy "You" page - Redirects to "What to Watch"
 * Maintains backward compatibility for bookmarks and links
 */
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function YouPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to what-to-watch page
    router.replace('/what-to-watch');
  }, [router]);

  // Show nothing while redirecting
  return null;
}

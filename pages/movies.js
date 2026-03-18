// Redirect /movies to homepage
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function MoviesRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return null;
}

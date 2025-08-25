/**
 * Static HTML Test Route
 * 
 * Simple route to serve our pre-generated static HTML files.
 * This demonstrates the evolution from React composition to static HTML generation.
 */

import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function StaticTestPage() {
  const router = useRouter();
  const { id } = router.query;

  useEffect(() => {
    if (id) {
      // Redirect to the static HTML file
      window.location.href = `/static-html/${id}.html`;
    }
  }, [id]);

  return (
    <div style={{ 
      padding: '20px', 
      textAlign: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <h2>Redirecting to Static HTML...</h2>
      <p>Loading static-generated page for: {id}</p>
      <p style={{ fontSize: '14px', color: '#666', marginTop: '20px' }}>
        This demonstrates the evolution from React components to pre-generated static HTML.
      </p>
    </div>
  );
}

export async function getStaticPaths() {
  // Generate paths for first 5 test movies to demonstrate the concept
  const testMovieIds = [
    'test_000059fa', // Buena Vista Social Club
    'test_00032d9f', // Less Than Zero
    'test_00014fb9', // Murder, My Sweet
    'test_00018052', // Testament of Orpheus
    'test_0003155b'  // No Time for Sergeants
  ];
  
  const paths = testMovieIds.map(id => ({ params: { id } }));
  
  return {
    paths,
    fallback: 'blocking'
  };
}

export async function getStaticProps({ params }) {
  return {
    props: {
      movieId: params.id
    }
  };
}
// hooks/useInfiniteScroll.js
import { useEffect, useState } from 'react';

export default function useInfiniteScroll({
  totalItems,
  step = 10,
  initial = 20,
}) {
  const [visibleCount, setVisibleCount] = useState(initial);

  useEffect(() => {
    function onScroll() {
      const bottom =
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 100;
      if (bottom) {
        setVisibleCount((v) => Math.min(v + step, totalItems));
      }
    }
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [totalItems, step]);

  return visibleCount;
}

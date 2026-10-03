import { useEffect, useState, useCallback, useRef } from 'react';
import PageScrollCache from '../config/pageScrollCache.ts';

/**
 * Custom hook to instantly load & persist full page state + smooth scroll restoration.
 * Prevents loading spinners, screen flashes, and layout jumps when scrolling or navigating back.
 */
export function useSmoothPageCache<T>(
  pageKey: string,
  initialData: T,
  maxAgeMs?: number
) {
  // 1. Instantly retrieve cached state from localStorage on first render
  const [data, setDataState] = useState<T>(() => {
    return PageScrollCache.getPageData<T>(pageKey, initialData, maxAgeMs);
  });

  const pageKeyRef = useRef(pageKey);
  pageKeyRef.current = pageKey;

  // 2. Setter function that updates React state + syncs to localStorage
  const setData = useCallback((newDataOrFn: T | ((prev: T) => T)) => {
    setDataState((prev) => {
      const updated = typeof newDataOrFn === 'function' 
        ? (newDataOrFn as (prev: T) => T)(prev)
        : newDataOrFn;
      PageScrollCache.setPageData(pageKeyRef.current, updated);
      return updated;
    });
  }, []);

  // 3. Auto-save scroll position on scroll (debounced) and restore on mount
  useEffect(() => {
    // Restore scroll position after mount
    const timer = setTimeout(() => {
      PageScrollCache.restoreScrollPosition(pageKey, false);
    }, 50);

    let scrollTimeout: any = null;
    const handleScroll = () => {
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        PageScrollCache.saveScrollPosition(pageKeyRef.current);
      }, 150);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      clearTimeout(timer);
      if (scrollTimeout) clearTimeout(scrollTimeout);
      // Save position on unmount
      PageScrollCache.saveScrollPosition(pageKeyRef.current);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [pageKey]);

  return [data, setData] as const;
}

export default useSmoothPageCache;

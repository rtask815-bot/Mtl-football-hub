import {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import PageScrollCache from '../config/pageScrollCache.ts';

type Updater<T> = T | ((prev: T) => T);

interface SmoothPageCacheOptions {
  /**
   * Delay before persisting state to storage.
   * Prevents excessive localStorage writes.
   */
  dataSaveDelay?: number;

  /**
   * Delay before saving scroll position.
   */
  scrollSaveDelay?: number;

  /**
   * Maximum number of scroll restoration attempts.
   */
  maxRestoreAttempts?: number;

  /**
   * Time between scroll restoration attempts.
   */
  restoreRetryDelay?: number;

  /**
   * Whether to restore scroll automatically.
   */
  restoreScroll?: boolean;

  /**
   * Whether to persist state automatically.
   */
  persistData?: boolean;

  /**
   * Whether to save scroll when page becomes hidden.
   */
  saveOnVisibilityChange?: boolean;

  /**
   * Whether to save state before the browser unloads.
   */
  saveOnBeforeUnload?: boolean;

  /**
   * Disable cache completely.
   */
  disabled?: boolean;
}

interface CacheStatus {
  restored: boolean;
  saving: boolean;
  cached: boolean;
  disabled: boolean;
  lastSavedAt: number | null;
}

/**
 * Advanced page-state + scroll persistence hook.
 *
 * Features:
 * - Instant synchronous cache hydration
 * - Debounced state persistence
 * - Debounced scroll persistence
 * - Intelligent scroll restoration retries
 * - Handles dynamically rendered content
 * - Handles browser back/forward navigation
 * - Handles visibility changes
 * - Handles beforeunload/pagehide
 * - Prevents unnecessary storage writes
 * - Protects against storage failures
 * - Detects page-key changes
 * - Avoids stale closures
 * - React StrictMode friendly
 * - requestAnimationFrame-based restoration
 */
export function useSmoothPageCache<T>(
  pageKey: string,
  initialData: T,
  maxAgeMs?: number,
  options: SmoothPageCacheOptions = {}
) {
  const {
    dataSaveDelay = 250,
    scrollSaveDelay = 120,
    maxRestoreAttempts = 12,
    restoreRetryDelay = 80,
    restoreScroll = true,
    persistData = true,
    saveOnVisibilityChange = true,
    saveOnBeforeUnload = true,
    disabled = false,
  } = options;

  /*
   * ---------------------------------------------------------
   * Stable references
   * ---------------------------------------------------------
   */

  const pageKeyRef = useRef(pageKey);
  const initialDataRef = useRef(initialData);

  pageKeyRef.current = pageKey;
  initialDataRef.current = initialData;

  /*
   * ---------------------------------------------------------
   * Cache hydration
   *
   * This happens synchronously during the first render,
   * meaning React receives cached data immediately.
   * ---------------------------------------------------------
   */

  const [data, setDataState] = useState<T>(() => {
    if (disabled || typeof window === 'undefined') {
      return initialData;
    }

    try {
      return PageScrollCache.getPageData<T>(
        pageKey,
        initialData,
        maxAgeMs
      );
    } catch (error) {
      console.warn(
        `[useSmoothPageCache] Failed to hydrate "${pageKey}":`,
        error
      );

      return initialData;
    }
  });

  /*
   * ---------------------------------------------------------
   * Runtime status
   * ---------------------------------------------------------
   */

  const [status, setStatus] = useState<CacheStatus>(() => ({
    restored: false,
    saving: false,
    cached: false,
    disabled,
    lastSavedAt: null,
  }));

  /*
   * ---------------------------------------------------------
   * Internal timers
   * ---------------------------------------------------------
   */

  const dataSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const scrollSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const restoreTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const restoreFrameRef = useRef<number | null>(null);

  const restoreAttemptsRef = useRef(0);

  /*
   * Prevent unnecessary writes.
   */
  const lastSerializedDataRef = useRef<string | null>(null);

  /*
   * Track whether component is still mounted.
   */
  const mountedRef = useRef(false);

  /*
   * Track whether a scroll restore is currently happening.
   */
  const restoringScrollRef = useRef(false);

  /*
   * Track the latest data without causing stale closures.
   */
  const dataRef = useRef(data);
  dataRef.current = data;

  /*
   * ---------------------------------------------------------
   * Utility: safely clear timers
   * ---------------------------------------------------------
   */

  const clearTimers = useCallback(() => {
    if (dataSaveTimerRef.current) {
      clearTimeout(dataSaveTimerRef.current);
      dataSaveTimerRef.current = null;
    }

    if (scrollSaveTimerRef.current) {
      clearTimeout(scrollSaveTimerRef.current);
      scrollSaveTimerRef.current = null;
    }

    if (restoreTimerRef.current) {
      clearTimeout(restoreTimerRef.current);
      restoreTimerRef.current = null;
    }

    if (restoreFrameRef.current !== null) {
      cancelAnimationFrame(restoreFrameRef.current);
      restoreFrameRef.current = null;
    }
  }, []);

  /*
   * ---------------------------------------------------------
   * Persist state immediately
   * ---------------------------------------------------------
   */

  const persistDataNow = useCallback(
    (value: T = dataRef.current) => {
      if (
        disabled ||
        !persistData ||
        typeof window === 'undefined'
      ) {
        return;
      }

      try {
        /*
         * Avoid serializing/writing identical data.
         */
        let serialized: string | null = null;

        try {
          serialized = JSON.stringify(value);
        } catch {
          /*
           * Some values cannot be serialized.
           * Let PageScrollCache decide whether it can handle them.
           */
        }

        if (
          serialized !== null &&
          serialized === lastSerializedDataRef.current
        ) {
          return;
        }

        setStatus((previous) => ({
          ...previous,
          saving: true,
        }));

        PageScrollCache.setPageData(
          pageKeyRef.current,
          value
        );

        if (serialized !== null) {
          lastSerializedDataRef.current = serialized;
        }

        const savedAt = Date.now();

        setStatus((previous) => ({
          ...previous,
          saving: false,
          cached: true,
          lastSavedAt: savedAt,
        }));
      } catch (error) {
        console.warn(
          `[useSmoothPageCache] Failed to persist "${pageKeyRef.current}":`,
          error
        );

        setStatus((previous) => ({
          ...previous,
          saving: false,
        }));
      }
    },
    [disabled, persistData]
  );

  /*
   * ---------------------------------------------------------
   * Debounced state persistence
   * ---------------------------------------------------------
   */

  const scheduleDataSave = useCallback(
    (value: T) => {
      if (
        disabled ||
        !persistData ||
        typeof window === 'undefined'
      ) {
        return;
      }

      if (dataSaveTimerRef.current) {
        clearTimeout(dataSaveTimerRef.current);
      }

      dataSaveTimerRef.current = setTimeout(() => {
        dataSaveTimerRef.current = null;
        persistDataNow(value);
      }, Math.max(0, dataSaveDelay));
    },
    [
      disabled,
      persistData,
      dataSaveDelay,
      persistDataNow,
    ]
  );

  /*
   * ---------------------------------------------------------
   * Public state setter
   * ---------------------------------------------------------
   */

  const setData = useCallback(
    (newDataOrFn: Updater<T>) => {
      setDataState((previous) => {
        const updated =
          typeof newDataOrFn === 'function'
            ? (newDataOrFn as (prev: T) => T)(previous)
            : newDataOrFn;

        dataRef.current = updated;

        scheduleDataSave(updated);

        return updated;
      });
    },
    [scheduleDataSave]
  );

  /*
   * ---------------------------------------------------------
   * Save current scroll position
   * ---------------------------------------------------------
   */

  const saveScrollNow = useCallback(() => {
    if (
      disabled ||
      typeof window === 'undefined'
    ) {
      return;
    }

    try {
      PageScrollCache.saveScrollPosition(
        pageKeyRef.current
      );
    } catch (error) {
      console.warn(
        `[useSmoothPageCache] Failed to save scroll for "${pageKeyRef.current}":`,
        error
      );
    }
  }, [disabled]);

  /*
   * ---------------------------------------------------------
   * Debounced scroll persistence
   * ---------------------------------------------------------
   */

  const scheduleScrollSave = useCallback(() => {
    if (
      disabled ||
      typeof window === 'undefined'
    ) {
      return;
    }

    if (scrollSaveTimerRef.current) {
      clearTimeout(scrollSaveTimerRef.current);
    }

    scrollSaveTimerRef.current = setTimeout(() => {
      scrollSaveTimerRef.current = null;
      saveScrollNow();
    }, Math.max(0, scrollSaveDelay));
  }, [disabled, scrollSaveDelay, saveScrollNow]);

  /*
   * ---------------------------------------------------------
   * Intelligent scroll restoration
   *
   * The old 50ms timeout assumes the page is ready.
   * That's fragile.
   *
   * Here we retry until:
   * - the document has enough height
   * - restoration succeeds
   * - maximum attempts are reached
   * ---------------------------------------------------------
   */

  const restoreScrollIntelligently = useCallback(() => {
    if (
      disabled ||
      !restoreScroll ||
      typeof window === 'undefined'
    ) {
      return;
    }

    restoreAttemptsRef.current = 0;
    restoringScrollRef.current = true;

    const attemptRestore = () => {
      if (!mountedRef.current) {
        return;
      }

      restoreAttemptsRef.current += 1;

      try {
        const previousY = window.scrollY;

        PageScrollCache.restoreScrollPosition(
          pageKeyRef.current,
          false
        );

        const restoredY = window.scrollY;

        /*
         * If the scroll position changed, restoration probably
         * succeeded.
         */
        const moved =
          Math.abs(restoredY - previousY) > 1;

        /*
         * If we were already at the requested position,
         * consider it successful as well.
         */
        const documentCanScroll =
          document.documentElement.scrollHeight >
          window.innerHeight;

        if (
          moved ||
          !documentCanScroll ||
          restoreAttemptsRef.current >= maxRestoreAttempts
        ) {
          restoringScrollRef.current = false;

          setStatus((previous) => ({
            ...previous,
            restored: true,
          }));

          return;
        }
      } catch (error) {
        console.warn(
          `[useSmoothPageCache] Scroll restoration attempt failed for "${pageKeyRef.current}":`,
          error
        );
      }

      /*
       * Wait for more content/layout before retrying.
       */
      restoreTimerRef.current = setTimeout(() => {
        restoreFrameRef.current =
          requestAnimationFrame(attemptRestore);
      }, restoreRetryDelay);
    };

    /*
     * Give React one paint before the first attempt.
     */
    restoreFrameRef.current =
      requestAnimationFrame(attemptRestore);
  }, [
    disabled,
    restoreScroll,
    maxRestoreAttempts,
    restoreRetryDelay,
  ]);

  /*
   * ---------------------------------------------------------
   * Page-key changes
   *
   * When navigating from:
   *
   * /news -> /fixtures -> /predictions
   *
   * each page gets its own cache lifecycle.
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (disabled) {
      return;
    }

    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }

    clearTimers();

    restoreAttemptsRef.current = 0;
    restoringScrollRef.current = false;

    /*
     * Hydrate the newly selected page.
     */
    try {
      const cached = PageScrollCache.getPageData<T>(
        pageKey,
        initialDataRef.current,
        maxAgeMs
      );

      dataRef.current = cached;
      setDataState(cached);

      /*
       * Reset serialization fingerprint.
       */
      try {
        lastSerializedDataRef.current =
          JSON.stringify(cached);
      } catch {
        lastSerializedDataRef.current = null;
      }
    } catch (error) {
      console.warn(
        `[useSmoothPageCache] Failed to switch cache page "${pageKey}":`,
        error
      );

      dataRef.current = initialDataRef.current;
      setDataState(initialDataRef.current);
    }

    setStatus((previous) => ({
      ...previous,
      restored: false,
      cached: false,
    }));

    restoreScrollIntelligently();

    return () => {
      saveScrollNow();
    };
  }, [
    pageKey,
    maxAgeMs,
    disabled,
    clearTimers,
    restoreScrollIntelligently,
    saveScrollNow,
  ]);

  /*
   * ---------------------------------------------------------
   * Scroll listener
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (
      disabled ||
      typeof window === 'undefined'
    ) {
      return;
    }

    let ticking = false;

    const handleScroll = () => {
      /*
       * requestAnimationFrame prevents a storm of timer
       * creation during high-frequency scrolling.
       */
      if (ticking) {
        return;
      }

      ticking = true;

      requestAnimationFrame(() => {
        ticking = false;

        if (!restoringScrollRef.current) {
          scheduleScrollSave();
        }
      });
    };

    window.addEventListener(
      'scroll',
      handleScroll,
      {
        passive: true,
      }
    );

    return () => {
      window.removeEventListener(
        'scroll',
        handleScroll
      );
    };
  }, [
    disabled,
    scheduleScrollSave,
  ]);

  /*
   * ---------------------------------------------------------
   * Browser navigation
   *
   * Handles:
   * - Back
   * - Forward
   * - BFCache
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (
      disabled ||
      typeof window === 'undefined'
    ) {
      return;
    }

    const handlePopState = () => {
      saveScrollNow();

      /*
       * Browser navigation may change the page before
       * React finishes rendering.
       */
      setTimeout(() => {
        restoreScrollIntelligently();
      }, 0);
    };

    const handlePageShow = () => {
      /*
       * pageshow fires when restoring from BFCache.
       */
      restoreScrollIntelligently();
    };

    window.addEventListener(
      'popstate',
      handlePopState
    );

    window.addEventListener(
      'pageshow',
      handlePageShow
    );

    return () => {
      window.removeEventListener(
        'popstate',
        handlePopState
      );

      window.removeEventListener(
        'pageshow',
        handlePageShow
      );
    };
  }, [
    disabled,
    saveScrollNow,
    restoreScrollIntelligently,
  ]);

  /*
   * ---------------------------------------------------------
   * Visibility lifecycle
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (
      disabled ||
      !saveOnVisibilityChange ||
      typeof document === 'undefined'
    ) {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        persistDataNow();
        saveScrollNow();
      }
    };

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange
    );

    return () => {
      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange
      );
    };
  }, [
    disabled,
    saveOnVisibilityChange,
    persistDataNow,
    saveScrollNow,
  ]);

  /*
   * ---------------------------------------------------------
   * beforeunload / pagehide
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (
      disabled ||
      typeof window === 'undefined'
    ) {
      return;
    }

    const handleBeforeUnload = () => {
      if (saveOnBeforeUnload) {
        persistDataNow();
        saveScrollNow();
      }
    };

    const handlePageHide = () => {
      persistDataNow();
      saveScrollNow();
    };

    if (saveOnBeforeUnload) {
      window.addEventListener(
        'beforeunload',
        handleBeforeUnload
      );
    }

    window.addEventListener(
      'pagehide',
      handlePageHide
    );

    return () => {
      if (saveOnBeforeUnload) {
        window.removeEventListener(
          'beforeunload',
          handleBeforeUnload
        );
      }

      window.removeEventListener(
        'pagehide',
        handlePageHide
      );
    };
  }, [
    disabled,
    saveOnBeforeUnload,
    persistDataNow,
    saveScrollNow,
  ]);

  /*
   * ---------------------------------------------------------
   * Cleanup
   * ---------------------------------------------------------
   */

  useEffect(() => {
    return () => {
      mountedRef.current = false;

      /*
       * Save one final snapshot.
       */
      if (!disabled) {
        try {
          persistDataNow();
          saveScrollNow();
        } catch {
          /*
           * Never allow cache cleanup to break navigation.
           */
        }
      }

      clearTimers();
    };
  }, [
    disabled,
    persistDataNow,
    saveScrollNow,
    clearTimers,
  ]);

  /*
   * ---------------------------------------------------------
   * Cache controls
   * ---------------------------------------------------------
   */

  const refreshCache = useCallback(() => {
    if (disabled) {
      return;
    }

    try {
      const freshData =
        PageScrollCache.getPageData<T>(
          pageKeyRef.current,
          initialDataRef.current,
          maxAgeMs
        );

      dataRef.current = freshData;
      setDataState(freshData);

      try {
        lastSerializedDataRef.current =
          JSON.stringify(freshData);
      } catch {
        lastSerializedDataRef.current = null;
      }

      setStatus((previous) => ({
        ...previous,
        cached: true,
        restored: false,
      }));

      restoreScrollIntelligently();
    } catch (error) {
      console.warn(
        `[useSmoothPageCache] Failed to refresh "${pageKeyRef.current}":`,
        error
      );
    }
  }, [
    disabled,
    maxAgeMs,
    restoreScrollIntelligently,
  ]);

  /*
   * Force immediate persistence.
   */
  const flushCache = useCallback(() => {
    if (dataSaveTimerRef.current) {
      clearTimeout(dataSaveTimerRef.current);
      dataSaveTimerRef.current = null;
    }

    if (scrollSaveTimerRef.current) {
      clearTimeout(scrollSaveTimerRef.current);
      scrollSaveTimerRef.current = null;
    }

    persistDataNow();
    saveScrollNow();
  }, [
    persistDataNow,
    saveScrollNow,
  ]);

  /*
   * ---------------------------------------------------------
   * Stable metadata object
   * ---------------------------------------------------------
   */

  const cacheInfo = useMemo(
    () => ({
      pageKey,
      ...status,
      isRestoring: restoringScrollRef.current,
    }),
    [
      pageKey,
      status,
    ]
  );

  /*
   * ---------------------------------------------------------
   * Public API
   *
   * Existing usage remains compatible:
   *
   * const [data, setData] = useSmoothPageCache(...)
   *
   * Additional controls are available through:
   *
   * hook.cacheInfo
   * hook.refreshCache()
   * hook.flushCache()
   *
   * ---------------------------------------------------------
   */

  return [
    data,
    setData,
    {
      cacheInfo,
      refreshCache,
      flushCache,
      saveScroll: saveScrollNow,
      persistData: persistDataNow,
    },
  ] as const;
}

export default useSmoothPageCache;

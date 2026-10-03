/**
 * MTL Football Hub - Smooth Page State & Scroll Restoration Cache
 * Caches full page state, filter states, scroll offset, and loaded datasets into localStorage/sessionStorage
 * so page transitions and scrolling are 100% instant, smooth, and jitter-free without re-loading spinners.
 */

export interface PageCacheOptions<T> {
  pageKey: string;
  initialData: T;
  expireMs?: number; // Optional expiration (default 24h)
}

const SCROLL_PREFIX = 'mtl_scroll_pos_';
const DATA_PREFIX = 'mtl_page_data_';
const DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours

export class PageScrollCache {
  /**
   * Saves current scroll position for a given page key or path
   */
  static saveScrollPosition(pageKey: string, yPos?: number): void {
    if (typeof window === 'undefined') return;
    const pos = yPos !== undefined ? yPos : window.scrollY || document.documentElement.scrollTop || 0;
    try {
      sessionStorage.setItem(`${SCROLL_PREFIX}${pageKey}`, pos.toString());
    } catch (e) {
      // Storage quota fallback ignored
    }
  }

  /**
   * Restores scroll position smoothly for a given page key
   */
  static restoreScrollPosition(pageKey: string, smooth: boolean = true): void {
    if (typeof window === 'undefined') return;
    try {
      const saved = sessionStorage.getItem(`${SCROLL_PREFIX}${pageKey}`);
      if (saved !== null) {
        const yPos = parseInt(saved, 10);
        if (!isNaN(yPos) && yPos > 0) {
          // Use requestAnimationFrame to ensure DOM is rendered before scroll
          requestAnimationFrame(() => {
            window.scrollTo({
              top: yPos,
              behavior: smooth ? 'smooth' : 'auto'
            });
          });
        }
      }
    } catch (e) {
      // Ignore
    }
  }

  /**
   * Saves arbitrary page payload to localStorage
   */
  static setPageData<T>(pageKey: string, data: T): void {
    if (typeof window === 'undefined') return;
    try {
      const payload = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(`${DATA_PREFIX}${pageKey}`, JSON.stringify(payload));
    } catch (e) {
      console.warn('Page cache write notice:', e);
    }
  }

  /**
   * Retrieves cached page payload instantly if valid
   */
  static getPageData<T>(pageKey: string, fallback: T, maxAgeMs: number = DEFAULT_TTL): T {
    if (typeof window === 'undefined') return fallback;
    try {
      const raw = localStorage.getItem(`${DATA_PREFIX}${pageKey}`);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.timestamp && (Date.now() - parsed.timestamp < maxAgeMs)) {
        return parsed.data as T;
      }
    } catch (e) {
      // Fallback on corrupt JSON
    }
    return fallback;
  }

  /**
   * Clears page cache
   */
  static clearPageCache(pageKey: string): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(`${DATA_PREFIX}${pageKey}`);
      sessionStorage.removeItem(`${SCROLL_PREFIX}${pageKey}`);
    } catch (e) {
      // Ignore
    }
  }
}

export default PageScrollCache;

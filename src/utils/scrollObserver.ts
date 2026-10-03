/**
 * Upfront Card & Element Visibility Engine
 *
 * Purpose:
 * - Makes scroll-animation elements visible immediately.
 * - Eliminates artificial entrance delays.
 * - Prevents cards from appearing/disappearing while scrolling.
 * - Handles dynamically inserted React elements.
 * - Avoids repeatedly scanning the entire DOM.
 * - Supports MutationObserver batching.
 * - Supports IntersectionObserver-compatible API.
 * - Respects reduced-motion preferences.
 * - Safe for SSR / Vite / React.
 *
 * Default behavior:
 *   Everything matching the selector is immediately marked `.is-visible`.
 *
 * This intentionally does NOT perform entrance animations.
 * Visibility is treated as a rendering state, not an animation trigger.
 */

const DEFAULT_SELECTOR =
  '.animate-on-scroll, .card-reveal, .horizontal-scroll-item';

const VISIBLE_CLASS = 'is-visible';

interface ScrollObserverOptions {
  selector?: string;
  visibleClass?: string;

  /**
   * Process DOM mutations in batches using requestAnimationFrame.
   * Prevents repeated DOM scans during rapid React rendering.
   */
  batchMutations?: boolean;

  /**
   * Respect prefers-reduced-motion.
   * Since this engine already forces visibility, this mainly
   * provides compatibility for applications that use motion CSS.
   */
  respectReducedMotion?: boolean;

  /**
   * Observe newly inserted DOM nodes.
   */
  observeMutations?: boolean;

  /**
   * Automatically process the initial document.
   */
  initialScan?: boolean;
}

interface ScrollObserverController {
  observe: (element: Element | null) => void;
  unobserve: (element: Element | null) => void;
  disconnect: () => void;
  refresh: () => void;
}

/* ---------------------------------------------------------
 * Browser safety
 * --------------------------------------------------------- */

const isBrowser =
  typeof window !== 'undefined' &&
  typeof document !== 'undefined';

/* ---------------------------------------------------------
 * Visibility helper
 * --------------------------------------------------------- */

function markVisible(
  element: Element | null,
  visibleClass: string
): void {
  if (!element) return;

  /*
   * Avoid unnecessary classList operations.
   */
  if (!element.classList.contains(visibleClass)) {
    element.classList.add(visibleClass);
  }

  /*
   * Defensive inline styles.
   *
   * These are intentionally minimal. The class remains the
   * primary source of truth for styling.
   */
  if (element instanceof HTMLElement) {
    element.dataset.visibilityState = 'visible';
  }
}

/* ---------------------------------------------------------
 * Process one DOM node and its matching descendants
 * --------------------------------------------------------- */

function processNode(
  node: Node,
  selector: string,
  visibleClass: string
): void {
  if (
    node.nodeType !== Node.ELEMENT_NODE &&
    node.nodeType !== Node.DOCUMENT_FRAGMENT_NODE
  ) {
    return;
  }

  const element = node as Element;

  /*
   * The node itself may be a target.
   */
  if (
    element.nodeType === Node.ELEMENT_NODE &&
    element.matches?.(selector)
  ) {
    markVisible(element, visibleClass);
  }

  /*
   * Process matching descendants only.
   */
  if (element.querySelectorAll) {
    const children = element.querySelectorAll(selector);

    for (const child of children) {
      markVisible(child, visibleClass);
    }
  }
}

/* ---------------------------------------------------------
 * Create an observer-compatible controller
 * --------------------------------------------------------- */

export function createScrollObserver(
  options: ScrollObserverOptions = {}
): ScrollObserverController {
  const {
    selector = DEFAULT_SELECTOR,
    visibleClass = VISIBLE_CLASS,
  } = options;

  return {
    observe(element) {
      if (!isBrowser || !element) return;

      markVisible(
        element,
        visibleClass
      );
    },

    unobserve(element) {
      /*
       * Intentionally does NOT remove `.is-visible`.
       *
       * Removing it during scrolling would reintroduce the
       * exact flickering / entrance-delay behavior this engine
       * is designed to eliminate.
       */
      void element;
    },

    disconnect() {
      /*
       * Kept for API compatibility with IntersectionObserver.
       */
    },

    refresh() {
      if (!isBrowser) return;

      const elements =
        document.querySelectorAll(selector);

      for (const element of elements) {
        markVisible(
          element,
          visibleClass
        );
      }
    },
  };
}

/* ---------------------------------------------------------
 * Main viewport animation initializer
 * --------------------------------------------------------- */

export function initViewportAnimationObserver(
  selector: string = DEFAULT_SELECTOR,
  options: Omit<
    ScrollObserverOptions,
    'selector'
  > = {}
): () => void {
  if (!isBrowser) {
    return () => {};
  }

  const {
    visibleClass = VISIBLE_CLASS,
    batchMutations = true,
    respectReducedMotion = true,
    observeMutations = true,
    initialScan = true,
  } = options;

  /*
   * -------------------------------------------------------
   * Reduced motion
   * -------------------------------------------------------
   */

  let reducedMotion = false;

  const mediaQuery =
    window.matchMedia?.(
      '(prefers-reduced-motion: reduce)'
    );

  const updateReducedMotion = () => {
    reducedMotion =
      Boolean(
        respectReducedMotion &&
        mediaQuery?.matches
      );
  };

  updateReducedMotion();

  const handleMotionChange = () => {
    updateReducedMotion();

    /*
     * Visibility should remain immediate regardless of
     * motion preference.
     *
     * This simply ensures newly affected elements are
     * processed.
     */
    scheduleRefresh();
  };

  mediaQuery?.addEventListener?.(
    'change',
    handleMotionChange
  );

  /*
   * -------------------------------------------------------
   * Initial scan
   * -------------------------------------------------------
   */

  const markAllVisible = () => {
    if (!document.body) return;

    const elements =
      document.querySelectorAll(selector);

    for (const element of elements) {
      markVisible(
        element,
        visibleClass
      );
    }
  };

  /*
   * -------------------------------------------------------
   * Batched refresh system
   * -------------------------------------------------------
   *
   * Instead of:
   *
   * mutation → scan DOM
   * mutation → scan DOM
   * mutation → scan DOM
   *
   * we do:
   *
   * mutations → collect
   *             ↓
   *         one RAF
   *             ↓
   *       process targets
   * -------------------------------------------------------
   */

  let refreshFrame: number | null = null;

  let pendingNodes: Node[] = [];

  const cancelScheduledRefresh = () => {
    if (refreshFrame !== null) {
      cancelAnimationFrame(refreshFrame);
      refreshFrame = null;
    }
  };

  const processPendingNodes = () => {
    refreshFrame = null;

    if (!pendingNodes.length) {
      return;
    }

    const nodes = pendingNodes;

    pendingNodes = [];

    for (const node of nodes) {
      processNode(
        node,
        selector,
        visibleClass
      );
    }
  };

  const scheduleRefresh = (
    nodes?: Node[]
  ) => {
    if (nodes?.length) {
      pendingNodes.push(...nodes);
    }

    if (!batchMutations) {
      processPendingNodes();
      return;
    }

    if (refreshFrame !== null) {
      return;
    }

    refreshFrame =
      requestAnimationFrame(
        processPendingNodes
      );
  };

  /*
   * -------------------------------------------------------
   * Initial render
   * -------------------------------------------------------
   */

  if (initialScan) {
    markAllVisible();
  }

  /*
   * -------------------------------------------------------
   * MutationObserver
   * -------------------------------------------------------
   */

  let mutationObserver:
    MutationObserver | null = null;

  if (
    observeMutations &&
    typeof MutationObserver !== 'undefined' &&
    document.body
  ) {
    mutationObserver =
      new MutationObserver(
        (mutations) => {
          const addedNodes: Node[] = [];

          for (const mutation of mutations) {
            /*
             * We only care about added nodes.
             *
             * Attribute changes, text changes and removals
             * don't require a visibility scan.
             */
            if (
              mutation.type !== 'childList' ||
              mutation.addedNodes.length === 0
            ) {
              continue;
            }

            for (
              const node of mutation.addedNodes
            ) {
              addedNodes.push(node);
            }
          }

          if (addedNodes.length) {
            scheduleRefresh(addedNodes);
          }
        }
      );

    mutationObserver.observe(
      document.body,
      {
        childList: true,
        subtree: true,
      }
    );
  }

  /*
   * -------------------------------------------------------
   * Page lifecycle
   * -------------------------------------------------------
   */

  const handlePageShow = () => {
    /*
     * Browser may restore a page from BFCache.
     * Make sure dynamically restored content is visible.
     */
    scheduleRefresh();
  };

  const handleLoad = () => {
    scheduleRefresh();
  };

  window.addEventListener(
    'pageshow',
    handlePageShow
  );

  window.addEventListener(
    'load',
    handleLoad
  );

  /*
   * -------------------------------------------------------
   * Cleanup
   * -------------------------------------------------------
   */

  return () => {
    mutationObserver?.disconnect();

    mutationObserver = null;

    cancelScheduledRefresh();

    pendingNodes = [];

    mediaQuery?.removeEventListener?.(
      'change',
      handleMotionChange
    );

    window.removeEventListener(
      'pageshow',
      handlePageShow
    );

    window.removeEventListener(
      'load',
      handleLoad
    );
  };
}

/* ---------------------------------------------------------
 * React-friendly helper
 *
 * Optional utility for components that dynamically create
 * cards outside the global observer lifecycle.
 * --------------------------------------------------------- */

export function makeElementVisible(
  element: Element | null,
  visibleClass = VISIBLE_CLASS
): void {
  if (!isBrowser || !element) {
    return;
  }

  markVisible(
    element,
    visibleClass
  );
}

/* ---------------------------------------------------------
 * Force the entire current document visible.
 *
 * Useful after:
 * - Supabase data hydration
 * - route transitions
 * - dashboard hydration
 * - cache restoration
 * - lazy component mounting
 * --------------------------------------------------------- */

export function forceAllElementsVisible(
  selector: string = DEFAULT_SELECTOR,
  visibleClass = VISIBLE_CLASS
): void {
  if (!isBrowser) return;

  const elements =
    document.querySelectorAll(selector);

  for (const element of elements) {
    markVisible(
      element,
      visibleClass
    );
  }
}

export default initViewportAnimationObserver;

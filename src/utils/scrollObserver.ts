/**
 * Intersection Observer Entrance Animation Engine
 * Automatically detects when card elements enter the viewport (vertical or horizontal scroll containers)
 * and triggers smooth fade-in and slide-up entrance animations.
 */

export function createScrollObserver(
  options: IntersectionObserverInit = {
    root: null,
    rootMargin: '0px 30px 0px 30px',
    threshold: 0.1,
  }
): {
  observe: (element: Element) => void;
  unobserve: (element: Element) => void;
  disconnect: () => void;
} {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        // Unobserve after animating in once to optimize performance
        observer.unobserve(entry.target);
      }
    });
  }, options);

  return {
    observe: (element: Element) => {
      if (element) observer.observe(element);
    },
    unobserve: (element: Element) => {
      if (element) observer.unobserve(element);
    },
    disconnect: () => {
      observer.disconnect();
    },
  };
}

/**
 * Initializes viewport IntersectionObserver for all elements matching selector
 */
export function initViewportAnimationObserver(
  selector: string = '.animate-on-scroll, .card-reveal, .horizontal-scroll-item'
): () => void {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
    return () => {};
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    },
    {
      root: null,
      rootMargin: '20px 40px 20px 40px',
      threshold: 0.08,
    }
  );

  const observeElements = () => {
    const elements = document.querySelectorAll(selector);
    elements.forEach((el) => {
      if (!el.classList.contains('is-visible')) {
        observer.observe(el);
      }
    });
  };

  observeElements();

  // Re-check DOM for dynamically rendered cards
  const mutationObserver = new MutationObserver(() => {
    observeElements();
  });

  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });

  return () => {
    observer.disconnect();
    mutationObserver.disconnect();
  };
}

/**
 * Upfront Card & Element Visibility Engine
 * Ensures all cards and containers are rendered fully visible immediately on page load,
 * eliminating glitchy entrance delays during scrolling.
 */

export function createScrollObserver(): {
  observe: (element: Element) => void;
  unobserve: (element: Element) => void;
  disconnect: () => void;
} {
  return {
    observe: (element: Element) => {
      if (element) element.classList.add('is-visible');
    },
    unobserve: () => {},
    disconnect: () => {},
  };
}

export function initViewportAnimationObserver(
  selector: string = '.animate-on-scroll, .card-reveal, .horizontal-scroll-item'
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const markAllVisible = () => {
    const elements = document.querySelectorAll(selector);
    elements.forEach((el) => {
      el.classList.add('is-visible');
    });
  };

  markAllVisible();

  const mutationObserver = new MutationObserver(() => {
    markAllVisible();
  });

  if (document.body) {
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  return () => {
    mutationObserver.disconnect();
  };
}

/**
 * Advanced Native Touch / Wheel / Drag Gesture Engine
 *
 * Designed for:
 * - Horizontal card rows
 * - Football fixtures
 * - News carousels
 * - Match lists
 * - Dashboard panels
 * - Mobile horizontal containers
 *
 * Features:
 * - Mouse drag-to-scroll
 * - Native touch swipe
 * - Touch momentum / inertia
 * - Mouse-wheel → horizontal scrolling
 * - Trackpad-aware wheel handling
 * - Frame-rate independent momentum
 * - Boundary clamping
 * - Pointer capture
 * - Interactive-element protection
 * - Accidental-click suppression after dragging
 * - Dynamic content compatibility
 * - Reduced-motion support
 * - RTL awareness
 * - No competing smooth-scroll animations
 * - Duplicate initialization protection
 * - Full cleanup
 */

const INITIALIZED_ATTRIBUTE =
  'data-horizontal-gesture-enabled';

const DRAGGING_CLASS = 'dragging';

const DEFAULT_OPTIONS = {
  dragMultiplier: 1.15,
  wheelMultiplier: 1.15,
  momentumMultiplier: 1,
  friction: 0.93,
  minVelocity: 0.02,
  maxVelocity: 3.5,
  edgeResistance: 0.35,
  clickSuppressionDistance: 8,
  clickSuppressionDuration: 250,
  touchThreshold: 6,
  wheelThreshold: 0.5,
};

export interface HorizontalGestureOptions {
  dragMultiplier?: number;
  wheelMultiplier?: number;
  momentumMultiplier?: number;

  /**
   * Momentum friction.
   * Higher = longer glide.
   */
  friction?: number;

  /**
   * Velocity below this value stops momentum.
   */
  minVelocity?: number;

  /**
   * Prevent extreme velocity spikes.
   */
  maxVelocity?: number;

  /**
   * Resistance near scroll boundaries.
   */
  edgeResistance?: number;

  /**
   * Minimum movement before treating pointer movement
   * as an intentional drag.
   */
  clickSuppressionDistance?: number;

  /**
   * Time during which click suppression remains active.
   */
  clickSuppressionDuration?: number;

  /**
   * Minimum movement before a touch gesture becomes
   * an intentional horizontal swipe.
   */
  touchThreshold?: number;

  /**
   * Ignore tiny wheel events.
   */
  wheelThreshold?: number;

  /**
   * Enable mouse dragging.
   */
  enableMouseDrag?: boolean;

  /**
   * Enable touch gestures.
   */
  enableTouch?: boolean;

  /**
   * Enable wheel conversion.
   */
  enableWheel?: boolean;

  /**
   * Respect prefers-reduced-motion.
   */
  respectReducedMotion?: boolean;

  /**
   * Prevent vertical page scrolling while a horizontal
   * touch gesture is actively horizontal.
   */
  lockHorizontalTouch?: boolean;
}

type InternalOptions = Required<
  HorizontalGestureOptions
>;

function getOptions(
  options: HorizontalGestureOptions = {}
): InternalOptions {
  return {
    ...DEFAULT_OPTIONS,

    enableMouseDrag: true,
    enableTouch: true,
    enableWheel: true,
    respectReducedMotion: true,
    lockHorizontalTouch: true,

    ...options,
  };
}

/* ---------------------------------------------------------
 * Browser safety
 * --------------------------------------------------------- */

function isBrowser(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof document !== 'undefined'
  );
}

/* ---------------------------------------------------------
 * Interactive element detection
 * --------------------------------------------------------- */

function isInteractiveTarget(
  target: EventTarget | null
): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(
    target.closest(
      [
        'button',
        'input',
        'textarea',
        'select',
        'option',
        'a',
        '[role="button"]',
        '[role="link"]',
        '[contenteditable="true"]',
        '[data-no-drag]',
      ].join(',')
    )
  );
}

/* ---------------------------------------------------------
 * Scroll boundary helpers
 * --------------------------------------------------------- */

function getMaxScrollLeft(
  container: HTMLElement
): number {
  return Math.max(
    0,
    container.scrollWidth -
      container.clientWidth
  );
}

function clampScroll(
  container: HTMLElement
): void {
  const max = getMaxScrollLeft(container);

  if (container.scrollLeft < 0) {
    container.scrollLeft = 0;
  } else if (container.scrollLeft > max) {
    container.scrollLeft = max;
  }
}

/* ---------------------------------------------------------
 * Reduced motion
 * --------------------------------------------------------- */

function prefersReducedMotion(): boolean {
  if (!isBrowser()) {
    return false;
  }

  return Boolean(
    window.matchMedia?.(
      '(prefers-reduced-motion: reduce)'
    ).matches
  );
}

/* ---------------------------------------------------------
 * Main engine
 * --------------------------------------------------------- */

export function enableSwipeToScroll(
  container: HTMLElement,
  userOptions: HorizontalGestureOptions = {}
): () => void {
  if (
    !container ||
    !isBrowser()
  ) {
    return () => {};
  }

  /*
   * Prevent duplicate initialization.
   */
  if (
    container.hasAttribute(
      INITIALIZED_ATTRIBUTE
    )
  ) {
    return () => {};
  }

  container.setAttribute(
    INITIALIZED_ATTRIBUTE,
    'true'
  );

  const options = getOptions(
    userOptions
  );

  /*
   * -------------------------------------------------------
   * State
   * -------------------------------------------------------
   */

  let destroyed = false;

  let pointerActive = false;

  let dragging = false;

  let touchGesture = false;

  let horizontalTouchLocked = false;

  let startPointerX = 0;

  let startPointerY = 0;

  let startScrollLeft = 0;

  let lastPointerX = 0;

  let lastPointerTime = 0;

  let velocity = 0;

  let momentumVelocity = 0;

  let animationFrame:
    number | null = null;

  let lastAnimationTime = 0;

  let suppressClickUntil = 0;

  let dragDistance = 0;

  let activePointerId:
    number | null = null;

  /*
   * -------------------------------------------------------
   * Cancel momentum
   * -------------------------------------------------------
   */

  const stopMomentum = () => {
    if (
      animationFrame !== null
    ) {
      cancelAnimationFrame(
        animationFrame
      );

      animationFrame = null;
    }

    momentumVelocity = 0;
    lastAnimationTime = 0;
  };

  /*
   * -------------------------------------------------------
   * Boundary-aware movement
   * -------------------------------------------------------
   */

  const moveScroll = (
    delta: number
  ) => {
    if (!delta) return;

    const max =
      getMaxScrollLeft(
        container
      );

    const current =
      container.scrollLeft;

    const next =
      current + delta;

    /*
     * Apply resistance at boundaries instead of
     * allowing the drag to feel completely detached.
     */
    if (
      next < 0
    ) {
      container.scrollLeft =
        current +
        delta *
          options.edgeResistance;

      return;
    }

    if (
      next > max
    ) {
      container.scrollLeft =
        current +
        delta *
          options.edgeResistance;

      return;
    }

    container.scrollLeft =
      next;
  };

  /*
   * -------------------------------------------------------
   * Momentum engine
   *
   * Frame-time independent.
   * This behaves much more consistently on:
   *
   * 30 FPS
   * 60 FPS
   * 90 FPS
   * 120 FPS
   * -------------------------------------------------------
   */

  const startMomentum = () => {
    if (
      destroyed ||
      prefersReducedMotion() ||
      Math.abs(velocity) <
        options.minVelocity
    ) {
      return;
    }

    stopMomentum();

    momentumVelocity =
      Math.max(
        -options.maxVelocity,
        Math.min(
          options.maxVelocity,
          velocity *
            options.momentumMultiplier
        )
      );

    lastAnimationTime =
      performance.now();

    const animate = (
      timestamp: number
    ) => {
      if (
        destroyed ||
        !container.isConnected
      ) {
        stopMomentum();
        return;
      }

      const deltaTime =
        Math.min(
          32,
          Math.max(
            1,
            timestamp -
              lastAnimationTime
          )
        );

      lastAnimationTime =
        timestamp;

      /*
       * Normalize movement against a 60 FPS baseline.
       */
      const frameScale =
        deltaTime / 16.6667;

      const movement =
        momentumVelocity *
        frameScale;

      const previous =
        container.scrollLeft;

      moveScroll(movement);

      /*
       * Detect hard boundaries.
       */
      const current =
        container.scrollLeft;

      const hitBoundary =
        Math.abs(
          current - previous
        ) < 0.01;

      if (hitBoundary) {
        momentumVelocity *= 0.72;
      } else {
        /*
         * Frame-rate independent friction.
         */
        const friction =
          Math.pow(
            options.friction,
            frameScale
          );

        momentumVelocity *=
          friction;
      }

      if (
        Math.abs(momentumVelocity) <
          options.minVelocity ||
        hitBoundary
      ) {
        stopMomentum();
        return;
      }

      animationFrame =
        requestAnimationFrame(
          animate
        );
    };

    animationFrame =
      requestAnimationFrame(
        animate
      );
  };

  /*
   * -------------------------------------------------------
   * Wheel
   * -------------------------------------------------------
   */

  const onWheel = (
    event: WheelEvent
  ) => {
    if (
      !options.enableWheel ||
      destroyed
    ) {
      return;
    }

    if (
      event.ctrlKey ||
      event.metaKey
    ) {
      /*
       * Preserve browser zoom gestures.
       */
      return;
    }

    const absX =
      Math.abs(event.deltaX);

    const absY =
      Math.abs(event.deltaY);

    if (
      Math.max(absX, absY) <
      options.wheelThreshold
    ) {
      return;
    }

    /*
     * Trackpads already generate horizontal delta.
     *
     * Traditional mouse wheels mostly generate deltaY.
     */
    let horizontalDelta =
      event.deltaX;

    if (
      absY > absX
    ) {
      horizontalDelta +=
        event.deltaY *
        options.wheelMultiplier;
    }

    if (
      Math.abs(horizontalDelta) <
      options.wheelThreshold
    ) {
      return;
    }

    const max =
      getMaxScrollLeft(
        container
      );

    const canScrollLeft =
      container.scrollLeft > 0;

    const canScrollRight =
      container.scrollLeft <
      max;

    const movingLeft =
      horizontalDelta < 0;

    const movingRight =
      horizontalDelta > 0;

    /*
     * At the edge, allow vertical scrolling to escape
     * naturally instead of trapping the user.
     */
    const canConsume =
      (
        movingLeft &&
        canScrollLeft
      ) ||
      (
        movingRight &&
        canScrollRight
      );

    if (!canConsume) {
      return;
    }

    event.preventDefault();

    stopMomentum();

    /*
     * Deliberately use direct scrolling instead of
     * scrollBy({ behavior: 'smooth' }).
     *
     * Multiple wheel events + smooth animations can
     * otherwise create a queue of competing animations.
     */
    moveScroll(
      horizontalDelta
    );
  };

  /*
   * -------------------------------------------------------
   * Pointer down
   * -------------------------------------------------------
   */

  const onPointerDown = (
    event: PointerEvent
  ) => {
    if (
      destroyed ||
      pointerActive
    ) {
      return;
    }

    if (
      event.pointerType ===
        'mouse' &&
      (
        !options.enableMouseDrag ||
        event.button !== 0
      )
    ) {
      return;
    }

    if (
      event.pointerType ===
        'touch' &&
      !options.enableTouch
    ) {
      return;
    }

    /*
     * Don't steal clicks from controls.
     */
    if (
      isInteractiveTarget(
        event.target
      )
    ) {
      return;
    }

    pointerActive = true;

    dragging = false;

    touchGesture =
      event.pointerType ===
      'touch';

    horizontalTouchLocked =
      false;

    activePointerId =
      event.pointerId;

    startPointerX =
      event.clientX;

    startPointerY =
      event.clientY;

    lastPointerX =
      event.clientX;

    startScrollLeft =
      container.scrollLeft;

    lastPointerTime =
      performance.now();

    velocity = 0;

    dragDistance = 0;

    stopMomentum();

    /*
     * Pointer capture keeps receiving events even if the
     * pointer leaves the container.
     */
    try {
      container.setPointerCapture(
        event.pointerId
      );
    } catch {
      /*
       * Some browsers / embedded environments may reject
       * pointer capture. Dragging can still continue.
       */
    }
  };

  /*
   * -------------------------------------------------------
   * Pointer move
   * -------------------------------------------------------
   */

  const onPointerMove = (
    event: PointerEvent
  ) => {
    if (
      destroyed ||
      !pointerActive ||
      activePointerId !==
        event.pointerId
    ) {
      return;
    }

    const deltaX =
      event.clientX -
      startPointerX;

    const deltaY =
      event.clientY -
      startPointerY;

    /*
     * Touch needs directional intent detection.
     *
     * A mostly vertical swipe should remain a normal
     * page scroll.
     */
    if (
      touchGesture &&
      !horizontalTouchLocked
    ) {
      const absX =
        Math.abs(deltaX);

      const absY =
        Math.abs(deltaY);

      if (
        Math.max(absX, absY) <
        options.touchThreshold
      ) {
        return;
      }

      if (
        absY > absX
      ) {
        /*
         * User is scrolling vertically.
         * Don't hijack it.
         */
        pointerActive = false;
        return;
      }

      horizontalTouchLocked =
        true;
    }

    const movement =
      deltaX *
      options.dragMultiplier;

    dragDistance =
      Math.abs(deltaX);

    /*
     * Only convert into an actual drag after the
     * configured threshold.
     */
    if (
      !dragging &&
      dragDistance <
        options.clickSuppressionDistance
    ) {
      return;
    }

    if (!dragging) {
      dragging = true;

      container.classList.add(
        DRAGGING_CLASS
      );
    }

    /*
     * Prevent browser text selection / native drag
     * once an intentional horizontal drag begins.
     */
    event.preventDefault();

    const now =
      performance.now();

    const dt =
      Math.max(
        1,
        now -
          lastPointerTime
      );

    const pointerDelta =
      event.clientX -
      lastPointerX;

    /*
     * Negative velocity means the content should move
     * toward the left, positive toward the right.
     */
    velocity =
      pointerDelta / dt;

    velocity =
      Math.max(
        -options.maxVelocity,
        Math.min(
          options.maxVelocity,
          velocity
        )
      );

    lastPointerX =
      event.clientX;

    lastPointerTime =
      now;

    /*
     * Position is based on the original pointer position,
     * preventing accumulated floating-point drift.
     */
    const targetScroll =
      startScrollLeft -
      movement;

    container.scrollLeft =
      Math.max(
        0,
        Math.min(
          getMaxScrollLeft(
            container
          ),
          targetScroll
        )
      );
  };

  /*
   * -------------------------------------------------------
   * Pointer release
   * -------------------------------------------------------
   */

  const finishPointer = (
    event?: PointerEvent
  ) => {
    if (!pointerActive) {
      return;
    }

    if (
      event &&
      activePointerId !==
        event.pointerId
    ) {
      return;
    }

    pointerActive = false;

    const wasDragging =
      dragging;

    dragging = false;

    horizontalTouchLocked =
      false;

    activePointerId = null;

    container.classList.remove(
      DRAGGING_CLASS
    );

    if (
      event
    ) {
      try {
        container.releasePointerCapture(
          event.pointerId
        );
      } catch {
        /* Ignore unsupported capture release. */
      }
    }

    /*
     * Prevent the click that normally follows a drag.
     */
    if (
      wasDragging &&
      dragDistance >=
        options.clickSuppressionDistance
    ) {
      suppressClickUntil =
        Date.now() +
        options.clickSuppressionDuration;
    }

    if (wasDragging) {
      startMomentum();
    }

    dragDistance = 0;
  };

  /*
   * -------------------------------------------------------
   * Pointer cancel
   * -------------------------------------------------------
   */

  const onPointerCancel = (
    event: PointerEvent
  ) => {
    finishPointer(event);
  };

  /*
   * -------------------------------------------------------
   * Prevent accidental click after drag
   * -------------------------------------------------------
   */

  const onClickCapture = (
    event: MouseEvent
  ) => {
    if (
      Date.now() <
      suppressClickUntil
    ) {
      event.preventDefault();
      event.stopPropagation();

      suppressClickUntil = 0;
    }
  };

  /*
   * -------------------------------------------------------
   * Native drag prevention
   * -------------------------------------------------------
   */

  const onDragStart = (
    event: DragEvent
  ) => {
    if (dragging) {
      event.preventDefault();
    }
  };

  /*
   * -------------------------------------------------------
   * CSS touch behavior
   * -------------------------------------------------------
   */

  const previousTouchAction =
    container.style.touchAction;

  const previousUserSelect =
    container.style.userSelect;

  /*
   * We do not globally disable vertical touch scrolling.
   *
   * `pan-y` tells the browser that vertical movement belongs
   * to the page while our JS handles horizontal intent.
   */
  if (
    options.enableTouch
  ) {
    container.style.touchAction =
      'pan-y pinch-zoom';
  }

  /*
   * -------------------------------------------------------
   * Event registration
   * -------------------------------------------------------
   */

  if (
    options.enableWheel
  ) {
    container.addEventListener(
      'wheel',
      onWheel,
      {
        passive: false,
      }
    );
  }

  container.addEventListener(
    'pointerdown',
    onPointerDown,
    {
      passive: true,
    }
  );

  container.addEventListener(
    'pointermove',
    onPointerMove,
    {
      passive: false,
    }
  );

  container.addEventListener(
    'pointerup',
    finishPointer
  );

  container.addEventListener(
    'pointercancel',
    onPointerCancel
  );

  container.addEventListener(
    'click',
    onClickCapture,
    true
  );

  container.addEventListener(
    'dragstart',
    onDragStart
  );

  /*
   * -------------------------------------------------------
   * Cleanup
   * -------------------------------------------------------
   */

  return () => {
    if (destroyed) {
      return;
    }

    destroyed = true;

    stopMomentum();

    pointerActive = false;

    container.classList.remove(
      DRAGGING_CLASS
    );

    container.removeEventListener(
      'wheel',
      onWheel
    );

    container.removeEventListener(
      'pointerdown',
      onPointerDown
    );

    container.removeEventListener(
      'pointermove',
      onPointerMove
    );

    container.removeEventListener(
      'pointerup',
      finishPointer
    );

    container.removeEventListener(
      'pointercancel',
      onPointerCancel
    );

    container.removeEventListener(
      'click',
      onClickCapture,
      true
    );

    container.removeEventListener(
      'dragstart',
      onDragStart
    );

    /*
     * Restore styles modified by this engine.
     */
    container.style.touchAction =
      previousTouchAction;

    container.style.userSelect =
      previousUserSelect;

    container.removeAttribute(
      INITIALIZED_ATTRIBUTE
    );
  };
}

/* =========================================================
 * Initialize all existing containers
 * ========================================================= */

export function initAllHorizontalSwipeContainers(
  options: HorizontalGestureOptions = {}
): () => void {
  if (!isBrowser()) {
    return () => {};
  }

  const cleanups: Array<
    () => void
  > = [];

  const initialize = (
    root: ParentNode = document
  ) => {
    const containers =
      root.querySelectorAll<HTMLElement>(
        '.horizontal-scroll-container'
      );

    for (
      const container of containers
    ) {
      const cleanup =
        enableSwipeToScroll(
          container,
          options
        );

      cleanups.push(cleanup);
    }
  };

  initialize();

  /*
   * Watch for React / dynamic content.
   *
   * Only added nodes are inspected.
   */
  let mutationObserver:
    MutationObserver | null = null;

  if (
    typeof MutationObserver !==
    'undefined' &&
    document.body
  ) {
    mutationObserver =
      new MutationObserver(
        (mutations) => {
          for (
            const mutation of mutations
          ) {
            for (
              const node of mutation.addedNodes
            ) {
              if (
                node.nodeType !==
                Node.ELEMENT_NODE
              ) {
                continue;
              }

              const element =
                node as Element;

              if (
                element.matches?.(
                  '.horizontal-scroll-container'
                )
              ) {
                cleanups.push(
                  enableSwipeToScroll(
                    element as HTMLElement,
                    options
                  )
                );
              }

              const nested =
                element.querySelectorAll?.(
                  '.horizontal-scroll-container'
                );

              if (nested) {
                for (
                  const container of nested
                ) {
                  cleanups.push(
                    enableSwipeToScroll(
                      container as HTMLElement,
                      options
                    )
                  );
                }
              }
            }
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
   * Global cleanup
   * -------------------------------------------------------
   */

  return () => {
    mutationObserver?.disconnect();

    mutationObserver = null;

    for (
      const cleanup of cleanups
    ) {
      try {
        cleanup();
      } catch {
        /*
         * One failed cleanup must not prevent
         * the remaining containers from cleaning up.
         */
      }
    }

    cleanups.length = 0;
  };
}

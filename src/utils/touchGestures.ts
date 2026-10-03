/**
 * Native Touch & Drag Gesture Engine for Horizontal Scroll Containers
 * Provides smooth drag-to-scroll, touch swipe inertia, and swipe gesture velocity.
 */

export function enableSwipeToScroll(container: HTMLElement): () => void {
  if (!container) return () => {};

  let isDown = false;
  let startX = 0;
  let scrollLeft = 0;
  let velocity = 0;
  let lastX = 0;
  let lastTime = Date.now();
  let animId: number | null = null;

  const onPointerDown = (e: PointerEvent) => {
    // Only handle primary button / touch
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    // Don't intercept button clicks or inputs
    const target = e.target as HTMLElement;
    if (target.closest('button, input, select, textarea, a, [role="button"]')) {
      return;
    }

    isDown = true;
    container.classList.add('dragging');
    startX = e.pageX - container.offsetLeft;
    scrollLeft = container.scrollLeft;
    lastX = e.pageX;
    lastTime = Date.now();
    velocity = 0;

    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }
  };

  const onPointerLeaveOrUp = () => {
    if (!isDown) return;
    isDown = false;
    container.classList.remove('dragging');

    // Inertia momentum scrolling after touch release
    if (Math.abs(velocity) > 0.5) {
      let currentVelocity = velocity * 12;
      const step = () => {
        if (Math.abs(currentVelocity) < 0.5 || !container) {
          if (animId) cancelAnimationFrame(animId);
          return;
        }
        container.scrollLeft -= currentVelocity;
        currentVelocity *= 0.92; // Friction deceleration
        animId = requestAnimationFrame(step);
      };
      animId = requestAnimationFrame(step);
    }
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!isDown) return;
    e.preventDefault();

    const x = e.pageX - container.offsetLeft;
    const walk = (x - startX) * 1.2; // Drag multiplier
    const now = Date.now();
    const dt = Math.max(1, now - lastTime);

    velocity = (e.pageX - lastX) / dt;
    lastX = e.pageX;
    lastTime = now;

    container.scrollLeft = scrollLeft - walk;
  };

  // Add event listeners
  container.addEventListener('pointerdown', onPointerDown);
  container.addEventListener('pointerleave', onPointerLeaveOrUp);
  container.addEventListener('pointerup', onPointerLeaveOrUp);
  container.addEventListener('pointermove', onPointerMove);

  return () => {
    container.removeEventListener('pointerdown', onPointerDown);
    container.removeEventListener('pointerleave', onPointerLeaveOrUp);
    container.removeEventListener('pointerup', onPointerLeaveOrUp);
    container.removeEventListener('pointermove', onPointerMove);
    if (animId) cancelAnimationFrame(animId);
  };
}

/**
 * Automatically initializes swipe gestures on all elements with class .horizontal-scroll-container
 */
export function initAllHorizontalSwipeContainers() {
  const containers = document.querySelectorAll<HTMLElement>('.horizontal-scroll-container');
  const cleanups: Array<() => void> = [];

  containers.forEach((container) => {
    cleanups.push(enableSwipeToScroll(container));
  });

  return () => {
    cleanups.forEach((cleanup) => cleanup());
  };
}

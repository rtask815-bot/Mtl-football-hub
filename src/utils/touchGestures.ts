/**
 * Native Touch, Wheel & Drag Gesture Engine for Horizontal Scroll Containers
 * Enables smooth horizontal mouse wheel conversion, drag-to-scroll, and touch swipe momentum.
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

  // 1. Mouse Wheel Horizontal Scroll Mapper
  const onWheel = (e: WheelEvent) => {
    // If the user is scrolling vertically with mouse wheel over the row, translate to horizontal scroll
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      container.scrollBy({
        left: e.deltaY * 1.5,
        behavior: 'smooth'
      });
    }
  };

  // 2. Mouse/Pointer Drag-to-Scroll
  const onPointerDown = (e: PointerEvent) => {
    // Only intercept desktop mouse left-click drag to avoid blocking mobile touch pan
    if (e.pointerType !== 'mouse' || e.button !== 0) return;

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

    if (Math.abs(velocity) > 0.4) {
      let currentVelocity = velocity * 14;
      const step = () => {
        if (Math.abs(currentVelocity) < 0.4 || !container) {
          if (animId) cancelAnimationFrame(animId);
          return;
        }
        container.scrollLeft -= currentVelocity;
        currentVelocity *= 0.90;
        animId = requestAnimationFrame(step);
      };
      animId = requestAnimationFrame(step);
    }
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!isDown) return;
    e.preventDefault();

    const x = e.pageX - container.offsetLeft;
    const walk = (x - startX) * 1.4;
    const now = Date.now();
    const dt = Math.max(1, now - lastTime);

    velocity = (e.pageX - lastX) / dt;
    lastX = e.pageX;
    lastTime = now;

    container.scrollLeft = scrollLeft - walk;
  };

  container.addEventListener('wheel', onWheel, { passive: false });
  container.addEventListener('pointerdown', onPointerDown);
  container.addEventListener('pointerleave', onPointerLeaveOrUp);
  container.addEventListener('pointerup', onPointerLeaveOrUp);
  container.addEventListener('pointermove', onPointerMove);

  return () => {
    container.removeEventListener('wheel', onWheel);
    container.removeEventListener('pointerdown', onPointerDown);
    container.removeEventListener('pointerleave', onPointerLeaveOrUp);
    container.removeEventListener('pointerup', onPointerLeaveOrUp);
    container.removeEventListener('pointermove', onPointerMove);
    if (animId) cancelAnimationFrame(animId);
  };
}

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

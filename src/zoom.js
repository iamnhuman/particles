const MIN_ZOOM = 0.6;
const MAX_ZOOM = 2.4;
const BUTTON_FACTOR = 1.2;
const clampZoom = (zoom) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));

/** Scene magnification, driven by the experience's existing animation loop. */
export function createZoomController({ element, onChange } = {}) {
  if (!element?.addEventListener) throw new TypeError('Zoom requires a scene element.');

  const document = element.ownerDocument;
  const zoomIn = element.querySelector('#zoom-in');
  const zoomOut = element.querySelector('#zoom-out');
  const zoomReset = element.querySelector('#zoom-reset');
  const zoomValue = element.querySelector('#zoom-value');
  const zoomButtons = new Set([zoomIn, zoomOut, zoomReset].filter(Boolean));
  const listeners = [];
  let value = 1;
  let target = 1;
  let pinchDistance = 0;
  let destroyed = false;

  const dialogOpen = () => Boolean(document.querySelector('dialog[open]'));
  const isEditable = (node) => Boolean(
    node?.isContentEditable || node?.closest?.('input, select, textarea, [contenteditable]:not([contenteditable="false"])'),
  );
  const preventDefault = (event) => { if (event.cancelable) event.preventDefault(); };
  const listen = (node, name, listener, options) => {
    node.addEventListener(name, listener, options);
    listeners.push(() => node.removeEventListener(name, listener, options));
  };
  const refreshControls = () => {
    if (zoomValue) zoomValue.textContent = `${Math.round(value * 100)}%`;
    if (zoomIn) zoomIn.disabled = target >= MAX_ZOOM;
    if (zoomOut) zoomOut.disabled = target <= MIN_ZOOM;
  };
  const setTarget = (next) => {
    if (destroyed || !Number.isFinite(next)) return;
    target = clampZoom(next);
    refreshControls();
  };
  const reset = () => setTarget(1);

  listen(element, 'wheel', (event) => {
    if (dialogOpen() || isEditable(event.target) || !Number.isFinite(event.deltaY) || event.deltaY === 0) return;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2
      ? element.clientHeight || document.documentElement.clientHeight || 800
      : 1;
    preventDefault(event);
    const exponent = Math.max(-20, Math.min(20, -event.deltaY * unit * 0.0015));
    setTarget(target * Math.exp(exponent));
  }, { passive: false });

  const distanceBetweenTouches = (event) => {
    const touches = Array.from(event.touches).filter((touch) => element.contains(touch.target));
    if (touches.length !== 2) return 0;
    return Math.hypot(touches[1].clientX - touches[0].clientX, touches[1].clientY - touches[0].clientY);
  };
  const beginPinch = (event) => {
    pinchDistance = dialogOpen() || isEditable(event.target) ? 0 : distanceBetweenTouches(event);
    if (pinchDistance) preventDefault(event);
  };
  listen(element, 'touchstart', beginPinch, { passive: false });
  listen(element, 'touchmove', (event) => {
    if (dialogOpen() || isEditable(event.target)) { pinchDistance = 0; return; }
    const distance = distanceBetweenTouches(event);
    if (!distance) { pinchDistance = 0; return; }
    preventDefault(event);
    if (pinchDistance) setTarget(target * distance / pinchDistance);
    pinchDistance = distance;
  }, { passive: false });
  listen(element, 'touchend', beginPinch, { passive: false });
  listen(element, 'touchcancel', () => { pinchDistance = 0; }, { passive: true });

  for (const [button, action] of [
    [zoomIn, () => setTarget(target * BUTTON_FACTOR)],
    [zoomOut, () => setTarget(target / BUTTON_FACTOR)],
    [zoomReset, reset],
  ]) {
    if (button) listen(button, 'click', () => { if (!dialogOpen()) action(); });
  }
  if (zoomReset) zoomReset.setAttribute('aria-label', 'Reset zoom to 100%');

  listen(document, 'keydown', (event) => {
    const active = document.activeElement;
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey
      || (event.shiftKey && event.key !== '+') || dialogOpen() || isEditable(active) || isEditable(event.target)) return;
    const focusedButton = active?.closest?.('button, [role="button"]');
    if (focusedButton && !zoomButtons.has(focusedButton)) return;
    if (event.key === '+' || event.key === '=') setTarget(target * BUTTON_FACTOR);
    else if (event.key === '-') setTarget(target / BUTTON_FACTOR);
    else if (event.key === '0') reset();
    else return;
    preventDefault(event);
  });

  refreshControls();
  if (typeof onChange === 'function') onChange(value, target);

  return {
    /** delta is in seconds; a larger value means a closer view. */
    update(delta) {
      if (destroyed) return value;
      const elapsed = Number.isFinite(delta) ? Math.max(0, delta) : 0;
      const previous = value;
      value += (target - value) * -Math.expm1(-elapsed * 9);
      if (Math.abs(target - value) < 0.0001) value = target;
      if (previous !== value) {
        refreshControls();
        if (typeof onChange === 'function') onChange(value, target);
      }
      return value;
    },
    reset,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      pinchDistance = 0;
      for (const remove of listeners) remove();
    },
    get value() { return value; },
    get target() { return target; },
  };
}

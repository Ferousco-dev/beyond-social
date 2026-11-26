/**
 * A real mouse pointer that glides onto the spotlighted element and clicks it,
 * so a person sees where to tap without being told. It follows the element
 * every frame, so scrolling and sliding sheets keep it in place.
 */

const POINTER_SVG = `<svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M6 3.5 L6 22.5 L10.6 18.4 L13.6 25.2 L17 23.7 L14 17 L20.3 16.8 Z" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/>
</svg>`;

let node: HTMLDivElement | null = null;
let frame = 0;

export function showCursor(target: Element): void {
  hideCursor();
  node = document.createElement("div");
  node.className = "bs-tour-cursor";
  node.innerHTML = `<span class="bs-tour-cursor-ring"></span><span class="bs-tour-cursor-pointer">${POINTER_SVG}</span>`;
  document.body.append(node);
  const follow = (): void => {
    if (!node) return;
    const rect = target.getBoundingClientRect();
    // The tip rests a little inside the element, toward its middle.
    const x = rect.left + Math.min(rect.width / 2, Math.max(24, rect.width * 0.35));
    const y = rect.top + Math.min(rect.height / 2, Math.max(18, rect.height * 0.45));
    node.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    frame = window.requestAnimationFrame(follow);
  };
  follow();
}

export function hideCursor(): void {
  window.cancelAnimationFrame(frame);
  node?.remove();
  node = null;
}

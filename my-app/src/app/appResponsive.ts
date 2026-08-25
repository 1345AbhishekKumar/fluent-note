import type { AppContext } from './context';

export function initResponsive(ctx: AppContext, root: HTMLElement): () => void {
  const { elements, st, closeOverlayIf } = ctx;

  const onBurgerClick = () => {
    if (root.classList.contains('m') || root.classList.contains('s')) {
      st.overlay = !st.overlay;
      root.classList.toggle('sb-open', st.overlay);
    } else {
      st.sbUser = !st.sbUser;
      root.classList.toggle('sb-user', st.sbUser);
    }
  };

  const onPointerMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    const target = e.target as HTMLElement;
    const t = target.closest('.rv') as HTMLElement;
    if (!t) return;
    const r = t.getBoundingClientRect();
    t.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    t.style.setProperty('--my', (e.clientY - r.top) + 'px');
  };

  /* ---------- burger / overlay ---------- */
  elements.burger.addEventListener('click', onBurgerClick);
  elements.scrim.addEventListener('click', closeOverlayIf);

  /* ---------- reveal hover ---------- */
  root.addEventListener('pointermove', onPointerMove);

  /* ---------- container breakpoints ---------- */
  const resizeObserver = new ResizeObserver(() => {
    const w = root.clientWidth;
    const h = root.clientHeight;
    root.classList.toggle('xl', w >= 1000);
    root.classList.toggle('l', w >= 780 && w < 1000);
    root.classList.toggle('m', w >= 620 && w < 780);
    root.classList.toggle('s', w < 620);
    root.classList.toggle('h-sm', h < 600 && h >= 430);
    root.classList.toggle('h-xs', h < 430);
    if (!(w < 620)) root.classList.remove('show-editor');
  });
  resizeObserver.observe(root);

  return () => {
    elements.burger.removeEventListener('click', onBurgerClick);
    elements.scrim.removeEventListener('click', closeOverlayIf);
    root.removeEventListener('pointermove', onPointerMove);
    resizeObserver.disconnect();
  };
}

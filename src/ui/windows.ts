/** One window/HUD layout controller shared by the game and the offline preview. */
export function bindWindows() {
  const root = document.getElementById('view')!;
  const preview = location.pathname.includes('ui-preview');
  const key = 'elyndra.ui.layout.v2' + (preview ? '.preview' : '');
  const selectors = ['#inv-win', '#journal-win', '#npc-win', '#char-win', '#menu-win', '#inspector', '.status-win', '.map-win', '.quest-win', '.log-win', '.action-dock', '.menu-dock'];
  const panels = selectors.map(s => document.querySelector<HTMLElement>(s)!);
  let positions: Record<string, [number, number]> = {};
  try { const saved = JSON.parse(localStorage.getItem(key) ?? '{}'); for (const [id, xy] of Object.entries(saved)) if (Array.isArray(xy) && xy.length === 2 && xy.every(Number.isFinite)) positions[id] = xy as [number, number]; } catch { /* Defaults work without storage. */ }
  const apply = (panel: HTMLElement, x: number, y: number) => {
    const rect = panel.getBoundingClientRect();
    panel.style.left = Math.max(6, Math.min(x, innerWidth - rect.width - 6)) + 'px';
    panel.style.top = Math.max(6, Math.min(y, innerHeight - rect.height - 6)) + 'px';
    panel.style.right = 'auto'; panel.style.bottom = 'auto'; panel.style.transform = 'none';
  };
  const restore = () => panels.forEach((p, i) => {
    if (innerWidth < 800) { for (const prop of ['left', 'top', 'right', 'bottom', 'transform']) p.style.removeProperty(prop); return; }
    if (positions[selectors[i]] && !p.hidden) apply(p, ...positions[selectors[i]]);
  });
  let drag: { panel: HTMLElement; key: string; offsetX: number; offsetY: number; pointer: number } | null = null;
  const edit = document.getElementById('edit-layout') as HTMLInputElement;
  edit.onchange = () => root.classList.toggle('editing-hud', edit.checked);
  root.addEventListener('pointerdown', ev => {
    const target = ev.target as HTMLElement;
    if (ev.button !== 0 || target.closest('button,input,select,a,summary')) return;
    const panel = panels.find(p => p.contains(target)); if (!panel) return;
    if (!target.closest('.window-heading') && !(edit.checked && !panel.classList.contains('parchment'))) return;
    const rect = panel.getBoundingClientRect();
    drag = { panel, key:selectors[panels.indexOf(panel)], offsetX:ev.clientX - rect.left, offsetY:ev.clientY - rect.top, pointer:ev.pointerId };
    root.setPointerCapture(ev.pointerId); ev.preventDefault();
  });
  root.addEventListener('pointermove', ev => { if (drag && ev.pointerId === drag.pointer) apply(drag.panel, ev.clientX - drag.offsetX, ev.clientY - drag.offsetY); });
  const finish = () => {
    if (!drag) return;
    const rect = drag.panel.getBoundingClientRect(); positions[drag.key] = [rect.left, rect.top]; drag = null;
    try { localStorage.setItem(key, JSON.stringify(positions)); } catch { /* Session drag still works. */ }
  };
  root.addEventListener('pointerup', finish); root.addEventListener('pointercancel', finish);
  document.getElementById('reset-layout')!.onclick = () => {
    positions = {}; try { localStorage.removeItem(key); } catch { /* No persistence available. */ }
    panels.forEach(p => { for (const prop of ['left', 'top', 'right', 'bottom', 'transform']) p.style.removeProperty(prop); });
    edit.checked = false; root.classList.remove('editing-hud');
  };
  window.addEventListener('resize', restore);
  // Hidden windows are clamped when opened, rather than measured at width zero.
  const observer = new MutationObserver(restore);
  panels.forEach(p => observer.observe(p, { attributes:true, attributeFilter:['hidden'] }));
  restore();
}

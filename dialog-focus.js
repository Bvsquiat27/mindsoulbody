/* Modal dialogs: when one opens, focus moves into it; Tab and Shift+Tab stay
   inside it; when it closes, focus goes back to whatever opened it. This
   covers every [role="dialog"][aria-modal="true"] in the app (the profile
   dialog in #overlay, the squishy play sheet, the Manna Match lesson, the
   squishy celebration) without each screen managing focus itself. */
(() => {
  'use strict';
  const FOCUSABLE = 'a[href],area[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),iframe,[tabindex]:not([tabindex="-1"]),[contenteditable="true"]';
  let lastPointer = null;
  const open = new Map(); /* dialog element -> element focused before it opened */
  const visible = el => !!el && el.isConnected && !el.closest('[hidden]') && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  const focusables = dialog => [...dialog.querySelectorAll(FOCUSABLE)].filter(el => visible(el) && !el.closest('[inert]'));
  const modals = () => [...document.querySelectorAll('[role="dialog"][aria-modal="true"]')].filter(visible);
  const top = () => { const list = [...open.keys()].filter(visible); return list[list.length - 1] || null; };

  function enter(dialog) {
    if (open.has(dialog)) return;
    const active = document.activeElement && document.activeElement !== document.body && !dialog.contains(document.activeElement) ? document.activeElement : null;
    const before = active || (lastPointer && lastPointer.isConnected && !dialog.contains(lastPointer) ? lastPointer : null);
    open.set(dialog, before);
    if (dialog.contains(document.activeElement)) return;
    /* first form field if there is one (not on touch screens, where that
       would pop the keyboard up), else the first control that is not the
       close button, else the dialog itself */
    const items = focusables(dialog);
    const touch = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
    if (touch) { if (!dialog.hasAttribute('tabindex')) dialog.setAttribute('tabindex', '-1'); dialog.focus({ preventScroll: true }); return; }
    const field = items.find(el => el.matches('input,select,textarea'));
    const target = field || items.find(el => !el.matches('[data-close],.dialog-close')) || items[0];
    if (target) target.focus({ preventScroll: true });
    else { if (!dialog.hasAttribute('tabindex')) dialog.setAttribute('tabindex', '-1'); dialog.focus({ preventScroll: true }); }
  }
  function leave(dialog) {
    const before = open.get(dialog);
    open.delete(dialog);
    const active = document.activeElement;
    const lost = !active || active === document.body || !active.isConnected || dialog.contains(active) || !visible(active);
    if (!lost) return;
    if (before && before.isConnected && visible(before)) { before.focus({ preventScroll: true }); return; }
    const main = document.getElementById('screen');
    if (main) { if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1'); main.focus({ preventScroll: true }); }
  }
  let queued = false;
  function sync() {
    queued = false;
    const now = modals();
    for (const dialog of [...open.keys()]) if (!now.includes(dialog)) leave(dialog);
    for (const dialog of now) enter(dialog);
  }
  const schedule = () => { if (!queued) { queued = true; requestAnimationFrame(sync); } };
  /* remember the control that opened a dialog, even if the DOM changes first */
  document.addEventListener('pointerdown', e => { lastPointer = e.target.closest(FOCUSABLE); }, true);
  document.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const dialog = top();
    if (!dialog) return;
    const items = focusables(dialog);
    if (!items.length) { e.preventDefault(); dialog.focus({ preventScroll: true }); return; }
    const first = items[0], last = items[items.length - 1], active = document.activeElement;
    if (!dialog.contains(active)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); return; }
    if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
  }, true);
  /* focus that wanders out (a click on the page behind) is brought back */
  document.addEventListener('focusin', e => {
    const dialog = top();
    if (dialog && !dialog.contains(e.target) && !e.target.closest('#toast')) {
      const items = focusables(dialog);
      (items[0] || dialog).focus({ preventScroll: true });
    }
  });
  function start() {
    new MutationObserver(schedule).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden', 'class', 'style', 'aria-modal', 'role'] });
    schedule();
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  window.MsbDialogFocus = { sync, _open: open, _lastPointer: () => lastPointer };
})();

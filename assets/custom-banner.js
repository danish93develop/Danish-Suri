/**
 * Custom Banner: mobile menu drawer.
 * Vanilla JS only (assignment requirement).
 */
(function () {
  var toggle = document.querySelector('[data-cb-menu-toggle]');
  var drawer = document.querySelector('[data-cb-drawer]');
  var overlay = document.querySelector('[data-cb-drawer-overlay]');
  var closeBtn = document.querySelector('[data-cb-menu-close]');

  if (!toggle || !drawer || !overlay) return;

  function setOpen(open) {
    drawer.classList.toggle('is-open', open);
    overlay.hidden = !open;
    toggle.setAttribute('aria-expanded', open);
    drawer.setAttribute('aria-hidden', !open);
    document.body.classList.toggle('cb-drawer-open', open);
  }

  toggle.addEventListener('click', function () { setOpen(true); });
  closeBtn.addEventListener('click', function () { setOpen(false); });
  overlay.addEventListener('click', function () { setOpen(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setOpen(false);
  });
})();
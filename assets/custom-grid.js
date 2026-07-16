/**
 * Custom Grid popup.
 * Vanilla JS (assignment requirement). No external libraries.
 *
 * Step A: open/close the popup and render the clicked product's
 * details and options (color buttons + size select) from the
 * product JSON embedded on each "+" button.
 */
(function () {
  var section = document.querySelector('[data-bundle-handle]');
  if (!section) return;

  var overlay = section.querySelector('[data-cg-overlay]');
  var popup = section.querySelector('[data-cg-popup]');
  var els = {
    img: section.querySelector('[data-cg-img]'),
    title: section.querySelector('[data-cg-title]'),
    price: section.querySelector('[data-cg-price]'),
    desc: section.querySelector('[data-cg-desc]'),
    options: section.querySelector('[data-cg-options]'),
    addBtn: section.querySelector('[data-cg-add]')
  };

  // Holds the product currently shown in the popup and the
  // shopper's picked option values, keyed by option name.
  var current = { product: null, selected: {} };

  /* ---------- money formatting ---------- */
  function formatMoney(cents) {
    var amount = (cents / 100).toFixed(2);
    // Match the design's "980,00€" style via the store's currency.
    return amount + ' ' + (window.Shopify && Shopify.currency ? Shopify.currency.active : '');
  }

  /* ---------- open / close ---------- */
  function openPopup(product) {
    current.product = product;
    current.selected = {};

    els.img.src = product.featured_image || (product.images && product.images[0]) || '';
    els.img.alt = product.title;
    els.title.textContent = product.title;
    els.price.textContent = formatMoney(product.price);
    els.desc.innerHTML = product.description || '';

    renderOptions(product);

    overlay.hidden = false;
    document.body.classList.add('cg-popup-open');
    els.addBtn.disabled = true;
  }

  function closePopup() {
    overlay.hidden = true;
    document.body.classList.remove('cg-popup-open');
    current.product = null;
    current.selected = {};
  }

  /* ---------- render option groups ---------- */
  function renderOptions(product) {
    els.options.innerHTML = '';

    product.options.forEach(function (optionName, index) {
      // product.options is a list of names; values live on variants.
      var values = uniqueValues(product, index);

      var group = document.createElement('div');
      group.className = 'cg__opt';

      var label = document.createElement('span');
      label.className = 'cg__opt-label';
      label.textContent = optionName;
      group.appendChild(label);

      // Heuristic: the size-like option uses a dropdown (matches the
      // design's "Choose your size"); everything else uses buttons.
      if (/size/i.test(optionName)) {
        group.appendChild(buildSelect(optionName, values));
      } else {
        group.appendChild(buildButtons(optionName, values));
      }

      els.options.appendChild(group);
    });
  }

  function uniqueValues(product, optionIndex) {
    var seen = [];
    product.variants.forEach(function (v) {
      var val = v.options[optionIndex];
      if (seen.indexOf(val) === -1) seen.push(val);
    });
    return seen;
  }

  function buildButtons(optionName, values) {
    var wrap = document.createElement('div');
    wrap.className = 'cg__opt-values';

    values.forEach(function (val) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cg__opt-btn';
      btn.textContent = val;
      btn.addEventListener('click', function () {
        current.selected[optionName] = val;
        wrap.querySelectorAll('.cg__opt-btn').forEach(function (b) {
          b.classList.remove('is-selected');
        });
        btn.classList.add('is-selected');
        onSelectionChange();
      });
      wrap.appendChild(btn);
    });

    return wrap;
  }

  function buildSelect(optionName, values) {
    var select = document.createElement('select');
    select.className = 'cg__opt-select';

    var placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Choose your ' + optionName.toLowerCase();
    placeholder.disabled = true;
    placeholder.selected = true;
    select.appendChild(placeholder);

    values.forEach(function (val) {
      var opt = document.createElement('option');
      opt.value = val;
      opt.textContent = val;
      select.appendChild(opt);
    });

    select.addEventListener('change', function () {
      current.selected[optionName] = select.value;
      onSelectionChange();
    });

    return select;
  }

  // Placeholder until step B wires variant matching.
  function onSelectionChange() {}

  /* ---------- wire up ---------- */
  section.querySelectorAll('[data-cg-open]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      try {
        openPopup(JSON.parse(btn.getAttribute('data-product')));
      } catch (e) {
        console.error('Could not parse product data', e);
      }
    });
  });

  section.querySelector('[data-cg-close]').addEventListener('click', closePopup);
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closePopup();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !overlay.hidden) closePopup();
  });

  // Exposed so steps B and C can extend behavior on the same object.
  window.CustomGrid = { current: current, els: els };
})();
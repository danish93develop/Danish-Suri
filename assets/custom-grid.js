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
  var current = { product: null, selected: {}, variant: null };

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
    current.variant = null;

    els.img.src = product.image || '';
    els.img.alt = product.title;
    els.title.textContent = product.title;
    els.price.textContent = formatMoney(product.price);
    els.desc.innerHTML = product.description || '';

    // Make the popup visible first so option buttons have real
    // dimensions when the sliding pill measures them.
    overlay.hidden = false;
    document.body.classList.add('cg-popup-open');

    renderOptions(product);

    els.addBtn.disabled = true;
    setAddLabel('ADD TO CART');
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

    // Our JSON emits an "options" array of { name, values }.
    var optionList = product.options || [];

    optionList.forEach(function (option) {
      var optionName = option.name;
      var values = option.values;

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

  // Values may be plain strings or objects with a name; normalize.
  function valueName(val) {
    return typeof val === 'string' ? val : (val && val.name) || '';
  }

  // Map common colour names to CSS values for the swatch. Unknown
  // names fall back to the name itself (CSS understands many), then
  // to a neutral grey via the border so the swatch is always visible.
  var COLOR_MAP = {
    black: '#000000',
    white: '#ffffff',
    grey: '#9e9e9e',
    gray: '#9e9e9e',
    red: '#c0392b',
    blue: '#2740c4',
    green: '#2e7d32',
    yellow: '#f4d03f',
    orange: '#e67e22',
    pink: '#e91e8c',
    purple: '#7b2fbe',
    brown: '#795548',
    beige: '#e8d8b0',
    navy: '#1a237e',
    cream: '#f5f0e1'
  };

  function swatchColor(name) {
    var key = String(name).trim().toLowerCase();
    return COLOR_MAP[key] || key || '#cccccc';
  }

  function buildButtons(optionName, values) {
    var wrap = document.createElement('div');
    wrap.className = 'cg__opt-values';

    var isColor = /colou?r/i.test(optionName);

    // Sliding highlight that moves under the selected button.
    var pill = document.createElement('span');
    pill.className = 'cg__opt-pill';
    wrap.appendChild(pill);

    var buttons = [];

    function movePill(btn) {
      // Position and size the pill to sit exactly under this button.
      pill.style.width = btn.offsetWidth + 'px';
      pill.style.transform = 'translateX(' + btn.offsetLeft + 'px)';
    }

    values.forEach(function (raw, index) {
      var val = valueName(raw);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cg__opt-btn';

      if (isColor) {
        var sw = document.createElement('span');
        sw.className = 'cg__opt-swatch';
        sw.style.backgroundColor = swatchColor(val);
        btn.appendChild(sw);
      }

      var text = document.createElement('span');
      text.className = 'cg__opt-btn-text';
      text.textContent = val;
      btn.appendChild(text);

      btn.addEventListener('click', function () {
        current.selected[optionName] = val;
        buttons.forEach(function (b) { b.classList.remove('is-selected'); });
        btn.classList.add('is-selected');
        movePill(btn);
        onSelectionChange();
      });

      buttons.push(btn);
      wrap.appendChild(btn);
    });

    // Pre-select the first value (prototype shows one selected by default)
    // and place the pill once the element has real dimensions.
    if (buttons.length) {
      buttons[0].classList.add('is-selected');
      current.selected[optionName] = valueName(values[0]);
      requestAnimationFrame(function () { movePill(buttons[0]); });
    }

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

    values.forEach(function (raw) {
      var val = valueName(raw);
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

  /* ---------- variant matching (step B) ----------
     Find the variant whose option values match every current
     selection, then update price, availability, and the add button. */
  function findMatchingVariant(product, selected) {
    var optionNames = (product.options || []).map(function (o) { return o.name; });

    return product.variants.filter(function (variant) {
      // variant.options is an array positionally aligned with optionNames.
      return optionNames.every(function (name, i) {
        return selected[name] === variant.options[i];
      });
    })[0] || null;
  }

  function allOptionsChosen(product, selected) {
    return (product.options || []).every(function (o) {
      return selected[o.name];
    });
  }

  function onSelectionChange() {
    var product = current.product;
    if (!product) return;

    // Not everything picked yet: keep the button off.
    if (!allOptionsChosen(product, current.selected)) {
      current.variant = null;
      els.addBtn.disabled = true;
      return;
    }

    var variant = findMatchingVariant(product, current.selected);
    current.variant = variant;

    if (!variant) {
      // Combination doesn't exist.
      els.addBtn.disabled = true;
      setAddLabel('UNAVAILABLE');
      return;
    }

    // Reflect the matched variant's price and stock.
    els.price.textContent = formatMoney(variant.price);
    if (variant.available) {
      els.addBtn.disabled = false;
      setAddLabel('ADD TO CART');
    } else {
      els.addBtn.disabled = true;
      setAddLabel('SOLD OUT');
    }
  }

  function setAddLabel(text) {
    var label = els.addBtn.querySelector('[data-cg-add-label]');
    if (label) label.textContent = text;
  }

  /* ---------- wire up ---------- */
  section.querySelectorAll('[data-cg-open]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = btn.getAttribute('data-product-id');
      var dataEl = section.querySelector('[data-cg-product-json="' + id + '"]');
      if (!dataEl) return;
      try {
        openPopup(JSON.parse(dataEl.textContent));
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

  /* ---------- add to cart (step C) ---------- */
  var bundleHandle = section.getAttribute('data-bundle-handle');

  els.addBtn.addEventListener('click', function () {
    var variant = current.variant;
    if (!variant || !variant.available) return;

    // Build the line items. Start with the chosen variant.
    var items = [{ id: variant.id, quantity: 1 }];

    // Rule: if the chosen variant's options include BOTH "Black" and
    // "Medium" (in any option position), also add the bundle product.
    if (bundleHandle && matchesBundleRule(variant)) {
      // Resolve the bundle product's first variant id from its own
      // embedded JSON if it's on the page; otherwise fetch by handle.
      addWithBundle(items);
    } else {
      submitCart(items);
    }
  });

  // Rule trigger: the variant must carry a "black" colour AND a
  // "medium" size. Sizes may be stored spelled out ("Medium") or
  // abbreviated ("M"), so both forms are accepted.
  var BLACK_VALUES = ['black'];
  var MEDIUM_VALUES = ['medium', 'm'];

  function matchesBundleRule(variant) {
    var opts = (variant.options || []).map(function (o) {
      return String(o).trim().toLowerCase();
    });
    var hasBlack = opts.some(function (v) { return BLACK_VALUES.indexOf(v) !== -1; });
    var hasMedium = opts.some(function (v) { return MEDIUM_VALUES.indexOf(v) !== -1; });
    return hasBlack && hasMedium;
  }

  function addWithBundle(items) {
    // Fetch the bundle product as JSON to get a valid variant id.
    fetch('/products/' + bundleHandle + '.js')
      .then(function (res) {
        if (!res.ok) throw new Error('Bundle product not found');
        return res.json();
      })
      .then(function (product) {
        var firstAvailable = (product.variants || []).filter(function (v) {
          return v.available;
        })[0] || product.variants[0];
        if (firstAvailable) {
          items.push({ id: firstAvailable.id, quantity: 1 });
        }
        return submitCart(items);
      })
      .catch(function (err) {
        // If the bundle can't be added, still add the main product.
        console.warn('Bundle add skipped:', err.message);
        return submitCart(items);
      });
  }

  function submitCart(items) {
    setAddLabel('ADDING...');
    els.addBtn.disabled = true;

    fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: items })
    })
      .then(function (res) {
        if (!res.ok) throw new Error('Add to cart failed');
        return res.json();
      })
      .then(function () {
        closePopup();
        refreshCartAndOpenDrawer();
      })
      .catch(function (err) {
        console.error(err);
        setAddLabel('TRY AGAIN');
        els.addBtn.disabled = false;
      });
  }

  /* ---------- cart drawer + count refresh ---------- */
  function refreshCartAndOpenDrawer() {
    // Ask Dawn to render its own cart sections, then replace the whole
    // <cart-drawer> and bubble nodes. Replacing the entire element (not
    // just innerHTML) lets Dawn's custom elements re-initialize, so the
    // native quantity and remove buttons keep working.
    fetch('/?sections=cart-drawer,cart-icon-bubble')
      .then(function (res) { return res.json(); })
      .then(function (sections) {
        if (sections['cart-drawer']) {
          var oldDrawer = document.querySelector('cart-drawer');
          var parsed = new DOMParser().parseFromString(sections['cart-drawer'], 'text/html');
          var newDrawer = parsed.querySelector('cart-drawer');
          if (oldDrawer && newDrawer) {
            oldDrawer.replaceWith(newDrawer);
          }
        }

        if (sections['cart-icon-bubble']) {
          var oldBubble = document.getElementById('cart-icon-bubble');
          var parsedBubble = new DOMParser().parseFromString(sections['cart-icon-bubble'], 'text/html');
          var newBubble = parsedBubble.getElementById('cart-icon-bubble');
          if (oldBubble && newBubble) {
            oldBubble.replaceWith(newBubble);
          }
        }

        openDawnDrawer();
      })
      .catch(function () {
        updateCartCount();
      });
  }

  function updateCartCount() {
    fetch('/cart.js')
      .then(function (res) { return res.json(); })
      .then(function (cart) {
        document
          .querySelectorAll('.cart-count-bubble span[aria-hidden="true"]')
          .forEach(function (el) { el.textContent = cart.item_count; });
      })
      .catch(function () {});
  }

  function openDawnDrawer() {
    var drawer = document.querySelector('cart-drawer');
    if (drawer && typeof drawer.open === 'function') {
      drawer.open();
    } else if (drawer) {
      drawer.classList.add('active');
      drawer.removeAttribute('inert');
    }
  }
})();
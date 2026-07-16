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

  function buildButtons(optionName, values) {
    var wrap = document.createElement('div');
    wrap.className = 'cg__opt-values';

    values.forEach(function (raw) {
      var val = valueName(raw);
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

    var drawer = document.querySelector('cart-drawer');

    // Request the sections Dawn's own drawer knows how to render, so we
    // can hand them straight to its native renderContents() method
    // instead of swapping HTML ourselves (which breaks its buttons).
    var body = { items: items };
    if (drawer && drawer.getSectionsToRender) {
      body.sections = drawer.getSectionsToRender().map(function (s) { return s.id; });
      body.sections_url = window.location.pathname;
    }

    fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body)
    })
      .then(function (res) {
        if (!res.ok) throw new Error('Add to cart failed');
        return res.json();
      })
      .then(function (data) {
        closePopup();
        if (drawer && typeof drawer.renderContents === 'function') {
          // Dawn re-renders and opens the drawer itself, keeping all
          // native quantity/remove behavior intact.
          drawer.renderContents(data);
        } else {
          openDawnDrawer();
        }
        updateCartCount();
      })
      .catch(function (err) {
        console.error(err);
        setAddLabel('TRY AGAIN');
        els.addBtn.disabled = false;
      });
  }

  /* ---------- cart count (fallback) ---------- */
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
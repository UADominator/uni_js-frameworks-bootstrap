const Shop = (() => {
  const CART_KEY = 'nastilnia:cart';
  const COMPARE_KEY = 'nastilnia:compare';

  const readList = (key) => {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  };

  const writeList = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* приватний режим — кошик живе лише до перезавантаження */
    }
  };

  const byId = (id) => GAMES.find((game) => game.id === id);
  const genreLabel = (id) => GENRES.find((genre) => genre.id === id)?.label ?? id;
  const formatPrice = (value) => `${value.toLocaleString('uk-UA')} ₴`;
  const formatPlayers = ([min, max]) => (min === max ? `${min}` : `${min}–${max}`);

  const toastHost = () => document.getElementById('toast-host');

  const notify = (message, icon = 'bi-check2-circle') => {
    const host = toastHost();
    if (!host) return;

    const element = document.createElement('div');
    element.className = 'toast align-items-center border-0 mb-2';
    element.setAttribute('role', 'status');
    element.innerHTML = `
      <div class="d-flex">
        <div class="toast-body d-flex align-items-center gap-2">
          <i class="bi ${icon} text-primary-emphasis fs-5"></i>${message}
        </div>
        <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Закрити"></button>
      </div>`;

    host.append(element);
    const toast = bootstrap.Toast.getOrCreateInstance(element, { delay: 3200 });
    element.addEventListener('hidden.bs.toast', () => element.remove());
    toast.show();
  };

  const cart = {
    items: () => readList(CART_KEY),
    count: () => readList(CART_KEY).reduce((sum, line) => sum + line.qty, 0),
    total: () => readList(CART_KEY).reduce((sum, line) => sum + byId(line.id).price * line.qty, 0),
    add(id) {
      const items = readList(CART_KEY);
      const line = items.find((item) => item.id === id);
      if (line) {
        line.qty += 1;
      } else {
        items.push({ id, qty: 1 });
      }
      writeList(CART_KEY, items);
      sync();
      notify(`«${byId(id).title}» у кошику`, 'bi-bag-check');
    },
    remove(id) {
      writeList(
        CART_KEY,
        readList(CART_KEY).filter((item) => item.id !== id),
      );
      sync();
    },
    clear() {
      writeList(CART_KEY, []);
      sync();
    },
  };

  const compare = {
    items: () => readList(COMPARE_KEY),
    has: (id) => readList(COMPARE_KEY).includes(id),
    toggle(id) {
      const items = readList(COMPARE_KEY);
      const next = items.includes(id)
        ? items.filter((item) => item !== id)
        : [...items, id].slice(-4);
      writeList(COMPARE_KEY, next);
      sync();
      return next.includes(id);
    },
    clear() {
      writeList(COMPARE_KEY, []);
      sync();
    },
  };

  const gameCard = (game) => {
    const badge = BADGES[game.badge];
    const compared = compare.has(game.id);
    return `
      <article class="card game-card h-100">
        <img
          class="game-card__cover"
          src="../img/covers/${game.cover}"
          alt="Обкладинка гри «${game.title}»"
          width="600"
          height="450"
          loading="lazy"
        />
        ${badge ? `<span class="badge ${badge.className} game-card__badge">${badge.label}</span>` : ''}
        <button
          type="button"
          class="btn btn-sm btn-light rounded-circle game-card__compare"
          data-compare="${game.id}"
          aria-pressed="${compared}"
          title="Додати до порівняння"
        >
          <i class="bi bi-bar-chart-steps" aria-hidden="true"></i>
          <span class="visually-hidden">Додати «${game.title}» до порівняння</span>
        </button>
        <div class="game-card__body">
          <p class="eyebrow mb-0">${genreLabel(game.genre)}</p>
          <h3 class="game-card__title">
            <a class="link-quiet stretched-link" href="game.html?id=${game.id}">${game.title}</a>
          </h3>
          <p class="game-card__meta mb-0">
            <span><i class="bi bi-people" aria-hidden="true"></i>${formatPlayers(game.players)}</span>
            <span><i class="bi bi-clock" aria-hidden="true"></i>${game.time} хв</span>
            <span><i class="bi bi-person-badge" aria-hidden="true"></i>${game.age}+</span>
          </p>
          <p class="game-card__rating mb-0">
            <i class="bi bi-star-fill" aria-hidden="true"></i>${game.rating.toFixed(1)}
            <span class="fw-normal text-body-secondary">(${game.reviews})</span>
          </p>
          <div class="game-card__foot">
            <p class="mb-0">
              <span class="game-card__price">${formatPrice(game.price)}</span>
              ${game.oldPrice ? `<s class="small text-body-secondary ms-1">${formatPrice(game.oldPrice)}</s>` : ''}
            </p>
            <button type="button" class="btn btn-sm btn-primary position-relative z-2" data-add="${game.id}">
              <i class="bi bi-bag-plus" aria-hidden="true"></i>
              <span class="visually-hidden">Додати «${game.title}» у кошик</span>
            </button>
          </div>
        </div>
      </article>`;
  };

  const renderCartPanel = () => {
    const host = document.getElementById('cart-lines');
    if (!host) return;

    const items = cart.items();
    const totalNode = document.getElementById('cart-total');
    const footer = document.getElementById('cart-footer');

    if (!items.length) {
      host.innerHTML = `
        <p class="text-body-secondary text-center my-5">
          <i class="bi bi-bag d-block fs-1 mb-2 opacity-50" aria-hidden="true"></i>
          Кошик поки порожній
        </p>`;
      footer?.classList.add('d-none');
      return;
    }

    host.innerHTML = `<ul class="list-group list-group-flush">${items
      .map((line) => {
        const game = byId(line.id);
        return `
          <li class="list-group-item d-flex align-items-center gap-3 px-0">
            <img class="rounded" src="../img/covers/${game.cover}" alt="" width="56" height="42" />
            <span class="flex-grow-1">
              <span class="d-block">${game.title}</span>
              <span class="small text-body-secondary">${line.qty} × ${formatPrice(game.price)}</span>
            </span>
            <button type="button" class="btn btn-sm btn-link text-danger p-0" data-cart-remove="${game.id}">
              <i class="bi bi-x-lg" aria-hidden="true"></i>
              <span class="visually-hidden">Прибрати «${game.title}»</span>
            </button>
          </li>`;
      })
      .join('')}</ul>`;

    if (totalNode) totalNode.textContent = formatPrice(cart.total());
    footer?.classList.remove('d-none');
  };

  const syncCompareBar = () => {
    const bar = document.getElementById('compare-bar');
    if (!bar) return;

    const items = compare.items();
    bar.classList.toggle('d-none', items.length === 0);
    const counter = document.getElementById('compare-count');
    if (counter) counter.textContent = String(items.length);

    document.querySelectorAll('[data-compare]').forEach((button) => {
      button.setAttribute('aria-pressed', String(items.includes(button.dataset.compare)));
    });
  };

  const sync = () => {
    document.querySelectorAll('.cart-count').forEach((node) => {
      const count = cart.count();
      node.textContent = count ? String(count) : '';
    });
    renderCartPanel();
    syncCompareBar();
  };

  const applyTheme = (theme) => {
    document.documentElement.setAttribute('data-bs-theme', theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      /* ігноруємо недоступне сховище */
    }
  };

  const initTheme = () => {
    document.querySelector('[data-theme-toggle]')?.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-bs-theme');
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });
  };

  const initDelegation = () => {
    document.addEventListener('click', (event) => {
      const addButton = event.target.closest('[data-add]');
      if (addButton) {
        event.preventDefault();
        cart.add(addButton.dataset.add);
        return;
      }

      const compareButton = event.target.closest('[data-compare]');
      if (compareButton) {
        event.preventDefault();
        const added = compare.toggle(compareButton.dataset.compare);
        notify(added ? 'Додано до порівняння' : 'Прибрано з порівняння', 'bi-bar-chart-steps');
        return;
      }

      const removeButton = event.target.closest('[data-cart-remove]');
      if (removeButton) {
        cart.remove(removeButton.dataset.cartRemove);
      }
    });

    document.getElementById('compare-clear')?.addEventListener('click', () => compare.clear());
    document.getElementById('cart-clear')?.addEventListener('click', () => cart.clear());
  };

  const initValidation = () => {
    document.querySelectorAll('form.needs-validation').forEach((form) => {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        if (!form.checkValidity()) {
          form.classList.add('was-validated');
          return;
        }
        form.classList.remove('was-validated');
        form.reset();
        notify(form.dataset.successMessage ?? 'Готово, дякуємо!', 'bi-send-check');
      });
    });
  };

  const trackHeaderHeight = () => {
    const header = document.querySelector('.site-header');
    if (!header) return;

    const measure = () =>
      document.documentElement.style.setProperty('--header-h', `${header.offsetHeight}px`);

    measure();
    new ResizeObserver(measure).observe(header);
  };

  const initTooltips = () => {
    document
      .querySelectorAll('[data-bs-toggle="tooltip"]')
      .forEach((node) => new bootstrap.Tooltip(node));
  };

  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    trackHeaderHeight();
    initDelegation();
    initValidation();
    initTooltips();
    sync();

    const year = document.getElementById('year');
    if (year) year.textContent = String(new Date().getFullYear());
  });

  return { byId, genreLabel, formatPrice, formatPlayers, gameCard, notify, cart, compare, sync };
})();

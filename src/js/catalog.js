(() => {
  const grid = document.getElementById('catalog-grid');
  if (!grid) return;

  const PAGE_SIZE = 8;

  const SORTERS = {
    popular: (a, b) => b.rating * b.reviews - a.rating * a.reviews,
    rating: (a, b) => b.rating - a.rating,
    'price-asc': (a, b) => a.price - b.price,
    'price-desc': (a, b) => b.price - a.price,
    fresh: (a, b) => b.year - a.year,
  };

  const maxPrice = Math.max(...GAMES.map((game) => game.price));

  const state = {
    genres: new Set(),
    players: 0,
    maxTime: 0,
    maxPrice,
    search: '',
    sort: 'popular',
    page: 1,
  };

  const form = document.getElementById('filters');
  const chipRow = document.getElementById('genre-chips');
  const countNode = document.getElementById('catalog-count');
  const pagination = document.getElementById('pagination');
  const priceOutput = document.getElementById('price-output');

  const matches = (game) => {
    if (state.genres.size && !state.genres.has(game.genre)) return false;
    if (state.players && (game.players[0] > state.players || game.players[1] < state.players)) {
      return false;
    }
    if (state.maxTime && game.time > state.maxTime) return false;
    if (game.price > state.maxPrice) return false;
    if (state.search && !game.title.toLowerCase().includes(state.search)) return false;
    return true;
  };

  const renderPagination = (pages) => {
    if (pages <= 1) {
      pagination.innerHTML = '';
      return;
    }

    const item = (page, label, { disabled = false, active = false } = {}) => `
      <li class="page-item${disabled ? ' disabled' : ''}${active ? ' active' : ''}">
        <button type="button" class="page-link" data-page="${page}"${active ? ' aria-current="page"' : ''}>
          ${label}
        </button>
      </li>`;

    pagination.innerHTML = [
      item(
        state.page - 1,
        '<span aria-hidden="true">‹</span><span class="visually-hidden">Назад</span>',
        {
          disabled: state.page === 1,
        },
      ),
      ...Array.from({ length: pages }, (_, index) =>
        item(index + 1, String(index + 1), { active: state.page === index + 1 }),
      ),
      item(
        state.page + 1,
        '<span aria-hidden="true">›</span><span class="visually-hidden">Далі</span>',
        {
          disabled: state.page === pages,
        },
      ),
    ].join('');
  };

  const render = () => {
    const found = GAMES.filter(matches).sort(SORTERS[state.sort]);
    const pages = Math.ceil(found.length / PAGE_SIZE);
    state.page = Math.min(state.page, Math.max(pages, 1));

    const slice = found.slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE);

    countNode.textContent = found.length
      ? `Знайдено ігор: ${found.length}`
      : 'За вашими фільтрами нічого не знайшлося';

    grid.innerHTML = slice.length
      ? slice
          .map(
            (game) =>
              `<div class="col-12 col-sm-6 col-lg-4 col-xxl-3">${Shop.gameCard(game)}</div>`,
          )
          .join('')
      : `<div class="col-12">
          <div class="empty-state">
            <i class="bi bi-search fs-1 text-body-secondary d-block mb-3" aria-hidden="true"></i>
            <h2 class="h5">Нічого не знайшлося</h2>
            <p class="text-body-secondary mb-3">Спробуйте послабити фільтри або скинути їх повністю.</p>
            <button type="button" class="btn btn-outline-primary" data-reset-filters>Скинути фільтри</button>
          </div>
        </div>`;

    renderPagination(pages);
    Shop.sync();
  };

  const syncChips = () => {
    chipRow.querySelectorAll('[data-genre]').forEach((chip) => {
      chip.setAttribute('aria-pressed', String(state.genres.has(chip.dataset.genre)));
    });
    form.querySelectorAll('[name="genre"]').forEach((input) => {
      input.checked = state.genres.has(input.value);
    });
  };

  const readForm = () => {
    const data = new FormData(form);
    state.genres = new Set(data.getAll('genre'));
    state.players = Number(data.get('players')) || 0;
    state.maxTime = Number(data.get('time')) || 0;
    state.maxPrice = Number(data.get('price')) || maxPrice;
    state.page = 1;
    priceOutput.textContent = Shop.formatPrice(state.maxPrice);
    syncChips();
    render();
  };

  form.addEventListener('change', readForm);

  form.addEventListener('reset', () => {
    window.requestAnimationFrame(() => {
      state.search = '';
      const search = document.getElementById('catalog-search');
      if (search) search.value = '';
      readForm();
    });
  });

  chipRow.addEventListener('click', (event) => {
    const chip = event.target.closest('[data-genre]');
    if (!chip) return;

    const { genre } = chip.dataset;
    if (state.genres.has(genre)) {
      state.genres.delete(genre);
    } else {
      state.genres.add(genre);
    }
    state.page = 1;
    syncChips();
    render();
  });

  pagination.addEventListener('click', (event) => {
    const button = event.target.closest('[data-page]');
    if (!button) return;

    state.page = Number(button.dataset.page);
    render();
    grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  document.getElementById('sort')?.addEventListener('change', (event) => {
    state.sort = event.target.value;
    state.page = 1;
    render();
  });

  document.getElementById('catalog-search')?.addEventListener('input', (event) => {
    state.search = event.target.value.trim().toLowerCase();
    state.page = 1;
    render();
  });

  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-reset-filters]')) form.reset();
  });

  const compareModal = document.getElementById('compare');

  const ROWS = [
    ['Жанр', (game) => Shop.genreLabel(game.genre)],
    ['Гравців', (game) => Shop.formatPlayers(game.players)],
    ['Партія', (game) => `${game.time} хв`],
    ['Вік', (game) => `${game.age}+`],
    ['Оцінка', (game) => game.rating.toFixed(1)],
    ['Рік', (game) => String(game.year)],
    ['Видавець', (game) => game.publisher],
    ['Ціна', (game) => Shop.formatPrice(game.price)],
  ];

  compareModal?.addEventListener('show.bs.modal', () => {
    const chosen = Shop.compare.items().map(Shop.byId);
    const body = document.getElementById('compare-body');

    if (!chosen.length) {
      body.innerHTML = '<p class="text-body-secondary mb-0">Оберіть хоча б дві гри в каталозі.</p>';
      return;
    }

    body.innerHTML = `
      <div class="table-responsive">
        <table class="table table-striped align-middle mb-0">
          <thead>
            <tr>
              <th scope="col">Характеристика</th>
              ${chosen.map((game) => `<th scope="col">${game.title}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${ROWS.map(
              ([label, value]) => `
                <tr>
                  <th scope="row" class="fw-normal text-body-secondary">${label}</th>
                  ${chosen.map((game) => `<td>${value(game)}</td>`).join('')}
                </tr>`,
            ).join('')}
          </tbody>
        </table>
      </div>`;
  });

  const params = new URLSearchParams(window.location.search);
  const requestedGenre = params.get('genre');
  const requestedQuery = params.get('q');

  if (requestedGenre && GENRES.some((genre) => genre.id === requestedGenre)) {
    state.genres.add(requestedGenre);
  }

  if (requestedQuery) {
    state.search = requestedQuery.trim().toLowerCase();
    const search = document.getElementById('catalog-search');
    if (search) search.value = requestedQuery;
  }

  syncChips();
  priceOutput.textContent = Shop.formatPrice(state.maxPrice);
  render();
})();

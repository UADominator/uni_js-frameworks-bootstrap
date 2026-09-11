(() => {
  const page = document.getElementById('game-page');
  if (!page) return;

  const REVIEWS = [
    {
      author: 'Оксана',
      rating: 5,
      date: '12 серпня 2026',
      text: 'Брали на дачу — зайшло і дорослим, і племінникам. Правила пояснили за десять хвилин, далі вже ніхто не хотів зупинятися.',
    },
    {
      author: 'Ігор',
      rating: 4,
      date: '3 серпня 2026',
      text: 'Компоненти щільні, коробка не роздовбалася після двадцяти партій. Єдине — органайзера всередині бракує.',
    },
    {
      author: 'Марта',
      rating: 5,
      date: '27 липня 2026',
      text: 'Українська локалізація зроблена акуратно, помилок у тексті карток не знайшла. Доставили за два дні.',
    },
  ];

  const params = new URLSearchParams(window.location.search);
  const game = Shop.byId(params.get('id') ?? '') ?? GAMES[0];

  const stars = (value) =>
    Array.from({ length: 5 }, (_, index) => {
      const filled = index < Math.round(value);
      return `<i class="bi bi-star${filled ? '-fill' : ''}" aria-hidden="true"></i>`;
    }).join('');

  const distribution = (rating) => {
    const top = Math.min(0.95, Math.max(0.1, (rating - 2.5) / 2.5));
    const rest = 1 - top;
    return [top, rest * 0.55, rest * 0.25, rest * 0.13, rest * 0.07];
  };

  const fields = {
    title: game.title,
    genre: Shop.genreLabel(game.genre),
    summary: game.summary,
    rating: game.rating.toFixed(1),
    reviews: String(game.reviews),
    price: Shop.formatPrice(game.price),
    players: Shop.formatPlayers(game.players),
    time: `${game.time} хв`,
    age: `${game.age}+`,
    year: String(game.year),
    publisher: game.publisher,
    designer: game.designer,
  };

  page.querySelectorAll('[data-field]').forEach((node) => {
    node.textContent = fields[node.dataset.field] ?? '';
  });

  page.querySelectorAll('[data-stars]').forEach((node) => {
    node.innerHTML = stars(game.rating);
  });

  page.querySelectorAll('[data-buy]').forEach((node) => {
    node.dataset.add = game.id;
  });

  page.querySelectorAll('[data-compare-btn]').forEach((node) => {
    node.dataset.compare = game.id;
  });

  const cover = page.querySelector('[data-cover]');
  cover.src = `../img/covers/${game.cover}`;
  cover.alt = `Обкладинка гри «${game.title}»`;

  const oldPrice = page.querySelector('[data-old-price]');
  if (game.oldPrice) {
    oldPrice.textContent = Shop.formatPrice(game.oldPrice);
  } else {
    oldPrice.remove();
  }

  const badge = BADGES[game.badge];
  const badgeNode = page.querySelector('[data-badge]');
  if (badge) {
    badgeNode.textContent = badge.label;
    badgeNode.classList.add(badge.className);
  } else {
    badgeNode.remove();
  }

  page.querySelector('[data-ratings]').innerHTML = distribution(game.rating)
    .map(
      (share, index) => `
        <div class="rating-bar">
          <span>${5 - index} <i class="bi bi-star-fill text-warning" aria-hidden="true"></i></span>
          <div class="progress" role="progressbar" aria-label="Оцінка ${5 - index} з 5"
               aria-valuenow="${Math.round(share * 100)}" aria-valuemin="0" aria-valuemax="100">
            <div class="progress-bar bg-warning" style="width: ${(share * 100).toFixed(0)}%"></div>
          </div>
          <span class="text-body-secondary">${(share * 100).toFixed(0)}%</span>
        </div>`,
    )
    .join('');

  page.querySelector('[data-reviews]').innerHTML = REVIEWS.map(
    (review) => `
      <article class="review d-flex gap-3">
        <span class="avatar" aria-hidden="true">${review.author.charAt(0)}</span>
        <div>
          <p class="mb-1">
            <span class="fw-semibold">${review.author}</span>
            <span class="text-warning ms-2">${stars(review.rating)}</span>
            <span class="small text-body-secondary ms-2">${review.date}</span>
          </p>
          <p class="mb-0 text-body-secondary">${review.text}</p>
        </div>
      </article>`,
  ).join('');

  const related = GAMES.filter((item) => item.genre === game.genre && item.id !== game.id)
    .concat(GAMES.filter((item) => item.genre !== game.genre).sort((a, b) => b.rating - a.rating))
    .slice(0, 4);

  page.querySelector('[data-related]').innerHTML = related
    .map((item) => `<div class="col-12 col-sm-6 col-lg-3">${Shop.gameCard(item)}</div>`)
    .join('');

  document.title = `${game.title} — Настільня`;
  Shop.sync();
})();

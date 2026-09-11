(() => {
  const popular = document.getElementById('popular-grid');
  if (!popular) return;

  const GENRE_ICONS = {
    strategy: 'bi-diagram-3',
    family: 'bi-house-heart',
    party: 'bi-emoji-laughing',
    coop: 'bi-people',
    duel: 'bi-arrow-left-right',
    abstract: 'bi-grid-3x3',
    kids: 'bi-balloon',
  };

  popular.innerHTML = [...GAMES]
    .sort((a, b) => b.rating * b.reviews - a.rating * a.reviews)
    .slice(0, 8)
    .map((game) => `<div class="col-12 col-sm-6 col-lg-4 col-xxl-3">${Shop.gameCard(game)}</div>`)
    .join('');

  document.getElementById('genre-grid').innerHTML = GENRES.map((genre) => {
    const count = GAMES.filter((game) => game.genre === genre.id).length;
    return `
      <div class="col-6 col-md-4 col-lg-3">
        <a class="card h-100 link-quiet text-decoration-none" href="catalog.html?genre=${genre.id}">
          <div class="card-body d-flex align-items-center gap-3">
            <span class="icon-tile"><i class="bi ${GENRE_ICONS[genre.id]}" aria-hidden="true"></i></span>
            <span>
              <span class="d-block fw-semibold">${genre.label}</span>
              <span class="small text-body-secondary">${count} ігор</span>
            </span>
          </div>
        </a>
      </div>`;
  }).join('');

  Shop.sync();
})();

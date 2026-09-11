const THEME_STORAGE_KEY = 'nastilnia:theme';

(() => {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  let stored = null;
  try {
    stored = localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    stored = null;
  }
  document.documentElement.setAttribute(
    'data-bs-theme',
    stored ?? (prefersDark ? 'dark' : 'light'),
  );
})();

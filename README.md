# Настільня — каталог настільних ігор на Bootstrap 5

## Мета

Зібрати багатосторінковий каталог-магазин на Bootstrap 5 так, щоб тема задавалася через SCSS-змінні фреймворку, а не перебивалася власним CSS поверх, і щоб уся інтерактивність (кошик, фільтри, порівняння) працювала без бекенду.

## Завдання

1. Підключити Bootstrap 5 через SCSS-джерела з власною палітрою і типографікою.
2. Зверстати чотири сторінки: головну, каталог, картку гри, «про нас».
3. Використати JS-компоненти Bootstrap: offcanvas, modal, toast, dropdown, carousel, accordion, tooltip, pills.
4. Реалізувати кошик і порівняння з персистентністю у `localStorage`.
5. Зробити каталог із фільтрами, пошуком, сортуванням і пагінацією на клієнті.
6. Підтримати світлу й темну теми без «блимання» при завантаженні.

## Виконання

**Bootstrap збирається з джерел, а не з готового CSS.** `src/scss/main.scss`

```scss
@import 'bootstrap/scss/functions';
@import 'variables'; // власна палітра — ДО змінних Bootstrap
@import 'bootstrap/scss/variables';
@import 'bootstrap/scss/variables-dark';
@import 'bootstrap/scss/maps';
@import 'bootstrap/scss/mixins';
@import 'bootstrap/scss/utilities';
@import 'bootstrap/scss/root';
// ... далі лише потрібні модули: grid, card, navbar, offcanvas, modal, toast, carousel ...
@import 'bootstrap/scss/utilities/api';
```

Порядок тут критичний: `variables` підключається між `functions` і `bootstrap/scss/variables`, бо змінні Bootstrap оголошені з `!default` — власне значення має існувати раніше, інакше воно не підхопиться. Альтернатива з `@use` не пройшла: `bootstrap-icons` і `color-mode()` у такій конфігурації простіше тримати на `@import`, тому deprecation-попередження глушаться прапорцем `--silence-deprecation=import` у npm-скрипті.

**Темна тема — на власних токенах поверх `color-mode`.** `src/scss/_tokens.scss`

```scss
:root {
  --surface: #ffffff;
  --cover-ring: rgba(43, 38, 34, 0.06);
}

@include color-mode(dark) {
  --surface: #232825;
  --cover-ring: rgba(255, 255, 255, 0.08);
}
```

Те, що Bootstrap не покриває своїми `--bs-*` (поверхні карток, градієнт hero, обідок обкладинки), виведено в окремі CSS-змінні. Компоненти читають `var(--surface)` і перемальовуються самі при зміні `data-bs-theme`.

**Атрибут теми виставляється до першого кадру.** `src/js/theme-init.js`

```js
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
let stored = null;
try {
  stored = localStorage.getItem(THEME_STORAGE_KEY);
} catch {
  stored = null;
}
document.documentElement.setAttribute('data-bs-theme', stored ?? (prefersDark ? 'dark' : 'light'));
```

Скрипт підключений синхронно в `<head>`, тому темна тема не блимає світлим. `try/catch` тут не формальність: у приватному режимі Safari звернення до `localStorage` кидає виняток і без обгортки падає вся ініціалізація сторінки.

**Вся інтерактивність — на одному слухачі.** `src/js/app.js:229`

```js
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
    notify(added ? 'Додано до порівняння' : 'Прибрано з порівняння');
    return;
  }
});
```

Картки товарів перемальовуються повністю при кожному фільтруванні, тож навішувати слухачі на кнопки всередині них не було сенсу — після `innerHTML` вони б загубилися. Делегування через `closest()` по `data-`атрибутах знімає цю проблему: розмітка може змінюватися скільки завгодно.

**Кошик і порівняння живуть у `localStorage`, UI — похідний від стану.** `src/js/app.js:50`

```js
const cart = {
  items: () => readList(CART_KEY),
  count: () => readList(CART_KEY).reduce((sum, line) => sum + line.qty, 0),
  total: () => readList(CART_KEY).reduce((sum, line) => sum + byId(line.id).price * line.qty, 0),
  add(id) {
    const items = readList(CART_KEY);
    const line = items.find((item) => item.id === id);
    if (line) line.qty += 1;
    else items.push({ id, qty: 1 });
    writeList(CART_KEY, items);
    sync();
  },
};
```

У сховищі лежать тільки `{ id, qty }` — назви й ціни завжди читаються з `GAMES`, тому правка каталогу не робить збережений кошик несумісним. Функція `sync()` — єдина точка, після якої оновлюються лічильник у навбарі, панель offcanvas і смуга порівняння.

**Каталог фільтрує один масив через об'єкт стану.** `src/js/catalog.js:33`

```js
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
```

Фільтри, сортування (`SORTERS`), пошук і номер сторінки — поля одного об'єкта `state`; будь-яка зміна зводиться до правки поля і виклику `render()`. Фільтр за кількістю гравців перевіряє перетин з діапазоном `[min, max]`, а не рівність, інакше гра «2–5 гравців» не знаходилася б за запитом «4 гравці». Стартові фільтри читаються з query-рядка (`catalog.html?genre=strategy`), тому посилання з плиток категорій на головній працюють без окремого коду.

**Картка гри — одна сторінка на всі 16 товарів.** `src/js/game.js:26`

```js
const params = new URLSearchParams(window.location.search);
const game = Shop.byId(params.get('id') ?? '') ?? GAMES[0];

page.querySelectorAll('[data-field]').forEach((node) => {
  node.textContent = fields[node.dataset.field] ?? '';
});
```

У розмітці стоять порожні слоти `data-field`, які заповнюються з об'єкта гри — окремий HTML на кожен товар не потрібен. Значення підставляються через `textContent`, а не `innerHTML`, щоб текст з даних не міг внести розмітку. Блок «схожі ігри» добирається спершу з того ж жанру, далі — за рейтингом, тому чотири картки є навіть у жанрі з єдиною грою.

**Збірка і сервер — без бандлера.** `scripts/serve.mjs:19`

```js
const resolve = (url) => {
  const path = decodeURIComponent(new URL(url, 'http://localhost').pathname);
  const target = join(ROOT, normalize(path).replace(/^(\.\.[/\\])+/, ''));
  if (existsSync(target) && statSync(target).isDirectory()) return join(target, 'index.html');
  return target;
};
```

Статику роздає ~40 рядків на `node:http` з мапою MIME-типів; `normalize()` плюс зрізання `../` не дає вийти за `src/`. `scripts/copy-assets.mjs` копіює бандл Bootstrap і шрифти іконок з `node_modules` у `src/vendor` і `src/fonts` — без цього кроку `bootstrap-icons` шукає шрифти за неправильним шляхом, тому в SCSS перед його імпортом перевизначено `$bootstrap-icons-font-dir: '../fonts'`.

## Результати

```bash
$ npm run build
> nastilnia@1.0.0 assets
> node scripts/copy-assets.mjs

> nastilnia@1.0.0 css
> sass --load-path=node_modules --quiet-deps --silence-deprecation=import --no-source-map src/scss/main.scss src/css/main.css

$ wc -l src/css/main.css
20300 src/css/main.css
```

Збірка проходить без попереджень, на виході 20 300 рядків CSS (372 КБ нестиснутих) — лише підключені модулі Bootstrap плюс власні партіали.

```bash
$ npm start
Настільня: http://localhost:3000/pages/index.html

$ curl -s -o /dev/null -w "%{http_code} %{size_download}\n" http://localhost:3000/pages/...
index.html    200  24046
catalog.html  200  24765
game.html?id=catan  200  29120
about.html    200  29573
css/main.css  200  379698
nope.html     404      3
```

Усі чотири сторінки і стилі віддаються, неіснуючий шлях коректно повертає 404. `npx prettier --check .` — `All matched files use Prettier code style!`.

Перевірено вручну в браузері: кошик і порівняння зберігаються після перезавантаження, фільтри каталогу і пагінація узгоджені між собою, темна тема не блимає, offcanvas/modal/toast/carousel/accordion/tooltip працюють від бандла Bootstrap без власних обгорток.

## Висновки

Складання Bootstrap із SCSS-джерел виявилося вигіднішим за перебивання готового CSS: уся палітра й типографіка задаються двома десятками змінних у `_variables.scss`, а темна тема дістається майже безкоштовно через `color-mode()`. Найнеочевиднішим був порядок імпортів — власні змінні мусять іти після `functions`, але до `variables`, інакше `!default` з'їдає їх молча, без жодної помилки збірки. Другий висновок практичний: при повному перемальовуванні списків делегування подій — не оптимізація, а єдиний робочий варіант, бо прямі слухачі гинуть разом зі старим `innerHTML`. Такий стек — SCSS-збірка плюс статичний сервер на `node:http` — цілком закриває потреби невеликого клієнтського каталогу без бандлера.

## Використання ШІ

| Інструмент | Запит                                                                                                       | Як використано результат                                                                                                                   |
| ---------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| AI agent   | Згенерувати описи 16 настільних ігор українською: коротке `summary`, видавець, автор, рік, вікове обмеження | Вставив у `GAMES` у `src/js/games.js`; звірив роки й авторів з BoardGameGeek, у двох записах виправив видавця на українського локалізатора |
| AI agent   | Написати три відгуки покупців різної тональності для картки товару                                          | Узяв у `REVIEWS` (`src/js/game.js:5`) як демо-дані; скоротив, бо довгі абзаци ламали сітку блоку відгуків                                  |
| AI agent   | Маркетингова копія головної: заголовок hero, чотири переваги, три тематичні підбірки, блок підписки         | Пішло в `src/pages/index.html` під готову розмітку; частину заголовків урізав під ширину колонок                                           |
| AI agent   | Текст сторінки «про нас»: історія магазину, три картки команди, п'ять питань FAQ                            | Пішло в `src/pages/about.html` в accordion і list-group                                                                                    |
| AI agent   | Мікрокопія: тексти тостів, empty-state каталогу, `alt` і `visually-hidden` підписи                          | Вставив у шаблони `app.js` і `catalog.js`; формулювання `aria`-підписів уніфікував під шаблон «Додати «Назва» у кошик»                     |
| AI agent   | SVG-заглушки: 16 обкладинок, ілюстрація hero, три скріншоти для «про нас»                                   | Використав як плейсхолдери в `src/img/`; привів усі обкладинки до єдиного `viewBox` 600×450, щоб не стрибала сітка карток                  |
| AI agent   | Оформити цей звіт за структурою методички                                                                   | Звіт перечитав, листинги звірив з файлами, вивід збірки і `curl` підставив власний                                                         |

Розмітка, SCSS-архітектура, весь JavaScript і скрипти збірки написані мною — ШІ використовував лише для генерації текстового та графічного контенту. Згенерований контент перевіряв перед вставкою: фактичні дані про ігри звіряв із BoardGameGeek, довжину текстів — у браузері на трьох ширинах екрана, SVG — на однакову геометрію. Найчастіша правка — скорочення: моделі схильні писати довше, ніж витримує верстка картки.

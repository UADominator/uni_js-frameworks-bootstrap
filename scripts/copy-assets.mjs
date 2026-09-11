import { cpSync, mkdirSync } from 'node:fs';

const copies = [
  ['node_modules/bootstrap-icons/font/fonts', 'src/fonts'],
  ['node_modules/bootstrap/dist/js/bootstrap.bundle.min.js', 'src/vendor/bootstrap.bundle.min.js'],
];

mkdirSync('src/vendor', { recursive: true });

for (const [from, to] of copies) {
  cpSync(from, to, { recursive: true });
}

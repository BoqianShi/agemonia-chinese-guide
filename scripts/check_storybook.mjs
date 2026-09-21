import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'assets/story-data.js'), 'utf8'), context);
const data = context.window.AGEMONIA_STORIES;
assert.equal(data.version, 1);
assert.ok(data.source.title);
assert.ok(Number.isInteger(data.source.pageCount));
assert.equal(data.source.pageNumbering, 'pdf', 'Source page numbering must be explicit');
const entries = Object.entries(data.entries);
assert.equal(entries.length, 896, 'The verified Chinese scan has 896 story entries');
const files = new Set();
let multiPart = 0;
let crossPage = 0;
for (const [number, story] of entries) {
  assert.match(number, /^\d{3}$/);
  assert.notEqual(number, '000');
  assert.ok(story.pages.length > 0, `${number}: missing pages`);
  assert.equal(new Set(story.pages).size, story.pages.length, `${number}: duplicate pages`);
  for (const page of story.pages) {
    assert.ok(Number.isInteger(page) && page >= 3 && page <= data.source.pageCount - 1,
      `${number}: invalid source page ${page}`);
  }
  assert.ok(story.images.length > 0, `${number}: missing image`);
  if (story.images.length > 1) multiPart++;
  if (story.pages.length > 1) crossPage++;
  for (const image of story.images) {
    assert.match(image.src, new RegExp(`^assets/stories/${number}-\\d+\\.webp$`));
    assert.ok(!files.has(image.src), `${number}: reused image ${image.src}`);
    files.add(image.src);
    assert.ok(Number.isInteger(image.width) && image.width > 0);
    assert.ok(Number.isInteger(image.height) && image.height > 0);
    const bytes = fs.readFileSync(path.join(root, image.src));
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF', `${image.src}: invalid image`);
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP', `${image.src}: invalid image`);
  }
}
const onDisk = fs.readdirSync(path.join(root, 'assets/stories')).filter(name => name.endsWith('.webp'));
assert.equal(onDisk.length, files.size, 'Unreferenced story images remain');
// Independently checked against the source scans, including illustrations and continuations.
const samples = {
  '001': [[3], 1], '004': [[3], 2], '009': [[3], 1], '026': [[4, 5], 2],
  '040': [[6], 2], '560': [[45], 2], '872': [[68], 2], '911': [[70], 2],
  '933': [[70], 2], '987': [[71], 1], '998': [[71], 1], '999': [[71], 1],
  // Page borders and rotated margin labels are not story continuations.
  '012': [[3], 1], '065': [[7], 1], '092': [[9], 1], '195': [[17], 1],
  '320': [[27], 1], '507': [[41], 1], '680': [[54], 1], '684': [[55], 1],
  '687': [[55], 1], '844': [[67], 1], '889': [[69], 1], '897': [[69], 1],
  // Short genuine continuations must survive border filtering.
  '461': [[38], 2], '548': [[44], 2], '675': [[54], 2], '795': [[63], 2],
};
for (const [number, [pages, imageCount]] of Object.entries(samples)) {
  assert.ok(data.entries[number], `Missing visually verified story ${number}`);
  assert.deepEqual(Array.from(data.entries[number].pages), pages, `${number}: wrong pages`);
  assert.equal(data.entries[number].images.length, imageCount, `${number}: missing or extra continuation`);
}
for (const absent of ['000', '501', '641', '642', '643', '644', '645', '646', '647', '648', '988', '996']) {
  assert.ok(!data.entries[absent], `Index invents absent story ${absent}`);
}
console.log(`Verified ${entries.length} story numbers and ${files.size} images; ${multiPart} multipart, ${crossPage} cross-page.`);

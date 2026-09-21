(() => {
  'use strict';
  const query = document.getElementById('item-query');
  if (!query) return;
  const category = document.getElementById('item-category');
  const tiles = [...document.querySelectorAll('#item-gallery .item-tile')];
  const count = document.getElementById('item-count');
  const normalize = value => value.normalize('NFKC').trim().toLocaleLowerCase();
  function filter() {
    const text = normalize(query.value);
    const number = /^\d{1,3}$/.test(text) ? text.padStart(3, '0') : null;
    const terms = text.split(/\s+/).filter(Boolean);
    let visible = 0;
    for (const tile of tiles) {
      const match = (!category.value || tile.dataset.category === category.value)
        && (number ? tile.dataset.number === number : terms.every(term => normalize(tile.dataset.search).includes(term)));
      tile.hidden = !match;
      if (match) visible++;
    }
    count.textContent = visible ? `显示 ${visible} / ${tiles.length} 项供应库物品` : '没有匹配的供应库物品。074及之后的编号可在下方单独查阅。';
  }
  query.addEventListener('input', filter);
  category.addEventListener('change', filter);
  document.getElementById('item-clear').addEventListener('click', () => {
    query.value = ''; category.value = ''; filter(); query.focus();
  });
  const form = document.getElementById('item-number-form');
  const numberInput = document.getElementById('item-number');
  const status = document.getElementById('item-lookup-status');
  const destinations = JSON.parse(document.getElementById('item-number-destinations').textContent);
  form.addEventListener('submit', event => {
    event.preventDefault();
    const raw = normalize(numberInput.value);
    if (!/^\d{1,3}$/.test(raw) || Number(raw) === 0) {
      numberInput.setAttribute('aria-invalid', 'true'); status.textContent = '请输入物品卡上的1–3位数字编号。'; return;
    }
    const number = raw.padStart(3, '0');
    const destination = destinations[number];
    if (!destination) {
      numberInput.setAttribute('aria-invalid', 'true'); status.textContent = `编号 ${number} 尚未收录；请查看所持实体卡。`; return;
    }
    numberInput.removeAttribute('aria-invalid'); status.textContent = ''; numberInput.value = number;
    location.hash = destination;
  });
  filter();
})();

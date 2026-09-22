(() => {
  'use strict';
  const normalize = value => value.normalize('NFKC').replace(/[’‘]/g, "'").replace(/[–—]/g, '-').trim().toLowerCase();
  for (const container of document.querySelectorAll('[data-resource-directory]')) {
    const input = container.querySelector('input[type="search"]');
    const entries = [...container.querySelectorAll('[data-resource-search]')];
    const count = container.querySelector('[data-resource-count]');
    const level = container.querySelector('[data-resource-level]');
    const run = () => {
      const terms = normalize(input.value).split(/\s+/).filter(Boolean);
      let visible = 0;
      for (const entry of entries) {
        const matches = terms.every(term => normalize(entry.dataset.resourceSearch).includes(term))
          && (!level || !level.value || (entry.dataset.levels || '').split(',').includes(level.value));
        entry.hidden = !matches;
        if (matches) visible++;
      }
      count.textContent = visible ? `显示 ${visible} / ${entries.length} 条` : '没有匹配条目。试试名称、材料或地点。';
    };
    input.addEventListener('input', run);
    if (level) level.addEventListener('change', run);
    container.querySelector('[data-resource-clear]').addEventListener('click', () => {
      input.value = ''; if (level) level.value = ''; run(); input.focus();
    });
    run();
  }
  for (const form of document.querySelectorAll('[data-card-lookup]')) {
    const input = form.querySelector('input');
    const status = form.parentElement.querySelector('.lookup-status');
    const mapping = JSON.parse(document.getElementById(form.dataset.cardLookup).textContent);
    form.addEventListener('submit', event => {
      event.preventDefault();
      const raw = normalize(input.value);
      let key = /^\d{1,3}$/.test(raw) ? String(Number(raw)) : raw;
      if (form.dataset.numberLookup === 'true') {
        if (!/^\d{1,2}$/.test(raw) || Number(raw) === 0) {
          input.setAttribute('aria-invalid', 'true'); status.textContent = '请输入卡面上的数字编号。'; return;
        }
        key = String(Number(raw));
      }
      const target = Object.entries(mapping).find(([name]) => (/^\d{1,3}$/.test(normalize(name)) ? String(Number(name)) : normalize(name)) === key)?.[1];
      if (!target) {
        input.setAttribute('aria-invalid', 'true');
        status.textContent = form.dataset.numberLookup === 'true' ? '未找到这个编号；本库收录剧本卡 4–36。' : '未找到这张神器。请输入01–10编号，或完整中文、英文名称。';
        return;
      }
      input.removeAttribute('aria-invalid'); status.textContent = '';
      location.hash = target; requestAnimationFrame(() => scrollTo(0, 0));
    });
  }
})();

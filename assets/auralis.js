/* Optional presentation enhancements. Original rule content stays in the HTML. */
(() => {
  'use strict';
  if (!document.body.hasAttribute('data-enhanced')) return;

  for (const grid of document.querySelectorAll('.class-grid')) {
    const careers = [...grid.children].filter(el => el.classList.contains('class-box'));
    if (careers.length !== 2) continue;
    const switcher = document.createElement('div');
    switcher.className = 'career-switch';
    switcher.setAttribute('role', 'group');
    switcher.setAttribute('aria-label', '选择要查看的职业');
    const names = careers.map(career => career.querySelector('header h2').textContent);
    const pageId = grid.closest('.page').id;
    careers.forEach((career, index) => { career.id = `${pageId}-career-${index}`; });
    [...names, '并排对比'].forEach((name, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = index === 2 ? '全部对比' : name;
      button.dataset.career = index === 2 ? 'all' : String(index);
      button.setAttribute('aria-controls', index === 2 ? careers.map(c => c.id).join(' ') : careers[index].id);
      button.setAttribute('aria-pressed', String(index === 0));
      button.addEventListener('click', () => {
        grid.dataset.career = button.dataset.career;
        for (const sibling of switcher.children) sibling.setAttribute('aria-pressed', String(sibling === button));
      });
      switcher.append(button);
    });
    grid.dataset.career = '0';
    grid.before(switcher);
  }

  const updateDock = () => {
    const id = location.hash.slice(1) || 'home';
    const section = id === 'favorites' ? 'favorites'
      : id === 'heroes' || /^hero-/.test(id) ? 'heroes'
      : id === 'home' ? 'home' : 'quick';
    for (const a of document.querySelectorAll('.mobile-dock a')) {
      if (a.hash === `#${section}`) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    }
  };
  window.addEventListener('hashchange', updateDock);
  updateDock();

  document.addEventListener('keydown', event => {
    if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey || event.isComposing) return;
    if (event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    event.preventDefault();
    const focusSearch = () => requestAnimationFrame(() => requestAnimationFrame(() => document.getElementById('query').focus()));
    if (location.hash === '#search') focusSearch();
    else {
      window.addEventListener('hashchange', focusSearch, { once: true });
      document.querySelector('.global-nav a[href="#search"]').click();
    }
  });
})();

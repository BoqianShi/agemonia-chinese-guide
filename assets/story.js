(function () {
  'use strict';

  var data = window.AGEMONIA_STORIES;
  var form = document.getElementById('story-form');
  var controls = document.getElementById('story-controls');
  var input = document.getElementById('story-number');
  var status = document.getElementById('story-status');
  var result = document.getElementById('story-result');
  var title = document.getElementById('story-result-title');
  var resultNumber = document.getElementById('story-result-number');
  var pages = document.getElementById('story-pages');
  var toggle = document.getElementById('story-toggle');
  var zoom = document.getElementById('story-zoom');
  var permalink = document.getElementById('story-permalink');
  var collapsedNote = document.getElementById('story-collapsed-note');
  var reader = document.getElementById('story-reader');
  var images = document.getElementById('story-images');
  var closeBottom = document.getElementById('story-close-bottom');
  var recentSection = document.getElementById('story-recent');
  var recentList = document.getElementById('story-recent-list');
  var clearRecent = document.getElementById('story-clear-recent');
  var coverage = document.getElementById('story-coverage');
  var activeNumber = null;
  var activeEntry = null;
  var recentNumbers = [];
  var fallbackHash = null;
  var defaultTitle = document.title;

  function announce(message, state) {
    status.textContent = message;
    status.dataset.state = state || '';
  }

  function normalizeNumber(value) {
    var normalized = value.trim().replace(/[０-９]/g, function (digit) {
      return String.fromCharCode(digit.charCodeAt(0) - 0xFEE0);
    });
    return /^[0-9]{1,3}$/.test(normalized) ? normalized.padStart(3, '0') : null;
  }

  function pageLabel(entry) {
    return (data.source.pageNumbering === 'pdf' ? '原 PDF 第 ' : '书内第 ') + entry.pages.join('、') + ' 页';
  }

  function setExpanded(expanded) {
    reader.hidden = !expanded;
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.textContent = expanded ? '收起这一段' : '阅读这一段';
    collapsedNote.hidden = expanded;
    zoom.hidden = !expanded || !activeEntry || !activeEntry.images.length;
  }

  function resetResult() {
    setExpanded(false);
    result.hidden = true;
    images.replaceChildren();
    images.dataset.zoom = 'false';
    zoom.setAttribute('aria-pressed', 'false');
    zoom.textContent = '放大原文';
    activeNumber = null;
    activeEntry = null;
    document.title = defaultTitle;
  }

  function remember(number) {
    recentNumbers = [number].concat(recentNumbers.filter(function (previous) {
      return previous !== number;
    })).slice(0, 5);
    renderRecent();
  }

  function renderRecent() {
    recentList.replaceChildren();
    recentSection.hidden = recentNumbers.length === 0;
    recentNumbers.forEach(function (number) {
      var button = document.createElement('button');
      button.type = 'button';
      button.textContent = number;
      button.setAttribute('aria-label', '查找并阅读故事 ' + number);
      if (number === activeNumber) button.setAttribute('aria-current', 'true');
      button.addEventListener('click', function () {
        input.value = number;
        lookup(number, { expand: true, navigate: true, focus: true });
      });
      recentList.appendChild(button);
    });
  }

  function changeHash(number) {
    var hash = '#story-' + number;
    if (window.location.hash === hash) return;
    try {
      window.history.pushState(null, '', hash);
    } catch (error) {
      fallbackHash = hash;
      window.location.hash = hash;
    }
  }

  function clearQueryHash() {
    if (!/^#story-/.test(window.location.hash)) return;
    try {
      window.history.pushState(null, '', window.location.pathname + window.location.search);
    } catch (error) {
      // Some local-file viewers restrict History; the result still clears normally.
    }
  }

  function addScan(imageData, index, count, number, entry) {
    var figure = document.createElement('figure');
    figure.className = 'story-figure';
    var frame = document.createElement('div');
    frame.className = 'story-image-frame';
    frame.tabIndex = 0;
    frame.setAttribute('role', 'region');
    frame.setAttribute('aria-label', '故事 ' + number + '，第 ' + (index + 1) + ' 部分；放大后可横向滚动');
    var loading = document.createElement('p');
    loading.className = 'story-image-status';
    loading.textContent = '正在载入原文…';
    loading.setAttribute('role', 'status');
    var scan = document.createElement('img');
    scan.className = 'story-scan';
    scan.alt = '故事 ' + number + ' 中文原书扫描，第 ' + (index + 1) + ' 部分，共 ' + count + ' 部分（' + pageLabel(entry) + '）';
    scan.decoding = 'async';
    scan.loading = index === 0 ? 'eager' : 'lazy';
    if (Number.isFinite(imageData.width) && imageData.width > 0) {
      scan.width = imageData.width;
      scan.style.setProperty('--scan-width', imageData.width + 'px');
    }
    if (Number.isFinite(imageData.height) && imageData.height > 0) scan.height = imageData.height;
    var errorBox = document.createElement('div');
    errorBox.className = 'story-image-error';
    errorBox.hidden = true;
    errorBox.setAttribute('role', 'status');
    var errorMessage = document.createElement('p');
    errorMessage.textContent = '这一部分暂时无法载入。请重试，或翻阅' + pageLabel(entry) + '。';
    var retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'button';
    retry.textContent = '重新载入这一部分';
    retry.addEventListener('click', function () {
      errorBox.hidden = true;
      loading.hidden = false;
      scan.hidden = false;
      scan.src = imageData.src + (imageData.src.indexOf('?') === -1 ? '?' : '&') + 'retry=' + Date.now();
      frame.focus({ preventScroll: true });
    });
    errorBox.append(errorMessage, retry);
    scan.addEventListener('load', function () {
      loading.hidden = true;
      errorBox.hidden = true;
    });
    scan.addEventListener('error', function () {
      loading.hidden = true;
      scan.hidden = true;
      errorBox.hidden = false;
    });
    frame.append(loading, scan, errorBox);
    figure.appendChild(frame);
    if (count > 1) {
      var caption = document.createElement('figcaption');
      caption.textContent = '故事 ' + number + ' · 第 ' + (index + 1) + ' / ' + count + ' 部分';
      figure.appendChild(caption);
    }
    images.appendChild(figure);
    scan.src = imageData.src;
  }

  function reveal() {
    if (!activeEntry) return;
    if (!images.childElementCount) {
      if (activeEntry.images.length) {
        activeEntry.images.forEach(function (imageData, index) {
          addScan(imageData, index, activeEntry.images.length, activeNumber, activeEntry);
        });
      } else {
        var missing = document.createElement('p');
        missing.className = 'note';
        missing.textContent = '此段原文图片暂不可用，请翻阅' + pageLabel(activeEntry) + '。';
        images.appendChild(missing);
      }
    }
    setExpanded(true);
  }

  function lookup(value, options) {
    resetResult();
    input.removeAttribute('aria-invalid');
    var number = normalizeNumber(value);
    if (!number) {
      if (options.navigate) clearQueryHash();
      input.setAttribute('aria-invalid', 'true');
      announce(value.trim() ? '请输入 1–3 位数字，不要加入字母、符号或空格。' : '请先输入游戏给出的故事号码。', 'error');
      renderRecent();
      if (options.focus) input.focus();
      return;
    }
    input.value = number;
    if (!Object.prototype.hasOwnProperty.call(data.entries, number)) {
      if (options.navigate) clearQueryHash();
      input.setAttribute('aria-invalid', 'true');
      announce('未找到故事 ' + number + '。请核对游戏给出的号码。', 'error');
      renderRecent();
      if (options.focus) input.focus();
      return;
    }
    activeNumber = number;
    activeEntry = data.entries[number];
    resultNumber.textContent = number;
    pages.textContent = '《' + (data.source.title || '阿格莫尼亚故事书') + '》 · ' + pageLabel(activeEntry);
    permalink.href = '#story-' + number;
    permalink.setAttribute('aria-label', '故事 ' + number + ' 的号码链接，可复制或在新标签页打开');
    result.hidden = false;
    document.title = '故事 ' + number + ' · ' + defaultTitle;
    if (options.expand) reveal();
    if (options.navigate) changeHash(number);
    remember(number);
    announce('已找到故事 ' + number + '，' + pageLabel(activeEntry) + (options.expand ? '。原文已展开。' : '。点击“阅读这一段”查看原文。'), 'success');
    if (options.focus) title.focus();
  }

  function readHash() {
    var hash = window.location.hash;
    if (fallbackHash === hash) {
      fallbackHash = null;
      return;
    }
    if (!hash || hash === '#main-content') {
      if (!hash) {
        resetResult();
        input.value = '';
        input.removeAttribute('aria-invalid');
        renderRecent();
        announce('输入号码后，点击“查找并阅读”。');
      }
      return;
    }
    var match = /^#story-([0-9]{1,3})$/.exec(hash);
    if (match) {
      input.value = match[1];
      lookup(match[1], { expand: false, navigate: false, focus: false });
    } else {
      resetResult();
      renderRecent();
      announce('这个号码链接无效。请在上方输入游戏给出的故事号码。', 'error');
    }
  }

  if (!data || !data.entries || !data.source || !Object.keys(data.entries).length) {
    announce('号码索引暂时未能载入。请刷新页面重试，或使用中文故事书查找。', 'error');
    return;
  }

  controls.disabled = false;
  var total = Object.keys(data.entries).length;
  coverage.textContent = '已收录 ' + total + ' 个故事号码' + (data.source.pageCount ? ' · 原书 ' + data.source.pageCount + ' 页' : '') + ' · 最近查询仅保留在当前页面。';
  coverage.hidden = false;
  document.getElementById('story-page-help').textContent = data.source.pageNumbering === 'pdf'
    ? '页码按原 PDF 文件的页面顺序计数；若图片无法载入，可据此翻阅原文件。'
    : '页码沿用中文故事书的书内页码；若图片无法载入，可据此翻阅原书。';
  announce('输入号码后，点击“查找并阅读”。');

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    lookup(input.value, { expand: true, navigate: true, focus: true });
  });
  input.addEventListener('input', function () {
    input.removeAttribute('aria-invalid');
    if (activeNumber && normalizeNumber(input.value) !== activeNumber) {
      resetResult();
      renderRecent();
    }
    announce('输入号码后，点击“查找并阅读”。');
  });
  toggle.addEventListener('click', function () {
    if (reader.hidden) {
      reveal();
      announce('故事 ' + activeNumber + ' 的原文已展开。', 'success');
    } else {
      setExpanded(false);
      announce('故事 ' + activeNumber + ' 的原文已收起。');
    }
  });
  closeBottom.addEventListener('click', function () {
    setExpanded(false);
    toggle.focus();
    announce('故事 ' + activeNumber + ' 的原文已收起。');
  });
  zoom.addEventListener('click', function () {
    var expanded = zoom.getAttribute('aria-pressed') !== 'true';
    zoom.setAttribute('aria-pressed', String(expanded));
    zoom.textContent = expanded ? '恢复适合屏幕' : '放大原文';
    images.dataset.zoom = String(expanded);
  });
  permalink.addEventListener('click', function (event) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    lookup(activeNumber, { expand: false, navigate: true, focus: true });
  });
  clearRecent.addEventListener('click', function () {
    recentNumbers = [];
    renderRecent();
    input.focus();
    announce('本次查询记录已清除。');
  });
  window.addEventListener('hashchange', readHash);
  readHash();
}());

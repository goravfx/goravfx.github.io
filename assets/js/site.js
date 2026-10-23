/* Гиоргий Мачарашвили — скрипты сайта: шапка, мобильное меню, язык, таймкод, видео и плеер */
(function () {
  'use strict';

  var root = document.documentElement;
  var header = document.querySelector('.site-header');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  var hasIO = 'IntersectionObserver' in window;

  /* Язык страницы и подписи, которые меняет скрипт */
  var LANG = (root.getAttribute('lang') || 'ru').slice(0, 2) === 'en' ? 'en' : 'ru';
  var T = {
    ru: {
      menu: 'Меню', close: 'Закрыть', sending: 'Отправляю…',
      subject: 'Идея с сайта goravfx.github.io',
      activate: 'Форма ещё не активирована: на {mail} пришло письмо от FormSubmit — нажмите в нём «Activate Form». После этого сообщение дойдёт.',
      fail: 'Не получилось отправить. Напишите напрямую: {link}'
    },
    en: {
      menu: 'Menu', close: 'Close', sending: 'Sending…',
      subject: 'Идея с сайта goravfx.github.io (английская версия)',
      activate: 'The form isn’t working yet. Please email me directly: {link}',
      fail: 'Couldn’t send your message. Please email me directly: {link}'
    }
  }[LANG];

  /* Выбор языка запоминается в браузере (если хранилище доступно) */
  var PREF = 'gora-lang';
  var HINT_OFF = 'gora-lang-hint-off';
  var store = {
    get: function (k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* приватный режим */ } }
  };

  /* Переключатель языка: <details> работает и без скрипта, скрипт закрывает его кликом мимо и Esc */
  var langBox = document.querySelector('.lang');
  if (langBox) {
    document.addEventListener('click', function (e) {
      if (langBox.open && !langBox.contains(e.target)) langBox.open = false;
    });
    langBox.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && langBox.open) {
        langBox.open = false;
        var s = langBox.querySelector('summary');
        if (s) s.focus();
      }
    });
  }
  /* Переход на другой язык: запоминаем выбор и остаёмся в том же разделе страницы */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[data-lang]');
    if (!a) return;
    store.set(PREF, a.getAttribute('data-lang'));
    if (a.hasAttribute('aria-current')) {
      /* уже на этом языке — просто закрываем меню */
      e.preventDefault();
      if (langBox) langBox.open = false;
      return;
    }
    if (location.hash && !a.hash && /^#[\w-]+$/.test(location.hash)) a.href = a.href + location.hash;
  });

  /* Подсказка «есть версия на другом языке»: если браузер посетителя на другом языке
     или он раньше сам выбрал другой язык. Закрыл подсказку — больше не показываем. */
  var hint = document.querySelector('[data-lang-hint]');
  if (hint && store.get(HINT_OFF) !== '1') {
    var other = hint.getAttribute('data-lang-hint');
    var pref = store.get(PREF);
    var langs = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language || ''];
    var readsRu = Array.prototype.some.call(langs, function (l) { return /^(ru|uk|be|kk)\b/i.test(l || ''); });
    var want = pref || (readsRu ? 'ru' : 'en');
    if (want === other) {
      window.setTimeout(function () {
        hint.hidden = false;
        window.requestAnimationFrame(function () { hint.classList.add('is-shown'); });
      }, 1200);
      hint.querySelector('.lang-hint-x').addEventListener('click', function () {
        store.set(HINT_OFF, '1');
        hint.classList.remove('is-shown');
        window.setTimeout(function () { hint.hidden = true; }, 300);
      });
    }
  }

  function playQuietly(video) {
    var p = video.play();
    if (p && p.catch) p.catch(function () { /* автозапуск запрещён — остаётся постер */ });
  }

  /* Высота шапки — чтобы якорные ссылки не прятали заголовки под ней */
  function setHeaderHeight() {
    if (header) root.style.setProperty('--hh', header.offsetHeight + 'px');
  }
  setHeaderHeight();
  if ('ResizeObserver' in window && header) {
    new ResizeObserver(setHeaderHeight).observe(header);
  } else {
    window.addEventListener('resize', setHeaderHeight);
  }

  /* Мобильное меню */
  var menuBtn = document.querySelector('.menu-btn');
  var nav = document.getElementById('site-nav');
  if (header && menuBtn && nav) {
    var label = menuBtn.querySelector('.menu-label');
    var setOpen = function (open) {
      header.classList.toggle('menu-open', open);
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (label) label.textContent = open ? T.close : T.menu;
      document.body.classList.toggle('menu-locked', open);
    };
    var isOpen = function () { return header.classList.contains('menu-open'); };
    menuBtn.addEventListener('click', function () {
      setOpen(!isOpen());
      if (isOpen()) {
        var first = nav.querySelector('a');
        if (first) first.focus({ preventScroll: true });
      }
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) { setOpen(false); menuBtn.focus(); }
    });
    header.addEventListener('focusout', function (e) {
      if (isOpen() && e.relatedTarget && !header.contains(e.relatedTarget)) setOpen(false);
    });
    var mq = window.matchMedia('(max-width: 1099px)');
    var onMq = function () { if (!mq.matches) setOpen(false); };
    if (mq.addEventListener) mq.addEventListener('change', onMq); else mq.addListener(onMq);
  }

  /* Таймкод REC в первом экране (24 кадра в секунду) */
  var tc = document.querySelector('[data-tc]');
  if (tc) {
    var t0 = performance.now();
    var lastFrame = -1;
    var tcVisible = true;
    var raf = 0;
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var tick = function (now) {
      var f = Math.floor((now - t0) / 1000 * 24);
      if (f !== lastFrame) {
        lastFrame = f;
        tc.textContent = pad(Math.floor(f / 86400) % 100) + ':' + pad(Math.floor(f / 1440) % 60) + ':' +
          pad(Math.floor(f / 24) % 60) + ':' + pad(f % 24);
      }
      raf = tcVisible ? requestAnimationFrame(tick) : 0;
    };
    raf = requestAnimationFrame(tick);
    if (hasIO) {
      new IntersectionObserver(function (entries) {
        tcVisible = entries[0].isIntersecting;
        if (tcVisible && !raf) raf = requestAnimationFrame(tick);
      }).observe(tc);
    }
  }

  /* Фоновое видео первого экрана: горизонтальная или вертикальная версия под экран */
  var hero = document.querySelector('.hero-video');
  if (hero && !reduceMotion && !saveData) {
    var tallMq = window.matchMedia('(max-aspect-ratio: 1/1)');
    var heroVisible = true;
    var pickSource = function () {
      var src = tallMq.matches ? hero.getAttribute('data-tall') : hero.getAttribute('data-wide');
      if (hero.getAttribute('src') !== src) {
        hero.classList.remove('is-playing');
        hero.setAttribute('src', src);
      }
      if (heroVisible) playQuietly(hero);
    };
    hero.addEventListener('playing', function () { hero.classList.add('is-playing'); });
    pickSource();
    if (tallMq.addEventListener) tallMq.addEventListener('change', pickSource); else tallMq.addListener(pickSource);
    if (hasIO) {
      new IntersectionObserver(function (entries) {
        heroVisible = entries[0].isIntersecting;
        if (heroVisible) playQuietly(hero); else hero.pause();
      }).observe(hero);
    }
  }

  /* Беззвучные превью в кейсах: грузятся у края экрана, играют только на экране */
  var loops = document.querySelectorAll('video.loop[data-src]');
  if (loops.length && !reduceMotion && !saveData && hasIO) {
    var loopObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var v = entry.target;
        if (entry.isIntersecting) {
          if (!v.getAttribute('src')) v.setAttribute('src', v.getAttribute('data-src'));
          playQuietly(v);
        } else if (!v.paused) {
          v.pause();
        }
      });
    }, { rootMargin: '200px 0px' });
    Array.prototype.forEach.call(loops, function (v) { loopObserver.observe(v); });
  }

  /* Плеер: ролики открываются поверх страницы со звуком */
  var dialog = document.getElementById('player');
  if (dialog && typeof dialog.showModal === 'function') {
    var pv = dialog.querySelector('.player-video');
    var ptitle = dialog.querySelector('.player-title');
    var pclose = dialog.querySelector('.player-close');
    var ratio = 16 / 9;
    var fit = function () {
      var top = dialog.querySelector('.player-top');
      var availW = window.innerWidth - 2 * Math.max(12, Math.min(32, window.innerWidth * 0.03));
      var availH = window.innerHeight - (top ? top.offsetHeight : 40) - 14 - 32;
      var w = availW;
      var h = w / ratio;
      if (h > availH) { h = availH; w = h * ratio; }
      dialog.style.setProperty('--pw', Math.floor(w) + 'px');
      dialog.style.setProperty('--ph', Math.floor(h) + 'px');
    };
    var pausedLoops = [];
    var open = function (link) {
      var w = parseFloat(link.getAttribute('data-w')) || 16;
      var h = parseFloat(link.getAttribute('data-h')) || 9;
      ratio = w / h;
      ptitle.textContent = link.getAttribute('data-title') || '';
      var poster = link.getAttribute('data-poster');
      if (poster) pv.setAttribute('poster', poster); else pv.removeAttribute('poster');
      pv.setAttribute('src', link.getAttribute('href'));
      fit();
      pausedLoops = [];
      Array.prototype.forEach.call(document.querySelectorAll('video.loop, .hero-video'), function (v) {
        if (!v.paused) { v.pause(); pausedLoops.push(v); }
      });
      document.body.classList.add('player-open');
      dialog.showModal();
      playQuietly(pv);
    };
    var cleanup = function () {
      pv.pause();
      pv.removeAttribute('src');
      pv.load();
      document.body.classList.remove('player-open');
      pausedLoops.forEach(function (v) { playQuietly(v); });
      pausedLoops = [];
    };
    document.addEventListener('click', function (e) {
      var link = e.target.closest('a[data-play]');
      if (!link || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      open(link);
    });
    pclose.addEventListener('click', function () { dialog.close(); });
    dialog.addEventListener('click', function (e) {
      if (e.target === dialog || e.target.classList.contains('player-box')) dialog.close();
    });
    dialog.addEventListener('close', cleanup);
    window.addEventListener('resize', function () { if (dialog.open) fit(); });
  }

  /* Форма «Предложить идею»: письмо уходит на почту через FormSubmit.
     Без поддержки dialog/fetch ссылки остаются обычными (mailto и якорь). */
  var idea = document.getElementById('idea');
  if (idea && typeof idea.showModal === 'function' && window.fetch && window.FormData) {
    var form = idea.querySelector('.idea-form');
    var done = idea.querySelector('.idea-done');
    var status = idea.querySelector('.idea-status');
    var sendBtn = idea.querySelector('.idea-send');
    var MAIL = 'gora.vfx@gmail.com';
    var mailLink = '<a href="mailto:' + MAIL + '">' + MAIL + '</a>';
    var setStatus = function (html, isError) {
      status.innerHTML = html;
      status.className = 'idea-status' + (isError ? ' is-error' : '');
    };
    var openIdea = function () {
      form.hidden = false;
      done.hidden = true;
      setStatus('', false);
      document.body.classList.add('modal-open');
      idea.showModal();
      if (window.matchMedia('(pointer: fine)').matches) {
        var area = form.querySelector('textarea');
        if (area) area.focus();
      }
    };
    document.addEventListener('click', function (e) {
      var link = e.target.closest('[data-idea]');
      if (!link || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      openIdea();
    });
    Array.prototype.forEach.call(idea.querySelectorAll('.idea-close, .idea-close-btn'), function (b) {
      b.addEventListener('click', function () { idea.close(); });
    });
    idea.addEventListener('click', function (e) { if (e.target === idea) idea.close(); });
    idea.addEventListener('close', function () { document.body.classList.remove('modal-open'); });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = typeof v === 'string' ? v.trim() : v; });
      if (data._honey) return; /* скрытое поле заполняют только боты */
      var contactValue = data['Контакт'] || '';
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactValue)) data._replyto = contactValue;
      data._subject = T.subject;
      data._template = 'table';
      data._captcha = 'false';
      sendBtn.disabled = true;
      setStatus(T.sending, false);
      fetch(form.getAttribute('data-endpoint'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data)
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; });
      }).then(function (res) {
        var msg = String(res.j.message || '');
        if (res.ok && (res.j.success === true || res.j.success === 'true')) {
          form.reset();
          form.hidden = true;
          done.hidden = false;
          setStatus('', false);
          var btn = done.querySelector('.idea-close-btn');
          if (btn) btn.focus();
        } else if (/activat/i.test(msg)) {
          setStatus(T.activate.replace('{mail}', MAIL).replace('{link}', mailLink), false);
        } else {
          throw new Error(msg || 'send failed');
        }
      }).catch(function () {
        setStatus(T.fail.replace('{link}', mailLink), true);
      }).then(function () {
        sendBtn.disabled = false;
      });
    });
  }
})();

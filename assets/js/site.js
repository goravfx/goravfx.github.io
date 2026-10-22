/* Гиоргий Мачарашвили — скрипты сайта: шапка, мобильное меню, таймкод, видео и плеер */
(function () {
  'use strict';

  var root = document.documentElement;
  var header = document.querySelector('.site-header');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  var hasIO = 'IntersectionObserver' in window;

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
      if (label) label.textContent = open ? 'Закрыть' : 'Меню';
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
    var mq = window.matchMedia('(max-width: 959px)');
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
})();

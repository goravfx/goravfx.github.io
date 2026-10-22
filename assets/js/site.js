/* Гиоргий Мачарашвили — скрипты сайта: шапка, мобильное меню, таймкод и фоновое видео */
(function () {
  'use strict';

  var root = document.documentElement;
  var header = document.querySelector('.site-header');

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
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        tcVisible = entries[0].isIntersecting;
        if (tcVisible && !raf) raf = requestAnimationFrame(tick);
      }).observe(tc);
    }
  }

  /* Фоновое видео Vimeo: грузится после страницы и проявляется, только когда реально заиграло.
     Если Vimeo недоступен — остаётся постер. */
  var media = document.querySelector('[data-vimeo]');
  if (media) {
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var saveData = navigator.connection && navigator.connection.saveData;
    if (!reduceMotion && !saveData) {
      var VIMEO = 'https://player.vimeo.com';
      var startVideo = function () {
        var iframe = document.createElement('iframe');
        var playing = false;
        var subscribed = false;
        var send = function (method, value) {
          var msg = { method: method };
          if (value !== undefined) msg.value = value;
          try { iframe.contentWindow.postMessage(msg, VIMEO); } catch (err) { /* плеер ещё не готов */ }
        };
        var subscribe = function () {
          if (subscribed) return;
          subscribed = true;
          send('addEventListener', 'play');
          send('addEventListener', 'timeupdate');
          send('addEventListener', 'playProgress');
        };
        window.addEventListener('message', function (e) {
          if (e.origin !== VIMEO || e.source !== iframe.contentWindow) return;
          var d = e.data;
          if (typeof d === 'string') { try { d = JSON.parse(d); } catch (err) { return; } }
          if (!d) return;
          if (d.event === 'ready' || d.method === 'ping') {
            subscribe();
          } else if (!playing && (d.event === 'play' || d.event === 'timeupdate' || d.event === 'playProgress')) {
            playing = true;
            iframe.classList.add('is-playing');
          }
        });
        iframe.className = 'hero-video';
        iframe.title = media.getAttribute('data-title') || '';
        iframe.allow = 'autoplay; fullscreen; picture-in-picture';
        iframe.setAttribute('tabindex', '-1');
        iframe.setAttribute('aria-hidden', 'true');
        iframe.addEventListener('load', function () { send('ping'); });
        iframe.src = media.getAttribute('data-vimeo');
        media.appendChild(iframe);

        /* Ставим видео на паузу, когда первый экран прокручен */
        if ('IntersectionObserver' in window) {
          new IntersectionObserver(function (entries) {
            if (subscribed) send(entries[0].isIntersecting ? 'play' : 'pause');
          }).observe(media);
        }
      };
      if (document.readyState === 'complete') {
        setTimeout(startVideo, 200);
      } else {
        window.addEventListener('load', function () { setTimeout(startVideo, 200); });
      }
    }
  }
})();

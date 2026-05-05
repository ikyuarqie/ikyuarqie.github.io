/**
 * Undangan — geser horizontal (swipe / trackpad).
 * Nama tamu: ?to=Nama di URL.
 */
(function () {
  var INVITE = {
    eventStartISO: "2026-06-27T07:00:00",
    eventDisplayText: "Sabtu, 27 Juni 2026\nAkad Nikah: Pukul 07.00 WIB\nResepsi Pernikahan: Pukul 10.00 - 13.00 WIB",
    mapsUrl: "https://maps.app.goo.gl/a1tnFZWcpCmaieE39",
    defaultGuestLabel: "Tamu Undangan"
  };

  function getGuestNameFromQuery() {
    try {
      var params = new URLSearchParams(window.location.search);
      var raw =
        params.get("to") ||
        params.get("nama") ||
        params.get("guest") ||
        params.get("kepada");
      if (!raw) return INVITE.defaultGuestLabel;
      // Also support links where spaces are sent as "+"
      var normalized = String(raw).replace(/\+/g, " ").trim();
      return normalized || INVITE.defaultGuestLabel;
    } catch (_) {}
    return INVITE.defaultGuestLabel;
  }

  function initGuestName() {
    var el = document.getElementById("guest-name");
    if (el) el.textContent = getGuestNameFromQuery();
  }

  function initEventText() {
    var el = document.getElementById("event-datetime");
    if (el) el.textContent = INVITE.eventDisplayText;
  }

  function initMapsLink() {
    var a = document.getElementById("map-link");
    if (a && INVITE.mapsUrl) a.href = INVITE.mapsUrl;
  }

  function initRandomSlideBackgrounds() {
    var nonHeroSlides = document.querySelectorAll(".swiper-slide:not(.swiper-slide--hero)");
    if (!nonHeroSlides || !nonHeroSlides.length) return;

    var pools = [
      "pages/Background.jpg",
      "pages/Background1.jpg",
      "pages/Background2.jpg",
      "pages/Background3.jpg",
      "pages/Background4.jpg",
      "pages/Background5.jpg"
    ];

    // Shuffle once so each slide gets a distinct background per refresh.
    for (var j = pools.length - 1; j > 0; j--) {
      var k = Math.floor(Math.random() * (j + 1));
      var temp = pools[j];
      pools[j] = pools[k];
      pools[k] = temp;
    }

    for (var i = 0; i < nonHeroSlides.length; i++) {
      var pick = pools[i % pools.length];
      nonHeroSlides[i].style.backgroundImage = 'url("' + pick + '")';
    }
  }

  function initBgm() {
    var audio = document.getElementById("bgm-audio");
    var btn = document.getElementById("bgm-toggle");
    if (!audio || !btn) return;

    var isEnabled = true;
    audio.volume = 0.2;

    function syncButton() {
      btn.textContent = "\u266b";
      btn.setAttribute("aria-label", isEnabled ? "Matikan musik" : "Nyalakan musik");
      btn.setAttribute("title", isEnabled ? "Matikan musik" : "Nyalakan musik");
      btn.setAttribute("aria-pressed", isEnabled ? "true" : "false");
      btn.classList.toggle("is-off", !isEnabled);
    }

    function tryPlay() {
      if (!isEnabled) return;
      var p = audio.play();
      if (p && typeof p.catch === "function") {
        p.catch(function () {});
      }
    }

    btn.addEventListener("click", function () {
      isEnabled = !isEnabled;
      if (isEnabled) {
        tryPlay();
      } else {
        audio.pause();
      }
      syncButton();
    });

    var startedByGesture = false;
    function startOnGesture() {
      if (startedByGesture || !isEnabled) return;
      startedByGesture = true;
      tryPlay();
      document.removeEventListener("pointerdown", startOnGesture);
      document.removeEventListener("keydown", startOnGesture);
    }

    document.addEventListener("pointerdown", startOnGesture);
    document.addEventListener("keydown", startOnGesture);

    window.addEventListener("load", tryPlay);
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) tryPlay();
    });
    setTimeout(tryPlay, 250);

    tryPlay();
    syncButton();
  }

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function tickCountdown() {
    var target = new Date(INVITE.eventStartISO).getTime();
    var now = Date.now();
    var diff = Math.max(0, target - now);
    var s = Math.floor(diff / 1000);
    var days = Math.floor(s / 86400);
    s -= days * 86400;
    var hours = Math.floor(s / 3600);
    s -= hours * 3600;
    var mins = Math.floor(s / 60);
    var secs = s - mins * 60;
    var d = document.getElementById("cd-days");
    var h = document.getElementById("cd-hours");
    var m = document.getElementById("cd-mins");
    var se = document.getElementById("cd-secs");
    if (d) d.textContent = pad(days);
    if (h) h.textContent = pad(hours);
    if (m) m.textContent = pad(mins);
    if (se) se.textContent = pad(secs);
  }

  function initSwipeAndNav() {
    var viewport = document.getElementById("swiper-viewport");
    var nav = document.getElementById("section-nav");
    if (!viewport || !nav) return;

    var buttons = nav.querySelectorAll(".nav-item[data-slide]");

    function slideWidth() {
      return viewport.clientWidth;
    }

    function activeIndexFromScroll() {
      var w = slideWidth();
      if (w <= 0) return 0;
      return Math.round(viewport.scrollLeft / w);
    }

    function goToSlide(i) {
      var max = viewport.querySelectorAll(".swiper-slide").length - 1;
      var idx = Math.max(0, Math.min(max, i));
      viewport.scrollTo({ left: idx * slideWidth(), behavior: "smooth" });
      setNavActive(idx);
    }

    function setNavActive(idx) {
      for (var b = 0; b < buttons.length; b++) {
        var btn = buttons[b];
        var slide = parseInt(btn.getAttribute("data-slide"), 10);
        if (slide === idx) {
          btn.classList.add("is-active");
          btn.setAttribute("aria-current", "page");
        } else {
          btn.classList.remove("is-active");
          btn.removeAttribute("aria-current");
        }
      }
    }

    for (var n = 0; n < buttons.length; n++) {
      buttons[n].addEventListener("click", function () {
        var idx = parseInt(this.getAttribute("data-slide"), 10);
        if (!isNaN(idx)) goToSlide(idx);
      });
    }

    var scrollScheduled = false;
    viewport.addEventListener("scroll", function () {
      if (scrollScheduled) return;
      scrollScheduled = true;
      requestAnimationFrame(function () {
        scrollScheduled = false;
        setNavActive(activeIndexFromScroll());
      });
    });

    window.addEventListener("resize", function () {
      var idx = activeIndexFromScroll();
      viewport.scrollLeft = idx * slideWidth();
    });
  }

  function initCoupleSwiper() {
    var el = document.getElementById("couple-swiper");
    var dotsRoot = document.getElementById("couple-swiper-dots");
    if (!el || !dotsRoot) return;
    var dots = dotsRoot.querySelectorAll(".couple-dot[data-couple-index]");

    function paneWidth() {
      return el.clientWidth;
    }

    function activeCoupleIndex() {
      var w = paneWidth();
      if (w <= 0) return 0;
      return Math.round(el.scrollLeft / w);
    }

    function syncDotsFromScroll() {
      var idx = activeCoupleIndex();
      for (var i = 0; i < dots.length; i++) {
        var b = dots[i];
        var n = parseInt(b.getAttribute("data-couple-index"), 10);
        if (n === idx) {
          b.classList.add("is-active");
          b.setAttribute("aria-pressed", "true");
        } else {
          b.classList.remove("is-active");
          b.setAttribute("aria-pressed", "false");
        }
      }
    }

    function goToCouple(idx) {
      var w = paneWidth();
      if (w <= 0) return;
      el.scrollTo({ left: idx * w, behavior: "smooth" });
    }

    for (var d = 0; d < dots.length; d++) {
      dots[d].addEventListener("click", function () {
        var ix = parseInt(this.getAttribute("data-couple-index"), 10);
        if (!isNaN(ix)) goToCouple(ix);
      });
    }

    var coupleScrollQueued = false;
    el.addEventListener("scroll", function () {
      if (coupleScrollQueued) return;
      coupleScrollQueued = true;
      requestAnimationFrame(function () {
        coupleScrollQueued = false;
        syncDotsFromScroll();
      });
    });

    window.addEventListener("resize", function () {
      var w = paneWidth();
      if (w <= 0) return;
      var ix = activeCoupleIndex();
      el.scrollLeft = ix * w;
      syncDotsFromScroll();
    });

    syncDotsFromScroll();
  }

  function init() {
    initRandomSlideBackgrounds();
    initGuestName();
    initEventText();
    initMapsLink();
    tickCountdown();
    setInterval(tickCountdown, 1000);
    initSwipeAndNav();
    initCoupleSwiper();
    initBgm();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

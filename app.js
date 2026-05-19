/**
 * Undangan — geser horizontal (swipe / trackpad).
 * Nama tamu: ?to=Nama di URL.
 */
(function () {
  var INVITE = {
    eventStartISO: "2026-06-27T07:00:00",
    eventEndISO: "2026-06-27T13:00:00",
    eventDisplayText: "Sabtu, 27 Juni 2026\nAkad Nikah: Pukul 07.00 WIB\nResepsi Pernikahan: Pukul 10.00 - 13.00 WIB",
    mapsUrl: "https://maps.app.goo.gl/a1tnFZWcpCmaieE39",
    calendarTitle: "Akad Nikah & Resepsi - Ikyu & Laras",
    calendarLocation: "Ballroom Ijen Suites Resort & Convention, Jl. Ijen Nirwana Raya Blok A no. 16, Malang",
    firebaseConfig: {
      apiKey: "AIzaSyCKnkDiidx2T_J8mD9cFXzfiWCxwEWn4m4",
      authDomain: "larasamaikyu.firebaseapp.com",
      projectId: "larasamaikyu",
      storageBucket: "larasamaikyu.firebasestorage.app",
      messagingSenderId: "497756031939",
      appId: "1:497756031939:web:f7a5f1d7636aa6db118b76"
    },
    rsvpCollection: "rsvps",
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

  function hasGuestNameInQuery() {
    try {
      var params = new URLSearchParams(window.location.search);
      var raw =
        params.get("to") ||
        params.get("nama") ||
        params.get("guest") ||
        params.get("kepada");
      return !!(raw && String(raw).trim());
    } catch (_) {}
    return false;
  }

  function getPicFromQuery() {
    try {
      var params = new URLSearchParams(window.location.search);
      var raw = params.get("pic");
      if (!raw) return "";
      var normalized = String(raw).replace(/\+/g, " ").trim();
      return normalized;
    } catch (_) {}
    return "";
  }

  function initGuestName() {
    var el = document.getElementById("guest-name");
    if (!el) return;
    var guestName = getGuestNameFromQuery();
    if (hasGuestNameInQuery()) {
      el.textContent = guestName + "\n& Keluarga";
    } else {
      el.textContent = guestName;
    }
  }

  function initEventText() {
    var el = document.getElementById("event-datetime");
    if (el) el.textContent = INVITE.eventDisplayText;
  }

  function initMapsLink() {
    var a = document.getElementById("map-link");
    if (a && INVITE.mapsUrl) a.href = INVITE.mapsUrl;
  }

  function toGoogleCalendarLocalDate(isoText) {
    // Fast-path parser for fixed ISO-like inputs (better Android WebView compatibility)
    var m = String(isoText || "").match(
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/
    );
    if (m) {
      return m[1] + m[2] + m[3] + "T" + m[4] + m[5] + (m[6] || "00");
    }

    var d = new Date(isoText);
    if (isNaN(d.getTime())) return "";
    function p2(n) {
      return n < 10 ? "0" + n : String(n);
    }
    return (
      String(d.getFullYear()) +
      p2(d.getMonth() + 1) +
      p2(d.getDate()) +
      "T" +
      p2(d.getHours()) +
      p2(d.getMinutes()) +
      p2(d.getSeconds())
    );
  }

  function initCalendarLink() {
    var a = document.getElementById("calendar-link");
    if (!a) return;

    var start = toGoogleCalendarLocalDate(INVITE.eventStartISO);
    var end = toGoogleCalendarLocalDate(INVITE.eventEndISO || INVITE.eventStartISO);
    var details = INVITE.eventDisplayText;
    if (!start || !end) {
      // Keep fallback href from HTML instead of breaking to "#".
      return;
    }

    var url =
      "https://calendar.google.com/calendar/render?action=TEMPLATE" +
      "&text=" + encodeURIComponent(INVITE.calendarTitle || "Undangan Pernikahan") +
      "&dates=" + encodeURIComponent(start + "/" + end) +
      "&details=" + encodeURIComponent(details) +
      "&location=" + encodeURIComponent(INVITE.calendarLocation || "");
    a.href = url;
  }

  function initRsvp() {
    var statusEl = document.getElementById("rsvp-status");
    var buttons = document.querySelectorAll(".btn-rsvp[data-rsvp]");
    var nameWrap = document.getElementById("rsvp-name-wrap");
    var nameInput = document.getElementById("rsvp-name-input");
    if (!buttons || !buttons.length) return;

    function setStatus(text, isError) {
      if (!statusEl) return;
      statusEl.textContent = text;
      statusEl.style.color = isError ? "#7b3340" : "#2f4462";
    }

    function setButtonsDisabled(disabled) {
      for (var i = 0; i < buttons.length; i++) {
        buttons[i].disabled = !!disabled;
      }
    }

    var firestoreDbInstance = null;

    function getFirestoreDb() {
      try {
        if (!window.firebase || !window.firebase.firestore) return null;
        if (!window.firebase.apps || !window.firebase.apps.length) {
          window.firebase.initializeApp(INVITE.firebaseConfig);
        }
        if (firestoreDbInstance) return firestoreDbInstance;
        firestoreDbInstance = window.firebase.firestore();
        try {
          firestoreDbInstance.settings({
            experimentalAutoDetectLongPolling: true,
            useFetchStreams: false
          });
        } catch (_) {}
        return firestoreDbInstance;
      } catch (_) {
        return null;
      }
    }

    var db = getFirestoreDb();
    if (!db) {
      setStatus("RSVP belum tersedia. Coba refresh halaman.", true);
      return;
    }

    var needManualName = !hasGuestNameInQuery();
    if (nameWrap) {
      nameWrap.hidden = !needManualName;
    }

    for (var b = 0; b < buttons.length; b++) {
      buttons[b].addEventListener("click", function () {
        var attendance = this.getAttribute("data-rsvp");
        if (attendance !== "yes" && attendance !== "no") return;

        var guestName = getGuestNameFromQuery();
        if (needManualName) {
          guestName = nameInput ? String(nameInput.value || "").trim() : "";
          if (!guestName) {
            setStatus("Mohon isi nama terlebih dahulu.", true);
            if (nameInput) nameInput.focus();
            return;
          }
        }
        var payload = {
          name: guestName,
          pic: getPicFromQuery(),
          attendance: attendance,
          createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
          createdAtClient: new Date().toISOString(),
          userAgent: navigator.userAgent || ""
        };

        setButtonsDisabled(true);
        setStatus("Mengirim RSVP...", false);

        db.collection(INVITE.rsvpCollection)
          .add(payload)
          .then(function () {
            setStatus(
              attendance === "yes"
                ? "Terima kasih, konfirmasi hadir Anda sudah kami terima."
                : "Terima kasih, konfirmasi Anda sudah kami terima.",
              false
            );
          })
          .catch(function (err) {
            var code = err && err.code ? String(err.code) : "";
            if (code === "permission-denied") {
              setStatus("RSVP ditolak Firestore Rules (permission-denied).", true);
            } else if (code === "unavailable") {
              setStatus("Koneksi ke Firestore sedang bermasalah (unavailable). Coba lagi.", true);
            } else {
              setStatus("Gagal mengirim RSVP. Coba lagi sebentar.", true);
            }
            setButtonsDisabled(false);
          });
      });
    }
  }

  function initSlideCats() {
    var nonHeroSlides = document.querySelectorAll(".swiper-slide:not(.swiper-slide--hero)");
    if (!nonHeroSlides || !nonHeroSlides.length) return;

    function randomBetween(min, max) {
      return min + Math.random() * (max - min);
    }

    var PUYOU_BASE_WIDTH = 120;
    var LEONA_BASE_WIDTH = 132;

    for (var i = 0; i < nonHeroSlides.length; i++) {
      var slide = nonHeroSlides[i];
      var layer = document.createElement("div");
      layer.className = "slide-cat-layer";

      var puyou = document.createElement("img");
      puyou.src = "pages/Puyou.png";
      puyou.alt = "";
      puyou.className = "slide-cat slide-cat--puyou";
      // Random lane choice keeps layout lively while staying separated.
      var puyouOnRight = Math.random() > 0.5;
      puyou.style.left = (puyouOnRight ? randomBetween(56, 78) : randomBetween(10, 26)).toFixed(2) + "%";
      puyou.style.bottom = randomBetween(14, 26).toFixed(2) + "px";
      puyou.style.width = Math.round(PUYOU_BASE_WIDTH * randomBetween(0.9, 1.1)) + "px";
      puyou.style.animationDuration = randomBetween(2.2, 3.9).toFixed(2) + "s";
      puyou.style.animationDelay = randomBetween(0, 1.4).toFixed(2) + "s";

      var leona = document.createElement("img");
      leona.src = "pages/Leona.png";
      leona.alt = "";
      leona.className = "slide-cat slide-cat--leona";
      // Three clearly separated vertical lanes: lower, middle, upper.
      var leonaLanes = [
        { name: "lower", bottom: 8 },
        { name: "middle", bottom: 34 },
        { name: "upper", bottom: 62 }
      ];
      var leonaLane = leonaLanes[Math.floor(Math.random() * leonaLanes.length)];
      leona.classList.add("slide-cat--lane-" + leonaLane.name);
      leona.style.bottom = leonaLane.bottom + "px";
      leona.style.width = Math.round(LEONA_BASE_WIDTH * randomBetween(0.9, 1.1)) + "px";
      // Use opposite lane from Puyou so they never overlap.
      leona.style.left = (puyouOnRight ? randomBetween(8, 30) : randomBetween(54, 74)).toFixed(2) + "%";
      leona.style.setProperty("--walk-x", randomBetween(20, 40).toFixed(2) + "px");
      leona.style.animationDuration = randomBetween(6.4, 10.8).toFixed(2) + "s";
      leona.style.animationDelay = randomBetween(0.1, 1.8).toFixed(2) + "s";

      layer.appendChild(puyou);
      layer.appendChild(leona);
      slide.appendChild(layer);
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
    initSlideCats();
    initGuestName();
    initEventText();
    initMapsLink();
    initCalendarLink();
    initRsvp();
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

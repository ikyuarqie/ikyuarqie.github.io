/**
 * One-page wedding interactive: intro → main image with clickable objects → detail.
 * Hotspots use percentages so they stay aligned with the image when it scales.
 * Data can be edited in /admin and is loaded from localStorage when present.
 */

var STORAGE_KEY = "weddingStory";
var pageImage, hotspotLayer, introScreen, mainScreen;
var btnEnter, btnFlashlight;

/** Default hotspots if no admin data. Values in % of image. */
var defaultHotspots = [
  { left: 22, top: 42, width: 18, height: 38, label: "The Groom", pageId: "groom" },
  { left: 58, top: 42, width: 20, height: 38, label: "The Bride", pageId: "bride" },
  { left: 8, top: 72, width: 22, height: 22, label: "Orange cat", pageId: "cat-orange" },
  { left: 70, top: 74, width: 22, height: 20, label: "Tabby cat", pageId: "cat-tabby" },
  { left: 4, top: 38, width: 18, height: 35, label: "Trees", pageId: "trees-left" },
  { left: 78, top: 38, width: 18, height: 35, label: "Trees", pageId: "trees-right" },
  { left: 5, top: 88, width: 22, height: 12, label: "Pink flowers", pageId: "flowers-left" },
  { left: 73, top: 88, width: 22, height: 12, label: "Pink flowers", pageId: "flowers-right" },
  { left: 42, top: 88, width: 16, height: 12, label: "White flowers", pageId: "flowers-center" }
];

/** Default pages if no admin data. */
var defaultPages = [
  { id: "groom", title: "The Groom", body: "" },
  { id: "bride", title: "The Bride", body: "" },
  { id: "cat-orange", title: "Orange cat", body: "" },
  { id: "cat-tabby", title: "Tabby cat", body: "" },
  { id: "trees-left", title: "Trees", body: "" },
  { id: "trees-right", title: "Trees", body: "" },
  { id: "flowers-left", title: "Pink flowers", body: "" },
  { id: "flowers-right", title: "Pink flowers", body: "" },
  { id: "flowers-center", title: "White flowers", body: "" }
];

function getStoryData() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      var data = JSON.parse(raw);
      if (Array.isArray(data.hotspots) && Array.isArray(data.pages)) {
        return { hotspots: data.hotspots, pages: data.pages };
      }
    }
  } catch (_) {}
  return { hotspots: defaultHotspots, pages: defaultPages };
}

var storyData, hotspots, pages;

function showScreen(screen) {
  if (!introScreen || !mainScreen) return;
  introScreen.classList.remove("active");
  mainScreen.classList.remove("active");
  if (screen) screen.classList.add("active");
}

function updateContentAwareBackdrop() {
  var mainContent = document.querySelector(".main-content");
  if (mainContent && pageImage && pageImage.src) {
    mainContent.style.setProperty("--page-bg-image", "url(" + pageImage.src + ")");
  }
}

function positionHotspotLayer() {
  if (!pageImage || !hotspotLayer) return;
  var wrap = pageImage.parentElement;
  if (!wrap) return;
  var imgRect = pageImage.getBoundingClientRect();
  var wrapRect = wrap.getBoundingClientRect();
  var boxW = imgRect.width;
  var boxH = imgRect.height;
  if (boxW <= 0 || boxH <= 0) {
    requestAnimationFrame(positionHotspotLayer);
    return;
  }
  var natW = pageImage.naturalWidth || 0;
  var natH = pageImage.naturalHeight || 0;
  var left = imgRect.left - wrapRect.left;
  var top = imgRect.top - wrapRect.top;
  var w = boxW;
  var h = boxH;
  if (natW > 0 && natH > 0) {
    var fit = window.getComputedStyle(pageImage).objectFit || "contain";
    var scale = fit === "cover"
      ? Math.max(boxW / natW, boxH / natH)
      : Math.min(boxW / natW, boxH / natH);
    var contentW = natW * scale;
    var contentH = natH * scale;
    var offsetX = (boxW - contentW) / 2;
    var offsetY = (boxH - contentH) / 2;
    left += offsetX;
    top += offsetY;
    w = contentW;
    h = contentH;
  }
  hotspotLayer.style.left = left + "px";
  hotspotLayer.style.top = top + "px";
  hotspotLayer.style.width = w + "px";
  hotspotLayer.style.height = h + "px";
}

// Load shared story.json from the server so all devices see the same data.
// Returns a promise; call buildHotspots() after it settles (or in its then/finally).
function loadStoryFromServer() {
  try {
    return fetch("data/story.json?ts=" + Date.now())
      .then(function (res) {
        if (!res.ok) throw new Error("no story.json");
        return res.json();
      })
      .then(function (data) {
        if (data && Array.isArray(data.hotspots) && Array.isArray(data.pages)) {
          storyData = { hotspots: data.hotspots, pages: data.pages };
          hotspots = storyData.hotspots;
          pages = storyData.pages;
        }
      })
      .catch(function () { /* use existing storyData (localStorage or defaults) */ });
  } catch (_) {
    return Promise.resolve();
  }
}

function buildHotspots() {
  if (!hotspotLayer) return;
  if (!storyData) storyData = getStoryData();
  if (!hotspots) hotspots = storyData.hotspots;
  if (!pages) pages = storyData.pages;
  if (!Array.isArray(hotspots) || !Array.isArray(pages)) return;
  hotspotLayer.innerHTML = "";
  var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "hotspot-svg");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.setAttribute("aria-hidden", "true");
  function goToDetailPage(pageId) {
    if (!pageId || String(pageId).trim() === "") return;
    window.location.href = "detail.html?page=" + encodeURIComponent(String(pageId).trim());
  }

  hotspots.forEach(function (h, i) {
    var idx = i;
    function addClick(el) {
      el.addEventListener("click", function (e) {
        var index = parseInt(el.getAttribute("data-index"), 10);
        if (isNaN(index) || index < 0) return;
        var hotspot = Array.isArray(hotspots) && hotspots[index] ? hotspots[index] : null;
        var pageId = hotspot && (hotspot.pageId != null) ? String(hotspot.pageId).trim() : "";
        goToDetailPage(pageId);
      });
    }
    if (h && h.polygons && Array.isArray(h.polygons) && h.polygons.length > 0) {
      h.polygons.forEach(function (pts) {
        if (!pts || pts.length < 3) return;
        var el = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        el.setAttribute("points", pts.map(function (p) { return (p && p.x != null && p.y != null) ? (p.x + "," + p.y) : ""; }).filter(Boolean).join(" "));
        el.setAttribute("class", "hotspot");
        el.setAttribute("role", "button");
        el.setAttribute("aria-label", h.label);
        el.setAttribute("data-index", String(idx));
        addClick(el);
        svg.appendChild(el);
      });
    } else if (h && h.points && Array.isArray(h.points) && h.points.length >= 3) {
      var el = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      el.setAttribute("points", h.points.map(function (p) { return (p && p.x != null && p.y != null) ? (p.x + "," + p.y) : ""; }).filter(Boolean).join(" "));
      el.setAttribute("class", "hotspot");
      el.setAttribute("role", "button");
      el.setAttribute("aria-label", h.label);
      el.setAttribute("data-index", String(idx));
      addClick(el);
      svg.appendChild(el);
    } else if (h && typeof h.left === "number" && typeof h.top === "number" && typeof h.width === "number" && typeof h.height === "number") {
      var el = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      el.setAttribute("x", String(h.left));
      el.setAttribute("y", String(h.top));
      el.setAttribute("width", String(h.width));
      el.setAttribute("height", String(h.height));
      el.setAttribute("class", "hotspot");
      el.setAttribute("role", "button");
      el.setAttribute("aria-label", h.label);
      el.setAttribute("data-index", String(idx));
      addClick(el);
      svg.appendChild(el);
    }
  });
  hotspotLayer.appendChild(svg);
  updateStitchVisibility();
}

function updateStitchVisibility() {
  if (!hotspotLayer) return;
  var show = hotspotLayer.classList.contains("show-stitches");
  var shapes = hotspotLayer.querySelectorAll(".hotspot-svg .hotspot");
  if (!shapes || !shapes.length) return;
  for (var s = 0; s < shapes.length; s++) {
    var el = shapes[s];
    if (show) {
      el.setAttribute("fill", "rgba(245, 230, 200, 0.2)");
      el.setAttribute("stroke", "rgb(120, 95, 70)");
      el.setAttribute("stroke-width", "0.8");
      el.setAttribute("stroke-dasharray", "2 2");
    } else {
      el.setAttribute("fill", "transparent");
      el.removeAttribute("stroke");
      el.removeAttribute("stroke-width");
      el.removeAttribute("stroke-dasharray");
    }
  }
}

function refreshHotspotLayer() {
  positionHotspotLayer();
  updateStitchVisibility();
}

function whenMainVisible(fn) {
  if (!mainScreen || !mainScreen.classList.contains("active")) return;
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      if (fn) fn();
    });
  });
}

var resizeTimer;
function onResizeOrViewportChange() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(function () {
    whenMainVisible(refreshHotspotLayer);
  }, 120);
}
window.addEventListener("resize", onResizeOrViewportChange);
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", onResizeOrViewportChange);
  window.visualViewport.addEventListener("scroll", onResizeOrViewportChange);
}

function init() {
  pageImage = document.getElementById("page-image");
  hotspotLayer = document.getElementById("hotspot-layer");
  introScreen = document.getElementById("intro");
  mainScreen = document.getElementById("main");
  btnEnter = document.getElementById("btn-enter");
  btnFlashlight = document.getElementById("btn-flashlight");

  if (!pageImage || !hotspotLayer || !introScreen || !mainScreen || !btnEnter || !btnFlashlight) {
    console.error("Wedding story: missing required DOM elements. Check that you are on the correct page (e.g. index.html).");
    return;
  }

  // Force bypass cache on open: main image loads fresh
  if (pageImage && pageImage.src) {
    var base = pageImage.src.split("?")[0];
    pageImage.src = base + "?t=" + Date.now();
    updateContentAwareBackdrop();
  }

  storyData = getStoryData();
  hotspots = storyData.hotspots;
  pages = storyData.pages;

  function scheduleHotspotRefresh() {
    whenMainVisible(refreshHotspotLayer);
    setTimeout(function () {
      whenMainVisible(refreshHotspotLayer);
    }, 550);
  }

  if (btnEnter) {
    btnEnter.addEventListener("click", function () {
      if (introScreen) introScreen.classList.add("leaving");
      setTimeout(function () {
        showScreen(mainScreen);
        if (introScreen) introScreen.classList.remove("leaving");
        scheduleHotspotRefresh();
        var isMobile = typeof window.orientation !== "undefined" || window.innerWidth < 768;
        if (isMobile) {
          setTimeout(function () { whenMainVisible(refreshHotspotLayer); }, 100);
          setTimeout(function () { whenMainVisible(refreshHotspotLayer); }, 400);
          setTimeout(function () { whenMainVisible(refreshHotspotLayer); }, 800);
        }
      }, 420);
    });
  }
  if (btnFlashlight) {
    btnFlashlight.addEventListener("click", function () {
      if (hotspotLayer) {
        hotspotLayer.classList.toggle("show-stitches");
        btnFlashlight.classList.toggle("on", hotspotLayer.classList.contains("show-stitches"));
        whenMainVisible(refreshHotspotLayer);
      }
    });
  }

  var mapPopup = document.getElementById("map-popup");
  var btnMap = document.getElementById("btn-map");
  var btnCloseMap = document.getElementById("btn-close-map");
  try {
    if (btnMap && mapPopup) {
      btnMap.addEventListener("click", function () {
        mapPopup.classList.add("visible");
        mapPopup.setAttribute("aria-hidden", "false");
      });
    }
    function closeMapPopup() {
      if (mapPopup) {
        mapPopup.classList.remove("visible");
        mapPopup.setAttribute("aria-hidden", "true");
      }
    }
    if (btnCloseMap) btnCloseMap.addEventListener("click", closeMapPopup);
    if (mapPopup) {
      mapPopup.addEventListener("click", function (e) {
        if (e.target === mapPopup) closeMapPopup();
      });
    }
  } catch (err) {
    // Map popup optional; don't break app on mobile
  }

  function buildHotspotsAndRefresh() {
    buildHotspots();
    whenMainVisible(refreshHotspotLayer);
  }

  if (pageImage) {
    pageImage.addEventListener("load", function () {
      updateContentAwareBackdrop();
      var p = loadStoryFromServer();
      if (p && typeof p.then === "function") {
        p.then(buildHotspotsAndRefresh).catch(buildHotspotsAndRefresh);
      } else {
        buildHotspotsAndRefresh();
      }
    });
    pageImage.addEventListener("error", function () {
      var p = loadStoryFromServer();
      if (p && typeof p.then === "function") {
        p.then(buildHotspotsAndRefresh).catch(buildHotspotsAndRefresh);
      } else {
        buildHotspotsAndRefresh();
      }
    });
  }

  if (pageImage && pageImage.complete) {
    var p = loadStoryFromServer();
    if (p && typeof p.then === "function") {
      p.then(buildHotspotsAndRefresh).catch(buildHotspotsAndRefresh);
    } else {
      buildHotspotsAndRefresh();
    }
  }

  if (mainScreen) {
    mainScreen.addEventListener("transitionend", function (e) {
      if (e.target === mainScreen && mainScreen.classList.contains("active")) {
        refreshHotspotLayer();
      }
    });
  }

  // Back from detail: skip intro, show main straight away
  if (window.location.hash === "#main") {
    showScreen(mainScreen);
    scheduleHotspotRefresh();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

/**
 * Detail page: shows one story page (image, title, body). Query: ?page=id
 * Loads data from data/story.json or localStorage. Back link goes to index.html.
 */

var STORAGE_KEY = "weddingStory";

function getPageId() {
  var params = new URLSearchParams(window.location.search);
  return params.get("page") || "";
}

function getStoryData(cb) {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      var data = JSON.parse(raw);
      if (Array.isArray(data.hotspots) && Array.isArray(data.pages)) {
        return cb(null, data);
      }
    }
  } catch (_) {}
  fetch("data/story.json?ts=" + Date.now())
    .then(function (res) {
      if (!res.ok) throw new Error("no story");
      return res.json();
    })
    .then(function (data) {
      if (data && Array.isArray(data.pages)) cb(null, data);
      else cb(new Error("no pages"));
    })
    .catch(function () { cb(new Error("load failed")); });
}

function showPage() {
  var pageId = getPageId();
  var titleEl = document.getElementById("detail-title");
  var bodyEl = document.getElementById("detail-body");
  var imageEl = document.getElementById("detail-image");

  if (!pageId) {
    if (titleEl) titleEl.textContent = "Page not found";
    if (bodyEl) { bodyEl.style.display = "none"; }
    if (imageEl) { imageEl.style.display = "none"; }
    return;
  }

  getStoryData(function (err, data) {
    var pages = data && data.pages ? data.pages : [];
    var page = pages.find(function (p) { return p && p.id === pageId; });

    if (page && page.title) document.title = page.title + " – The Wedding of Laras & Ikyu";
    if (titleEl) titleEl.textContent = page ? page.title : "Page not found";
    if (bodyEl) {
      var body = page && page.body ? page.body : "";
      bodyEl.textContent = body;
      bodyEl.style.display = body ? "block" : "none";
    }
    if (imageEl) {
      var imgSrc = page && page.image ? page.image : "pages/" + pageId + ".jpg";
      var sep = imgSrc.indexOf("?") === -1 ? "?" : "&";
      imageEl.src = imgSrc + sep + "t=" + Date.now();
      imageEl.alt = page ? page.title : pageId;
      imageEl.style.display = "block";
      imageEl.onerror = function () { imageEl.style.display = "none"; };
      var content = document.querySelector(".detail-content");
      if (content) content.style.setProperty("--detail-bg-image", "url(" + imageEl.src + ")");
      imageEl.addEventListener("load", function setDetailBackdrop() {
        if (content) content.style.setProperty("--detail-bg-image", "url(" + imageEl.src + ")");
      }, { once: true });
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", showPage);
} else {
  showPage();
}

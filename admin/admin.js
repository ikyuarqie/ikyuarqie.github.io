/**
 * Admin: define hotspots (stitch areas) and pages. Data saved to localStorage
 * so the main story app can load it dynamically. Open via /admin or admin/index.html
 */

var STORAGE_KEY = "weddingStory";

const adminImage = document.getElementById("admin-image");
const adminOverlay = document.getElementById("admin-overlay");
const drawPreview = document.getElementById("draw-preview");
const drawHint = document.getElementById("draw-hint");
const btnAddHotspot = document.getElementById("btn-add-hotspot");
const btnConfirmShapes = document.getElementById("btn-confirm-shapes");
const btnCancelShapes = document.getElementById("btn-cancel-shapes");
const shapeCountEl = document.getElementById("shape-count");
const hotspotList = document.getElementById("hotspot-list");
const pageList = document.getElementById("page-list");
const btnAddPage = document.getElementById("btn-add-page");
const btnSave = document.getElementById("btn-save");

const hotspotDialog = document.getElementById("hotspot-dialog");
const hotspotForm = document.getElementById("hotspot-form");
const hotspotDialogTitle = document.getElementById("hotspot-dialog-title");
const hotspotEditIndex = document.getElementById("hotspot-edit-index");
const hotspotLabel = document.getElementById("hotspot-label");
const hotspotPage = document.getElementById("hotspot-page");
const hotspotCancel = document.getElementById("hotspot-cancel");

const pageDialog = document.getElementById("page-dialog");
const pageForm = document.getElementById("page-form");
const pageDialogTitle = document.getElementById("page-dialog-title");
const pageEditId = document.getElementById("page-edit-id");
const pageTitle = document.getElementById("page-title");
const pageImagePath = document.getElementById("page-image-path");
const pageBody = document.getElementById("page-body");
const pageCancel = document.getElementById("page-cancel");

let state = {
  hotspots: [],
  pages: []
};

var drawStart = null;
var lassoPoints = [];
var isAddingHotspot = false; // true when drawing / building a group
var shapeGroup = []; // [{ points, left, top, width, height }, ...] — multiple shapes → one hotspot

function loadState() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      var data = JSON.parse(raw);
      state.hotspots = Array.isArray(data.hotspots) ? data.hotspots : [];
      state.pages = Array.isArray(data.pages) ? data.pages : [];
      return;
    }
  } catch (_) {}
  state.hotspots = [];
  state.pages = [];
}

function saveState() {
  var payload = {
    hotspots: state.hotspots,
    pages: state.pages
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (_) {}
  try {
    return fetch("../data/save-story.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (_) {
    return Promise.reject(new Error("Request failed"));
  }
}

function getImageRect() {
  const r = adminImage.getBoundingClientRect();
  const box = adminImage.parentElement.getBoundingClientRect();
  return {
    left: r.left,
    top: r.top,
    width: r.width,
    height: r.height,
    boxLeft: box.left,
    boxTop: box.top
  };
}

function positionAdminOverlay() {
  if (!adminImage || !adminOverlay) return;
  const imgRect = adminImage.getBoundingClientRect();
  const box = adminImage.parentElement ? adminImage.parentElement.getBoundingClientRect() : imgRect;
  adminOverlay.style.left = (imgRect.left - box.left) + "px";
  adminOverlay.style.top = (imgRect.top - box.top) + "px";
  adminOverlay.style.width = imgRect.width + "px";
  adminOverlay.style.height = imgRect.height + "px";
}

function renderHotspotBoxes() {
  var preview = document.getElementById("draw-preview");
  adminOverlay.innerHTML = "";
  var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "hotspot-svg");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("preserveAspectRatio", "none");
  state.hotspots.forEach(function (h, i) {
    var idx = i;
    if (h.polygons && Array.isArray(h.polygons) && h.polygons.length > 0) {
      h.polygons.forEach(function (pts) {
        if (!pts || pts.length < 3) return;
        var poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        poly.setAttribute("class", "hotspot-box hotspot-poly");
        poly.setAttribute("points", pts.map(function (p) { return p.x + "," + p.y; }).join(" "));
        poly.setAttribute("data-index", String(idx));
        poly.addEventListener("click", function (e) {
          e.stopPropagation();
          openHotspotForm(parseInt(poly.getAttribute("data-index"), 10));
        });
        svg.appendChild(poly);
      });
    } else if (h.points && h.points.length >= 3) {
      var poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      poly.setAttribute("class", "hotspot-box hotspot-poly");
      poly.setAttribute("points", h.points.map(function (p) { return p.x + "," + p.y; }).join(" "));
      poly.setAttribute("data-index", String(idx));
      poly.addEventListener("click", function (e) {
        e.stopPropagation();
        openHotspotForm(parseInt(poly.getAttribute("data-index"), 10));
      });
      svg.appendChild(poly);
    } else {
      var rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("class", "hotspot-box");
      rect.setAttribute("x", String(h.left));
      rect.setAttribute("y", String(h.top));
      rect.setAttribute("width", String(h.width));
      rect.setAttribute("height", String(h.height));
      rect.setAttribute("data-index", String(idx));
      rect.addEventListener("click", function (e) {
        e.stopPropagation();
        openHotspotForm(parseInt(rect.getAttribute("data-index"), 10));
      });
      svg.appendChild(rect);
    }
  });
  adminOverlay.appendChild(svg);
  if (preview) adminOverlay.appendChild(preview);
}

function renderHotspotList() {
  hotspotList.innerHTML = "";
  state.hotspots.forEach(function (h, i) {
    const page = state.pages.find(function (p) { return p.id === h.pageId; });
    const li = document.createElement("li");
    li.innerHTML =
      "<span class=\"item-label\">" + escapeHtml(h.label) + "</span>" +
      "<span class=\"item-meta\">" + (page ? escapeHtml(page.title) : "—") + "</span>" +
      "<button type=\"button\" class=\"edit\" data-index=\"" + i + "\">Edit</button>" +
      "<button type=\"button\" class=\"delete\" data-index=\"" + i + "\">Delete</button>";
    li.querySelector(".edit").addEventListener("click", function () { openHotspotForm(i); });
    li.querySelector(".delete").addEventListener("click", function () {
      state.hotspots.splice(i, 1);
      renderHotspotBoxes();
      renderHotspotList();
    });
    hotspotList.appendChild(li);
  });
}

// Try to load shared story.json from the server so all devices see the same data
function loadStateFromServer() {
  try {
    fetch("../data/story.json?ts=" + Date.now())
      .then(function (res) {
        if (!res.ok) throw new Error("no story.json");
        return res.json();
      })
      .then(function (data) {
        if (!data || !Array.isArray(data.hotspots) || !Array.isArray(data.pages)) return;
        state.hotspots = data.hotspots;
        state.pages = data.pages;
        renderHotspotBoxes();
        renderHotspotList();
        renderPageList();
        fillPageSelect();
      })
      .catch(function () { /* ignore if file missing */ });
  } catch (_) {}
}

function renderPageList() {
  pageList.innerHTML = "";
  state.pages.forEach(function (p) {
    const li = document.createElement("li");
    li.innerHTML =
      "<span class=\"item-label\">" + escapeHtml(p.title) + "</span>" +
      "<span class=\"item-meta\">" + escapeHtml(p.id) + "</span>" +
      "<button type=\"button\" class=\"edit\" data-id=\"" + escapeHtml(p.id) + "\">Edit</button>" +
      "<button type=\"button\" class=\"delete\" data-id=\"" + escapeHtml(p.id) + "\">Delete</button>";
    li.querySelector(".edit").addEventListener("click", function () { openPageForm(p.id); });
    li.querySelector(".delete").addEventListener("click", function () {
      state.pages = state.pages.filter(function (x) { return x.id !== p.id; });
      state.hotspots = state.hotspots.map(function (h) {
        return h.pageId === p.id ? Object.assign({}, h, { pageId: "" }) : h;
      });
      renderHotspotList();
      renderPageList();
      fillPageSelect();
    });
    pageList.appendChild(li);
  });
}

function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

function fillPageSelect() {
  const sel = hotspotPage;
  const current = sel.value;
  sel.innerHTML = "<option value=\"\">— Select page —</option>";
  state.pages.forEach(function (p) {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.title;
    sel.appendChild(opt);
  });
  sel.value = current || "";
}

function openHotspotForm(index) {
  hotspotEditIndex.value = index === undefined ? -1 : index;
  hotspotDialogTitle.textContent = index === undefined ? "New hotspot" : "Edit hotspot";
  if (index >= 0 && state.hotspots[index]) {
    const h = state.hotspots[index];
    hotspotLabel.value = h.label;
    hotspotPage.value = h.pageId || "";
  } else {
    hotspotLabel.value = "";
    hotspotPage.value = "";
  }
  fillPageSelect();
  hotspotDialog.showModal();
}

function openPageForm(id) {
  pageEditId.value = id || "";
  pageDialogTitle.textContent = id ? "Edit page" : "New page";
  if (id) {
    const p = state.pages.find(function (x) { return x.id === id; });
    if (p) {
      pageTitle.value = p.title;
      if (pageImagePath) pageImagePath.value = p.image || "";
      pageBody.value = p.body || "";
    }
  } else {
    pageTitle.value = "";
    if (pageImagePath) pageImagePath.value = "";
    pageBody.value = "";
  }
  pageDialog.showModal();
}

function generateId(title) {
  const base = (title || "page").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  let id = base;
  let n = 0;
  while (state.pages.some(function (p) { return p.id === id; })) {
    id = base + (n++);
  }
  return id;
}

// --- Helpers ---
function getImgRect() {
  return adminImage.getBoundingClientRect();
}

function clientToPercent(clientX, clientY) {
  var r = getImgRect();
  return { x: ((clientX - r.left) / r.width) * 100, y: ((clientY - r.top) / r.height) * 100 };
}

// --- Lasso: draw one or more shapes, then Done = one hotspot (polygons) ---
function setLassoSvgViewBox() {
  var svg = drawPreview && drawPreview.querySelector(".draw-preview-svg");
  if (!svg) return;
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("preserveAspectRatio", "none");
}

function lassoPointsToPercent() {
  var r = getImgRect();
  if (!r || r.width < 1 || r.height < 1) return [];
  return lassoPoints.map(function (p) {
    return { x: (p.x / r.width) * 100, y: (p.y / r.height) * 100 };
  });
}

function updateLassoPreview() {
  var svg = drawPreview && drawPreview.querySelector(".draw-preview-svg");
  if (!svg) return;
  var pts = lassoPointsToPercent();
  svg.innerHTML = "";
  shapeGroup.forEach(function (sel) {
    var poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    poly.setAttribute("class", "draw-preview-path");
    poly.setAttribute("points", sel.points.map(function (p) { return p.x + "," + p.y; }).join(" "));
    svg.appendChild(poly);
  });
  var current = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
  current.setAttribute("class", "draw-preview-path");
  current.setAttribute("points", pts.length >= 2 ? pts.map(function (p) { return p.x + "," + p.y; }).join(" ") : "");
  svg.appendChild(current);
}

function showGroupPreview() {
  var svg = drawPreview && drawPreview.querySelector(".draw-preview-svg");
  if (!svg) return;
  setLassoSvgViewBox();
  svg.innerHTML = "";
  shapeGroup.forEach(function (sel) {
    var poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    poly.setAttribute("class", "draw-preview-path");
    poly.setAttribute("points", sel.points.map(function (p) { return p.x + "," + p.y; }).join(" "));
    svg.appendChild(poly);
  });
  if (shapeGroup.length > 0) drawPreview.classList.add("visible");
  else drawPreview.classList.remove("visible");
}

function updateDoneCancelButtons() {
  var inMode = isAddingHotspot;
  if (btnConfirmShapes) {
    btnConfirmShapes.classList.toggle("hidden", !inMode);
    var canDone = inMode && shapeGroup.length > 0;
    btnConfirmShapes.disabled = !canDone;
    btnConfirmShapes.title = canDone ? "Create hotspot from drawn shape(s)" : "Draw at least one shape on the image first";
  }
  if (btnCancelShapes) btnCancelShapes.classList.toggle("hidden", !inMode);
  if (shapeCountEl) {
    shapeCountEl.classList.toggle("hidden", !inMode);
    shapeCountEl.textContent = inMode ? (shapeGroup.length === 0 ? "0 shapes — draw on the image" : shapeGroup.length + " shape(s) — click Done when ready") : "";
  }
}

// Convex hull (Graham scan) — merge multiple shapes into one outline
function convexHull(points) {
  if (!points || points.length < 3) return points ? points.slice() : [];
  var pts = points.slice();
  var start = 0;
  for (var i = 1; i < pts.length; i++) {
    if (pts[i].y < pts[start].y || (pts[i].y === pts[start].y && pts[i].x < pts[start].x)) start = i;
  }
  var origin = pts[start];
  pts.splice(start, 1);
  pts.sort(function (a, b) {
    var ax = a.x - origin.x, ay = a.y - origin.y;
    var bx = b.x - origin.x, by = b.y - origin.y;
    var cross = ax * by - ay * bx;
    if (cross !== 0) return cross > 0 ? 1 : -1;
    return (ax * ax + ay * ay) - (bx * bx + by * by);
  });
  var hull = [origin];
  for (var j = 0; j < pts.length; j++) {
    var p = pts[j];
    while (hull.length >= 2) {
      var a = hull[hull.length - 2], b = hull[hull.length - 1];
      var cr = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
      if (cr <= 0) hull.pop();
      else break;
    }
    hull.push(p);
  }
  return hull;
}

// Smooth polygon for a nicer outline (weighted average of each point with neighbors)
function smoothPolygon(points, passes) {
  if (!points || points.length < 3) return points ? points.slice() : [];
  passes = passes || 2;
  var pts = points.map(function (p) { return { x: p.x, y: p.y }; });
  for (var pass = 0; pass < passes; pass++) {
    var next = [];
    for (var i = 0; i < pts.length; i++) {
      var prev = pts[(i - 1 + pts.length) % pts.length];
      var curr = pts[i];
      var nextPt = pts[(i + 1) % pts.length];
      next.push({
        x: 0.25 * prev.x + 0.5 * curr.x + 0.25 * nextPt.x,
        y: 0.25 * prev.y + 0.5 * curr.y + 0.25 * nextPt.y
      });
    }
    pts = next;
  }
  return pts;
}

// Bounding boxes overlap (with small tolerance for "touching")
function bboxesOverlap(a, b) {
  var pad = 0.5;
  return !(a.right + pad < b.left - pad || b.right + pad < a.left - pad ||
           a.bottom + pad < b.top - pad || b.bottom + pad < a.top - pad);
}

// Point-in-polygon (ray casting)
function pointInPolygon(px, py, points) {
  var n = points.length, inside = false;
  for (var i = 0, j = n - 1; i < n; j = i++) {
    var xi = points[i].x, yi = points[i].y, xj = points[j].x, yj = points[j].y;
    if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

// Two shapes overlap if bboxes overlap or any point of one is inside the other
function shapesOverlap(s1, s2) {
  if (!s1.points || !s2.points || s1.points.length < 3 || s2.points.length < 3) return false;
  var r1 = { left: s1.left, top: s1.top, right: s1.left + s1.width, bottom: s1.top + s1.height };
  var r2 = { left: s2.left, top: s2.top, right: s2.left + s2.width, bottom: s2.top + s2.height };
  if (bboxesOverlap(r1, r2)) return true;
  for (var i = 0; i < s1.points.length; i++) {
    if (pointInPolygon(s1.points[i].x, s1.points[i].y, s2.points)) return true;
  }
  for (var j = 0; j < s2.points.length; j++) {
    if (pointInPolygon(s2.points[j].x, s2.points[j].y, s1.points)) return true;
  }
  return false;
}

// Union-find: parent[i] = index of parent
function findParent(parent, i) {
  if (parent[i] !== i) parent[i] = findParent(parent, parent[i]);
  return parent[i];
}

// Convert our points [{x,y},...] to PolyBool format { regions: [[[x,y],...]], inverted: false }
function pointsToPolyBool(points) {
  var region = points.map(function (p) { return [p.x, p.y]; });
  return { regions: [region], inverted: false };
}

// Union of overlapping shapes using polygon union (not convex hull). Uses PolyBool if available.
function unionPolygons(group) {
  if (group.length === 0) return [];
  if (group.length === 1 && group[0].points && group[0].points.length >= 3) {
    return [group[0].points.map(function (p) { return { x: p.x, y: p.y }; })];
  }
  if (typeof PolyBool !== "undefined" && PolyBool.union) {
    try {
      var acc = pointsToPolyBool(group[0].points);
      for (var i = 1; i < group.length; i++) {
        acc = PolyBool.union(acc, pointsToPolyBool(group[i].points));
      }
      if (!acc.regions || acc.regions.length === 0) return [];
      return acc.regions.map(function (region) {
        return region.map(function (pt) { return { x: pt[0], y: pt[1] }; });
      });
    } catch (e) {
      // fallback to convex hull if union fails
    }
  }
  var allPoints = [];
  group.forEach(function (s) { s.points.forEach(function (p) { allPoints.push({ x: p.x, y: p.y }); }); });
  var merged = convexHull(allPoints);
  if (!merged || merged.length < 3) {
    var minL = 100, minT = 100, maxR = 0, maxB = 0;
    allPoints.forEach(function (p) {
      if (p.x < minL) minL = p.x; if (p.x > maxR) maxR = p.x;
      if (p.y < minT) minT = p.y; if (p.y > maxB) maxB = p.y;
    });
    merged = [{ x: minL, y: minT }, { x: maxR, y: minT }, { x: maxR, y: maxB }, { x: minL, y: maxB }];
  }
  return [merged];
}

function confirmShapes() {
  if (shapeGroup.length === 0) return;
  var valid = shapeGroup.filter(function (s) { return s && s.points && s.points.length >= 3; });
  if (valid.length === 0) return;
  var n = valid.length;
  var parent = [];
  for (var i = 0; i < n; i++) parent[i] = i;
  for (var i = 0; i < n; i++) {
    for (var j = i + 1; j < n; j++) {
      if (shapesOverlap(valid[i], valid[j])) {
        var pi = findParent(parent, i), pj = findParent(parent, j);
        if (pi !== pj) parent[pi] = pj;
      }
    }
  }
  var groups = {};
  for (var k = 0; k < n; k++) {
    var root = findParent(parent, k);
    if (!groups[root]) groups[root] = [];
    groups[root].push(valid[k]);
  }
  var resultPolygons = [];
  for (var root in groups) {
    var group = groups[root];
    var mergedList = unionPolygons(group);
    for (var m = 0; m < mergedList.length; m++) {
      var merged = mergedList[m];
      if (merged.length < 3) continue;
      var smoothed = smoothPolygon(merged, 2);
      if (smoothed && smoothed.length >= 3) resultPolygons.push(smoothed);
    }
  }
  if (resultPolygons.length === 0) return;
  var minL = 100, minT = 100, maxR = 0, maxB = 0;
  resultPolygons.forEach(function (pts) {
    pts.forEach(function (p) {
      if (p.x < minL) minL = p.x; if (p.x > maxR) maxR = p.x;
      if (p.y < minT) minT = p.y; if (p.y > maxB) maxB = p.y;
    });
  });
  var left = minL, top = minT;
  var width = Math.min(100 - left, Math.max(0, maxR - minL));
  var height = Math.min(100 - top, Math.max(0, maxB - minT));
  var hotspot = { left: left, top: top, width: width, height: height, label: "New hotspot", pageId: "" };
  if (resultPolygons.length === 1) hotspot.points = resultPolygons[0];
  else hotspot.polygons = resultPolygons;
  state.hotspots.push(hotspot);
  shapeGroup = [];
  showGroupPreview();
  updateDoneCancelButtons();
  renderHotspotBoxes();
  renderHotspotList();
  openHotspotForm(state.hotspots.length - 1);
}

function cancelShapes() {
  shapeGroup = [];
  lassoPoints = [];
  drawStart = null;
  showGroupPreview();
  updateDoneCancelButtons();
  if (drawPreview) drawPreview.classList.remove("visible");
  var svg = drawPreview && drawPreview.querySelector(".draw-preview-svg");
  if (svg) {
    svg.innerHTML = "";
    var poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    poly.setAttribute("class", "draw-preview-path");
    svg.appendChild(poly);
  }
}

function startLasso(e) {
  if (!isAddingHotspot) return;
  var r = getImgRect();
  if (!r || r.width < 1 || r.height < 1) return;
  if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
  drawStart = true;
  lassoPoints = [{ x: e.clientX - r.left, y: e.clientY - r.top }];
  setLassoSvgViewBox();
  if (drawPreview) drawPreview.classList.add("visible");
  updateLassoPreview();
}

function updateLasso(e) {
  if (!drawStart || lassoPoints.length === 0) return;
  var r = getImgRect();
  var x = e.clientX - r.left;
  var y = e.clientY - r.top;
  if (x < 0 || x > r.width || y < 0 || y > r.height) return;
  var last = lassoPoints[lassoPoints.length - 1];
  if (Math.abs(x - last.x) < 1 && Math.abs(y - last.y) < 1) return;
  lassoPoints.push({ x: x, y: y });
  updateLassoPreview();
}

function endLasso(e) {
  if (!drawStart || !isAddingHotspot) return;
  drawStart = null;
  var r = getImgRect();
  if (!r || r.width < 1 || r.height < 1) return;
  var w = r.width;
  var h = r.height;
  if (lassoPoints.length === 1) {
    var cx = lassoPoints[0].x, cy = lassoPoints[0].y;
    var size = Math.min(w, h) * 0.08;
    var half = size / 2;
    lassoPoints = [
      { x: cx - half, y: cy - half },
      { x: cx + half, y: cy - half },
      { x: cx + half, y: cy + half },
      { x: cx - half, y: cy + half }
    ];
  } else if (lassoPoints.length === 2) {
    var a = lassoPoints[0], b = lassoPoints[1];
    var mx = (a.x + b.x) / 2 + 15, my = (a.y + b.y) / 2 - 10;
    lassoPoints.push({ x: Math.max(0, Math.min(w, mx)), y: Math.max(0, Math.min(h, my)) });
  } else if (lassoPoints.length < 3) {
    updateLassoPreview();
    return;
  }
  var r2 = getImgRect();
  if (!r2) return;
  w = r2.width;
  h = r2.height;
  var h = r.height;
  var minX = lassoPoints[0].x, maxX = minX, minY = lassoPoints[0].y, maxY = minY;
  lassoPoints.forEach(function (p) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  });
  var left = Math.max(0, (minX / w) * 100);
  var top = Math.max(0, (minY / h) * 100);
  var width = Math.min(100 - left, ((maxX - minX) / w) * 100);
  var height = Math.min(100 - top, ((maxY - minY) / h) * 100);
  var pointsPercent = lassoPoints.map(function (p) { return { x: (p.x / w) * 100, y: (p.y / h) * 100 }; });
  lassoPoints = [];
  shapeGroup.push({ points: pointsPercent, left: left, top: top, width: width, height: height });
  showGroupPreview();
  updateDoneCancelButtons();
}

// --- Overlay: lasso only ---
function onOverlayMouseDown(e) {
  if (isAddingHotspot) startLasso(e);
}

document.addEventListener("mousemove", function (e) {
  if (drawStart) updateLasso(e);
});
document.addEventListener("mouseup", function (e) {
  if (drawStart) endLasso(e);
});

if (adminOverlay) adminOverlay.addEventListener("mousedown", onOverlayMouseDown);

window.addEventListener("resize", function () {
  positionAdminOverlay();
  renderHotspotBoxes();
  setLassoSvgViewBox();
});

if (btnAddHotspot) {
  btnAddHotspot.addEventListener("click", function () {
    if (isAddingHotspot) {
      isAddingHotspot = false;
      cancelShapes();
      if (adminOverlay) {
        adminOverlay.classList.remove("drawing");
        adminOverlay.removeAttribute("role");
        adminOverlay.removeAttribute("tabindex");
        adminOverlay.removeAttribute("aria-label");
      }
      btnAddHotspot.classList.remove("active");
      if (drawHint) drawHint.classList.add("hidden");
    } else {
      isAddingHotspot = true;
      shapeGroup = [];
      positionAdminOverlay();
      if (adminOverlay) {
        adminOverlay.classList.add("drawing");
        adminOverlay.setAttribute("role", "button");
        adminOverlay.setAttribute("tabindex", "0");
        adminOverlay.setAttribute("aria-label", "Draw hotspot shape on image");
      }
      btnAddHotspot.classList.add("active");
      if (drawHint) drawHint.classList.remove("hidden");
      updateDoneCancelButtons();
    }
  });
}

if (btnConfirmShapes) btnConfirmShapes.addEventListener("click", confirmShapes);
if (btnCancelShapes) btnCancelShapes.addEventListener("click", cancelShapes);

hotspotForm.addEventListener("submit", function () {
  const index = parseInt(hotspotEditIndex.value, 10);
  const label = hotspotLabel.value.trim();
  const pageId = hotspotPage.value || "";
  if (index >= 0 && state.hotspots[index]) {
    state.hotspots[index].label = label;
    state.hotspots[index].pageId = pageId;
  }
  hotspotDialog.close();
  renderHotspotBoxes();
  renderHotspotList();
});

hotspotCancel.addEventListener("click", function () { hotspotDialog.close(); });

pageForm.addEventListener("submit", function () {
  const id = pageEditId.value.trim();
  const title = pageTitle.value.trim();
  const imagePath = pageImagePath ? pageImagePath.value.trim() : "";
  const body = pageBody.value.trim();
  if (id) {
    const p = state.pages.find(function (x) { return x.id === id; });
    if (p) {
      p.title = title;
      p.body = body;
      if (imagePath) p.image = imagePath; else delete p.image;
    }
  } else {
    const newId = generateId(title);
    const page = { id: newId, title: title, body: body };
    if (imagePath) page.image = imagePath;
    state.pages.push(page);
  }
  pageDialog.close();
  renderPageList();
  fillPageSelect();
});

pageCancel.addEventListener("click", function () { pageDialog.close(); });

btnAddPage.addEventListener("click", function () {
  pageEditId.value = "";
  openPageForm();
});

var dataPane = document.getElementById("data-pane");
var btnToggleSettings = document.getElementById("btn-toggle-settings");
if (dataPane && btnToggleSettings) {
  btnToggleSettings.addEventListener("click", function () {
    dataPane.classList.toggle("panel-closed");
  });
}

var saveStatusEl = document.getElementById("save-status");
btnSave.addEventListener("click", function () {
  var p = saveState();
  btnSave.textContent = "Saving…";
  if (saveStatusEl) saveStatusEl.textContent = "";
  if (p && typeof p.then === "function") {
    p.then(function (res) {
      return res.json().then(function (data) {
        if (data && data.ok) {
          if (saveStatusEl) saveStatusEl.textContent = "Saved to server";
        } else {
          if (saveStatusEl) saveStatusEl.textContent = "Saved locally only";
        }
      }).catch(function () {
        if (saveStatusEl) saveStatusEl.textContent = res.ok ? "Saved to server" : "Server error";
      });
    }).catch(function () {
      if (saveStatusEl) saveStatusEl.textContent = "Saved locally only (server unavailable)";
    }).finally(function () {
      btnSave.textContent = "Save to story";
      if (saveStatusEl) {
        setTimeout(function () { saveStatusEl.textContent = ""; }, 4000);
      }
    });
  } else {
    if (saveStatusEl) saveStatusEl.textContent = "Saved locally only";
    btnSave.textContent = "Save to story";
    setTimeout(function () { if (saveStatusEl) saveStatusEl.textContent = ""; }, 4000);
  }
});

// Init: load saved data or leave empty
loadState();
positionAdminOverlay();
renderHotspotBoxes();
renderHotspotList();
renderPageList();
fillPageSelect();
// Then try to override from shared server JSON if present
loadStateFromServer();
if (adminImage) {
  adminImage.addEventListener("load", function () {
    positionAdminOverlay();
    renderHotspotBoxes();
  });
  if (adminImage.complete) {
    positionAdminOverlay();
    renderHotspotBoxes();
  }
}

import { PROPERTY } from "./property-data.js";
import { FloorPlan } from "./floorplan.js";
import {
  STATUS_DESCRIPTIONS,
  STATUS_LABELS,
  createElement,
  prefersReducedMotion,
} from "./utils.js";

const state = {
  roomId: null,
  viewId: "perspective",
  viewer: null,
  plan: null,
  video: null,
  videoChapters: [],
  viewButtons: [],
  roomButtons: new Map(),
  evidenceRows: [],
  lastFrameTrigger: null,
};

const roomById = new Map(PROPERTY.layout.rooms.map((room) => [room.id, room]));
const evidenceById = new Map(PROPERTY.evidence.map((entry) => [entry.id, entry]));

function byId(id) {
  return document.getElementById(id);
}

function statusClass(status) {
  return ["confirmed", "inferred", "unknown", "provisional"].includes(status)
    ? status
    : "provisional";
}

function formatClock(seconds) {
  const value = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(value / 60);
  const remainder = value % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function evidenceLabel(id) {
  const entry = evidenceById.get(id);
  if (!entry) return id.replaceAll("-", " ");
  return entry.feature.split("—")[0].split(",")[0].trim();
}

function renderRooms() {
  const list = byId("room-list");
  if (!list) return;
  list.replaceChildren();
  for (const room of PROPERTY.layout.rooms) {
    const button = createElement("button", "room-chip");
    button.type = "button";
    button.dataset.roomId = room.id;
    button.setAttribute("aria-pressed", "false");

    const index = createElement("span", "room-chip__index", String(room.index).padStart(2, "0"));
    const body = createElement("span", "room-chip__body");
    body.append(
      createElement("span", "room-chip__name", room.name),
      createElement(
        "span",
        "room-chip__meta",
        `${STATUS_LABELS[room.functionStatus] || room.functionStatus} · ${room.confidenceLabel}`,
      ),
    );
    const dot = createElement(
      "span",
      `room-chip__status room-chip__status--${statusClass(room.functionStatus)}`,
    );
    dot.setAttribute("aria-hidden", "true");
    button.append(index, body, dot);
    button.addEventListener("click", () => {
      if (state.roomId === room.id) {
        applyRoomSelection(null, "room-list");
      } else {
        applyRoomSelection(room.id, "room-list");
      }
    });
    state.roomButtons.set(room.id, button);
    list.appendChild(button);
  }
}

function createDossierFact(label, value) {
  const wrapper = createElement("div");
  wrapper.append(createElement("dt", "", label), createElement("dd", "", value));
  return wrapper;
}

function renderWelcomeDossier() {
  const dossier = byId("room-dossier");
  if (!dossier) return;
  const wrap = createElement("div", "dossier__welcome");
  const copy = createElement("div");
  copy.append(
    createElement("span", "micro-label", "Room dossier"),
    createElement("h3", "", "Read the flat, room by room."),
    createElement(
      "p",
      "",
      "Choose a space in the 3D model, the plan or the room index. Each dossier separates what the walkthrough shows from what has been inferred — and states what remains unknown.",
    ),
  );
  const hint = createElement("div", "dossier__welcome-hint");
  hint.append(
    createElement("span", "", "01"),
    createElement("p", "", "Select any room to begin"),
  );
  wrap.append(copy, hint);
  dossier.replaceChildren(wrap);
}

function renderRoomDossier(room) {
  const dossier = byId("room-dossier");
  if (!dossier) return;
  if (!room) {
    renderWelcomeDossier();
    return;
  }
  const currentIndex = PROPERTY.layout.rooms.findIndex((entry) => entry.id === room.id);
  const previous = PROPERTY.layout.rooms[
    (currentIndex - 1 + PROPERTY.layout.rooms.length) % PROPERTY.layout.rooms.length
  ];
  const next = PROPERTY.layout.rooms[(currentIndex + 1) % PROPERTY.layout.rooms.length];

  const inner = createElement("div", "dossier__inner");
  const top = createElement("div", "dossier__topline");
  top.append(
    createElement(
      "span",
      "dossier__count",
      `Room ${String(room.index).padStart(2, "0")} / ${String(
        PROPERTY.layout.rooms.length,
      ).padStart(2, "0")}`,
    ),
    createElement(
      "span",
      `status-pill status-pill--${statusClass(room.functionStatus)}`,
      STATUS_LABELS[room.functionStatus] || room.functionStatus,
    ),
  );

  const title = createElement("h3", "dossier__title", room.name);

  const facts = createElement("dl", "dossier__facts");
  facts.append(
    createDossierFact("Function", STATUS_LABELS[room.functionStatus] || room.functionStatus),
    createDossierFact("Geometry", STATUS_LABELS[room.geometryStatus] || room.geometryStatus),
    createDossierFact("Confidence", room.confidenceLabel),
    createDossierFact("In footage", room.evidenceWindow),
  );

  const featuresSection = createElement("div", "dossier__section");
  const featureList = createElement("ul", "dossier__features");
  for (const feature of room.features) {
    featureList.appendChild(createElement("li", "", feature));
  }
  featuresSection.append(createElement("h4", "", "Observed or inferred"), featureList);

  const evidenceSection = createElement("div", "dossier__section");
  evidenceSection.appendChild(createElement("h4", "", "Evidence references"));
  const tags = createElement("div", "dossier__tags");
  for (const evidenceId of room.evidenceIds) {
    const tag = createElement("span", "dossier__tag", evidenceId.replaceAll("-", " "));
    tag.title = evidenceLabel(evidenceId);
    tags.appendChild(tag);
  }
  evidenceSection.appendChild(tags);

  const caveat = createElement("p", "dossier__caveat");
  caveat.append(
    createElement("strong", "", "Limit of this reading"),
    document.createTextNode(room.caveat),
  );

  const nav = createElement("div", "dossier__nav");
  const previousButton = createElement("button", "", "");
  previousButton.type = "button";
  previousButton.dataset.roomId = previous.id;
  previousButton.append(
    createElement("span", "", "←"),
    createElement("span", "", `Previous · ${previous.shortName}`),
  );
  const nextButton = createElement("button", "", "");
  nextButton.type = "button";
  nextButton.dataset.roomId = next.id;
  nextButton.append(
    createElement("span", "", `Next · ${next.shortName}`),
    createElement("span", "", "→"),
  );
  nav.append(previousButton, nextButton);
  previousButton.addEventListener("click", () =>
    applyRoomSelection(previousButton.dataset.roomId, "dossier"),
  );
  nextButton.addEventListener("click", () =>
    applyRoomSelection(nextButton.dataset.roomId, "dossier"),
  );

  inner.append(
    top,
    title,
    createElement("p", "dossier__summary", room.summary),
    facts,
    featuresSection,
    evidenceSection,
    caveat,
    nav,
  );
  dossier.replaceChildren(inner);
}

function updateRelatedEvidence(roomId) {
  for (const row of state.evidenceRows) {
    row.classList.toggle("is-related", Boolean(roomId) && row.dataset.roomId === roomId);
  }
}

function applyRoomSelection(roomId, source) {
  const id = roomId && roomById.has(roomId) ? roomId : null;
  state.roomId = id;

  if (state.viewer && source !== "viewer") {
    state.viewer.selectRoom(id, { notify: false });
  }
  if (state.plan && source !== "plan") {
    state.plan.select(id, { notify: false });
  }
  for (const [buttonId, button] of state.roomButtons) {
    const active = buttonId === id;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  }
  const clearButton = byId("clear-room");
  if (clearButton) clearButton.hidden = !id;
  renderRoomDossier(id ? roomById.get(id) : null);
  updateRelatedEvidence(id);
}

function renderChapters() {
  const list = byId("chapter-list");
  if (!list) return;
  list.replaceChildren();
  state.videoChapters = [];
  for (const chapter of PROPERTY.chapters) {
    const button = createElement("button", "chapter-list__item");
    button.type = "button";
    button.dataset.time = String(chapter.time);
    button.dataset.roomId = chapter.roomId;
    const time = createElement("span", "chapter-list__time", formatClock(chapter.time));
    const title = createElement("span", "chapter-list__title", chapter.title);
    const arrow = createElement("span", "chapter-list__arrow", "→");
    arrow.setAttribute("aria-hidden", "true");
    button.append(time, title, arrow);
    button.setAttribute("aria-label", `Play from ${formatClock(chapter.time)}: ${chapter.title}`);
    button.addEventListener("click", () => seekToChapter(chapter));
    list.appendChild(button);
    state.videoChapters.push({ button, chapter });
  }
}

function seekToChapter(chapter) {
  const video = state.video;
  if (!video) return;
  try {
    video.currentTime = chapter.time;
    const promise = video.play();
    if (promise && typeof promise.catch === "function") {
      promise.catch(() => {});
    }
  } catch {
    return;
  }
  updateChapterState();
}

function updateChapterState() {
  const video = state.video;
  if (!video || !state.videoChapters.length) return;
  const time = video.currentTime + 0.06;
  let activeIndex = -1;
  state.videoChapters.forEach((entry, index) => {
    if (time >= entry.chapter.time) activeIndex = index;
  });
  state.videoChapters.forEach((entry, index) => {
    const current = index === activeIndex;
    entry.button.classList.toggle("is-active", current);
    entry.button.classList.toggle("is-playing", current && !video.paused);
    if (current) entry.button.setAttribute("aria-current", "true");
    else entry.button.removeAttribute("aria-current");
  });
}

function renderFrames() {
  const grid = byId("reference-frames");
  if (!grid) return;
  grid.replaceChildren();
  for (const frame of PROPERTY.referenceFrames) {
    const button = createElement("button", "frame-card");
    button.type = "button";
    button.setAttribute("aria-label", `Open reference frame: ${frame.title}, ${frame.time}`);
    const imageWrap = createElement("span", "frame-card__image");
    const image = document.createElement("img");
    image.src = frame.image;
    image.alt = frame.alt;
    image.width = 768;
    image.height = 1366;
    image.loading = "lazy";
    image.decoding = "async";
    const badge = createElement("span", "frame-card__badge", frame.time);
    const caption = createElement("span", "frame-card__caption");
    caption.append(
      createElement("span", "frame-card__title", frame.title),
      createElement("span", "frame-card__arrow", "↗"),
    );
    imageWrap.append(image, badge, caption);
    button.appendChild(imageWrap);
    button.addEventListener("click", () => openFrame(frame, button));
    grid.appendChild(button);
  }
}

function openFrame(frame, trigger) {
  const dialog = byId("frame-dialog");
  if (!dialog) return;
  state.lastFrameTrigger = trigger;
  byId("dialog-image").src = frame.image;
  byId("dialog-image").alt = frame.alt;
  byId("dialog-time").textContent = `Reference frame · ${frame.time}`;
  byId("dialog-title").textContent = frame.title;
  byId("dialog-caption").textContent = frame.caption;
  document.body.classList.add("is-locked");
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}

function closeFrame() {
  const dialog = byId("frame-dialog");
  if (!dialog) return;
  if (typeof dialog.close === "function" && dialog.open) dialog.close();
  else dialog.removeAttribute("open");
  document.body.classList.remove("is-locked");
  if (state.lastFrameTrigger) state.lastFrameTrigger.focus();
}

function setupLightbox() {
  const dialog = byId("frame-dialog");
  if (!dialog) return;
  byId("dialog-close").addEventListener("click", closeFrame);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closeFrame();
  });
  dialog.addEventListener("close", () => {
    document.body.classList.remove("is-locked");
    if (state.lastFrameTrigger) state.lastFrameTrigger.focus();
  });
}

function renderConfidenceSummary() {
  const grid = byId("confidence-grid");
  if (!grid) return;
  const content = {
    confirmed: {
      heading: "Directly observed",
      status: "confirmed",
      description: STATUS_DESCRIPTIONS.confirmed,
    },
    inferred: {
      heading: "Reasonable readings",
      status: "inferred",
      description: STATUS_DESCRIPTIONS.inferred,
    },
    unknown: {
      heading: "Left unresolved",
      status: "unknown",
      description: STATUS_DESCRIPTIONS.unknown,
    },
    provisional: {
      heading: "Modelling assumptions",
      status: "provisional",
      description: STATUS_DESCRIPTIONS.provisional,
    },
  };
  grid.replaceChildren();
  for (const [key, config] of Object.entries(content)) {
    const items = PROPERTY.confidenceSummary[key] || [];
    const card = createElement(
      "article",
      `confidence-card confidence-card--${config.status}`,
    );
    const top = createElement("div", "confidence-card__top");
    top.append(
      createElement(
        "span",
        `status-pill status-pill--${config.status}`,
        STATUS_LABELS[key],
      ),
      createElement("span", "confidence-card__count", String(items.length).padStart(2, "0")),
    );
    const sample = items.slice(0, 3).join(" · ");
    const remainder = items.length > 3 ? ` · +${items.length - 3} more` : "";
    card.append(
      top,
      createElement("h3", "", config.heading),
      createElement("p", "", `${config.description} ${sample}${remainder}`),
    );
    grid.appendChild(card);
  }
}

function renderEvidence() {
  const list = byId("evidence-list");
  if (!list) return;
  list.replaceChildren();
  state.evidenceRows = [];
  const count = byId("evidence-count");
  if (count) count.textContent = `${PROPERTY.evidence.length} entries`;

  for (const entry of PROPERTY.evidence) {
    const row = createElement("article", "evidence-row");
    row.dataset.roomId = entry.roomId;
    const time = createElement("span", "evidence-row__time", entry.timestamp);
    const body = createElement("div", "evidence-row__body");
    const room = roomById.get(entry.roomId);
    const meta = createElement("div", "evidence-row__meta");
    meta.append(
      createElement("span", "", room ? room.shortName : "Unassigned"),
      createElement("span", "", `Confidence: ${entry.confidence}`),
    );
    body.append(
      createElement("h4", "", entry.feature),
      createElement("p", "evidence-row__effect", entry.effect),
      meta,
    );
    const pill = createElement(
      "span",
      `status-pill status-pill--${statusClass(entry.status)}`,
      STATUS_LABELS[entry.status] || entry.status,
    );
    row.append(time, body, pill);
    list.appendChild(row);
    state.evidenceRows.push(row);
  }
  updateRelatedEvidence(state.roomId);
}

function setupVideo() {
  const video = byId("reference-video");
  if (!video) return;
  state.video = video;
  video.addEventListener("timeupdate", updateChapterState);
  video.addEventListener("play", updateChapterState);
  video.addEventListener("pause", updateChapterState);
  video.addEventListener("seeked", updateChapterState);
  video.addEventListener("loadedmetadata", updateChapterState);
  updateChapterState();
}

function setView(viewId) {
  state.viewId = viewId;
  for (const button of state.viewButtons) {
    const active = button.dataset.view === viewId;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  }
  if (state.viewer) state.viewer.setView(viewId);
}

function setupViewerControls() {
  state.viewButtons = [...document.querySelectorAll("[data-view]")];
  for (const button of state.viewButtons) {
    button.setAttribute("aria-pressed", String(button.dataset.view === state.viewId));
    button.addEventListener("click", () => setView(button.dataset.view));
  }
  const reset = byId("reset-view");
  if (reset) reset.addEventListener("click", () => state.viewer?.resetView());
  const fullscreen = byId("fullscreen-viewer");
  const viewer = byId("viewer");
  if (fullscreen && viewer) {
    fullscreen.addEventListener("click", async () => {
      try {
        if (document.fullscreenElement === viewer) await document.exitFullscreen();
        else await viewer.requestFullscreen();
      } catch {
        return;
      }
    });
    document.addEventListener("fullscreenchange", () => {
      const active = document.fullscreenElement === viewer;
      fullscreen.setAttribute("aria-label", active ? "Exit fullscreen" : "View 3D model in fullscreen");
      fullscreen.setAttribute("title", active ? "Exit fullscreen" : "Fullscreen");
    });
  }
  const clear = byId("clear-room");
  if (clear) clear.addEventListener("click", () => applyRoomSelection(null, "clear"));
}

function showViewerFallback() {
  const loader = byId("viewer-loader");
  const fallback = byId("viewer-fallback");
  const status = byId("viewer-status-label");
  if (loader) loader.hidden = true;
  if (fallback) fallback.hidden = false;
  if (status) status.textContent = "3D model unavailable";
  for (const button of document.querySelectorAll(
    "[data-view], #reset-view, #fullscreen-viewer",
  )) {
    button.disabled = true;
  }
}

async function initializeViewer() {
  const viewerContainer = byId("viewer");
  if (!viewerContainer) return;
  try {
    const module = await import("./viewer3d.js");
    const viewer = new module.DigitalTwinViewer(viewerContainer, {
      property: PROPERTY,
      initialView: state.viewId,
      onRoomSelect: (room) => {
        applyRoomSelection(room ? room.id : null, "viewer");
      },
      onViewChange: (viewId) => {
        state.viewId = viewId;
        for (const button of state.viewButtons) {
          const active = button.dataset.view === viewId;
          button.classList.toggle("is-active", active);
          button.setAttribute("aria-pressed", String(active));
        }
      },
      onReady: () => {
        const loader = byId("viewer-loader");
        const status = byId("viewer-status-label");
        if (status) status.textContent = "Interactive model · scale not calibrated";
        if (loader) {
          loader.classList.add("is-hidden");
          window.setTimeout(() => {
            loader.hidden = true;
          }, 560);
        }
      },
      onError: () => {
        showViewerFallback();
      },
    });
    state.viewer = viewer;
    if (state.roomId) viewer.selectRoom(state.roomId, { notify: false });
  } catch (error) {
    showViewerFallback();
    if (window.console && typeof window.console.error === "function") {
      window.console.error("Flat 501 3D viewer failed to start:", error);
    }
  }
}

function setupNavigation() {
  const header = byId("site-header");
  const toggle = byId("nav-toggle");
  const nav = byId("primary-nav");
  if (!header || !toggle || !nav) return;

  const closeMenu = () => {
    header.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("is-locked");
  };

  toggle.addEventListener("click", () => {
    const open = !header.classList.contains("is-open");
    header.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("is-locked", open);
  });

  for (const link of nav.querySelectorAll("a")) {
    link.addEventListener("click", closeMenu);
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && header.classList.contains("is-open")) {
      closeMenu();
      toggle.focus();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 900 && header.classList.contains("is-open")) closeMenu();
  });

  const updateHeader = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 24);
  };
  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });
}

function setupReveals() {
  const elements = [...document.querySelectorAll(".reveal")];
  if (!elements.length) return;
  if (!("IntersectionObserver" in window) || prefersReducedMotion()) {
    elements.forEach((element) => element.classList.add("is-visible"));
    return;
  }
  try {
    document.documentElement.classList.add("reveal-ready");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -6% 0px" },
    );
    elements.forEach((element) => observer.observe(element));
  } catch {
    document.documentElement.classList.remove("reveal-ready");
    elements.forEach((element) => element.classList.add("is-visible"));
  }
}

function initializePlan() {
  const svg = byId("floorplan");
  if (!svg) return;
  state.plan = new FloorPlan(svg, PROPERTY, {
    onSelect: (roomId) => applyRoomSelection(roomId, "plan"),
  });
}

function initializeFooter() {
  const year = byId("footer-year");
  if (year) year.textContent = `© ${new Date().getFullYear()} Flat 501`;
}

function initialize() {
  renderRooms();
  renderChapters();
  renderFrames();
  renderConfidenceSummary();
  renderEvidence();
  renderRoomDossier(null);
  initializePlan();
  setupViewerControls();
  setupVideo();
  setupLightbox();
  setupNavigation();
  initializeFooter();
  setupReveals();
  initializeViewer();
}

initialize();

// ═══════════════════════════════════════════════════════════════════════
//  STARFIELD ROUTE PLANNER  v1.0
//  Module: starfield-route-planner
//
//  Responsibilities:
//    - Persistent full-screen 3D star map iframe (Three.js, real LY coords)
//    - Open/close sync across all clients via socketlib
//    - Route plot/clear sync across all clients
//    - Camera pan/zoom/rotate sync across all clients
//    - Calendaria stardate bridge (folded in — no world.js snippet needed)
//    - GM-only "Close for All" button; per-client close + reopen
//    - Suppressed on /stream view (OBS chat log browser source)
//
//  Console API:  window.starfieldRoutePlanner
//  HTML file:    /modules/starfield-route-planner/StarfieldRoutePlanner.html
// ═══════════════════════════════════════════════════════════════════════

const MODULE_ID        = "starfield-route-planner";
const ROUTE_PLANNER_ID = "srp-iframe";
const ROUTE_PLANNER_PATH = "/modules/starfield-route-planner/StarfieldRoutePlanner.html";

let socketlibSocket;

// Per-client iframe state
let _routePlannerVisible  = false;
let _routePlannerCreating = false;

// ════════════════════════════════════════════════════════════════════════
//  CALENDARIA BRIDGE
//
//  Reads CALENDARIA.api.getCurrentDateTime() and pushes a stardate
//  payload into the route planner iframe via postMessage.
//  Hooks into updateWorldTime (fires on every game-time change) and
//  calendaria.ready (fires once on load).
//  No world.js snippet required — this module handles it automatically.
// ════════════════════════════════════════════════════════════════════════

function _buildStardatePayload() {
  if (typeof CALENDARIA === "undefined" || !CALENDARIA?.api?.getCurrentDateTime) return null;

  const dt  = CALENDARIA.api.getCurrentDateTime();
  const cal = CALENDARIA.api.getActiveCalendar();

  // Day-of-year: sum days in all preceding months
  let dayOfYear = dt.dayOfMonth ?? dt.day ?? 1;
  if (cal) {
    const months = cal.monthsArray ?? [];
    for (let i = 0; i < (dt.month - 1) && i < months.length; i++) {
      dayOfYear += months[i].days ?? months[i].length ?? 28;
    }
  }

  const h  = String(dt.hour   ?? 0).padStart(2, "0");
  const m  = String(dt.minute ?? 0).padStart(2, "0");
  const s  = String(dt.second ?? 0).padStart(2, "0");
  const d  = String(dayOfYear).padStart(3, "0");
  const yr = dt.year ?? 0;

  return {
    type:      "calendaria-stardate",
    stardate:  `UT ${yr}.${d} ${h}:${m}:${s}`,
    year:      yr,
    dayOfYear: Number(d),
    month:     dt.month,
    day:       dt.dayOfMonth ?? dt.day ?? 1,
    hour:      dt.hour   ?? 0,
    minute:    dt.minute ?? 0,
    second:    dt.second ?? 0,
    monthName: dt.monthName ?? "",
  };
}

function _pushStardateToIframe() {
  const payload = _buildStardatePayload();
  if (!payload) return;
  const iframe = document.getElementById(ROUTE_PLANNER_ID);
  if (iframe?.contentWindow) {
    iframe.contentWindow.postMessage(JSON.stringify(payload), "*");
  }
}

// Expose for console/macro use
window.pushStardate = _pushStardateToIframe;

// Wire Calendaria hooks — fire even if Calendaria isn't active yet
// (hooks are no-ops if CALENDARIA is undefined)
Hooks.once("calendaria.ready", () => {
  console.log("Starfield Route Planner | Calendaria ready — pushing initial stardate.");
  _pushStardateToIframe();
});

Hooks.on("updateWorldTime", () => { _pushStardateToIframe(); });
Hooks.on("calendaria.calendarSwitched", () => { _pushStardateToIframe(); });

// ════════════════════════════════════════════════════════════════════════
//  IFRAME FACTORY
//
//  Fetches the HTML file, injects a <base> tag for path resolution,
//  wraps it in a Blob with explicit text/html MIME type to bypass
//  Foundry V14's text/plain serving behaviour, then creates the iframe.
// ════════════════════════════════════════════════════════════════════════

function _getOrCreateRoutePlannerIframe() {
  const existing = document.getElementById(ROUTE_PLANNER_ID);
  if (existing) return existing;
  if (_routePlannerCreating) return null;
  _routePlannerCreating = true;

  fetch(ROUTE_PLANNER_PATH)
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status} fetching ${ROUTE_PLANNER_PATH}`);
      return r.text();
    })
    .then(html => {
      const base    = `${window.location.origin}/`;
      const based   = html.replace("<head>", `<head><base href="${base}">`);
      const blob    = new Blob([based], { type: "text/html" });
      const blobUrl = URL.createObjectURL(blob);

      const iframe = document.createElement("iframe");
      iframe.id  = ROUTE_PLANNER_ID;
      iframe.src = blobUrl;

      Object.assign(iframe.style, {
        position:      "fixed",
        inset:         "0",
        width:         "100vw",
        height:        "100vh",
        border:        "none",
        zIndex:        "8000",
        visibility:    "hidden",
        pointerEvents: "none",
        opacity:       "0",
        transition:    "opacity 0.25s ease",
      });

      document.body.appendChild(iframe);

      iframe.addEventListener("load", () => {
        _routePlannerCreating        = false;
        URL.revokeObjectURL(blobUrl);
        window.starfieldRouteWindow  = iframe.contentWindow;
        game.starfieldRouteWindow    = iframe.contentWindow;
        console.log("Starfield Route Planner | iframe loaded.");
        _pushStardateToIframe();
        _showIframe(iframe);
      });
    })
    .catch(e => {
      _routePlannerCreating = false;
      console.error("Starfield Route Planner | Failed to load HTML:", e);
    });

  return null; // async — show is called from load event
}

// ════════════════════════════════════════════════════════════════════════
//  SHOW / HIDE
// ════════════════════════════════════════════════════════════════════════

function _showIframe(iframe) {
  if (_routePlannerVisible) return;
  _routePlannerVisible       = true;
  iframe.style.visibility    = "visible";
  iframe.style.pointerEvents = "auto";
  requestAnimationFrame(() => { iframe.style.opacity = "1"; });
  _pushStardateToIframe();
  console.log("Starfield Route Planner | shown.");
}

function _hideIframe(iframe) {
  _routePlannerVisible       = false;
  iframe.style.opacity       = "0";
  iframe.style.pointerEvents = "none";
  setTimeout(() => {
    if (!_routePlannerVisible) iframe.style.visibility = "hidden";
  }, 280);
  console.log("Starfield Route Planner | hidden.");
}

// ════════════════════════════════════════════════════════════════════════
//  SOCKETLIB-REGISTERED FUNCTIONS
//  These run on every client when executeForEveryone is called.
//  All suppress on /stream to avoid affecting the OBS chat log view.
// ════════════════════════════════════════════════════════════════════════

const _isStream = () => window.location.pathname.includes("/stream");

function openRoutePlanner() {
  if (_isStream()) return;
  const iframe = _getOrCreateRoutePlannerIframe();
  if (iframe) _showIframe(iframe);
  // else: async fetch in progress — _showIframe called from load event
}

function closeRoutePlannerAll() {
  if (_isStream()) return;
  const iframe = document.getElementById(ROUTE_PLANNER_ID);
  if (iframe && _routePlannerVisible) _hideIframe(iframe);
}

function closeRoutePlannerLocal() {
  const iframe = document.getElementById(ROUTE_PLANNER_ID);
  if (iframe && _routePlannerVisible) _hideIframe(iframe);
}

function syncRoute(payload) {
  if (_isStream()) return;
  const iframe = document.getElementById(ROUTE_PLANNER_ID);
  iframe?.contentWindow?.postMessage(
    JSON.stringify({ type: "co-apply-route", payload }), "*"
  );
}

function syncClearRoute() {
  if (_isStream()) return;
  const iframe = document.getElementById(ROUTE_PLANNER_ID);
  iframe?.contentWindow?.postMessage(
    JSON.stringify({ type: "co-apply-clear" }), "*"
  );
}

function syncCamera(payload) {
  if (_isStream()) return;
  const iframe = document.getElementById(ROUTE_PLANNER_ID);
  iframe?.contentWindow?.postMessage(
    JSON.stringify({ type: "co-apply-camera", payload }), "*"
  );
}

function syncDiscoveredStar(payload) {
  if (_isStream()) return;
  const iframe = document.getElementById(ROUTE_PLANNER_ID);
  iframe?.contentWindow?.postMessage(
    JSON.stringify({ type: "co-apply-discovered-star", payload }), "*"
  );
}

// ════════════════════════════════════════════════════════════════════════
//  PARENT-SIDE postMessage LISTENER
//  Receives signals posted by the iframe (close buttons, route plots,
//  camera moves, GM detection query) and acts on them in Foundry context
//  where game.user, socketlib, etc. are available.
// ════════════════════════════════════════════════════════════════════════

window.addEventListener("message", (event) => {
  let data;
  try { data = typeof event.data === "string" ? JSON.parse(event.data) : event.data; }
  catch (_) { return; }
  if (!data?.type) return;

  switch (data.type) {

    // ── Per-client close (✕ CLOSE MAP button) ──────────────────────────
    case "co-close-route-planner":
      closeRoutePlannerLocal();
      break;

    // ── GM close-all (✕ CLOSE FOR ALL button) ──────────────────────────
    case "co-close-all-clients":
      if (game.user.isGM) {
        socketlibSocket?.executeForEveryone("closeRoutePlannerAll");
      }
      break;

    // ── GM detection query (iframe asks if local user is GM) ────────────
    case "co-query-is-gm": {
      const iframe = document.getElementById(ROUTE_PLANNER_ID);
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage(
          JSON.stringify({ type: "co-is-gm-response", isGM: !!game.user.isGM }),
          "*"
        );
      }
      break;
    }

    // ── Camera sync (GM finished a pan/zoom/rotate gesture) ─────────────
    case "co-sync-camera":
      if (game.user.isGM) {
        socketlibSocket?.executeForEveryone("syncCamera", data.payload);
      }
      break;

    // ── Route sync (GM plotted a route) ─────────────────────────────────
    case "co-sync-route":
      if (game.user.isGM) {
        socketlibSocket?.executeForEveryone("syncRoute", data.payload);
      }
      break;

    // ── Route clear sync (GM cleared the route) ──────────────────────────
    case "co-clear-route":
      if (game.user.isGM) {
        socketlibSocket?.executeForEveryone("syncClearRoute");
      }
      break;

    // ── Discovered star sync (GM published a new star) ───────────────────
    case "co-sync-discovered-star":
      if (game.user.isGM) {
        socketlibSocket?.executeForEveryone("syncDiscoveredStar", data.payload);
      }
      break;
  }
});

// ════════════════════════════════════════════════════════════════════════
//  SOCKETLIB REGISTRATION
// ════════════════════════════════════════════════════════════════════════

function _registerSocketlibFunctions() {
  if (!socketlibSocket) {
    console.warn("Starfield Route Planner | _registerSocketlibFunctions: socketlibSocket is null");
    return;
  }
  const fns = [
    ["openRoutePlanner",     openRoutePlanner],
    ["closeRoutePlannerAll", closeRoutePlannerAll],
    ["syncRoute",            syncRoute],
    ["syncClearRoute",       syncClearRoute],
    ["syncCamera",           syncCamera],
    ["syncDiscoveredStar",   syncDiscoveredStar],
  ];
  for (const [name, fn] of fns) {
    try {
      socketlibSocket.register(name, fn);
      console.log(`Starfield Route Planner | registered: ${name}`);
    } catch(e) {
      console.error(`Starfield Route Planner | failed to register "${name}":`, e);
    }
  }
}

Hooks.once("socketlib.ready", () => {
  try {
    socketlibSocket = socketlib.registerModule(MODULE_ID);
    _registerSocketlibFunctions();
    console.log("Starfield Route Planner | socketlib registered.");
  } catch(e) {
    console.error("Starfield Route Planner | socketlib.ready hook failed:", e);
  }
});

// ════════════════════════════════════════════════════════════════════════
//  READY HOOK
// ════════════════════════════════════════════════════════════════════════

Hooks.once("ready", () => {
  if (typeof socketlib !== "undefined" && !socketlibSocket) {
    try {
      socketlibSocket = socketlib.registerModule(MODULE_ID);
      _registerSocketlibFunctions();
      console.log("Starfield Route Planner | socketlib registered (fallback).");
    } catch(e) {
      console.error("Starfield Route Planner | ready hook socketlib registration failed:", e);
    }
  }

  // ── Public API ──────────────────────────────────────────────────────
  window.starfieldRoutePlanner = {
    // Opens on ALL clients simultaneously (GM macro)
    openForAll:   () => socketlibSocket?.executeForEveryone("openRoutePlanner"),
    // Closes on ALL clients simultaneously (GM console/macro)
    closeForAll:  () => socketlibSocket?.executeForEveryone("closeRoutePlannerAll"),
    // Opens on THIS client only (player reopen macro)
    openLocal:    () => openRoutePlanner(),
    // Closes on THIS client only
    closeLocal:   () => closeRoutePlannerLocal(),
    // Push current Calendaria stardate into the iframe manually
    pushStardate: () => _pushStardateToIframe(),
  };

  if (game.user.isGM) _createMacrosIfMissing();
  console.log("Starfield Route Planner | Ready.");
});

// ════════════════════════════════════════════════════════════════════════
//  MACRO AUTO-CREATE
// ════════════════════════════════════════════════════════════════════════

async function _createMacrosIfMissing() {
  const macros = [
    {
      name:    "Starfield Route Planner — Open for All",
      img:     "icons/svg/compass.svg",
      command:
`// Opens the Starfield jump route planner on ALL connected clients.
// Players close their own screen via the ✕ CLOSE MAP button on the map,
// or reopen it with the "Starfield Route Planner — Reopen (My Screen)" macro.
if (!window.starfieldRoutePlanner) {
  ui.notifications.error("Starfield Route Planner module not loaded.");
  return;
}
starfieldRoutePlanner.openForAll();`,
    },
    {
      name:    "Starfield Route Planner — Reopen (My Screen)",
      img:     "icons/svg/compass.svg",
      command:
`// Reopens the route planner on YOUR screen only.
// Use this after closing via the ✕ button if you want it back
// without affecting other players' screens.
if (!window.starfieldRoutePlanner) {
  ui.notifications.error("Starfield Route Planner module not loaded.");
  return;
}
starfieldRoutePlanner.openLocal();`,
    },
  ];
  for (const data of macros) {
    if (!game.macros.find(m => m.name === data.name)) {
      await Macro.create({
        name: data.name, type: "script", img: data.img, command: data.command,
        flags: { "starfield-route-planner": { autoCreated: true } },
      });
      console.log(`Starfield Route Planner | Created macro: ${data.name}`);
    }
  }
}

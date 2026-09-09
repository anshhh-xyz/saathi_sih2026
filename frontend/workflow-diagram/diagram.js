/**
 * SAATHI — animated architecture diagram (v2)
 * -------------------------------------------------------------
 * Rebuilt for reliability after the first version reported as "not working /
 * not smooth". Two root causes were found and fixed:
 *
 * 1. The edge "draw" effect depended on a CSS transition running in lockstep
 *    with a JS requestAnimationFrame loop driving the token. Two independent
 *    timing systems trying to stay in sync is exactly the kind of thing that
 *    looks smooth on one machine and janky/out-of-sync on another. This
 *    version drives everything — the line drawing AND the token position —
 *    from a single rAF loop per edge, with one shared easing curve.
 *
 * 2. On resize, the old version wiped and rebuilt every SVG element from
 *    scratch, which orphaned any DOM node a still-running animation already
 *    held a reference to — so a resize mid-animation could silently break
 *    it. This version creates every path/token element exactly once and
 *    only ever updates their "d" / position attributes in place, so a
 *    resize can never invalidate an in-flight animation.
 *
 * It also now respects prefers-reduced-motion uniformly (steps still run,
 * just near-instantly) instead of only disabling one half of the old
 * two-system animation and leaving the other half running on its own.
 */
(function () {
  "use strict";

  var svg = document.getElementById("edgeSvg");
  var stage = document.getElementById("stage");
  var stageWrap = document.getElementById("stageWrap");
  var captionMarker = document.getElementById("captionMarker");
  var captionText = document.getElementById("captionText");
  var runCalmBtn = document.getElementById("runCalm");
  var runDangerBtn = document.getElementById("runDanger");
  var resetBtn = document.getElementById("resetBtn");

  var REDUCED_MOTION = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var EDGE_LEN_MS = REDUCED_MOTION ? 1 : 480;
  var HOLD_MS = REDUCED_MOTION ? 60 : 520;

  var NODE_IDS = [
    "n-caller", "n-channel", "n-intake", "n-safety", "n-text", "n-acoustic",
    "n-review", "n-fusion", "n-score", "n-operator", "n-outcome",
  ];
  var nodes = {};
  NODE_IDS.forEach(function (id) { nodes[id] = document.getElementById(id); });

  // fromXFrac/toXFrac place the anchor along the width of a node (0 = left
  // edge, 1 = right edge, 0.5 = center) so several edges can leave or land
  // on the same wide node without stacking on top of each other.
  var EDGE_DEFS = [
    { id: "caller-channel", from: "n-caller", to: "n-channel" },
    { id: "channel-intake", from: "n-channel", to: "n-intake" },
    { id: "intake-safety", from: "n-intake", to: "n-safety", fromXFrac: 0.12, toSide: "top" },
    { id: "intake-text", from: "n-intake", to: "n-text", toSide: "top" },
    { id: "intake-acoustic", from: "n-intake", to: "n-acoustic", fromXFrac: 0.88, toSide: "top" },
    { id: "text-safety", from: "n-text", to: "n-safety", fromSide: "left", toSide: "right" },
    { id: "safety-review", from: "n-safety", to: "n-review" },
    { id: "safety-fusion", from: "n-safety", to: "n-fusion", fromXFrac: 0.85, toXFrac: 0.05, toSide: "top" },
    { id: "text-fusion", from: "n-text", to: "n-fusion", toXFrac: 0.16, toSide: "top" },
    { id: "acoustic-fusion", from: "n-acoustic", to: "n-fusion", fromXFrac: 0.2, toXFrac: 0.86, toSide: "top" },
    { id: "fusion-score", from: "n-fusion", to: "n-score" },
    { id: "score-operator", from: "n-score", to: "n-operator", toXFrac: 0.875 },
    { id: "review-operator", from: "n-review", to: "n-operator", toXFrac: 0.15 },
    { id: "operator-outcome", from: "n-operator", to: "n-outcome" },
  ];

  var basePaths = {};
  var flowPaths = {};
  var tokens = {};

  function rectIn(el) {
    var r = el.getBoundingClientRect();
    var s = stage.getBoundingClientRect();
    var scale = stageScale || 1;
    return {
      left: (r.left - s.left) / scale,
      top: (r.top - s.top) / scale,
      width: r.width / scale,
      height: r.height / scale,
    };
  }

  function anchor(nodeId, side, xFrac) {
    var r = rectIn(nodes[nodeId]);
    var fx = typeof xFrac === "number" ? xFrac : 0.5;
    if (side === "top") return { x: r.left + r.width * fx, y: r.top };
    if (side === "bottom") return { x: r.left + r.width * fx, y: r.top + r.height };
    if (side === "left") return { x: r.left, y: r.top + r.height / 2 };
    if (side === "right") return { x: r.left + r.width, y: r.top + r.height / 2 };
    return { x: r.left + r.width * fx, y: r.top + r.height / 2 };
  }

  function curvePath(p1, p2) {
    var dx = p2.x - p1.x, dy = p2.y - p1.y;
    if (Math.abs(dy) >= Math.abs(dx)) {
      var midY = p1.y + dy / 2;
      return "M " + p1.x + "," + p1.y + " C " + p1.x + "," + midY + " " + p2.x + "," + midY + " " + p2.x + "," + p2.y;
    }
    var midX = p1.x + dx / 2;
    return "M " + p1.x + "," + p1.y + " C " + midX + "," + p1.y + " " + midX + "," + p2.y + " " + p2.x + "," + p2.y;
  }

  function svgEl(tag, attrs) {
    var e = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    return e;
  }

  // Built exactly once. Resize only ever updates the "d" attribute of these
  // same elements — see updateGeometry() — so a reference an animation is
  // holding never goes stale.
  function createEdges() {
    EDGE_DEFS.forEach(function (def) {
      var base = svgEl("path", { class: "edge", id: "base-" + def.id, d: "" });
      svg.appendChild(base);
      basePaths[def.id] = base;

      var flow = svgEl("path", { class: "edge-flow", id: "flow-" + def.id, d: "" });
      svg.appendChild(flow);
      flowPaths[def.id] = flow;

      var token = svgEl("g", { class: "token", id: "token-" + def.id });
      token.appendChild(svgEl("circle", { r: 6 }));
      svg.appendChild(token);
      tokens[def.id] = token;
    });
  }

  function updateGeometry() {
    EDGE_DEFS.forEach(function (def) {
      var fromSide = def.fromSide || "bottom";
      var toSide = def.toSide || "top";
      var p1 = anchor(def.from, fromSide, def.fromXFrac);
      var p2 = anchor(def.to, toSide, def.toXFrac);
      var d = curvePath(p1, p2);
      basePaths[def.id].setAttribute("d", d);
      flowPaths[def.id].setAttribute("d", d);
    });
  }

  var stageScale = 1;
  function fitStage() {
    stageScale = Math.min(1, stageWrap.clientWidth / 1180);
    stage.style.transform = "scale(" + stageScale + ")";
    stageWrap.style.height = 940 * stageScale + "px";
    updateGeometry();
  }

  window.addEventListener("resize", debounce(fitStage, 120));
  function debounce(fn, ms) {
    var t;
    return function () { clearTimeout(t); t = setTimeout(fn, ms); };
  }

  function delay(ms) { return new Promise(function (res) { setTimeout(res, ms); }); }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function resetVisual() {
    NODE_IDS.forEach(function (id) {
      nodes[id].classList.remove("active-calm", "active-danger", "dimmed");
    });
    Object.keys(flowPaths).forEach(function (id) {
      var flow = flowPaths[id];
      flow.classList.remove("on", "calm", "danger");
      flow.style.strokeDasharray = "";
      flow.style.strokeDashoffset = "";
      tokens[id].classList.remove("on", "calm", "danger");
    });
    document.getElementById("badge-safety").classList.remove("lit-danger");
    document.getElementById("badge-score").classList.remove("lit-calm");
    captionMarker.className = "caption-marker";
    captionText.textContent = "Choose a scenario above to see how a case moves through SAATHI.";
  }

  function setCaption(text, kind) {
    captionText.textContent = text;
    captionMarker.className = "caption-marker" + (kind ? " " + kind : "");
  }

  function activateNode(id, kind) {
    nodes[id].classList.remove("dimmed");
    nodes[id].classList.add(kind === "danger" ? "active-danger" : "active-calm");
  }

  function dimNodes(ids) {
    ids.forEach(function (id) { nodes[id].classList.add("dimmed"); });
  }

  // Single rAF loop drives both the growing line and the moving dot together,
  // so they can never fall out of sync with each other.
  function animateEdge(edgeId, kind, durationMs, runToken) {
    return new Promise(function (resolve) {
      var base = basePaths[edgeId];
      var flow = flowPaths[edgeId];
      var token = tokens[edgeId];
      var len = base.getTotalLength();

      flow.classList.add("on", kind);
      token.classList.add("on", kind);
      flow.style.strokeDasharray = len;
      flow.style.strokeDashoffset = len;

      var start = null;
      function step(ts) {
        if (!isCurrent(runToken)) { resolve(); return; }
        if (!start) start = ts;
        var raw = Math.min(1, (ts - start) / durationMs);
        var t = easeInOutCubic(raw);
        flow.style.strokeDashoffset = String(len * (1 - t));
        var pt = base.getPointAtLength(t * len);
        token.setAttribute("transform", "translate(" + pt.x + "," + pt.y + ")");
        if (raw < 1) {
          requestAnimationFrame(step);
        } else {
          resolve();
        }
      }
      requestAnimationFrame(step);
    });
  }

  var activeRunToken = 0;
  function startRun() {
    activeRunToken += 1;
    return activeRunToken;
  }
  function isCurrent(token) {
    return token === activeRunToken;
  }

  async function runCalm() {
    var run = startRun();
    setButtonsDisabled(true);
    resetVisual();
    await delay(120);
    if (!isCurrent(run)) return;

    activateNode("n-caller", "calm");
    setCaption("A caller reaches out through one of NHAA's existing channels.", "calm");
    await delay(HOLD_MS);
    if (!isCurrent(run)) return;

    await animateEdge("caller-channel", "calm", EDGE_LEN_MS, run);
    if (!isCurrent(run)) return;
    activateNode("n-channel", "calm");
    setCaption("The interaction reaches SAATHI via 14566, the portal, chat, or IVRS.", "calm");
    await delay(HOLD_MS);
    if (!isCurrent(run)) return;

    await animateEdge("channel-intake", "calm", EDGE_LEN_MS, run);
    if (!isCurrent(run)) return;
    activateNode("n-intake", "calm");
    setCaption("Audio is captured, and a few direct safety questions are asked alongside it.", "calm");
    await delay(HOLD_MS);
    if (!isCurrent(run)) return;

    await Promise.all([
      animateEdge("intake-safety", "calm", EDGE_LEN_MS, run),
      animateEdge("intake-text", "calm", EDGE_LEN_MS, run),
      animateEdge("intake-acoustic", "calm", EDGE_LEN_MS, run),
    ]);
    if (!isCurrent(run)) return;
    activateNode("n-safety", "calm");
    activateNode("n-text", "calm");
    activateNode("n-acoustic", "calm");
    setCaption("Three things start at once: Text Analysis, Acoustic Analysis on the raw audio, and the Safety Engine watching everything.", "calm");
    await delay(HOLD_MS);
    if (!isCurrent(run)) return;

    await animateEdge("text-safety", "calm", EDGE_LEN_MS, run);
    if (!isCurrent(run)) return;
    setCaption("The Safety Engine also reads the transcript Text Analysis produces — nothing critical shows up this time.", "calm");
    await delay(HOLD_MS);
    if (!isCurrent(run)) return;

    await Promise.all([
      animateEdge("text-fusion", "calm", EDGE_LEN_MS, run),
      animateEdge("acoustic-fusion", "calm", EDGE_LEN_MS, run),
      animateEdge("safety-fusion", "calm", EDGE_LEN_MS, run),
    ]);
    if (!isCurrent(run)) return;
    activateNode("n-fusion", "calm");
    setCaption("Text Score, Acoustic Score, and safety context all feed into confidence-aware fusion.", "calm");
    await delay(HOLD_MS);
    if (!isCurrent(run)) return;

    await animateEdge("fusion-score", "calm", EDGE_LEN_MS, run);
    if (!isCurrent(run)) return;
    activateNode("n-score", "calm");
    setCaption("Out comes a Priority Score with its own confidence level — shown as two numbers, never one.", "calm");
    await delay(HOLD_MS);
    if (!isCurrent(run)) return;

    await animateEdge("score-operator", "calm", EDGE_LEN_MS, run);
    if (!isCurrent(run)) return;
    activateNode("n-operator", "calm");
    document.getElementById("badge-score").classList.add("lit-calm");
    setCaption("Both paths always land here — a human operator reviews the evidence.", "calm");
    await delay(HOLD_MS);
    if (!isCurrent(run)) return;

    await animateEdge("operator-outcome", "calm", EDGE_LEN_MS, run);
    if (!isCurrent(run)) return;
    activateNode("n-outcome", "calm");
    setCaption("The operator decides what happens next — support, referral, or the normal process continues.", "calm");

    if (isCurrent(run)) setButtonsDisabled(false);
  }

  async function runDanger() {
    var run = startRun();
    setButtonsDisabled(true);
    resetVisual();
    await delay(120);
    if (!isCurrent(run)) return;

    activateNode("n-caller", "danger");
    setCaption("A caller reaches out — this time in real danger.", "danger");
    await delay(HOLD_MS);
    if (!isCurrent(run)) return;

    await animateEdge("caller-channel", "danger", EDGE_LEN_MS, run);
    if (!isCurrent(run)) return;
    activateNode("n-channel", "danger");
    setCaption("Same channels as always — 14566, portal, chat, or IVRS.", "danger");
    await delay(HOLD_MS);
    if (!isCurrent(run)) return;

    await animateEdge("channel-intake", "danger", EDGE_LEN_MS, run);
    if (!isCurrent(run)) return;
    activateNode("n-intake", "danger");
    setCaption("Audio captured, safety questions asked — this time the answers matter, or the caller uses the silent SOS signal instead.", "danger");
    await delay(HOLD_MS);
    if (!isCurrent(run)) return;

    await Promise.all([
      animateEdge("intake-safety", "danger", EDGE_LEN_MS, run),
      animateEdge("intake-text", "danger", EDGE_LEN_MS, run),
    ]);
    if (!isCurrent(run)) return;
    activateNode("n-safety", "danger");
    activateNode("n-text", "danger");
    dimNodes(["n-acoustic"]);
    setCaption("Speech-to-text still runs so the Safety Engine has a transcript to check — Acoustic Analysis isn't needed for this.", "danger");
    await delay(HOLD_MS);
    if (!isCurrent(run)) return;

    await animateEdge("text-safety", "danger", EDGE_LEN_MS, run);
    if (!isCurrent(run)) return;
    setCaption("That transcript, plus the safety answers, goes straight into the Safety Engine.", "danger");
    await delay(HOLD_MS);
    if (!isCurrent(run)) return;

    await animateEdge("safety-review", "danger", EDGE_LEN_MS, run);
    if (!isCurrent(run)) return;
    activateNode("n-review", "danger");
    dimNodes(["n-fusion", "n-score"]);
    setCaption("Critical Flag. Scoring is skipped entirely — Text and Acoustic scores are never even combined.", "danger");
    await delay(HOLD_MS);
    if (!isCurrent(run)) return;

    await animateEdge("review-operator", "danger", EDGE_LEN_MS, run);
    if (!isCurrent(run)) return;
    activateNode("n-operator", "danger");
    document.getElementById("badge-safety").classList.add("lit-danger");
    setCaption("Straight to the same operator screen as every case — just immediately.", "danger");
    await delay(HOLD_MS);
    if (!isCurrent(run)) return;

    await animateEdge("operator-outcome", "danger", EDGE_LEN_MS, run);
    if (!isCurrent(run)) return;
    activateNode("n-outcome", "danger");
    setCaption("Immediate human action follows. The system never decides this on its own.", "danger");

    if (isCurrent(run)) setButtonsDisabled(false);
  }

  function setButtonsDisabled(disabled) {
    runCalmBtn.disabled = disabled;
    runDangerBtn.disabled = disabled;
  }

  runCalmBtn.addEventListener("click", runCalm);
  runDangerBtn.addEventListener("click", runDanger);
  resetBtn.addEventListener("click", function () {
    startRun();
    resetVisual();
    setButtonsDisabled(false);
  });

  createEdges();
  window.addEventListener("load", function () {
    fitStage();
    resetVisual();
  });
})();

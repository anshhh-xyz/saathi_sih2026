/**
 * SAATHI — Call View
 * -------------------------------------------------------------
 * The same two scenarios as the System View (diagram.js), told from the
 * other side: what the person on the call hears and says, and what the
 * operator's screen does in response — with a small "what SAATHI is doing"
 * panel alongside it so the two views stay honest with each other.
 *
 * Independent of diagram.js by design: separate element IDs, separate run
 * token, so switching tabs mid-animation never leaves either view stuck.
 */
(function () {
  "use strict";

  var runCalmBtn = document.getElementById("callRunCalm");
  var runModerateBtn = document.getElementById("callRunModerate");
  var runDangerBtn = document.getElementById("callRunDanger");
  var resetBtn = document.getElementById("callResetBtn");

  var phoneStatus = document.getElementById("phoneStatus");
  var phoneWave = document.getElementById("phoneWave");
  var phoneTimer = document.getElementById("phoneTimer");
  var transcriptFeed = document.getElementById("transcriptFeed");
  var transcriptEmpty = document.getElementById("transcriptEmpty");

  var chipText = document.getElementById("chipText");
  var chipAcoustic = document.getElementById("chipAcoustic");
  var chipSafety = document.getElementById("chipSafety");
  var readoutBox = document.getElementById("readoutBox");

  var operatorStrip = document.getElementById("operatorStrip");

  var captionMarker = document.getElementById("callCaptionMarker");
  var captionText = document.getElementById("callCaptionText");

  var REDUCED_MOTION = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var HOLD = REDUCED_MOTION ? 60 : 1250;
  var HOLD_SHORT = REDUCED_MOTION ? 40 : 700;

  function delay(ms) { return new Promise(function (res) { setTimeout(res, ms); }); }

  var activeRunToken = 0;
  function startRun() { activeRunToken += 1; return activeRunToken; }
  function isCurrent(token) { return token === activeRunToken; }

  var timerInterval = null;
  var elapsedSeconds = 0;
  function startTimer() {
    stopTimer();
    elapsedSeconds = 0;
    phoneTimer.textContent = "00:00";
    timerInterval = setInterval(function () {
      elapsedSeconds += 1;
      var m = String(Math.floor(elapsedSeconds / 60)).padStart(2, "0");
      var s = String(elapsedSeconds % 60).padStart(2, "0");
      phoneTimer.textContent = m + ":" + s;
    }, 1000);
  }
  function stopTimer() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  }

  function setPhoneStatus(text, kind) {
    phoneStatus.className = "phone-status" + (kind ? " " + kind : "");
    phoneStatus.innerHTML = '<span class="phone-status-dot" id="phoneStatusDot"></span>' + text;
  }

  function setWave(live, kind) {
    phoneWave.className = "phone-wave" + (live ? " live" : "") + (kind ? " " + kind : "");
  }

  function clearTranscript() {
    transcriptFeed.innerHTML = "";
  }

  function scrollFeed() {
    transcriptFeed.scrollTop = transcriptFeed.scrollHeight;
  }

  function addBubble(kind, tag, text) {
    var div = document.createElement("div");
    div.className = "t-bubble " + kind;
    var html = "";
    if (tag) html += '<span class="t-tag">' + tag + "</span>";
    html += text;
    div.innerHTML = html;
    transcriptFeed.appendChild(div);
    scrollFeed();
    return div;
  }

  function addSystemNote(text) {
    var div = document.createElement("div");
    div.className = "t-bubble system-note";
    div.textContent = text;
    transcriptFeed.appendChild(div);
    scrollFeed();
  }

  function addTyping(kind) {
    var div = document.createElement("div");
    div.className = "typing-indicator" + (kind === "danger" ? " tense" : kind === "moderate" ? " moderate" : "");
    div.innerHTML = "<span></span><span></span><span></span>";
    transcriptFeed.appendChild(div);
    scrollFeed();
    return div;
  }

  async function callerLine(text, opts, run) {
    opts = opts || {};
    var kind = opts.tense ? "danger" : opts.moderate ? "moderate" : "calm";
    if (!REDUCED_MOTION) {
      var typing = addTyping(kind);
      await delay(650);
      if (!isCurrent(run)) return;
      typing.remove();
    }
    var bubbleClass = "caller" + (opts.tense ? " tense" : opts.moderate ? " moderate-tone" : "");
    addBubble(bubbleClass, opts.tag, text);
  }

  function setChip(chip, state, stateText) {
    chip.className = "status-chip" + (state ? " " + state : "");
    chip.querySelector(".chip-state").textContent = stateText;
  }

  function setGaugeReadout(priorityLabel, priorityPercent, priorityKind, confidenceLabel, confidencePercent) {
    readoutBox.innerHTML =
      '<div class="score-gauge-label">Priority Score <strong>' + priorityLabel + "</strong></div>" +
      '<div class="score-gauge-track"><div class="score-gauge-fill" id="gaugeFillPriority"></div></div>' +
      '<div class="score-gauge-label confidence-row">Confidence <strong>' + confidenceLabel + '</strong><span class="confidence-pct" id="confPct"></span></div>' +
      '<div class="score-gauge-track confidence-track"><div class="score-gauge-fill confidence-fill" id="gaugeFillConfidence"></div></div>';
    requestAnimationFrame(function () {
      var pFill = document.getElementById("gaugeFillPriority");
      if (priorityKind === "moderate") pFill.classList.add("moderate");
      if (priorityKind === "danger") pFill.classList.add("danger");
      pFill.style.width = priorityPercent + "%";
      document.getElementById("gaugeFillConfidence").style.width = confidencePercent + "%";
      document.getElementById("confPct").textContent = " · " + confidencePercent + "%";
    });
  }

  function setCriticalReadout() {
    readoutBox.innerHTML =
      '<div class="critical-box">' +
      '<div class="critical-title">Critical Flag — scoring skipped</div>' +
      '<div class="critical-sub">Text and Acoustic scores are never combined for this case, so no Priority Score or confidence figure gets produced — the flag alone is the operator\'s evidence, and it goes to a human directly.</div>' +
      "</div>";
  }

  function resetReadout() {
    readoutBox.innerHTML = '<p class="readout-empty">Scores appear here once the call starts.</p>';
  }

  function setOperatorQueueCard(kind, idText, title, sub, badgeText) {
    operatorStrip.innerHTML =
      '<div class="queue-card">' +
      '<div class="qc-left"><span class="qc-id">' + idText + "</span>" +
      '<span class="qc-title">' + title + "</span>" +
      '<span class="qc-sub">' + sub + "</span></div>" +
      '<span class="qc-badge ' + kind + '">' + badgeText + "</span>" +
      "</div>";
  }

  function resetOperatorStrip() {
    operatorStrip.innerHTML = '<p class="operator-strip-empty">Operator dashboard — waiting for a case to arrive.</p>';
  }

  function setCaption(text, kind) {
    captionText.textContent = text;
    captionMarker.className = "caption-marker" + (kind ? " " + kind : "");
  }

  function setButtonsDisabled(disabled) {
    runCalmBtn.disabled = disabled;
    runModerateBtn.disabled = disabled;
    runDangerBtn.disabled = disabled;
  }

  function resetCallView() {
    stopTimer();
    phoneTimer.textContent = "00:00";
    setPhoneStatus("Not connected");
    setWave(false);
    clearTranscript();
    transcriptFeed.appendChild(transcriptEmpty);
    setChip(chipText, "", "idle");
    setChip(chipAcoustic, "", "idle");
    setChip(chipSafety, "", "idle");
    resetReadout();
    resetOperatorStrip();
    setCaption("Choose a scenario above to hear how a call actually unfolds for the person on the line.");
  }

  async function runCalm() {
    var run = startRun();
    setButtonsDisabled(true);
    resetCallView();
    await delay(200);
    if (!isCurrent(run)) return;

    if (transcriptEmpty.parentNode) transcriptEmpty.remove();
    setPhoneStatus("Ringing…");
    setCaption("A caller dials 14566 — one of NHAA's existing channels, unchanged by SAATHI.");
    await delay(HOLD_SHORT);
    if (!isCurrent(run)) return;

    setPhoneStatus("Call connected", "connected");
    setWave(true, "calm");
    startTimer();
    setCaption("Audio starts recording the moment the call connects.");
    await delay(HOLD_SHORT);
    if (!isCurrent(run)) return;

    addBubble("operator", "Operator", "NHAA helpline, how can we help you today?");
    await delay(HOLD);
    if (!isCurrent(run)) return;

    setChip(chipText, "running", "listening");
    setChip(chipAcoustic, "running", "listening");
    await callerLine("Hi — I wanted to report a missed pickup near my house. It's been three days now.", {}, run);
    setCaption("Text Analysis and Acoustic Analysis both start on this the moment it's said — same interaction, two independent readings.", "calm");
    await delay(HOLD);
    if (!isCurrent(run)) return;

    setChip(chipSafety, "running", "checking");
    addBubble("operator", "Safety question", "Before we go further — are you safe right now, and is anyone with you making it hard to talk?");
    setCaption("The same short safety questions are asked on every call, calm or not.");
    await delay(HOLD);
    if (!isCurrent(run)) return;

    await callerLine("Yes, I'm safe — just annoyed about the pickup, that's all.", {}, run);
    setCaption("Nothing in the words or the voice crosses the safety threshold.", "calm");
    await delay(HOLD);
    if (!isCurrent(run)) return;

    setChip(chipText, "done-calm", "Text Distress: Low");
    setChip(chipAcoustic, "done-calm", "Acoustic: Low");
    setChip(chipSafety, "done-calm", "clear");
    setCaption("All three finish reading the same interaction, independently.", "calm");
    await delay(HOLD);
    if (!isCurrent(run)) return;

    setGaugeReadout("Low", 18, "calm", "High", 92);
    setCaption("Confidence-aware fusion combines the two scores into one Priority Score, with its own confidence.", "calm");
    await delay(HOLD);
    if (!isCurrent(run)) return;

    setOperatorQueueCard("calm", "Case #10482", "Routine complaint", "Missed pickup · queued for review", "Priority: Low");
    setCaption("The operator sees it land in the normal queue — nothing here was assumed, and nothing was missed either.", "calm");
    await delay(HOLD);
    if (!isCurrent(run)) return;

    addSystemNote("Call continues into the existing NHAA grievance process.");
    setPhoneStatus("Call ended", "ended");
    setWave(false);
    stopTimer();
    setCaption("The call proceeds exactly like it always has — SAATHI only added a second, quieter set of eyes on it.", "calm");

    if (isCurrent(run)) setButtonsDisabled(false);
  }

  async function runModerate() {
    var run = startRun();
    setButtonsDisabled(true);
    resetCallView();
    await delay(200);
    if (!isCurrent(run)) return;

    if (transcriptEmpty.parentNode) transcriptEmpty.remove();
    setPhoneStatus("Ringing…");
    setCaption("A third caller dials in — not calm, but not in immediate danger either.");
    await delay(HOLD_SHORT);
    if (!isCurrent(run)) return;

    setPhoneStatus("Call connected", "connected");
    setWave(true, "moderate");
    startTimer();
    setCaption("Same channel, same greeting — nothing about the setup changes.");
    await delay(HOLD_SHORT);
    if (!isCurrent(run)) return;

    addBubble("operator", "Operator", "NHAA helpline, how can we help you today?");
    await delay(HOLD);
    if (!isCurrent(run)) return;

    setChip(chipText, "running", "listening");
    setChip(chipAcoustic, "running", "listening");
    await callerLine("Hi... I've been getting calls about a loan I never took, and now they're saying they'll come to my house. I don't really know what to do.", { moderate: true }, run);
    setCaption("No direct danger statement here — but the pace and the wording both carry more weight than a routine complaint.", "moderate");
    await delay(HOLD);
    if (!isCurrent(run)) return;

    setChip(chipSafety, "running", "checking");
    addBubble("operator", "Safety question", "I hear you. Just to check — are you safe right now, is anyone forcing you to stay on this call?");
    await delay(HOLD);
    if (!isCurrent(run)) return;

    await callerLine("I'm okay for now… but I'm honestly pretty shaken up.", { moderate: true }, run);
    setCaption("No coercion, no explicit threat — the Safety Engine doesn't fire. But it doesn't stay silent either; it feeds context into the score.", "moderate");
    await delay(HOLD);
    if (!isCurrent(run)) return;

    setChip(chipText, "done-moderate", "Text Distress: Moderate");
    setChip(chipAcoustic, "done-moderate", "Acoustic: Moderate");
    setChip(chipSafety, "done-neutral", "no flag — feeds context");
    setCaption("All three finish reading the same interaction — this time landing somewhere in the middle.", "moderate");
    await delay(HOLD);
    if (!isCurrent(run)) return;

    setGaugeReadout("Moderate", 52, "moderate", "Moderate", 66);
    setCaption("Fusion weighs in the caller's own hesitation too, not just the two scores — confidence dips a little because the signals don't all point the same way.", "moderate");
    await delay(HOLD);
    if (!isCurrent(run)) return;

    setOperatorQueueCard("moderate", "Case #10484", "Harassment / loan-recovery threat", "Caller shaken but not in immediate danger · flagged for timely follow-up", "Priority: Moderate");
    setCaption("Not urgent enough to interrupt anything, not routine enough to sit at the back of the queue either.", "moderate");
    await delay(HOLD);
    if (!isCurrent(run)) return;

    addSystemNote("Call continues into the existing NHAA grievance process, with a support referral offered.");
    setPhoneStatus("Call ended", "ended");
    setWave(false);
    stopTimer();
    setCaption("The operator decides what happens next — same as every case, just with better evidence in front of them.", "moderate");

    if (isCurrent(run)) setButtonsDisabled(false);
  }

  async function runDanger() {
    var run = startRun();
    setButtonsDisabled(true);
    resetCallView();
    await delay(200);
    if (!isCurrent(run)) return;

    if (transcriptEmpty.parentNode) transcriptEmpty.remove();
    setPhoneStatus("Ringing…");
    setCaption("Another caller dials the same number.");
    await delay(HOLD_SHORT);
    if (!isCurrent(run)) return;

    setPhoneStatus("Call connected", "connected");
    setWave(true, "danger");
    startTimer();
    setCaption("Same channel, same greeting — nothing about the call itself looks different yet.");
    await delay(HOLD_SHORT);
    if (!isCurrent(run)) return;

    addBubble("operator", "Operator", "NHAA helpline, how can we help you today?");
    await delay(HOLD);
    if (!isCurrent(run)) return;

    setChip(chipText, "running", "listening");
    setChip(chipAcoustic, "running", "listening");
    await callerLine("I… I need help. I can't really talk right now.", { tense: true }, run);
    setCaption("Something is already different in how this is said, not just what's said — that's exactly what Acoustic Analysis is watching for.", "danger");
    await delay(HOLD);
    if (!isCurrent(run)) return;

    setChip(chipSafety, "running", "checking");
    addBubble("operator", "Safety question", "I understand. Just answer yes or no — are you safe to talk right now?");
    await delay(HOLD);
    if (!isCurrent(run)) return;

    await callerLine("No.", { tense: true }, run);
    addSystemNote("(Or: no words at all — the caller uses the silent SOS signal instead.)");
    setCaption("The Safety Engine reads this directly — it doesn't need a score to know this is critical.", "danger");
    await delay(HOLD);
    if (!isCurrent(run)) return;

    setChip(chipText, "done-neutral", "done — feeds the transcript");
    setChip(chipAcoustic, "skipped", "not needed here");
    setChip(chipSafety, "done-danger", "Critical Flag");
    setCaption("Text Analysis still finishes, because the Safety Engine needs that transcript — Acoustic Analysis simply isn't needed for this path.", "danger");
    await delay(HOLD);
    if (!isCurrent(run)) return;

    setCriticalReadout();
    setCaption("Scoring is skipped entirely, not just delayed — Text and Acoustic scores are never combined for this case.", "danger");
    await delay(HOLD);
    if (!isCurrent(run)) return;

    setOperatorQueueCard("danger", "Case #10483", "Immediate human review", "Safety Flag path · live", "Safety Flag");
    setCaption("The operator's screen doesn't wait in a queue for this one — it's already there.", "danger");
    await delay(HOLD);
    if (!isCurrent(run)) return;

    addSystemNote("The call stays connected. A human takes over from here.");
    setPhoneStatus("Call in progress — handed to reviewer", "connected");
    setCaption("The system never decides this on its own. It just makes sure a person sees it immediately.", "danger");

    if (isCurrent(run)) setButtonsDisabled(false);
  }

  runCalmBtn.addEventListener("click", runCalm);
  runModerateBtn.addEventListener("click", runModerate);
  runDangerBtn.addEventListener("click", runDanger);
  resetBtn.addEventListener("click", function () {
    startRun();
    stopTimer();
    setButtonsDisabled(false);
    resetCallView();
  });

  resetCallView();
})();

/**
 * SAATHI Operator Dashboard
 * -------------------------------------------------------------
 * This is a working front-end against mock data (mock-data.js). In a real
 * deployment, replace loadQueue()/loadCase() with calls to:
 *   GET /dashboard/queue
 *   GET /cases/{id}/interactions/{iid}/assessment
 * and wire recordDecision() to POST /cases/{id}/operator-action and
 * POST /cases/{id}/referral, as described in the techstack document's API
 * section. Everything here that mutates state (override, referral, audit
 * log) is currently in-memory only and resets on reload.
 */
(function () {
  "use strict";

  var LEVEL_COLOR = { Low: "#0F6E63", Moderate: "#B4790C", High: "#B94D0E", Urgent: "#B3261E" };
  var LEVEL_ORDER = { Urgent: 0, High: 1, Moderate: 2, Low: 3 };

  var stored = [];
  try {
    stored = JSON.parse(localStorage.getItem("SAATHI_GRIEVANCE_CASES") || "[]");
  } catch (e) {}
  var combined = stored.concat(window.SAATHI_MOCK_CASES || []);

  var cases = combined.slice().sort(function (a, b) {
    if (a.safetyFlag.active !== b.safetyFlag.active) return a.safetyFlag.active ? -1 : 1;
    var orderA = LEVEL_ORDER[a.priorityLevel] !== undefined ? LEVEL_ORDER[a.priorityLevel] : 2;
    var orderB = LEVEL_ORDER[b.priorityLevel] !== undefined ? LEVEL_ORDER[b.priorityLevel] : 2;
    return orderA - orderB;
  });
  var activeId = cases.length ? cases[0].id : null;
  var auditEntries = [];

  function $(id) { return document.getElementById(id); }
  function fmtTime(d) {
    return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  }

  function renderQueue() {
    $("queueSummary").textContent =
      cases.length + " active cases · " + cases.filter(function (c) { return c.safetyFlag.active; }).length + " with an active safety flag";

    var list = $("queueList");
    list.innerHTML = "";
    cases.forEach(function (c) {
      var item = document.createElement("button");
      item.type = "button";
      item.className = "queue-item" + (c.id === activeId ? " active" : "");
      item.setAttribute("role", "listitem");
      item.innerHTML =
        '<div class="queue-item-top">' +
        '<span class="queue-item-id">' + c.id + "</span>" +
        '<span class="queue-dot level-' + c.priorityLevel + '"></span>' +
        "</div>" +
        '<div class="queue-item-meta">' + c.channel + " · " + c.language + "</div>" +
        '<div class="queue-item-meta">' + fmtTime(c.receivedAt) + " · " + c.priorityLevel + " (" + c.priorityScore + ")</div>" +
        (c.safetyFlag.active ? '<div class="queue-item-flag">&#9888; Safety flag active</div>' : "");
      item.addEventListener("click", function () {
        activeId = c.id;
        renderQueue();
        renderCase();
      });
      list.appendChild(item);
    });
  }

  function evidenceCard(name, sig) {
    if (!sig || sig.available === false) {
      return (
        '<div class="evidence-card"><div class="evidence-card-head">' +
        '<span class="evidence-name">' + name + '</span>' +
        '<span class="evidence-conf conf-unavailable">Unavailable</span></div>' +
        '<div class="evidence-note evidence-unavailable">' + (sig && sig.note ? sig.note : "Not available for this interaction.") + "</div></div>"
      );
    }
    return (
      '<div class="evidence-card"><div class="evidence-card-head">' +
      '<span class="evidence-name">' + name + '</span>' +
      '<span class="evidence-conf conf-' + sig.confidence + '">' + sig.confidence + ' confidence</span></div>' +
      '<div class="evidence-note">' + sig.note + "</div></div>"
    );
  }

  function renderCase() {
    var c = cases.find(function (x) { return x.id === activeId; });
    if (!c) return;

    $("caseId").textContent = c.id;
    $("caseMeta").textContent = c.docket + " · " + c.channel + " · " + c.language + " · received " + fmtTime(c.receivedAt);
    $("overallConfidence").textContent = "Overall confidence: " + c.confidence;

    var banner = $("safetyBanner");
    if (c.safetyFlag.active) {
      banner.hidden = false;
      $("safetyBannerDetail").textContent = c.safetyFlag.type + " — " + c.safetyFlag.detail;
    } else {
      banner.hidden = true;
    }

    var pct = Math.max(0, Math.min(100, c.priorityScore));
    var circumference = Math.PI * 60; // half-circle radius 60
    var dash = (pct / 100) * circumference;
    var fill = $("gaugeFill");
    fill.style.strokeDasharray = dash.toFixed(1) + " " + circumference.toFixed(1);
    fill.style.stroke = LEVEL_COLOR[c.priorityLevel] || "#0F6E63";
    $("scoreNumber").textContent = c.priorityScore;

    var levelBadge = $("levelBadge");
    levelBadge.textContent = c.priorityLevel + " Priority";
    levelBadge.style.background = LEVEL_COLOR[c.priorityLevel] || "#0F6E63";
    $("suggestedAction").textContent = c.suggestedAction;

    var saathiSummaryHtml = "";
    if (c.saathiAssessment) {
      saathiSummaryHtml =
        '<div class="evidence-card" style="grid-column: 1 / -1; background: #F8FAFC; border: 1.5px solid #CBD5E1; padding: 14px 18px; border-radius: 8px; margin-bottom: 12px;">' +
        '<div style="font-weight: 700; color: #0B2B5C; font-size: 13px; margin-bottom: 8px; letter-spacing: 0.3px;">SAATHI HUMAN-IMPACT ASSESSMENT (DECISION-SUPPORT SUMMARY)</div>' +
        '<div style="display: flex; gap: 20px; flex-wrap: wrap; font-size: 13px; color: #334155; margin-bottom: 8px;">' +
        '<div><strong>Distress indicators:</strong> ' + (c.saathiAssessment.distressLevel || "Moderate") + '</div>' +
        '<div><strong>Trauma-related indicators:</strong> ' + (c.saathiAssessment.traumaIndicators || "Moderate") + '</div>' +
        '<div><strong>Functional impact:</strong> ' + (c.saathiAssessment.functionalImpact || "Moderate") + '</div>' +
        '<div><strong>Immediate safety concern:</strong> ' + (c.saathiAssessment.safetyFlag ? '<span style="color:#B3261E;font-weight:700;">CRITICAL FLAGGED</span>' : 'None') + '</div>' +
        '</div>' +
        '<div style="font-size: 12.5px; color: #475569;"><strong>Recommended action:</strong> ' + (c.suggestedAction || "Prioritize case review / consider additional intervention.") + '</div>' +
        '<div style="font-size: 11px; color: #64748B; font-style: italic; margin-top: 4px;">* Operational decision-support terminology — not a medical diagnosis.</div>' +
        '</div>';
    }

    $("evidenceGrid").innerHTML =
      saathiSummaryHtml +
      evidenceCard("Text", c.signals.text) +
      evidenceCard("Acoustic", c.signals.acoustic) +
      evidenceCard("Check-in", c.signals.checkin);

    $("timeline").innerHTML = c.timeline
      .map(function (t) {
        return (
          '<li><span class="timeline-dot"></span>' +
          '<span class="timeline-t">' + t.t + '</span>' +
          '<span class="timeline-label">' + t.label + "</span></li>"
        );
      })
      .join("");

    var copilotList = $("copilotList");
    if (c.copilotSuggestions && c.copilotSuggestions.length) {
      copilotList.innerHTML = c.copilotSuggestions
        .map(function (s, i) {
          return (
            '<div class="copilot-chip"><span>' + s + '</span>' +
            '<button type="button" data-suggestion="' + i + '">Use</button></div>'
          );
        })
        .join("");
      Array.prototype.forEach.call(copilotList.querySelectorAll("button"), function (btn) {
        btn.addEventListener("click", function () {
          var text = c.copilotSuggestions[Number(btn.getAttribute("data-suggestion"))];
          copyToClipboard(text);
          logAudit("Co-Pilot suggestion copied for " + c.id + ": \u201c" + text.slice(0, 40) + (text.length > 40 ? "\u2026" : "") + "\u201d");
          showToast("Copied to clipboard");
        });
      });
    } else {
      copilotList.innerHTML = '<div class="copilot-empty">No template matched this context.</div>';
    }

    $("referralSelect").value = "continue";
    $("overrideSelect").value = "";
    $("reasonInput").value = "";
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(function () {});
    }
  }

  function showToast(msg) {
    var t = $("toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(function () { t.hidden = true; }, 2200);
  }

  function logAudit(msg) {
    auditEntries.unshift({ time: new Date(), msg: msg });
    var log = $("auditLog");
    log.innerHTML = auditEntries
      .map(function (e) {
        return '<li><span class="audit-time">' + fmtTime(e.time) + "</span>" + e.msg + "</li>";
      })
      .join("");
  }

  $("saveDecisionBtn").addEventListener("click", function () {
    var c = cases.find(function (x) { return x.id === activeId; });
    var referral = $("referralSelect").value;
    var override = $("overrideSelect").value;
    var reason = $("reasonInput").value.trim();

    if (override && !reason) {
      showToast("Add a reason before overriding the priority level");
      $("reasonInput").focus();
      return;
    }

    var msg = "Referral recorded for " + c.id + ": " + $("referralSelect").options[$("referralSelect").selectedIndex].text + ".";
    if (override) {
      msg += " Priority overridden to " + override + " (reason: " + reason + ").";
      c.priorityLevel = override;
      renderQueue();
      renderCase();
    }
    logAudit(msg);
    showToast("Decision recorded");

    // Real implementation:
    // fetch(`${API_BASE}/cases/${c.id}/operator-action`, { method: "POST", body: JSON.stringify({...}) })
  });

  renderQueue();
  renderCase();
})();

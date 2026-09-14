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

  var currentCopilotCase = null;

  function renderComplainantDossier(c) {
    var dossierGrid = $("dossierGrid");
    if (!dossierGrid) return;

    var name = (c.complainant && c.complainant.name) || c.callerName || "Complainant";
    var mobile = (c.complainant && c.complainant.mobile) || c.callerMobile || "Not Disclosed";
    var role = (c.complainant && c.complainant.role) || c.complainantRole || "Victim";
    var category = (c.complainant && c.complainant.category) || (c.category ? c.category.toUpperCase() : "Scheduled Caste (SC)");

    var loc = (c.incident && c.incident.location) || c.incidentLocation || "Main Village Site";
    var ps = (c.incident && c.incident.policeStation) || "Jurisdictional Police Station";
    var district = (c.incident && c.incident.district) || c.district || "North West Delhi";
    var state = (c.incident && c.incident.state) || "Delhi";
    var date = (c.incident && c.incident.date) || (c.receivedAt ? c.receivedAt.split("T")[0] : "2026-09-14");
    var catLabel = (c.incident && c.incident.categoryLabel) || c.categoryLabel || (c.category ? c.category.replace(/_/g, " ").toUpperCase() : "Grievance");
    var narrative = (c.incident && c.incident.description) || c.incidentDescription || (c.transcriptExcerpt || "Incident statement recorded in docket.");

    var badge = $("dossierRoleBadge");
    if (badge) badge.textContent = role;

    var emotions = [];
    if (c.assessment && c.assessment.detectedEmotions) {
      emotions = c.assessment.detectedEmotions;
    } else if (c.signals && c.signals.text && c.signals.text.emotions) {
      emotions = c.signals.text.emotions;
    } else {
      emotions = ["fear (84%)", "intimidation (78%)"];
    }

    var emotionsHtml = emotions.map(function(emo) {
      var isHigh = emo.toLowerCase().includes("acute") || emo.toLowerCase().includes("fear") || emo.toLowerCase().includes("trauma") || emo.toLowerCase().includes("danger");
      return '<span class="emotion-chip' + (isHigh ? ' danger' : '') + '">' + emo + '</span>';
    }).join("");

    var sections = c.statutorySections || "Section 3(1)(r), 3(1)(s), 3(2)(va) SC/ST (PoA) Act; Section 109 BNS";
    var relief = c.reliefEntitlement || "Statutory relief under Rule 12(4) of SC/ST (PoA) Rules";

    var profileHtml =
      '<div class="dossier-card">' +
      '<div class="dossier-card-title"><span>Complainant & Jurisdiction Details</span><span style="font-size:11px;color:#1D4ED8;font-weight:700;">' + (c.docket || c.id) + '</span></div>' +
      '<div class="dossier-table">' +
      '<div><div class="dossier-field-label">Complainant Name</div><div class="dossier-field-val">' + name + '</div></div>' +
      '<div><div class="dossier-field-label">Registered Mobile</div><div class="dossier-field-val">' + mobile + '</div></div>' +
      '<div><div class="dossier-field-label">Complainant Role</div><div class="dossier-field-val">' + role + '</div></div>' +
      '<div><div class="dossier-field-label">Caste / Category</div><div class="dossier-field-val">' + category + '</div></div>' +
      '<div><div class="dossier-field-label">Incident Site / Village</div><div class="dossier-field-val">' + loc + '</div></div>' +
      '<div><div class="dossier-field-label">Police Station Jurisdiction</div><div class="dossier-field-val">' + ps + '</div></div>' +
      '<div><div class="dossier-field-label">District & State</div><div class="dossier-field-val">' + district + ', ' + state + '</div></div>' +
      '<div><div class="dossier-field-label">Incident Date</div><div class="dossier-field-val">' + date + '</div></div>' +
      '</div>' +
      '<div style="margin-top:14px;padding-top:10px;border-top:1px solid #E2E8F0;font-size:12px;">' +
      '<div style="margin-bottom:4px;"><strong>Statutory Sections:</strong> <span style="color:#003366;font-weight:600;">' + sections + '</span></div>' +
      '<div><strong>Victim Relief Entitlement:</strong> <span style="color:#15803D;font-weight:600;">' + relief + '</span></div>' +
      '</div>' +
      '</div>';

    var narrativeHtml =
      '<div class="dossier-card">' +
      '<div class="dossier-card-title"><span>Incident Narrative & IndicBERT Emotion Tags</span><span style="font-size:11px;color:#64748B;">Category: ' + catLabel + '</span></div>' +
      '<div class="dossier-narrative-box">' + narrative + '</div>' +
      '<div style="font-size:11.5px;font-weight:700;color:#1E293B;margin-bottom:6px;">Neural Emotion & Psychological Distress Tags:</div>' +
      '<div class="dossier-emotions-row">' + emotionsHtml + '</div>' +
      '</div>';

    dossierGrid.innerHTML = profileHtml + narrativeHtml;
  }

  function renderCopilotChatbot(c) {
    currentCopilotCase = c;
    var chatBody = $("copilotChatBody");
    var quickChips = $("copilotQuickChips");
    var statusEl = $("copilotStatus");
    if (!chatBody) return;

    if (statusEl) {
      statusEl.textContent = "Synced to " + (c.docket || c.id) + " (" + c.priorityLevel + ")";
    }

    var name = (c.complainant && c.complainant.name) || c.callerName || "Complainant";
    var cat = (c.incident && c.incident.categoryLabel) || c.categoryLabel || (c.category ? c.category.replace(/_/g, " ") : "Atrocity");
    var loc = (c.incident && c.incident.location) || c.incidentLocation || (c.district || "Jurisdiction");
    var sections = c.statutorySections || "Section 3(1)(r), 3(1)(s), 3(2)(va) SC/ST (PoA) Act; Section 109 BNS";
    var relief = c.reliefEntitlement || "Mandatory relief under Rule 12(4)";
    var isEmergency = c.safetyFlag && c.safetyFlag.active;

    chatBody.innerHTML = "";

    var welcomeHtml =
      '<div class="copilot-bubble bot">' +
      '<div style="font-weight:700;color:#1E3A8A;margin-bottom:6px;display:flex;align-items:center;gap:6px;">' +
      '<span>&#129302; SAATHI Triage Intelligence Briefing</span>' +
      '<span style="font-size:11px;background:#DBEAFE;color:#1D4ED8;padding:1px 6px;border-radius:4px;">' + c.priorityLevel + ' Priority (' + c.priorityScore + '/100)</span>' +
      '</div>' +
      '<div style="margin-bottom:6px;">Case <strong>' + (c.docket || c.id) + '</strong> received for <strong>' + name + '</strong> regarding <em>' + cat + '</em> at ' + loc + '.</div>' +
      (isEmergency ? '<div style="color:#B91C1C;font-weight:700;margin-bottom:6px;">&#9888; CRITICAL OVERRIDE: ' + (c.safetyFlag.detail || "Active armed threat reported") + '</div>' : '') +
      '<div style="font-size:12px;color:#475569;margin-bottom:8px;">' +
      '• <strong>Applicable Sections:</strong> ' + sections + '<br/>' +
      '• <strong>Relief Entitlement:</strong> ' + relief + '<br/>' +
      '• <strong>Suggested Next Step:</strong> ' + (c.suggestedAction || "Escalate to District Atrocity Cell.") +
      '</div>' +
      '<div style="font-size:11.5px;color:#64748B;font-style:italic;">Choose a quick action below or type any legal/triage query for this docket.</div>' +
      '</div>';

    chatBody.innerHTML = welcomeHtml;

    if (quickChips) {
      quickChips.innerHTML =
        '<button type="button" class="copilot-quick-btn" onclick="handleCopilotAction(\'sections\')">&#9889; Penal Sections</button>' +
        '<button type="button" class="copilot-quick-btn" onclick="handleCopilotAction(\'memo\')">&#128221; Draft Escalation Memo</button>' +
        '<button type="button" class="copilot-quick-btn" onclick="handleCopilotAction(\'relief\')">&#128176; Relief Calculator</button>' +
        '<button type="button" class="copilot-quick-btn" onclick="handleCopilotAction(\'script\')">&#128222; Caller Verification Script</button>' +
        '<button type="button" class="copilot-quick-btn" onclick="handleCopilotAction(\'safety\')">&#128737; Safety Checklist</button>';
    }

    chatBody.scrollTop = chatBody.scrollHeight;
  }

  window.handleCopilotAction = function(actionType) {
    if (!currentCopilotCase) return;
    var c = currentCopilotCase;
    var name = (c.complainant && c.complainant.name) || c.callerName || "Complainant";
    var docket = c.docket || c.id;
    var loc = (c.incident && c.incident.location) || c.incidentLocation || "Alipur";
    var dist = (c.incident && c.incident.district) || c.district || "North West Delhi";
    var ps = (c.incident && c.incident.policeStation) || "Jurisdictional Police Station";
    var cat = (c.incident && c.incident.categoryLabel) || c.categoryLabel || "Atrocity Act Violation";
    var sections = c.statutorySections || "Section 3(1)(r), 3(1)(s), 3(2)(va) SC/ST (PoA) Act; Section 109 BNS";
    var relief = c.reliefEntitlement || "₹8,25,000 under Rule 12(4)";

    var userQuery = "";
    var botReply = "";

    if (actionType === "sections") {
      userQuery = "What penal sections apply under the SC/ST (PoA) Act for this case?";
      botReply =
        "<strong>Statutory Legal Assessment for Docket " + docket + ":</strong><br/><br/>" +
        "1. <strong>" + sections + "</strong><br/>" +
        "• <strong>Section 3(1)(r):</strong> Intentionally insults or intimidates with intent to humiliate a member of SC/ST in any place within public view (Punishment: 6 months to 5 years + fine).<br/>" +
        "• <strong>Section 3(1)(s):</strong> Abuses any member of SC/ST by caste name in any place within public view.<br/>" +
        "• <strong>Section 3(1)(za):</strong> Obstructs or prevents SC/ST community member from using customary public well, water spring, path, or burial ground.<br/>" +
        "• <strong>Section 18 Bar on Anticipatory Bail:</strong> Pre-arrest bail is strictly barred under Section 18 of the Act.<br/>" +
        "• <strong>Rule 7 Investigation:</strong> Investigation can only be conducted by a police officer not below the rank of Deputy Superintendent of Police (DSP), who must complete investigation within 60 days.";
    } else if (actionType === "memo") {
      userQuery = "Draft District Magistrate & SP Escalation Memo for this case.";
      botReply =
        "<strong>OFFICIAL MEMORANDUM (ESCALATION UNDER SC/ST PoA ACT 1989)</strong><br/><br/>" +
        "<strong>To:</strong> The District Magistrate & Superintendent of Police, " + dist + "<br/>" +
        "<strong>From:</strong> National Helpline Against Atrocities (14566), MoSJE<br/>" +
        "<strong>Date:</strong> " + new Date().toLocaleDateString("en-IN") + " | <strong>Urgency:</strong> " + c.priorityLevel.toUpperCase() + "<br/>" +
        "<strong>Subject:</strong> Urgent Intervention & Protection Memo — Docket " + docket + "<br/><br/>" +
        "<strong>1. Complainant:</strong> " + name + " (" + ((c.complainant && c.complainant.category) || "SC") + ") | Mobile: " + ((c.complainant && c.complainant.mobile) || "On Record") + "<br/>" +
        "<strong>2. Incident Site:</strong> " + loc + " (Jurisdiction: " + ps + ")<br/>" +
        "<strong>3. Facts of Offence:</strong> " + ((c.incident && c.incident.description) || c.incidentDescription || "Severe atrocity reported.") + "<br/>" +
        "<strong>4. Prima Facie Offence:</strong> " + sections + "<br/>" +
        "<strong>5. Mandatory Directives:</strong><br/>" +
        "a) Immediate registration of FIR under SC/ST (PoA) Act and BNS sections without procedural delay.<br/>" +
        "b) Deployment of immediate police picket for physical protection of complainant household.<br/>" +
        "c) Immediate sanction of 50% interim relief (" + relief + ") under Rule 12(4) within 7 days.<br/>" +
        "d) Deputation of DSP rank investigating officer under Rule 7.";
    } else if (actionType === "relief") {
      userQuery = "Calculate statutory victim compensation under Rule 12(4).";
      botReply =
        "<strong>Statutory Victim Relief Calculation (Rule 12(4) PoA Rules Schedule I):</strong><br/><br/>" +
        "• <strong>Offence Category:</strong> " + cat + "<br/>" +
        "• <strong>Total Statutory Relief Scale:</strong> " + relief + "<br/><br/>" +
        "<strong>Disbursement Schedule:</strong><br/>" +
        "1. <strong>Stage 1 (Immediate / 50%):</strong> To be released within 7 days of FIR registration upon verification by Sub-Divisional Magistrate / District Social Welfare Officer.<br/>" +
        "2. <strong>Stage 2 (25%):</strong> Upon submission of police charge sheet before the Special Atrocity Court.<br/>" +
        "3. <strong>Stage 3 (25%):</strong> Upon conclusion of trial in Special Court.<br/><br/>" +
        "<em>* In addition, complainant is entitled to free medical treatment, food rations, and witness travel allowance under Rule 11.</em>";
    } else if (actionType === "script") {
      userQuery = "Generate caller verification script.";
      botReply =
        "<strong>Recommended Operator Call Verification Script for " + name + ":</strong><br/><br/>" +
        "<em>Operator:</em> 'Namaste " + name + " ji. I am calling from the National Helpline Against Atrocities (14566), Ministry of Social Justice. First, are you in a safe place to speak privately right now?'<br/><br/>" +
        "<em>If Safe:</em> 'Thank you. We have received your grievance docket " + docket + " regarding the incident at " + loc + ". Our District Nodal Officer has been assigned, and we have raised an active priority alert. Have local police visited your basti yet, or are the perpetrators still posing any threat?'<br/><br/>" +
        "<em>If In Danger:</em> 'Please stay indoors in a locked room. Do not confront anyone. I am patching your call directly to the Police Emergency 112 and alerting the District Atrocity Cell supervisor right now.'";
    } else if (actionType === "safety") {
      userQuery = "Safety & witness protection checklist.";
      botReply =
        "<strong>Witness & Victim Protection Protocol (Section 15A SC/ST Act):</strong><br/><br/>" +
        "&#9745; <strong>Immediate Physical Security:</strong> Deploy 24x7 police picket or armed escort outside complainant residence if active threat flagged.<br/>" +
        "&#9745; <strong>FIR Verification:</strong> Ensure copy of FIR provided free of cost to complainant immediately.<br/>" +
        "&#9745; <strong>Witness Relocation:</strong> If perpetrators reside in immediate neighborhood, arrange temporary safe shelter under District Magistrate supervision.<br/>" +
        "&#9745; <strong>Confidentiality:</strong> Identity of complainant and witnesses shielded from public disclosure.<br/>" +
        "&#9745; <strong>Tele-MANAS Connect:</strong> Toll-free psychosocial counselling (14416) offered to affected family members.";
    }

    appendCopilotConversation(userQuery, botReply);
  };

  window.sendCopilotMsg = function() {
    var input = $("copilotInput");
    if (!input || !input.value.trim()) return;
    var query = input.value.trim();
    input.value = "";

    var c = currentCopilotCase || {};
    var name = (c.complainant && c.complainant.name) || c.callerName || "Complainant";
    var docket = c.docket || c.id || "Current Case";
    var sections = c.statutorySections || "Section 3(1)(r), 3(1)(s) SC/ST (PoA) Act";

    var qLower = query.toLowerCase();
    var botReply = "";

    if (qLower.includes("memo") || qLower.includes("draft") || qLower.includes("escalat")) {
      window.handleCopilotAction("memo");
      return;
    } else if (qLower.includes("section") || qLower.includes("law") || qLower.includes("bns") || qLower.includes("penal")) {
      window.handleCopilotAction("sections");
      return;
    } else if (qLower.includes("relief") || qLower.includes("compensation") || qLower.includes("money") || qLower.includes("fund")) {
      window.handleCopilotAction("relief");
      return;
    } else if (qLower.includes("script") || qLower.includes("call") || qLower.includes("speak") || qLower.includes("verify")) {
      window.handleCopilotAction("script");
      return;
    } else if (qLower.includes("safe") || qLower.includes("protect") || qLower.includes("threat") || qLower.includes("police")) {
      window.handleCopilotAction("safety");
      return;
    } else {
      botReply =
        "<strong>Legal & Triage Guidance for Docket " + docket + ":</strong><br/><br/>" +
        "Regarding your query: <em>\"" + query + "\"</em><br/><br/>" +
        "Under the SC/ST (Prevention of Atrocities) Act 1989 and Amendment Act 2015, all offences are cognizable and non-bailable. The designated officer must take up verification without demanding informal compromise.<br/>" +
        "• <strong>Applicable Framework:</strong> " + sections + "<br/>" +
        "• <strong>Recommended Action:</strong> Record this interaction in the docket audit log and update referral status below.";
      appendCopilotConversation(query, botReply);
    }
  };

  function appendCopilotConversation(userText, botHtml) {
    var chatBody = $("copilotChatBody");
    if (!chatBody) return;

    var userBubble = document.createElement("div");
    userBubble.className = "copilot-bubble user";
    userBubble.textContent = userText;
    chatBody.appendChild(userBubble);

    var botBubble = document.createElement("div");
    botBubble.className = "copilot-bubble bot";
    botBubble.innerHTML =
      botHtml +
      '<br/><button type="button" class="copilot-bubble-copy-btn" onclick="copyCopilotContent(this)">&#128203; Copy Text</button>';
    chatBody.appendChild(botBubble);

    chatBody.scrollTop = chatBody.scrollHeight;
  }

  window.copyCopilotContent = function(btn) {
    var parent = btn.parentElement;
    var clone = parent.cloneNode(true);
    var copyBtn = clone.querySelector(".copilot-bubble-copy-btn");
    if (copyBtn) copyBtn.remove();
    var text = clone.innerText || clone.textContent;
    copyToClipboard(text);
    showToast("Copied to clipboard");
  };

  function renderPriorityBreakdown(c) {
    var container = $("priorityBreakdownContainer");
    if (!container) return;

    if (!c.breakdown && window.SaathiService && window.SaathiService.calculatePriority) {
      var textScore = null;
      if (c.assessment && c.assessment.textScore !== undefined) {
        textScore = c.assessment.textScore;
      } else if (c.signals && c.signals.text && c.signals.text.available) {
        textScore = c.priorityScore ? Math.min(95, c.priorityScore + 2) : 68;
      }

      var acousticScore = null;
      if (c.assessment && c.assessment.acousticScore !== undefined && c.assessment.acousticScore !== null) {
        acousticScore = c.assessment.acousticScore;
      } else if (c.signals && c.signals.acoustic && c.signals.acoustic.available) {
        acousticScore = 72;
      }

      var checkinScore = 60;
      if (c.signals && c.signals.checkin && c.signals.checkin.available) {
        checkinScore = c.safetyFlag && c.safetyFlag.active ? 85 : 55;
      }

      var cat = c.category || (c.safetyFlag && c.safetyFlag.active ? "physical_assault" : "threat_intimidation");

      var res = window.SaathiService.calculatePriority({
        textScore: textScore,
        textConfidence: c.signals && c.signals.text ? c.signals.text.confidence : "High",
        acousticScore: acousticScore,
        acousticConfidence: c.signals && c.signals.acoustic ? c.signals.acoustic.confidence : null,
        checkinScore: checkinScore,
        checkinConfidence: "High",
        category: cat,
        recencyDays: 1,
        isOngoingRisk: c.safetyFlag ? c.safetyFlag.active : false,
        safetyFlagActive: c.safetyFlag ? c.safetyFlag.active : false,
        safetyFlagType: c.safetyFlag ? c.safetyFlag.type : null,
        safetyFlagDetail: c.safetyFlag ? c.safetyFlag.detail : null,
        detectedEmotions: c.assessment && c.assessment.detectedEmotions ? c.assessment.detectedEmotions : []
      });
      c.breakdown = res.breakdown;
      c.criticalOverride = res.criticalOverride;
    }

    var bd = c.breakdown || {};
    var textBd = bd.text || { available: true, effectiveWeight: 0.375, score: 75, contribution: 28.1 };
    var acBd = bd.acoustic || { available: false, effectiveWeight: 0.0, score: null, contribution: 0.0 };
    var chBd = bd.checkin || { available: true, effectiveWeight: 0.25, score: 65, contribution: 16.3 };
    var ctxBd = bd.context || { available: true, effectiveWeight: 0.375, score: 85, contribution: 31.9 };

    var isOverride = c.criticalOverride || (c.safetyFlag && c.safetyFlag.active);

    var equationHtml =
      '<div class="priority-equation-bar">' +
      '<div class="equation-chips">' +
      '<span class="eq-chip eq-chip-text">Text: +' + (textBd.contribution || 0).toFixed(1) + ' pts (' + ((textBd.effectiveWeight || 0) * 100).toFixed(1) + '%)</span>' +
      '<span class="eq-operator">+</span>' +
      '<span class="eq-chip eq-chip-acoustic">' + (acBd.available ? 'Acoustic: +' + (acBd.contribution || 0).toFixed(1) + ' pts (' + ((acBd.effectiveWeight || 0) * 100).toFixed(1) + '%)' : 'Acoustic: 0.0 pts (Re-normalized)') + '</span>' +
      '<span class="eq-operator">+</span>' +
      '<span class="eq-chip eq-chip-checkin">Check-in: +' + (chBd.contribution || 0).toFixed(1) + ' pts (' + ((chBd.effectiveWeight || 0) * 100).toFixed(1) + '%)</span>' +
      '<span class="eq-operator">+</span>' +
      '<span class="eq-chip eq-chip-context">Context: +' + (ctxBd.contribution || 0).toFixed(1) + ' pts (' + ((ctxBd.effectiveWeight || 0) * 100).toFixed(1) + '%)</span>' +
      '<span class="eq-operator">=</span>' +
      '<span class="eq-chip eq-chip-total">Score: ' + c.priorityScore + '/100 (' + c.priorityLevel + ')</span>' +
      '</div>' +
      (isOverride ? '<div class="critical-tag">&#9888; Critical Safety Override Active (&ge;90)</div>' : '') +
      '</div>';

    var cardsHtml =
      '<div class="priority-grid">' +
      '<div class="p-card">' +
      '<div class="p-card-top">' +
      '<span class="p-card-title">&#128221; Text Distress</span>' +
      '<span class="p-card-badge ' + (textBd.available ? 'badge-active' : 'badge-inactive') + '">' + ((textBd.effectiveWeight || 0) * 100).toFixed(1) + '% wt</span>' +
      '</div>' +
      '<div class="p-card-score-row">' +
      '<span class="p-card-score-val">' + (textBd.score !== null ? textBd.score : '—') + '<span style="font-size:12px;color:#8B98AE;font-weight:600;">/100</span></span>' +
      '<span class="p-card-contrib">+' + (textBd.contribution || 0).toFixed(1) + ' pts</span>' +
      '</div>' +
      '<div class="p-card-bar-bg"><div class="p-card-bar-fill" style="width:' + (textBd.score || 0) + '%;background:#4F46E5;"></div></div>' +
      '<div class="p-card-meta">' + (c.signals && c.signals.text ? c.signals.text.note : 'IndicBERT v3 emotional distress classification.') + '</div>' +
      '</div>' +

      '<div class="p-card ' + (acBd.available ? '' : 'unavailable') + '">' +
      '<div class="p-card-top">' +
      '<span class="p-card-title">&#127908; Acoustic Indicators</span>' +
      '<span class="p-card-badge ' + (acBd.available ? 'badge-active' : 'badge-inactive') + '">' + (acBd.available ? ((acBd.effectiveWeight || 0) * 100).toFixed(1) + '% wt' : 'Re-normalized') + '</span>' +
      '</div>' +
      '<div class="p-card-score-row">' +
      '<span class="p-card-score-val">' + (acBd.available && acBd.score !== null ? acBd.score : 'N/A') + '<span style="font-size:12px;color:#8B98AE;font-weight:600;">' + (acBd.available ? '/100' : '') + '</span></span>' +
      '<span class="p-card-contrib" style="color:' + (acBd.available ? '#7C3AED' : '#94A3B8') + ';">+' + (acBd.contribution || 0).toFixed(1) + ' pts</span>' +
      '</div>' +
      '<div class="p-card-bar-bg"><div class="p-card-bar-fill" style="width:' + (acBd.score || 0) + '%;background:#7C3AED;"></div></div>' +
      '<div class="p-card-meta">' + (c.signals && c.signals.acoustic ? c.signals.acoustic.note : 'No audio input; weights re-normalized across active modalities.') + '</div>' +
      '</div>' +

      '<div class="p-card">' +
      '<div class="p-card-top">' +
      '<span class="p-card-title">&#128203; Self-Report Check-in</span>' +
      '<span class="p-card-badge ' + (chBd.available ? 'badge-active' : 'badge-inactive') + '">' + ((chBd.effectiveWeight || 0) * 100).toFixed(1) + '% wt</span>' +
      '</div>' +
      '<div class="p-card-score-row">' +
      '<span class="p-card-score-val">' + (chBd.score !== null ? chBd.score : '—') + '<span style="font-size:12px;color:#8B98AE;font-weight:600;">/100</span></span>' +
      '<span class="p-card-contrib" style="color:#D97706;">+' + (chBd.contribution || 0).toFixed(1) + ' pts</span>' +
      '</div>' +
      '<div class="p-card-bar-bg"><div class="p-card-bar-fill" style="width:' + (chBd.score || 0) + '%;background:#F59E0B;"></div></div>' +
      '<div class="p-card-meta">' + (c.signals && c.signals.checkin ? c.signals.checkin.note : 'Structured psychological impact check-in.') + '</div>' +
      '</div>' +

      '<div class="p-card">' +
      '<div class="p-card-top">' +
      '<span class="p-card-title">&#9878; Incident Severity Context</span>' +
      '<span class="p-card-badge ' + (ctxBd.available ? 'badge-active' : 'badge-inactive') + '">' + ((ctxBd.effectiveWeight || 0) * 100).toFixed(1) + '% wt</span>' +
      '</div>' +
      '<div class="p-card-score-row">' +
      '<span class="p-card-score-val">' + (ctxBd.score !== null ? ctxBd.score : '—') + '<span style="font-size:12px;color:#8B98AE;font-weight:600;">/100</span></span>' +
      '<span class="p-card-contrib" style="color:#0F6E63;">+' + (ctxBd.contribution || 0).toFixed(1) + ' pts</span>' +
      '</div>' +
      '<div class="p-card-bar-bg"><div class="p-card-bar-fill" style="width:' + (ctxBd.score || 0) + '%;background:#0F6E63;"></div></div>' +
      '<div class="p-card-meta">' + (c.categoryLabel || c.category || 'Atrocity act severity weight, recency multiplier & proximity.') + '</div>' +
      '</div>' +
      '</div>';

    container.innerHTML = equationHtml + cardsHtml;
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
    var circumference = Math.PI * 60;
    var dash = (pct / 100) * circumference;
    var fill = $("gaugeFill");
    fill.style.strokeDasharray = dash.toFixed(1) + " " + circumference.toFixed(1);
    fill.style.stroke = LEVEL_COLOR[c.priorityLevel] || "#0F6E63";
    $("scoreNumber").textContent = c.priorityScore;

    var levelBadge = $("levelBadge");
    levelBadge.textContent = c.priorityLevel + " Priority";
    levelBadge.style.background = LEVEL_COLOR[c.priorityLevel] || "#0F6E63";
    $("suggestedAction").textContent = c.suggestedAction;
    renderPriorityBreakdown(c);
    renderComplainantDossier(c);
    renderCopilotChatbot(c);

    var saathiSummaryHtml = "";
    if (c.saathiAssessment) {
      var dynHtml = "";
      if (c.caseSummary) {
        dynHtml += '<div style="margin-top: 8px; font-size: 12px; color: #1E40AF; background: #EFF6FF; padding: 6px 10px; border-radius: 6px;"><strong>Incident Focus:</strong> ' + c.caseSummary + '</div>';
      }
      if (c.dynamicAnswers && c.dynamicAnswers.length) {
        dynHtml += '<div style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed #CBD5E1;"><div style="font-size: 11.5px; font-weight: 700; color: #0B2B5C; margin-bottom: 4px;">CASE-SPECIFIC SCREENING (AI-ASSISTED):</div>';
        c.dynamicAnswers.forEach(function(a) {
          dynHtml += '<div style="font-size: 12px; color: #334155; margin-bottom: 3px;">• <strong>' + (a.dimension || 'Dimension') + ':</strong> ' + a.selectedLabel + (a.flagSafety ? ' <span style="color:#B3261E; font-weight:700;">[Safety Risk 🚨]</span>' : '') + '</div>';
        });
        dynHtml += '</div>';
      }

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
        dynHtml +
        '<div style="font-size: 11px; color: #64748B; font-style: italic; margin-top: 6px;">* Operational decision-support terminology — not a medical diagnosis.</div>' +
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
  });

  renderQueue();
  renderCase();
})();

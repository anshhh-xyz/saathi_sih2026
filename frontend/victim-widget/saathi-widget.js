/**
 * SAATHI Support Widget
 * -------------------------------------------------------------
 * A self-contained, dependency-free widget meant to be embedded into an
 * existing site (e.g. dosje.gov.in) with a single <script> tag. It does not
 * assume the host page uses React or any particular framework — this is a
 * deliberate choice: on a legacy/CMS-driven government site, a plain script
 * embed is far more realistic than requiring the host to run a build step.
 *
 * Usage on the host page:
 *   <link rel="stylesheet" href="saathi-widget.css">
 *   <script src="saathi-widget.js"></script>
 *   <script>
 *     SaathiWidget.init({
 *       apiBase: "https://api.saathi.example.gov.in",   // your backend
 *       launcherLabel: { en: "SAATHI Support", hi: "साथी सहायता" }
 *     });
 *   </script>
 *
 * IMPORTANT: this file builds the interface and the client-side flow only.
 * Anything described here as "sent to the assessment API" is a fetch() call
 * to apiBase and needs a real backend behind it (see approach_final /
 * techstack docs for the API contract) — there is no AI running in the
 * browser. Where no backend is configured, calls no-op into a console log
 * so the widget is still fully demoable on its own.
 */
(function (window, document) {
  "use strict";

  var STRINGS = {
    en: {
      launcher: "SAATHI Support",
      title: "SAATHI Support",
      subtitle: "AI-assisted support alongside your complaint — not a diagnosis.",
      consentHeading: "Before we start",
      consentBody: "SAATHI helps our team understand how urgent your situation is, so the right person can reach you faster. It does not replace your complaint, and a person always reviews what happens next. You can stop at any time.",
      consentContinue: "I understand, continue",
      shareHeading: "Tell us what happened",
      shareBody: "Type below, or use voice if that's easier. Share as much or as little as you're comfortable with.",
      placeholder: "Share what happened, in your own words…",
      record: "Record voice",
      recording: "Recording… tap to stop",
      shareContinue: "Continue",
      checkinHeading: "A couple of quick questions",
      checkinBody: "These are optional — skip if you'd rather not answer.",
      feelingQ: "How are you feeling right now?",
      feelingOpts: ["Calm", "Anxious", "Very afraid"],
      safeQ: "Are you somewhere safe to talk right now?",
      safeOpts: ["Yes", "No"],
      submit: "Submit",
      skip: "Skip and submit",
      doneHeading: "Thank you — this has reached our team",
      doneBody: "A member of the NHAA team will follow up. Keep this reference for your records.",
      docketLabel: "Your reference ID",
      close: "Close",
      helpNow: "I need help right now",
      helpNowConfirmHeading: "You're being connected",
      helpNowConfirmBody: "This has been flagged for a team member to review immediately. If you are in immediate physical danger, please also contact local emergency services.",
      resourcesHeading: "You can also reach out directly",
      quietLink: "Not able to talk freely? Tap here",
      quietConfirm: "This page will now close and switch to something neutral. Nothing you typed will be saved.",
    },
    hi: {
      launcher: "साथी सहायता",
      title: "साथी सहायता",
      subtitle: "आपकी शिकायत के साथ एआई-सहायता — यह निदान नहीं है।",
      consentHeading: "शुरू करने से पहले",
      consentBody: "साथी हमारी टीम को यह समझने में मदद करता है कि आपकी स्थिति कितनी गंभीर है, ताकि सही व्यक्ति जल्दी आपसे संपर्क कर सके। यह आपकी शिकायत की जगह नहीं लेता, और आगे क्या होगा यह हमेशा कोई व्यक्ति ही तय करता है। आप कभी भी रुक सकते हैं।",
      consentContinue: "मैं समझता/समझती हूँ, जारी रखें",
      shareHeading: "हमें बताएं क्या हुआ",
      shareBody: "नीचे लिखें, या आवाज़ का उपयोग करें अगर वह आसान हो। जितना सहज महसूस करें उतना साझा करें।",
      placeholder: "अपने शब्दों में बताएं कि क्या हुआ…",
      record: "आवाज़ रिकॉर्ड करें",
      recording: "रिकॉर्ड हो रहा है… रोकने के लिए टैप करें",
      shareContinue: "जारी रखें",
      checkinHeading: "कुछ छोटे सवाल",
      checkinBody: "ये वैकल्पिक हैं — चाहें तो छोड़ सकते हैं।",
      feelingQ: "अभी आप कैसा महसूस कर रहे हैं?",
      feelingOpts: ["शांत", "चिंतित", "बहुत डरा हुआ"],
      safeQ: "क्या आप अभी सुरक्षित रूप से बात कर सकते हैं?",
      safeOpts: ["हाँ", "नहीं"],
      submit: "जमा करें",
      skip: "छोड़ें और जमा करें",
      doneHeading: "धन्यवाद — यह हमारी टीम तक पहुँच गया है",
      doneBody: "NHAA टीम का एक सदस्य संपर्क करेगा। कृपया यह संदर्भ नंबर सुरक्षित रखें।",
      docketLabel: "आपकी संदर्भ आईडी",
      close: "बंद करें",
      helpNow: "मुझे अभी मदद चाहिए",
      helpNowConfirmHeading: "आपको जोड़ा जा रहा है",
      helpNowConfirmBody: "इसे तुरंत समीक्षा के लिए टीम को भेज दिया गया है। अगर आप तत्काल खतरे में हैं, तो कृपया स्थानीय आपातकालीन सेवाओं से भी संपर्क करें।",
      resourcesHeading: "आप सीधे भी संपर्क कर सकते हैं",
      quietLink: "खुलकर बात नहीं कर सकते? यहाँ टैप करें",
      quietConfirm: "यह पेज अब बंद होकर एक सामान्य पेज पर चला जाएगा। आपने जो भी टाइप किया वह सुरक्षित नहीं रहेगा।",
    },
  };

  var RESOURCES = [
    { label: "NHAA — 14566", href: "tel:14566" },
    { label: "Tele-MANAS — 14416", href: "tel:14416" },
  ];

  function el(tag, className, html) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function icon(name) {
    if (name === "saathi-logo" || name === "chat") {
      return '<svg viewBox="0 0 120 120" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<circle cx="60" cy="60" r="57" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.5"/>' +
        '<circle cx="60" cy="60" r="52" fill="none" stroke="#F1F5F9" stroke-width="1"/>' +
        '<path d="M 23,60 A 42,42 0 0,1 60,18" fill="none" stroke="#FF9933" stroke-width="3" stroke-linecap="round"/>' +
        '<path d="M 60,18 A 42,42 0 0,1 97,60" fill="none" stroke="#138808" stroke-width="3" stroke-linecap="round"/>' +
        '<circle cx="60" cy="50" r="18" fill="none" stroke="#DBEAFE" stroke-width="1.2" stroke-dasharray="2.5 2"/>' +
        '<circle cx="60" cy="50" r="13" fill="none" stroke="#BFDBFE" stroke-width="1.2"/>' +
        '<circle cx="60" cy="50" r="8" fill="#EFF6FF"/>' +
        '<path d="M 40,35 C 50,28 70,28 80,35 C 75,32 67,30 60,30 C 53,30 45,32 40,35 Z" fill="#123E7C"/>' +
        '<path d="M 36,65 C 33,56 34,46 39,39 C 41,44 42,50 43,55 C 44,60 46,65 52,69 C 45,69 40,67 36,65 Z" fill="#FF9933"/>' +
        '<path d="M 84,65 C 87,56 86,46 81,39 C 79,44 78,50 77,55 C 76,60 74,65 68,69 C 75,69 80,67 84,65 Z" fill="#138808"/>' +
        '<circle cx="60" cy="46" r="4.5" fill="#0B2B5C"/>' +
        '<path d="M 52,62 C 52,55 55,52 60,52 C 65,52 68,55 68,62 Z" fill="#0B2B5C"/>' +
        '<text x="60" y="84" font-family=\"\'Noto Sans\', Segoe UI, Arial, sans-serif\" font-size=\"11\" font-weight=\"800\" fill=\"#0B2B5C\" text-anchor=\"middle\" letter-spacing=\"1\">SAATHI</text>' +
        '<text x="60" y="95" font-family=\"\'Noto Sans\', Segoe UI, Arial, sans-serif\" font-size=\"7.5\" font-weight=\"600\" fill=\"#475569\" text-anchor=\"middle\">साथी</text>' +
        '<line x1="34" y1="100" x2="50" y2="100" stroke="#FF9933" stroke-width=\"1.8\" stroke-linecap=\"round\"/>' +
        '<line x1="54" y1="100" x2="66" y2="100" stroke="#0B2B5C" stroke-width=\"1.8\" stroke-linecap=\"round\"/>' +
        '<line x1="70" y1="100" x2="86" y2="100" stroke="#138808" stroke-width=\"1.8\" stroke-linecap=\"round\"/>' +
        '</svg>';
    }
    return "";
  }

  function SaathiWidget(opts) {
    this.opts = Object.assign(
      {
        apiBase: null,
        defaultLang: "en",
        docketPrefix: "SAATHI",
      },
      opts || {}
    );
    this.lang = this.opts.defaultLang;
    this.step = "consent"; // consent -> share -> checkin -> done
    this.state = { text: "", feeling: null, safe: null, recording: false, recordSeconds: 0 };
    this._mediaRecorder = null;
    this._recordTimer = null;
    window.SaathiWidgetInstance = this;
    this._build();
  }

  SaathiWidget.prototype.t = function (key) {
    return STRINGS[this.lang][key];
  };

  SaathiWidget.prototype._build = function () {
    var root = el("div", "saathi-root");

    // Launcher with Redesigned SAATHI Support Logo (Sambal-style secondary access)
    var launcher = el(
      "button",
      "saathi-launcher",
      '<span class="saathi-launcher-icon">' + icon("saathi-logo") + "</span>" +
      '<div class="saathi-launcher-content">' +
        '<span class="saathi-launcher-name">SAATHI</span>' +
        '<span class="saathi-launcher-sub">Need support? · सहायता</span>' +
      '</div>'
    );
    launcher.setAttribute("type", "button");
    launcher.setAttribute("aria-haspopup", "dialog");
    launcher.setAttribute("title", "SAATHI: Need support? Talk to our assistant");
    launcher.addEventListener("click", this.open.bind(this));
    this.launcherEl = launcher;

    // Panel
    var panel = el("div", "saathi-panel");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-label", this.t("title"));
    panel.appendChild(el("div", "saathi-tricolor"));

    var header = el("div", "saathi-header");
    var headerTop = el("div", "saathi-header-top");
    var headerBrand = el("div", "saathi-header-brand");
    headerBrand.appendChild(el("span", "saathi-header-emblem", icon("saathi-logo")));
    
    var titleWrap = el("div");
    titleWrap.appendChild(el("p", "saathi-title", this.t("title")));
    titleWrap.appendChild(el("p", "saathi-subtitle", this.t("subtitle")));
    headerBrand.appendChild(titleWrap);
    
    var closeBtn = el("button", "saathi-close", "&times;");
    closeBtn.setAttribute("aria-label", this.t("close"));
    closeBtn.addEventListener("click", this.close.bind(this));
    headerTop.appendChild(headerBrand);
    headerTop.appendChild(closeBtn);
    header.appendChild(headerTop);

    var langToggle = el("div", "saathi-lang-toggle");
    ["en", "hi"].forEach(
      function (code) {
        var b = el("button", "saathi-lang-btn" + (this.lang === code ? " saathi-active" : ""), code === "en" ? "EN" : "हि");
        b.setAttribute("type", "button");
        b.addEventListener("click", this._setLang.bind(this, code));
        langToggle.appendChild(b);
      }.bind(this)
    );
    header.appendChild(langToggle);

    var steps = el("div", "saathi-steps");
    ["consent", "share", "checkin", "done"].forEach(function () {
      steps.appendChild(el("div", "saathi-step-dot"));
    });
    header.appendChild(steps);
    this.stepsEl = steps;

    var body = el("div", "saathi-body");
    this.bodyEl = body;

    var footer = el("div", "saathi-footer");
    var helpBtn = el("button", "saathi-help-now", "\u26A0 " + this.t("helpNow"));
    helpBtn.setAttribute("type", "button");
    helpBtn.addEventListener("click", this._helpNow.bind(this));
    this.helpBtnEl = helpBtn;
    var quietBtn = el("button", "saathi-quiet-link", this.t("quietLink"));
    quietBtn.setAttribute("type", "button");
    quietBtn.addEventListener("click", this._quietExit.bind(this));
    this.quietBtnEl = quietBtn;
    footer.appendChild(helpBtn);
    footer.appendChild(quietBtn);

    panel.appendChild(header);
    panel.appendChild(body);
    panel.appendChild(footer);
    this.panelEl = panel;
    this.headerEl = header;

    root.appendChild(launcher);
    root.appendChild(panel);
    document.body.appendChild(root);
    this.rootEl = root;

    this._renderStep();
  };

  SaathiWidget.prototype._setLang = function (code) {
    this.lang = code;
    this.rootEl.remove();
    this._build();
    if (this._wasOpen) this.open();
  };

  SaathiWidget.prototype._updateSteps = function () {
    var order = ["consent", "share", "checkin", "done"];
    var idx = order.indexOf(this.step);
    Array.prototype.forEach.call(this.stepsEl.children, function (dot, i) {
      dot.classList.toggle("saathi-done", i <= idx);
    });
  };

  SaathiWidget.prototype.open = function () {
    this._wasOpen = true;
    this.panelEl.classList.add("saathi-open");
    this.launcherEl.classList.add("saathi-hidden");
    this.panelEl.querySelector("button, textarea")?.focus();
  };
  SaathiWidget.prototype.close = function () {
    this.panelEl.classList.remove("saathi-open");
    this.launcherEl.classList.remove("saathi-hidden");
  };

  // ---- step rendering ----
  SaathiWidget.prototype._renderStep = function () {
    this._updateSteps();
    this.bodyEl.innerHTML = "";
    if (this.step === "consent") this._renderConsent();
    else if (this.step === "share") this._renderShare();
    else if (this.step === "checkin") this._renderCheckin();
    else if (this.step === "done") this._renderDone();
  };

  SaathiWidget.prototype._renderConsent = function () {
    var b = this.bodyEl;
    b.appendChild(el("h3", null, this.t("consentHeading")));
    b.appendChild(el("div", "saathi-consent-box", this.t("consentBody")));
    var btn = el("button", "saathi-primary-btn", this.t("consentContinue"));
    btn.setAttribute("type", "button");
    btn.addEventListener("click", function () {
      this.step = "share";
      this._renderStep();
    }.bind(this));
    b.appendChild(btn);
  };

  SaathiWidget.prototype._renderShare = function () {
    var self = this;
    var b = this.bodyEl;
    b.appendChild(el("h3", null, this.t("shareHeading")));
    b.appendChild(el("p", null, this.t("shareBody")));

    var ta = el("textarea", "saathi-textarea");
    ta.placeholder = this.t("placeholder");
    ta.value = this.state.text;
    ta.addEventListener("input", function (e) { self.state.text = e.target.value; refreshBtn(); });
    b.appendChild(ta);

    var recordRow = el("div", "saathi-record-row");
    var recordBtn = el("button", "saathi-record-btn", '<span class="saathi-record-dot"></span><span>' + this.t("record") + "</span>");
    recordBtn.setAttribute("type", "button");
    var timeLabel = el("span", "saathi-record-time", "");
    recordBtn.addEventListener("click", function () { self._toggleRecording(recordBtn, timeLabel); });
    recordRow.appendChild(recordBtn);
    recordRow.appendChild(timeLabel);
    b.appendChild(recordRow);

    var continueBtn = el("button", "saathi-primary-btn", this.t("shareContinue"));
    continueBtn.setAttribute("type", "button");
    function refreshBtn() { continueBtn.disabled = !self.state.text.trim() && !self.state.audioBlob; }
    refreshBtn();
    continueBtn.addEventListener("click", function () {
      self.step = "checkin";
      self._renderStep();
    });
    b.appendChild(continueBtn);
    this._shareRefreshBtn = refreshBtn;
  };

  SaathiWidget.prototype._toggleRecording = function (btnEl, timeLabelEl) {
    var self = this;
    if (!this.state.recording) {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Voice recording isn't supported in this browser — please type instead.");
        return;
      }
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then(function (stream) {
          self._stream = stream;
          self._chunks = [];
          self._mediaRecorder = new MediaRecorder(stream);
          self._mediaRecorder.ondataavailable = function (e) { self._chunks.push(e.data); };
          self._mediaRecorder.onstop = function () {
            self.state.audioBlob = new Blob(self._chunks, { type: "audio/webm" });
            if (self._shareRefreshBtn) self._shareRefreshBtn();
            stream.getTracks().forEach(function (t) { t.stop(); });
          };
          self._mediaRecorder.start();
          self.state.recording = true;
          self.state.recordSeconds = 0;
          btnEl.classList.add("saathi-recording");
          btnEl.querySelector("span:last-child").textContent = self.t("recording");
          self._recordTimer = setInterval(function () {
            self.state.recordSeconds++;
            var m = Math.floor(self.state.recordSeconds / 60);
            var s = self.state.recordSeconds % 60;
            timeLabelEl.textContent = m + ":" + (s < 10 ? "0" : "") + s;
          }, 1000);
        })
        .catch(function () {
          alert("Microphone access was blocked — please type your message instead.");
        });
    } else {
      if (this._mediaRecorder) this._mediaRecorder.stop();
      clearInterval(this._recordTimer);
      this.state.recording = false;
      btnEl.classList.remove("saathi-recording");
      btnEl.querySelector("span:last-child").textContent = this.t("record");
    }
  };

  SaathiWidget.prototype._renderCheckin = function () {
    var self = this;
    var b = this.bodyEl;
    b.appendChild(el("h3", null, this.t("checkinHeading")));
    b.appendChild(el("p", null, this.t("checkinBody")));

    b.appendChild(el("p", null, this.t("feelingQ")));
    var feelingGroup = el("div", "saathi-chip-group");
    this.t("feelingOpts").forEach(function (label, i) {
      var chip = el("button", "saathi-chip", label);
      chip.setAttribute("type", "button");
      chip.addEventListener("click", function () {
        self.state.feeling = i;
        Array.prototype.forEach.call(feelingGroup.children, function (c) { c.classList.remove("saathi-selected"); });
        chip.classList.add("saathi-selected");
      });
      feelingGroup.appendChild(chip);
    });
    b.appendChild(feelingGroup);

    b.appendChild(el("p", null, this.t("safeQ")));
    var safeGroup = el("div", "saathi-chip-group");
    this.t("safeOpts").forEach(function (label, i) {
      var chip = el("button", "saathi-chip", label);
      chip.setAttribute("type", "button");
      chip.addEventListener("click", function () {
        self.state.safe = i === 0;
        Array.prototype.forEach.call(safeGroup.children, function (c) { c.classList.remove("saathi-selected"); });
        chip.classList.add("saathi-selected");
        // A "not safe to talk" answer here is itself a soft safety signal —
        // it should be sent to the safety engine alongside everything else,
        // not just logged as a survey answer.
      });
      safeGroup.appendChild(chip);
    });
    b.appendChild(safeGroup);

    var submitBtn = el("button", "saathi-primary-btn", this.t("submit"));
    submitBtn.setAttribute("type", "button");
    submitBtn.addEventListener("click", function () { self._submit(); });
    b.appendChild(submitBtn);

    var skipBtn = el("button", "saathi-secondary-btn", this.t("skip"));
    skipBtn.setAttribute("type", "button");
    skipBtn.addEventListener("click", function () { self._submit(); });
    b.appendChild(skipBtn);
  };

  SaathiWidget.prototype._renderDone = function () {
    var b = this.bodyEl;
    b.appendChild(el("h3", null, this.t("doneHeading")));
    b.appendChild(el("p", null, this.t("doneBody")));
    var docket = el(
      "div",
      "saathi-docket",
      '<div class="saathi-docket-id">' + this.docketId + '</div><div class="saathi-docket-label">' + this.t("docketLabel") + "</div>"
    );
    b.appendChild(docket);
    var closeBtn = el("button", "saathi-primary-btn", this.t("close"));
    closeBtn.setAttribute("type", "button");
    closeBtn.addEventListener("click", this.close.bind(this));
    b.appendChild(closeBtn);
  };

  SaathiWidget.prototype._submit = function () {
    var payload = {
      text: this.state.text,
      hasAudio: !!this.state.audioBlob,
      feeling: this.state.feeling,
      safeToTalk: this.state.safe,
      lang: this.lang,
      timestamp: new Date().toISOString(),
    };
    this._sendToApi("/interactions/submit", payload);
    this.docketId = this.opts.docketPrefix + "-" + Math.floor(100000 + Math.random() * 900000);
    this.step = "done";
    this._renderStep();
  };

  SaathiWidget.prototype._helpNow = function () {
    var b = this.bodyEl;
    this._sendToApi("/interactions/safety-flag", {
      reason: "help_now_button",
      text: this.state.text,
      timestamp: new Date().toISOString(),
    });
    b.innerHTML = "";
    b.appendChild(
      el(
        "div",
        "saathi-alert-box saathi-urgent-box",
        "<strong>" + this.t("helpNowConfirmHeading") + "</strong>" + this.t("helpNowConfirmBody")
      )
    );
    b.appendChild(el("p", null, this.t("resourcesHeading")));
    var list = el("ul", "saathi-resource-list");
    RESOURCES.forEach(function (r) {
      var li = el("li", null, r.label + ' <a href="' + r.href + '">' + r.href.replace("tel:", "") + "</a>");
      list.appendChild(li);
    });
    b.appendChild(list);
  };

  SaathiWidget.prototype._quietExit = function () {
    if (!window.confirm(this.t("quietConfirm"))) return;
    this._sendToApi("/interactions/safety-flag", {
      reason: "quiet_exit",
      timestamp: new Date().toISOString(),
    });
    try {
      sessionStorage.clear();
    } catch (e) {}
    // A neutral destination — replace() so the widget page doesn't sit in history.
    window.location.replace("https://www.imd.gov.in");
  };

  SaathiWidget.prototype._sendToApi = function (path, payload) {
    if (!this.opts.apiBase) {
      console.info("[SaathiWidget] (no apiBase configured) would POST", path, payload);
      return;
    }
    fetch(this.opts.apiBase + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(function (err) {
      console.error("[SaathiWidget] request failed", err);
    });
  };

  window.SaathiWidget = {
    init: function (opts) {
      return new SaathiWidget(opts);
    },
  };
})(window, document);

(function (window) {
  "use strict";

  var QUESTION_BANK = {
    immediate_safety: {
      id: "immediate_safety",
      dimension: "Immediate Safety & Perceived Fear",
      prompt: "Do you currently feel safe where you are?",
      promptHi: "क्या आप अभी जहाँ हैं, वहाँ खुद को सुरक्षित महसूस कर रहे हैं?",
      options: [
        { label: "Yes, I feel completely safe", labelHi: "हाँ, मैं पूरी तरह सुरक्षित हूँ", value: 0, weight: 0 },
        { label: "Somewhat safe, but concerned", labelHi: "कुछ हद तक सुरक्षित, पर चिंता है", value: 1, weight: 1 },
        { label: "Not safe, feeling constant fear", labelHi: "सुरक्षित नहीं, लगातार डर लग रहा है", value: 2, weight: 2 },
        { label: "In immediate danger right now", labelHi: "अभी तत्काल खतरे में हूँ", value: 3, weight: 3, flagSafety: true }
      ]
    },
    sleep_disturbance: {
      id: "sleep_disturbance",
      dimension: "Sleep Disturbance",
      prompt: "Since the incident, have you experienced difficulty sleeping or frequent nightmares?",
      promptHi: "इस घटना के बाद से, क्या आपको सोने में परेशानी या बुरे सपने आ रहे हैं?",
      options: [
        { label: "Not at all", labelHi: "बिल्कुल नहीं", value: 0, weight: 0 },
        { label: "A little / occasionally", labelHi: "थोड़ा / कभी-कभी", value: 1, weight: 1 },
        { label: "Quite a lot / most nights", labelHi: "काफी ज्यादा / अधिकांश रातों में", value: 2, weight: 2 },
        { label: "Severely / barely able to sleep", labelHi: "अत्यधिक / शायद ही सो पाता/पाती हूँ", value: 3, weight: 3 }
      ]
    },
    intrusive_thoughts: {
      id: "intrusive_thoughts",
      dimension: "Intrusive Thoughts & Memories",
      prompt: "Do upsetting thoughts or memories of the incident come back when you don't want them to?",
      promptHi: "क्या घटना की परेशान करने वाली यादें या विचार बिना चाहे बार-बार मन में आते हैं?",
      options: [
        { label: "Not at all", labelHi: "बिल्कुल नहीं", value: 0, weight: 0 },
        { label: "A little / sometimes", labelHi: "थोड़ा / कभी-कभी", value: 1, weight: 1 },
        { label: "Quite a lot", labelHi: "काफी बार", value: 2, weight: 2 },
        { label: "Constantly / overwhelming", labelHi: "लगातार / बहुत ज्यादा", value: 3, weight: 3 }
      ]
    },
    avoidance: {
      id: "avoidance",
      dimension: "Avoidance Behavior",
      prompt: "Have you been avoiding certain places, people, or activities because of what happened?",
      promptHi: "क्या आप जो हुआ उसकी वजह से कुछ जगहों, लोगों या गतिविधियों से बच रहे हैं?",
      options: [
        { label: "Not at all", labelHi: "बिल्कुल नहीं", value: 0, weight: 0 },
        { label: "Only a little", labelHi: "केवल थोड़ा", value: 1, weight: 1 },
        { label: "Quite a lot", labelHi: "काफी हद तक", value: 2, weight: 2 },
        { label: "Extremely / unable to leave home", labelHi: "अत्यधिक / घर से निकलना मुश्किल हो गया है", value: 3, weight: 3 }
      ]
    },
    functional_impact: {
      id: "functional_impact",
      dimension: "Functional Impact (Work / Study / Daily Life)",
      prompt: "Has this incident affected your ability to work, study, or carry out your usual daily activities?",
      promptHi: "क्या इस घटना ने आपके काम, पढ़ाई या सामान्य दैनिक कार्यों को प्रभावित किया है?",
      options: [
        { label: "Not at all", labelHi: "बिल्कुल नहीं", value: 0, weight: 0 },
        { label: "Mild disruption", labelHi: "हल्का असर", value: 1, weight: 1 },
        { label: "Significant difficulty", labelHi: "काफी कठिनाई", value: 2, weight: 2 },
        { label: "Severe / completely unable to function", labelHi: "गंभीर / सामान्य कार्य करने में असमर्थ", value: 3, weight: 3 }
      ]
    },
    emotional_distress: {
      id: "emotional_distress",
      dimension: "Persistent Worry & Emotional Distress",
      prompt: "How intensely are you experiencing feelings of anxiety, hopelessness, or panic right now?",
      promptHi: "अभी आप घबराहट, निराशा या चिंता किस हद तक महसूस कर रहे हैं?",
      options: [
        { label: "Mild / Calm", labelHi: "सामान्य / शांत", value: 0, weight: 0 },
        { label: "Moderate worry", labelHi: "मध्यम चिंता", value: 1, weight: 1 },
        { label: "High anxiety & distress", labelHi: "तीव्र चिंता और तनाव", value: 2, weight: 2 },
        { label: "Overwhelming distress", labelHi: "असहनीय तनाव व घबराहट", value: 3, weight: 3 }
      ]
    }
  };

  var SaathiService = {
    analyzeContext: function (nhaaContext) {
      var incidentType = nhaaContext.incidentType || "";
      var recencyDays = this._getDaysSinceIncident(nhaaContext.incidentDate);
      var relationship = nhaaContext.relationshipToPerpetrator || "";
      var isHighPhysicalThreat = incidentType === "physical_assault" || incidentType === "threat_intimidation";
      var isRecent = recencyDays <= 7;
      var isOngoingRisk = relationship === "neighbor" || relationship === "landlord" || relationship === "employer";

      var questionSequence = [];

      if (isHighPhysicalThreat && isRecent) {
        questionSequence = ["immediate_safety", "emotional_distress", "sleep_disturbance", "functional_impact"];
      } else if (incidentType === "social_boycott" || recencyDays > 30) {
        questionSequence = ["functional_impact", "avoidance", "sleep_disturbance", "emotional_distress"];
      } else {
        questionSequence = ["emotional_distress", "sleep_disturbance", "intrusive_thoughts", "functional_impact"];
      }

      return {
        initialRiskCategory: isHighPhysicalThreat ? "Priority" : "Standard",
        recencyDays: recencyDays,
        isOngoingRisk: isOngoingRisk,
        questionSequence: questionSequence,
        totalQuestions: questionSequence.length
      };
    },

    getQuestion: function (questionId) {
      return QUESTION_BANK[questionId] || null;
    },

    getNextQuestionId: function (sequence, currentIndex, currentAnswers) {
      if (currentIndex + 1 < sequence.length) {
        return sequence[currentIndex + 1];
      }
      return null;
    },

    evaluateAssessment: function (nhaaContext, answers) {
      var totalScore = 0;
      var maxPossible = 0;
      var safetyFlag = false;
      var safetyDetail = "";

      var answersList = Object.keys(answers).map(function (qId) {
        var val = answers[qId];
        var qObj = QUESTION_BANK[qId];
        var selectedOpt = qObj ? qObj.options.find(function (o) { return o.value === val; }) : null;
        var weight = selectedOpt ? selectedOpt.weight : 0;
        totalScore += weight;
        maxPossible += 3;

        if (selectedOpt && selectedOpt.flagSafety) {
          safetyFlag = true;
          safetyDetail = "Citizen reported immediate danger in safety check-in.";
        }
        return {
          questionId: qId,
          dimension: qObj ? qObj.dimension : qId,
          value: val,
          label: selectedOpt ? selectedOpt.label : ""
        };
      });

      if (nhaaContext.incidentType === "threat_intimidation" && answers.immediate_safety >= 2) {
        safetyFlag = true;
        safetyDetail = "Active threat incident with elevated ongoing fear reported.";
      }

      var ratio = maxPossible > 0 ? (totalScore / maxPossible) : 0;

      var distressLevel = "Low";
      if (ratio > 0.65 || totalScore >= 7) distressLevel = "Elevated";
      else if (ratio > 0.35 || totalScore >= 4) distressLevel = "Moderate";

      var traumaIndicators = "Low";
      var sleepVal = answers.sleep_disturbance || 0;
      var intrusiveVal = answers.intrusive_thoughts || 0;
      if (sleepVal >= 2 || intrusiveVal >= 2) {
        traumaIndicators = (sleepVal === 3 || intrusiveVal === 3) ? "Elevated" : "Moderate";
      }

      var functionalImpact = "Low";
      var funcVal = answers.functional_impact || 0;
      var avoidVal = answers.avoidance || 0;
      if (funcVal >= 2 || avoidVal >= 2) {
        functionalImpact = (funcVal === 3 || avoidVal === 3) ? "High" : "Moderate";
      }

      var recommendations = this._generateRecommendations(nhaaContext, {
        distressLevel: distressLevel,
        traumaIndicators: traumaIndicators,
        functionalImpact: functionalImpact,
        safetyFlag: safetyFlag
      });

      var citizenSummary = "Your grievance has been captured with your impact check-in. Our team reviews every complaint to ensure appropriate assistance.";
      if (distressLevel === "Elevated" || safetyFlag) {
        citizenSummary = "Your responses indicate that immediate additional support and prioritized attention may be helpful. Supportive resources and follow-up options are available below.";
      } else if (distressLevel === "Moderate") {
        citizenSummary = "Your responses indicate that supportive guidance and counselling options may be useful while your grievance is being processed.";
      }

      return {
        distressLevel: distressLevel,
        traumaIndicators: traumaIndicators,
        functionalImpact: functionalImpact,
        safetyFlag: safetyFlag,
        safetyDetail: safetyDetail,
        citizenSummary: citizenSummary,
        recommendations: recommendations,
        answersSummary: answersList
      };
    },

    _generateRecommendations: function (nhaaContext, signals) {
      var recs = [];

      if (signals.safetyFlag) {
        recs.push({
          id: "rec_safety_escalation",
          type: "urgent_protection",
          title: "Immediate Safety & Protection Protocol",
          titleHi: "तत्काल सुरक्षा एवं संरक्षण प्रोटोकॉल",
          description: "Priority routing to District Nodal Officer & local SC/ST Protection Cell for immediate safety review.",
          contact: "Emergency 112 / NHAA Priority Desk 14566",
          badge: "High Priority Action"
        });
      }

      if (signals.distressLevel === "Elevated" || signals.traumaIndicators === "Elevated" || signals.distressLevel === "Moderate") {
        recs.push({
          id: "rec_telemanas",
          type: "psychosocial_support",
          title: "Tele-MANAS 24x7 Mental Health Helpline",
          titleHi: "टेली-मानस 24x7 मानसिक स्वास्थ्य सहायता",
          description: "Free, confidential psychosocial support and crisis counselling in your preferred language provided by the Ministry of Health.",
          contact: "Toll-Free: 14416 (24 Hours)",
          actionUrl: "tel:14416",
          actionLabel: "Call 14416 Now"
        });
      }

      if (signals.functionalImpact === "High" || nhaaContext.incidentType === "social_boycott" || nhaaContext.incidentType === "denial_of_rights") {
        recs.push({
          id: "rec_legal_aid",
          type: "legal_and_welfare",
          title: "District Legal Services Authority (DLSA) Support",
          titleHi: "जिला विधिक सेवा प्राधिकरण (DLSA) विधिक सहायता",
          description: "Free legal representation, compensation guidance under SC/ST (PoA) Act Rules, and victim rehabilitation support.",
          contact: "National Legal Aid: 15100",
          actionUrl: "https://nalsa.gov.in",
          actionLabel: "Access Legal Aid"
        });
      }

      recs.push({
        id: "rec_nhaa_callback",
        type: "helpline_support",
        title: "NHAA Welfare Officer Case Follow-up",
        titleHi: "NHAA कल्याण अधिकारी केस अनुवर्ती सहायता",
        description: "Your assigned welfare officer will review the incident impact context to expedite verification and relief entitlement.",
        contact: "NHAA Helpline: 14566",
        actionUrl: "tel:14566",
        actionLabel: "Call NHAA 14566"
      });

      return recs;
    },

    saveCase: function (nhaaContext, saathiResult) {
      var referenceId = "NHAA-" + new Date().getFullYear() + "-" + Math.floor(100000 + Math.random() * 900000);
      var docketNumber = "NHAA/" + new Date().getFullYear() + "/09/" + Math.floor(1000 + Math.random() * 9000);

      var newCase = {
        id: referenceId,
        docket: docketNumber,
        referenceId: referenceId,
        channel: "Web Portal (Integrated)",
        language: "English / Hindi",
        receivedAt: new Date().toISOString(),
        complainant: {
          name: nhaaContext.complainantName || "Complainant",
          mobile: nhaaContext.mobileNumber || "9876543210",
          category: nhaaContext.category || "SC",
          location: nhaaContext.incidentLocation || "New Delhi"
        },
        incident: {
          type: nhaaContext.incidentType || "Grievance",
          date: nhaaContext.incidentDate || new Date().toISOString().split("T")[0],
          relationship: nhaaContext.relationshipToPerpetrator || "Unknown",
          description: nhaaContext.incidentDescription || ""
        },
        safetyFlag: {
          active: saathiResult ? saathiResult.safetyFlag : false,
          type: saathiResult && saathiResult.safetyFlag ? "Urgent Human Intervention Required" : "None",
          detail: saathiResult && saathiResult.safetyFlag ? saathiResult.safetyDetail : "Standard intake"
        },
        priorityLevel: (saathiResult && saathiResult.safetyFlag) ? "Urgent" : (saathiResult && saathiResult.distressLevel === "Elevated" ? "High" : "Normal"),
        priorityScore: (saathiResult && saathiResult.safetyFlag) ? 92 : (saathiResult && saathiResult.distressLevel === "Elevated" ? 78 : (saathiResult && saathiResult.distressLevel === "Moderate" ? 54 : 28)),
        confidence: "High",
        signals: {
          text: {
            available: true,
            confidence: "High",
            note: (saathiResult && saathiResult.distressLevel === "Elevated") ? "Elevated distress & urgency indicators detected in report." : "Structured complaint intake processed."
          },
          acoustic: {
            available: false,
            confidence: "N/A",
            note: "Web portal submission (text mode)."
          },
          checkin: {
            available: saathiResult ? true : false,
            confidence: "High",
            note: saathiResult ? ("Distress: " + saathiResult.distressLevel + " | Functional Impact: " + saathiResult.functionalImpact) : "Assessment skipped by citizen."
          }
        },
        saathiAssessment: saathiResult,
        status: "Registered — Assigned to District Welfare Officer",
        timeline: [
          { t: "10:00 AM", label: "Grievance submitted via NHAA Web Portal" },
          { t: "10:01 AM", label: saathiResult && saathiResult.safetyFlag ? "SAATHI Safety Flag raised — Routed to Senior Officer" : "SAATHI Contextual Impact Profile attached" },
          { t: "10:05 AM", label: "Docket assigned to District Welfare Cell" }
        ],
        suggestedAction: (saathiResult && saathiResult.safetyFlag)
          ? "Prioritize immediate case review, contact local police protection cell, and initiate welfare callback."
          : (saathiResult && saathiResult.distressLevel === "Elevated"
            ? "Prioritize case review, connect complainant to Tele-MANAS counselling, and verify relief eligibility."
            : "Review grievance details and proceed with standard verification.")
      };

      try {
        var existingCases = JSON.parse(localStorage.getItem("SAATHI_GRIEVANCE_CASES") || "[]");
        existingCases.unshift(newCase);
        localStorage.setItem("SAATHI_GRIEVANCE_CASES", JSON.stringify(existingCases));
      } catch (e) {
        console.warn("Could not save to localStorage:", e);
      }

      return newCase;
    },

    findCase: function (query) {
      if (!query) return null;
      var cleanQuery = query.trim().toUpperCase();
      try {
        var cases = JSON.parse(localStorage.getItem("SAATHI_GRIEVANCE_CASES") || "[]");
        var match = cases.find(function (c) {
          return (c.referenceId && c.referenceId.toUpperCase() === cleanQuery) ||
                 (c.docket && c.docket.toUpperCase() === cleanQuery) ||
                 (c.complainant && c.complainant.mobile === query.trim());
        });
        if (match) return match;
      } catch (e) {}

      if (cleanQuery.includes("NHAA") || cleanQuery === "9876543210" || cleanQuery.length >= 6) {
        return {
          referenceId: cleanQuery.startsWith("NHAA") ? cleanQuery : "NHAA-2026-DL-48192",
          docket: "NHAA/2026/09/1182",
          receivedAt: new Date(Date.now() - 86400000).toISOString(),
          complainant: { name: "Ramesh Kumar", category: "Scheduled Caste (SC)", location: "North West Delhi" },
          incident: { type: "Verbal abuse and denial of water facility access", date: "2026-09-02" },
          status: "Under Verification — Assigned to District Welfare Officer",
          safetyFlag: { active: false },
          priorityLevel: "High",
          saathiAssessment: {
            distressLevel: "Elevated",
            functionalImpact: "Moderate",
            citizenSummary: "Your responses indicated elevated stress regarding access to community resources."
          },
          timeline: [
            { t: "Sep 07, 10:15 AM", label: "Grievance registered online via NHAA Portal" },
            { t: "Sep 07, 10:16 AM", label: "SAATHI Impact Profile attached to docket" },
            { t: "Sep 08, 02:30 PM", label: "Notice issued to Block Development Officer for inquiry" },
            { t: "Sep 09, 11:00 AM", label: "Complainant statement verification scheduled" }
          ]
        };
      }
      return null;
    },

    assessTextWithIndicBERT: async function (text, threshold) {
      if (!text || !text.trim()) return null;
      try {
        var response = await fetch("http://localhost:8000/api/text/assess", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: text.trim(), threshold: threshold || 0.40 })
        });
        if (response.ok) {
          return await response.json();
        }
      } catch (err) {
        console.warn("IndicBERT API offline:", err);
      }
      return null;
    },

    calculatePriority: function (params) {
      var nominalWeights = { text: 0.30, acoustic: 0.20, checkin: 0.20, context: 0.30 };
      var categorySeverity = {
        physical_assault: 90.0,
        threat_intimidation: 85.0,
        sexual_harassment: 88.0,
        social_boycott: 75.0,
        land_dispute: 68.0,
        caste_slurs: 65.0,
        police_inaction: 60.0,
        procedural_roadblock: 50.0,
        relief_compensation: 30.0,
        administrative: 20.0,
        general_inquiry: 15.0,
        other: 45.0
      };

      var catKey = (params.category || "other").toString().trim().toLowerCase().replace(/[\s-]+/g, "_");
      var baseContext = categorySeverity[catKey] !== undefined ? categorySeverity[catKey] : 45.0;
      var recency = Number(params.recencyDays || 0);
      var adj = 0.0;
      if (recency <= 1) adj += 15.0;
      else if (recency <= 3) adj += 10.0;
      else if (recency <= 7) adj += 5.0;
      else if (recency > 30) adj -= 5.0;

      if (params.isOngoingRisk) adj += 10.0;
      if (params.vulnerableGroup) adj += 5.0;
      var contextScore = Math.max(5.0, Math.min(100.0, baseContext + adj));

      var available = {};
      if (params.textScore !== undefined && params.textScore !== null) {
        available.text = Math.max(0.0, Math.min(100.0, Number(params.textScore)));
      }
      if (params.acousticScore !== undefined && params.acousticScore !== null) {
        available.acoustic = Math.max(0.0, Math.min(100.0, Number(params.acousticScore)));
      }
      if (params.checkinScore !== undefined && params.checkinScore !== null) {
        available.checkin = Math.max(0.0, Math.min(100.0, Number(params.checkinScore)));
      }
      available.context = contextScore;

      var sumNominal = 0.0;
      for (var k in available) {
        sumNominal += nominalWeights[k];
      }
      if (sumNominal <= 0) sumNominal = 1.0;

      var breakdown = {};
      var fusedScore = 0.0;

      for (var m in nominalWeights) {
        var isAvail = available[m] !== undefined;
        if (isAvail) {
          var effW = Number((nominalWeights[m] / sumNominal).toFixed(4));
          var scoreVal = available[m];
          var contrib = Number((effW * scoreVal).toFixed(2));
          fusedScore += contrib;
          breakdown[m] = {
            available: true,
            nominalWeight: nominalWeights[m],
            effectiveWeight: effW,
            score: Number(scoreVal.toFixed(1)),
            contribution: contrib
          };
        } else {
          breakdown[m] = {
            available: false,
            nominalWeight: nominalWeights[m],
            effectiveWeight: 0.0,
            score: null,
            contribution: 0.0
          };
        }
      }

      var rawPriority = Math.round(fusedScore);
      var criticalOverride = false;
      if (params.safetyFlagActive) {
        criticalOverride = true;
      } else if (params.textScore >= 85.0 && params.detectedEmotions && params.detectedEmotions.length) {
        if (params.detectedEmotions.indexOf("immediate_danger") !== -1 || params.detectedEmotions.indexOf("panic") !== -1) {
          criticalOverride = true;
        }
      }

      var finalScore = 0;
      var priorityLevel = "Low";
      var flagActive = false;
      var flagType = "None";
      var flagDetail = "Standard verification";
      var suggestedAction = "";

      if (criticalOverride) {
        finalScore = Math.max(rawPriority, 92);
        priorityLevel = "Urgent";
        flagActive = true;
        flagType = params.safetyFlagType || "Immediate Safety Intervention";
        flagDetail = params.safetyFlagDetail || "Critical acute danger indicators detected in statement";
        suggestedAction = "Immediate human review & District Atrocity Cell alert — do not delay.";
      } else {
        finalScore = Math.max(0, Math.min(100, rawPriority));
        if (finalScore >= 75) {
          priorityLevel = "Urgent";
          suggestedAction = "Immediate human review & District Atrocity Cell alert — do not delay.";
        } else if (finalScore >= 50) {
          priorityLevel = "High";
          suggestedAction = "Prioritised human review; consider counselling and legal aid referral.";
        } else if (finalScore >= 25) {
          priorityLevel = "Moderate";
          suggestedAction = "Standard triage queue; monitor and offer psychological first-aid.";
        } else {
          priorityLevel = "Low";
          suggestedAction = "Continue normal grievance workflow and routine administrative docketing.";
        }
      }

      var availCount = Object.keys(available).length;
      var overallConfidence = "Medium";
      if (availCount >= 3 && (params.textConfidence === "High" || params.checkinConfidence === "High")) {
        overallConfidence = "High";
      } else if (availCount < 2) {
        overallConfidence = "Low";
      }

      var copilot = [];
      if (flagActive || priorityLevel === "Urgent") {
        copilot = [
          "Are you in a safe place to speak right now, or should I stay quietly on the line with you?",
          "I have raised an immediate priority safety flag. Our supervisor and the District Atrocity Cell are being alerted right now.",
          "Can you confirm your exact current location in case emergency field assistance is dispatched?"
        ];
      } else if (priorityLevel === "High") {
        copilot = [
          "Thank you for sharing these details with us. We have marked your docket for prioritized human review.",
          "Would you like us to link your case with Tele-MANAS emotional support or DLSA free legal aid services?",
          "Please let us know if the perpetrators are attempting any further contact or intimidation."
        ];
      } else if (priorityLevel === "Moderate") {
        copilot = [
          "We have recorded your grievance under the NHAA standard support workflow with linked verification.",
          "Your docket tracking reference is active, and our field team will verify the jurisdictional status.",
          "If your situation changes or you feel unsafe, call 14566 immediately to escalate."
        ];
      } else {
        copilot = [
          "Your inquiry docket has been successfully lodged in the National Helpline Against Atrocities registry.",
          "You can track status updates via your docket number on the official portal at any time.",
          "Is there any other information or documentation you would like attached to this docket?"
        ];
      }

      return {
        priorityScore: finalScore,
        priorityLevel: priorityLevel,
        overallConfidence: overallConfidence,
        criticalOverride: criticalOverride,
        safetyFlag: {
          active: flagActive,
          type: flagType,
          detail: flagDetail
        },
        breakdown: breakdown,
        suggestedAction: suggestedAction,
        copilotSuggestions: copilot
      };
    },

    calculatePriorityViaAPI: async function (params) {
      try {
        var res = await fetch("http://localhost:8000/api/priority/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text_score: params.textScore !== undefined ? params.textScore : null,
            text_confidence: params.textConfidence || "High",
            acoustic_score: params.acousticScore !== undefined ? params.acousticScore : null,
            acoustic_confidence: params.acousticConfidence || null,
            checkin_score: params.checkinScore !== undefined ? params.checkinScore : null,
            checkin_confidence: params.checkinConfidence || "High",
            category: params.category || "other",
            recency_days: Number(params.recencyDays || 0),
            is_ongoing_risk: !!params.isOngoingRisk,
            vulnerable_group: !!params.vulnerableGroup,
            safety_flag_active: !!params.safetyFlagActive,
            safety_flag_type: params.safetyFlagType || null,
            safety_flag_detail: params.safetyFlagDetail || null,
            detected_emotions: params.detectedEmotions || null
          })
        });
        if (res.ok) {
          var data = await res.json();
          return {
            priorityScore: data.priority_score,
            priorityLevel: data.priority_level,
            overallConfidence: data.overall_confidence,
            criticalOverride: data.critical_override,
            safetyFlag: data.safety_flag,
            breakdown: data.breakdown,
            suggestedAction: data.suggested_action,
            copilotSuggestions: data.copilot_suggestions
          };
        }
      } catch (e) {
        console.warn("Priority API offline, computing locally:", e);
      }
      return this.calculatePriority(params);
    },

    generateCaseQuestions: async function (params) {
      params = params || {};
      try {
        var res = await fetch("http://localhost:8000/api/questions/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: params.description || "",
            category: params.category || "threats_intimidation",
            location: params.location || "",
            detected_emotions: params.detectedEmotions || [],
            distress_score: params.distressScore !== undefined ? params.distressScore : null
          })
        });
        if (res.ok) {
          var data = await res.json();
          return {
            status: "success",
            source: data.source || "groq_ai",
            caseSummary: data.case_summary || "",
            questions: data.questions || []
          };
        }
      } catch (e) {
        console.warn("Questions API offline, providing local questions:", e);
      }
      return {
        status: "success",
        source: "domain_fallback",
        caseSummary: "Contextual screening for " + (params.category || "general").replace("_", " "),
        questions: this.getCategoryFallbackQuestions(params.category)
      };
    },

    getCategoryFallbackQuestions: function (category) {
      var bank = {
        threats_intimidation: [
          {
            id: "q_threat_proximity",
            dimension: "Perpetrator Proximity & Threat Recurrence",
            prompt: "Are the persons who threatened you living in the immediate vicinity or still attempting contact?",
            prompt_hi: "क्या आपको धमकाने वाले लोग आपके आसपास ही रहते हैं या अभी भी संपर्क करने की कोशिश कर रहे हैं?",
            options: [
              { label: "No current contact / Safe distance", label_hi: "अभी कोई संपर्क नहीं / सुरक्षित दूरी", value: "none", weight: 0 },
              { label: "Frequent passes / Indirect warnings", label_hi: "आसपास घूमते हैं / परोक्ष धमकियां", value: "moderate", weight: 1 },
              { label: "Armed / Outside home right now", label_hi: "हथियारबंद / अभी घर के बाहर मौजूद", value: "severe", weight: 3, flag_safety: true }
            ]
          },
          {
            id: "q_family_vulnerability",
            dimension: "Family & Household Safety",
            prompt: "Are women, children, or elderly family members in your household feeling terrified to leave home?",
            prompt_hi: "क्या आपके परिवार की महिलाएं, बच्चे या बुजुर्ग घर से बाहर निकलने में अत्यधिक डर महसूस कर रहे हैं?",
            options: [
              { label: "Able to move freely", label_hi: "सामान्य आवागमन संभव है", value: "none", weight: 0 },
              { label: "Anxious / Moving only accompanied", label_hi: "चिंता में हैं / साथ में ही निकलते हैं", value: "moderate", weight: 1 },
              { label: "Completely confined inside home", label_hi: "पूरी तरह घर में कैद / बाहर निकलना नामुमकिन", value: "severe", weight: 3 }
            ]
          },
          {
            id: "q_police_complaint",
            dimension: "Police Protection & Legal Accessibility",
            prompt: "Have you been able to safely approach the local police station to report this intimidation?",
            prompt_hi: "क्या आप इस धमकी की रिपोर्ट दर्ज कराने के लिए स्थानीय थाने तक सुरक्षित पहुंच पाए हैं?",
            options: [
              { label: "Report lodged without hindrance", label_hi: "बिना बाधा रिपोर्ट दर्ज कराई", value: "none", weight: 0 },
              { label: "Threatened not to visit police station", label_hi: "थाने न जाने की धमकी मिली", value: "moderate", weight: 2 },
              { label: "Police refused FIR or pressured compromise", label_hi: "पुलिस ने एफआईआर नहीं लिखी / समझौते का दबाव", value: "severe", weight: 3 }
            ]
          }
        ],
        physical_violence: [
          {
            id: "q_medical_attention",
            dimension: "Physical Injury & Emergency Medical Care",
            prompt: "Have the injured persons received urgent medical examination and treatment (MLC)?",
            prompt_hi: "क्या घायल व्यक्तियों को तत्काल चिकित्सकीय जांच और उपचार (एमएलसी) मिल चुका है?",
            options: [
              { label: "Minor harm / Medical care completed", label_hi: "हल्की चोट / उपचार हो चुका है", value: "none", weight: 0 },
              { label: "Injuries present / Seeking medical care", label_hi: "चोटें हैं / अस्पताल जाने की तैयारी", value: "moderate", weight: 2 },
              { label: "Severe trauma / Urgent hospitalization required", label_hi: "गंभीर चोटें / तुरंत अस्पताल में भर्ती की जरूरत", value: "severe", weight: 3, flag_safety: true }
            ]
          },
          {
            id: "q_ongoing_assault",
            dimension: "Ongoing Attack & Mobilization",
            prompt: "Is there an active mob or group gathered near your settlement posing continued danger?",
            prompt_hi: "क्या आपके टोले या बस्ती के पास अभी भी भीड़ जमा है जिससे लगातार खतरा बना हुआ है?",
            options: [
              { label: "Attackers dispersed", label_hi: "हमलावर चले गए हैं", value: "none", weight: 0 },
              { label: "Tension persists / Aggressors nearby", label_hi: "तनाव बना हुआ है / हमलावर आसपास हैं", value: "moderate", weight: 1 },
              { label: "Active siege / Urgent police PCR needed", label_hi: "सक्रिय घेराबंदी / तुरंत पुलिस पीसीआर की आवश्यकता", value: "severe", weight: 3, flag_safety: true }
            ]
          },
          {
            id: "q_shelter_security",
            dimension: "Shelter & Property Destruction",
            prompt: "Has your dwelling or source of livelihood suffered physical destruction or arson?",
            prompt_hi: "क्या आपके घर, झोपड़ी या आजीविका के साधन को तोड़ा-फोड़ा या आग लगाई गई है?",
            options: [
              { label: "No property damage", label_hi: "कोई संपत्ति नुकसान नहीं", value: "none", weight: 0 },
              { label: "Partial property damage", label_hi: "आंशिक नुकसान हुआ", value: "moderate", weight: 1 },
              { label: "Home destroyed / Displaced", label_hi: "घर नष्ट कर दिया / बेघर हो गए", value: "severe", weight: 3 }
            ]
          }
        ],
        caste_abuse: [
          {
            id: "q_public_humiliation",
            dimension: "Public Humiliation & Community Impact",
            prompt: "Did the caste slurs and insult occur in a public view or village square?",
            prompt_hi: "क्या जातिसूचक अपशब्द और अपमान सार्वजनिक स्थान या चौपाल में लोगों के सामने हुआ?",
            options: [
              { label: "Private confrontation", label_hi: "निजी बातचीत में हुआ", value: "none", weight: 0 },
              { label: "Public location with witnesses", label_hi: "सार्वजनिक स्थल पर गवाहों के सामने", value: "moderate", weight: 1 },
              { label: "Severe public humiliation / Recording made", label_hi: "गंभीर सार्वजनिक अपमान / वीडियो बनाया गया", value: "severe", weight: 2 }
            ]
          },
          {
            id: "q_retaliation_fear",
            dimension: "Fear of Retaliation",
            prompt: "Are the dominant accused threatening you with ostracization if you report to 14566 or police?",
            prompt_hi: "क्या दबंग आरोपी शिकायत करने पर सामाजिक या शारीरिक नुकसान की धमकी दे रहे हैं?",
            options: [
              { label: "No subsequent threats", label_hi: "बाद में कोई धमकी नहीं", value: "none", weight: 0 },
              { label: "Pressure to compromise", label_hi: "समझौते का दबाव बना रहे हैं", value: "moderate", weight: 1 },
              { label: "Threat of physical violence or eviction", label_hi: "हमले या गांव से निकालने की धमकी", value: "severe", weight: 3, flag_safety: true }
            ]
          },
          {
            id: "q_mental_anguish",
            dimension: "Dignity & Acute Mental Anguish",
            prompt: "Is the victim experiencing acute emotional trauma, panic attacks, or overwhelming shame?",
            prompt_hi: "क्या पीड़ित इस अपमान के कारण अत्यधिक मानसिक तनाव, घबराहट या अवसाद से गुजर रहे हैं?",
            options: [
              { label: "Coping with community support", label_hi: "परिवार के सहयोग से संभाल रहे हैं", value: "none", weight: 0 },
              { label: "High anxiety / Unable to sleep", label_hi: "तीव्र चिंता / नींद नहीं आ रही", value: "moderate", weight: 2 },
              { label: "Severe crisis / Tele-MANAS counselling needed", label_hi: "अत्यधिक अवसाद / तुरंत टेली-मानस काउंसलिंग चाहिए", value: "severe", weight: 3 }
            ]
          }
        ],
        denial_access: [
          {
            id: "q_water_access",
            dimension: "Essential Public Resource Access",
            prompt: "Is access to drinking water wells, handpumps, or cremation grounds currently blocked for you?",
            prompt_hi: "क्या आपके लिए पीने के पानी के कुएं, हैंडपंप या श्मशान घाट का रास्ता अभी भी रोका गया है?",
            options: [
              { label: "Access restored", label_hi: "रास्ता/पानी फिर चालू हो गया", value: "none", weight: 0 },
              { label: "Forced to fetch water from distant areas", label_hi: "दूर से पानी लाने को मजबूर हैं", value: "moderate", weight: 2 },
              { label: "Strict armed blockade of water source", label_hi: "पानी के स्रोत पर सख्त पाबंदी व पहरा", value: "severe", weight: 3 }
            ]
          },
          {
            id: "q_daily_subsistence",
            dimension: "Impact on Family Survival & Health",
            prompt: "Are children or elderly family members unable to obtain drinking water or daily necessities?",
            prompt_hi: "क्या परिवार के बच्चों या बुजुर्गों को पीने का पानी या दैनिक जरूरतें नहीं मिल पा रही हैं?",
            options: [
              { label: "Alternative arrangements possible", label_hi: "वैकल्पिक व्यवस्था संभव है", value: "none", weight: 0 },
              { label: "Significant physical struggle", label_hi: "काफी परेशानी हो रही है", value: "moderate", weight: 1 },
              { label: "Critical shortage / Immediate water supply needed", label_hi: "गंभीर संकट / तुरंत टैंकर या प्रशासन हस्तक्षेप चाहिए", value: "severe", weight: 3, flag_safety: true }
            ]
          },
          {
            id: "q_administration_intervention",
            dimension: "Local Administration Response",
            prompt: "Has the Gram Panchayat or Block Development Officer taken any action to remove the blockade?",
            prompt_hi: "क्या ग्राम पंचायत या बीडीओ ने रास्ता खुलवाने के लिए कोई कदम उठाया है?",
            options: [
              { label: "Local authorities intervened", label_hi: "अधिकारियों ने हस्तक्षेप किया", value: "none", weight: 0 },
              { label: "Complaints ignored by local pradhan", label_hi: "प्रधान या पंचायत ने शिकायत नजरअंदाज की", value: "moderate", weight: 2 },
              { label: "Local officials colluding with dominant group", label_hi: "स्थानीय प्रशासन दबंगों का साथ दे रहा है", value: "severe", weight: 3 }
            ]
          }
        ],
        economic_boycott: [
          {
            id: "q_boycott_scope",
            dimension: "Social & Economic Ostracization",
            prompt: "Are local village shops, daily wage work, or essential services completely blocked for your community?",
            prompt_hi: "क्या गांव की दुकानें, मजदूरी या आवश्यक सेवाएं आपके समाज के लिए पूरी तरह बंद कर दी गई हैं?",
            options: [
              { label: "Partial friction", label_hi: "हल्का तनाव", value: "none", weight: 0 },
              { label: "Wage work stopped / Shops refuse goods", label_hi: "मजदूरी रोकी / दुकानों से सामान नहीं दे रहे", value: "moderate", weight: 2 },
              { label: "Complete social boycott decree", label_hi: "पूर्ण सामाजिक बहिष्कार का फरमान", value: "severe", weight: 3 }
            ]
          },
          {
            id: "q_starvation_risk",
            dimension: "Livelihood & Subsistence Threat",
            prompt: "Is your household facing immediate food shortage or financial ruin due to this boycott?",
            prompt_hi: "क्या इस बहिष्कार के कारण आपके परिवार को राशन या आजीविका का गंभीर संकट आ गया है?",
            options: [
              { label: "Supplies available for now", label_hi: "फिलहाल कुछ समय का प्रबंध है", value: "none", weight: 0 },
              { label: "Under severe financial strain", label_hi: "गंभीर आर्थिक संकट में हैं", value: "moderate", weight: 1 },
              { label: "Acute emergency / Immediate relief needed", label_hi: "अति संकट / तत्काल राहत व राशन की दरकार", value: "severe", weight: 3 }
            ]
          },
          {
            id: "q_retaliation_boycott",
            dimension: "Coercion to Withdraw Complaint",
            prompt: "Are village leaders conditioning the end of the boycott on withdrawing your SC/ST complaint?",
            prompt_hi: "क्या गांव के प्रभावशाली लोग शिकायत वापस लेने की शर्त पर बहिष्कार खत्म करने का दबाव बना रहे हैं?",
            options: [
              { label: "No such condition mentioned", label_hi: "ऐसी कोई शर्त नहीं रखी गई", value: "none", weight: 0 },
              { label: "Informal pressure to compromise", label_hi: "दबाव बनाया जा रहा है", value: "moderate", weight: 1 },
              { label: "Strict ultimatum backed by threats", label_hi: "धमकी भरा सख्त अल्टीमेटम दिया गया है", value: "severe", weight: 3, flag_safety: true }
            ]
          }
        ],
        land_dispute: [
          {
            id: "q_land_occupation",
            dimension: "Physical Occupation & Destruction",
            prompt: "Is your government-allotted patta land currently physically occupied or crops damaged by force?",
            prompt_hi: "क्या आपकी पट्टे की जमीन पर दबंगों ने जबरन कब्जा कर लिया है या फसल नष्ट कर दी है?",
            options: [
              { label: "Dispute over boundary / Not occupied", label_hi: "मेड़ का विवाद / कब्जा नहीं हुआ", value: "none", weight: 0 },
              { label: "Attempted encroachment / Crops damaged", label_hi: "कब्जे की कोशिश / फसल बर्बाद की", value: "moderate", weight: 2 },
              { label: "Full forceful occupation with machinery", label_hi: "ट्रैक्टर लगाकर पूरी जमीन पर जबरन कब्जा", value: "severe", weight: 3 }
            ]
          },
          {
            id: "q_arms_threat",
            dimension: "Armed Intimidation at Farmland",
            prompt: "Were weapons, firearms, or tractors used to threaten your family when you tried to enter your land?",
            prompt_hi: "जब आप अपने खेत पर गए तो क्या लाठी, हथियार या ट्रैक्टर से आपको जान से मारने की धमकी दी गई?",
            options: [
              { label: "Verbal altercation only", label_hi: "केवल कहासुनी हुई", value: "none", weight: 0 },
              { label: "Physical pushing / Threats", label_hi: "हाथापाई और धमकियां दी गईं", value: "moderate", weight: 1 },
              { label: "Armed assault / Severe death threat", label_hi: "हथियार लहराए / जान से मारने की खुली धमकी", value: "severe", weight: 3, flag_safety: true }
            ]
          },
          {
            id: "q_revenue_records",
            dimension: "Revenue / Legal Documentation Status",
            prompt: "Do you possess legal patta documents, and has the Revenue Tehsildar / Lekhpal verified your title?",
            prompt_hi: "क्या आपके पास जमीन के वैध पट्टा कागजात हैं, और क्या तहसीलदार/लेखपाल ने नाप की है?",
            options: [
              { label: "Valid patta / Records in hand", label_hi: "वैध पट्टा और कागजात मौजूद हैं", value: "none", weight: 0 },
              { label: "Paperwork pending verification", label_hi: "कागजी कार्रवाई लंबित है", value: "moderate", weight: 1 },
              { label: "Lekhpal / Local officials refusing demarcation", label_hi: "लेखपाल/प्रशासन दबंगों के डर से नाप नहीं कर रहा", value: "severe", weight: 2 }
            ]
          }
        ]
      };
      return bank[category] || bank["threats_intimidation"];
    },

    generateRecommendations: async function (params) {
      try {
        var res = await fetch("http://localhost:8000/api/recommendations/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: params.description || "",
            category: params.category || "threats_intimidation",
            location: params.location || "",
            active_threat: params.activeThreat || false,
            dynamic_answers: params.dynamicAnswers || []
          })
        });
        if (res.ok) {
          var data = await res.json();
          return {
            status: "success",
            source: data.source || "groq_ai",
            nhaaMessage: data.nhaa_message || "",
            recommendations: data.recommendations || []
          };
        }
      } catch (e) {
        console.warn("Recommendations API offline, using local fallback:", e);
      }
      return this.getLocalRecommendationsFallback(params.category, params.location, params.activeThreat);
    },

    getLocalRecommendationsFallback: function (category, location, activeThreat) {
      var locText = location ? (" in " + location) : "";
      var defaultMessage = "Your grievance has been officially registered with the National Helpline Against Atrocities (14566). A priority docket has been assigned to the District Atrocity Welfare Cell and local Nodal Officer" + locText + ". The administration is actively processing your complaint under the SC/ST (Prevention of Atrocities) Act framework. An official will review your case and reach out for verification and necessary field support. Please utilize the linked welfare and legal aid services below for immediate assistance.";

      var defaultRecs = [
        {
          id: "rec_legal_aid",
          title: "Free Legal Representation & FIR Lodging",
          title_hi: "निःशुल्क कानूनी सहायता एवं एफआईआर दर्ज कराना",
          badge: "Free Legal Support",
          description: "Under Section 15A of the SC/ST (PoA) Act, you are entitled to free legal aid and advocate representation from the District Legal Services Authority (DLSA).",
          action_label: "Call DLSA 15100",
          action_url: "tel:15100",
          type: "legal"
        },
        {
          id: "rec_telemanas",
          title: "Tele-MANAS Confidential Psychological Counselling",
          title_hi: "टेली-मानस 24x7 मानसिक स्वास्थ्य परामर्श",
          badge: "24x7 Mental Health",
          description: "Free, confidential emotional and crisis support available in Hindi and English around the clock provided by the Ministry of Health.",
          action_label: "Call Tele-MANAS 14416",
          action_url: "tel:14416",
          type: "mental_health"
        },
        {
          id: "rec_protection",
          title: activeThreat ? "Emergency Police Protection & Escort" : "Police Protection & Nodal Officer Escalation",
          title_hi: activeThreat ? "तत्काल पुलिस सुरक्षा एवं एस्कॉर्ट" : "पुलिस सुरक्षा एवं नोडल अधिकारी निगरानी",
          badge: activeThreat ? "Immediate Safety" : "Safety Protocol",
          description: activeThreat ? "Direct escalation to local SC/ST Protection Cell and senior police for urgent physical security." : "If perpetrators issue continuous threats, local police are mandated to provide immediate patrol.",
          action_label: "Emergency 112",
          action_url: "tel:112",
          type: "emergency"
        },
        {
          id: "rec_nhaa",
          title: "NHAA District Officer Case Follow-up",
          title_hi: "NHAA जिला अधिकारी केस अनुवर्ती सहायता",
          badge: "Government Tracking",
          description: "Your docket has been linked to the District Welfare Officer. For real-time updates or to report further developments, speak with the helpline team.",
          action_label: "Call NHAA 14566",
          action_url: "tel:14566",
          type: "welfare"
        }
      ];

      return {
        status: "success",
        source: "domain_fallback",
        nhaaMessage: defaultMessage,
        recommendations: defaultRecs
      };
    },

    _getDaysSinceIncident: function (dateStr) {
      if (!dateStr) return 0;
      var d = new Date(dateStr);
      if (isNaN(d.getTime())) return 0;
      var now = new Date();
      var diffMs = now.getTime() - d.getTime();
      return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    }
  };


  window.SaathiService = SaathiService;
})(window);

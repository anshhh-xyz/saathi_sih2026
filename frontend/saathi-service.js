/**
 * SAATHI Service Layer
 * -------------------------------------------------------------
 * Responsible for:
 * 1. Context Analysis of existing NHAA grievance data (WHAT happened)
 * 2. Adaptive Question Selection (assessing HOW the person is affected)
 * 3. Non-clinical decision-support signal evaluation (for internal triage)
 * 4. Contextual Support Recommendations (combining incident + human impact)
 * 5. Case persistence to localStorage for sync with Operator Dashboard
 */

(function (window) {
  "use strict";

  // Comprehensive Question Bank across Stress & Trauma Dimensions
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
    /**
     * Analyzes existing NHAA grievance information.
     * Determines initial priority and dynamically tailors question sequencing.
     */
    analyzeContext: function (nhaaContext) {
      var incidentType = nhaaContext.incidentType || "";
      var recencyDays = this._getDaysSinceIncident(nhaaContext.incidentDate);
      var relationship = nhaaContext.relationshipToPerpetrator || "";
      var isHighPhysicalThreat = incidentType === "physical_assault" || incidentType === "threat_intimidation";
      var isRecent = recencyDays <= 7;
      var isOngoingRisk = relationship === "neighbor" || relationship === "landlord" || relationship === "employer";

      var questionSequence = [];

      if (isHighPhysicalThreat && isRecent) {
        // CASE B: Recent physical assault + threats -> Prioritize safety, fear, sleep, functional impact
        questionSequence = ["immediate_safety", "emotional_distress", "sleep_disturbance", "functional_impact"];
      } else if (incidentType === "social_boycott" || recencyDays > 30) {
        // CASE C: Repeated harassment/chronic stress over period -> Avoidance, functional, sleep, emotional
        questionSequence = ["functional_impact", "avoidance", "sleep_disturbance", "emotional_distress"];
      } else {
        // CASE A: Verbal harassment, older incident, or standard -> Emotional distress, sleep, intrusive memories, functional impact
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

    /**
     * Returns the question object for a given ID
     */
    getQuestion: function (questionId) {
      return QUESTION_BANK[questionId] || null;
    },

    /**
     * Determines if an adaptive shift is required after an answer
     */
    getNextQuestionId: function (sequence, currentIndex, currentAnswers) {
      if (currentIndex + 1 < sequence.length) {
        return sequence[currentIndex + 1];
      }
      return null;
    },

    /**
     * Evaluates assessment responses and computes non-clinical triage signals + recommendations
     */
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

      // Contextual safety escalation
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

      // Generate contextual recommendations based on WHAT happened + HOW citizen is affected
      var recommendations = this._generateRecommendations(nhaaContext, {
        distressLevel: distressLevel,
        traumaIndicators: traumaIndicators,
        functionalImpact: functionalImpact,
        safetyFlag: safetyFlag
      });

      // Reassuring citizen summary (non-clinical!)
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

    /**
     * Generates support recommendations tailored to incident + psychological impact
     */
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

    /**
     * Persists grievance case to localStorage so Operator Dashboard receives it
     */
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

    /**
     * Retrieve a case by Reference ID or mobile number
     */
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

      // Fallback default sample case for instant demo testing
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

window.SAATHI_MOCK_CASES = [
  {
    id: "SAATHI-483920",
    docket: "NHAA/2026/09/84920",
    channel: "14566 Helpline (Voice)",
    language: "Hindi / Hinglish",
    receivedAt: "2026-09-14T21:15:00+05:30",
    complainant: {
      name: "Ramesh Kumar",
      mobile: "+91 98765 43210",
      role: "Victim (Direct Complainant)",
      category: "Scheduled Caste (SC - Chamar)",
      gender: "Male, 34 yrs"
    },
    incident: {
      location: "Main Square Water Facility, Alipur Village",
      policeStation: "PS Alipur",
      district: "North West Delhi",
      state: "NCT of Delhi",
      date: "2026-09-13",
      category: "physical_violence",
      categoryLabel: "Physical Assault & Armed Threats",
      description: "Yesterday evening, I was stopped at the community water facility by local influential persons who used derogatory caste remarks, pushed me, and threatened me and my family with country-made firearms if we reported to the authorities. They are still roaming outside our basti."
    },
    safetyFlag: {
      active: true,
      type: "Immediate Danger & Armed Intimidation",
      detail: "Armed perpetrators stationed outside complainant settlement issuing lethal threats."
    },
    priorityScore: 94,
    priorityLevel: "Urgent",
    overallConfidence: "High",
    confidence: "High",
    caseSummary: "Physical assault, caste slurs, and armed firearm intimidation at community water facility in Alipur.",
    questionsSource: "groq_ai",
    statutorySections: "Section 3(1)(r), 3(1)(s), 3(1)(za), 3(2)(va) of SC/ST (PoA) Act; Section 109 BNS",
    reliefEntitlement: "₹8,25,000 under Rule 12(4) (50% upon FIR registration, 25% on charge sheet, 25% on trial)",
    assessment: {
      textScore: 92,
      acousticScore: 88,
      detectedEmotions: ["acute_fear (89%)", "intimidation (84%)", "trauma (92%)"],
      checkinScore: 90,
      contextScore: 95
    },
    signals: {
      text: { available: true, confidence: "High", note: "IndicBERT v3: 92/100 · High distress, explicit firearm intimidation keywords detected." },
      acoustic: { available: true, confidence: "High", note: "Acoustic: Pitch jitter 4.2%, speech rate 180 wpm, voice tremors." },
      checkin: { available: true, confidence: "High", note: "Dynamic check-in score: 90/100 · Ongoing life threat acknowledged." }
    },
    breakdown: {
      text: { available: true, effectiveWeight: 0.30, score: 92, contribution: 27.6 },
      acoustic: { available: true, effectiveWeight: 0.20, score: 88, contribution: 17.6 },
      checkin: { available: true, effectiveWeight: 0.20, score: 90, contribution: 18.0 },
      context: { available: true, effectiveWeight: 0.30, score: 95, contribution: 28.5 }
    },
    dynamicAnswers: [
      { dimension: "Perpetrator Proximity", selectedLabel: "Armed / Outside home right now", flagSafety: true },
      { dimension: "Family & Household Safety", selectedLabel: "Completely confined inside home in terror", flagSafety: true },
      { dimension: "Police Protection Access", selectedLabel: "Police refused FIR or pressured compromise", flagSafety: true }
    ],
    saathiAssessment: {
      distressLevel: "Elevated",
      traumaIndicators: "Acute Trauma / Imminent Danger",
      functionalImpact: "Severe (Paralyzed Movement)",
      safetyFlag: true
    },
    suggestedAction: "Immediate emergency police dispatch to District Nodal Officer & SC/ST Protection Cell.",
    copilotSuggestions: [
      "Are you in a safe room right now? Emergency 112 and local nodal escort are being notified.",
      "Stay indoors; our District Atrocity Cell supervisor is connecting directly with the SHO.",
      "We have initiated Rule 12(4) immediate protection and statutory relief protocol."
    ],
    timeline: [
      { t: "21:15", label: "Helpline intake recorded via 14566 Voice Gateway" },
      { t: "21:16", label: "IndicBERT neural triage flagged acute fear & firearm threat (92/100)" },
      { t: "21:17", label: "Safety Flag activated — armed perpetrators near basti" },
      { t: "21:18", label: "Docket escalated to Senior Operator Queue with Emergency Override" }
    ]
  },
  {
    id: "SAATHI-483915",
    docket: "NHAA/2026/09/84915",
    channel: "Web Intake Portal",
    language: "Hindi",
    receivedAt: "2026-09-14T20:30:00+05:30",
    complainant: {
      name: "Sunita Devi",
      mobile: "+91 98112 34567",
      role: "Victim (Land Title Holder)",
      category: "Scheduled Caste (SC - Jatav)",
      gender: "Female, 42 yrs"
    },
    incident: {
      location: "Khasra No. 142, Sadabad Farmland",
      policeStation: "PS Sadabad",
      district: "Hathras",
      state: "Uttar Pradesh",
      date: "2026-09-12",
      category: "land_dispute",
      categoryLabel: "Encroachment & Arson of Patta Land",
      description: "Influential landlords brought tractors and bulldozed our standing crop on patta land allotted by the government, and set our boundary fence on fire. When we objected, they assaulted my brother and threatened to burn our house."
    },
    safetyFlag: {
      active: true,
      type: "Arson & Criminal Intimidation",
      detail: "Standing crop bulldozed and boundary fence set on fire with threat of residential arson."
    },
    priorityScore: 88,
    priorityLevel: "Urgent",
    overallConfidence: "High",
    confidence: "High",
    caseSummary: "Forcible dispossession of allotted SC patta land with arson and physical assault in Hathras.",
    questionsSource: "groq_ai",
    statutorySections: "Section 3(1)(f), 3(1)(g), 3(2)(iv), 3(2)(v) of SC/ST (PoA) Act; Section 326 BNS",
    reliefEntitlement: "₹8,25,000 for arson and loss of agricultural land possession under PoA Rules Schedule I",
    assessment: {
      textScore: 86,
      acousticScore: null,
      detectedEmotions: ["anger (82%)", "fear (86%)", "helplessness (78%)"],
      checkinScore: 85,
      contextScore: 92
    },
    signals: {
      text: { available: true, confidence: "High", note: "IndicBERT v3: 86/100 · Agricultural arson, destruction of property & bodily threat detected." },
      acoustic: { available: false, confidence: "N/A", note: "Web portal intake (re-normalized across active modalities)." },
      checkin: { available: true, confidence: "High", note: "Dynamic check-in: 85/100 · Loss of livelihood & residential arson threat." }
    },
    breakdown: {
      text: { available: true, effectiveWeight: 0.375, score: 86, contribution: 32.3 },
      acoustic: { available: false, effectiveWeight: 0.0, score: null, contribution: 0.0 },
      checkin: { available: true, effectiveWeight: 0.25, score: 85, contribution: 21.3 },
      context: { available: true, effectiveWeight: 0.375, score: 92, contribution: 34.5 }
    },
    dynamicAnswers: [
      { dimension: "Physical Occupation & Destruction", selectedLabel: "Full forceful occupation with machinery & arson", flagSafety: true },
      { dimension: "Armed Intimidation at Farmland", selectedLabel: "Armed assault / Severe death threat", flagSafety: true },
      { dimension: "Revenue Records Status", selectedLabel: "Valid patta / Records in hand", flagSafety: false }
    ],
    saathiAssessment: {
      distressLevel: "Elevated",
      traumaIndicators: "High Trauma / Arson Threat",
      functionalImpact: "High (Agricultural Livelihood Destroyed)",
      safetyFlag: true
    },
    suggestedAction: "Alert Sub-Divisional Magistrate (SDM) Sadabad for land restoration and police protection.",
    copilotSuggestions: [
      "Has your brother received medical examination (MLC) at the Government Hospital?",
      "We are notifying the District Magistrate to enforce Section 3(1)(g) land restitution immediately.",
      "A DLSA legal aid advocate has been assigned to petition the Special Atrocity Court."
    ],
    timeline: [
      { t: "20:30", label: "Web grievance lodged with land documentation attached" },
      { t: "20:32", label: "IndicBERT identified land dispossession and arson triggers" },
      { t: "20:33", label: "Automatic priority score fused: 88/100 (Urgent)" }
    ]
  },
  {
    id: "SAATHI-483902",
    docket: "NHAA/2026/09/84902",
    channel: "14566 Helpline (Voice)",
    language: "Hindi / Rajasthani",
    receivedAt: "2026-09-14T19:45:00+05:30",
    complainant: {
      name: "Mohan Lal Meghwal",
      mobile: "+91 94140 88219",
      role: "Informer (Parent & Community Elder)",
      category: "Scheduled Caste (SC - Meghwal)",
      gender: "Male, 48 yrs"
    },
    incident: {
      location: "Government Senior Secondary School, Bayana",
      policeStation: "PS Bayana",
      district: "Bharatpur",
      state: "Rajasthan",
      date: "2026-09-14",
      category: "caste_abuse",
      categoryLabel: "Public Caste Abuse & Denial of School Access",
      description: "Influential village panchayat members publicly insulted our children using abusive caste slurs, threw their mid-day meal thalis, and locked the village school gates refusing entry to SC students. The local police station refused to register our FIR without an order from the SDM."
    },
    safetyFlag: {
      active: false,
      type: "None",
      detail: "No active physical assault in progress; severe institutional obstruction and public humiliation."
    },
    priorityScore: 74,
    priorityLevel: "High",
    overallConfidence: "High",
    confidence: "High",
    caseSummary: "Public caste humiliation of Dalit students and unlawful school gate blockade in Bayana.",
    questionsSource: "groq_ai",
    statutorySections: "Section 3(1)(r), 3(1)(s), 3(1)(za) of SC/ST (PoA) Act; Section 4 PoA (Dereliction by Public Servant)",
    reliefEntitlement: "₹1,00,000 to ₹4,00,000 for public humiliation and denial of public institution access",
    assessment: {
      textScore: 78,
      acousticScore: 70,
      detectedEmotions: ["humiliation (88%)", "distress (76%)", "helplessness (72%)"],
      checkinScore: 75,
      contextScore: 80
    },
    signals: {
      text: { available: true, confidence: "High", note: "IndicBERT v3: 78/100 · Caste humiliation, denial of public education & police inaction reported." },
      acoustic: { available: true, confidence: "Medium", note: "Acoustic: Controlled voice, steady narrative, moderate distress tone." },
      checkin: { available: true, confidence: "High", note: "Dynamic check-in: 75/100 · High functional impact on children's education." }
    },
    breakdown: {
      text: { available: true, effectiveWeight: 0.30, score: 78, contribution: 23.4 },
      acoustic: { available: true, effectiveWeight: 0.20, score: 70, contribution: 14.0 },
      checkin: { available: true, effectiveWeight: 0.20, score: 75, contribution: 15.0 },
      context: { available: true, effectiveWeight: 0.30, score: 80, contribution: 24.0 }
    },
    dynamicAnswers: [
      { dimension: "Perpetrator Proximity", selectedLabel: "They are nearby or have threatened but are not armed", flagSafety: false },
      { dimension: "Institutional Obstacles", selectedLabel: "Authorities have denied filing FIR or actively prevented action", flagSafety: false },
      { dimension: "Family & Educational Impact", selectedLabel: "Children cannot attend school at all; family lives in constant fear", flagSafety: false }
    ],
    saathiAssessment: {
      distressLevel: "Elevated",
      traumaIndicators: "Moderate Trauma (Social Humiliation)",
      functionalImpact: "High (Children Barred from Education)",
      safetyFlag: false
    },
    suggestedAction: "Direct escalation to Superintendent of Police (SP) Bharatpur & District Education Officer.",
    copilotSuggestions: [
      "We are escalating the SHO's refusal under Section 4 of the SC/ST Act directly to the SP.",
      "The District Education Officer is being instructed to ensure school entry and police protection.",
      "Tele-MANAS counsellors can provide psychological support for the affected students."
    ],
    timeline: [
      { t: "19:45", label: "Helpline intake completed" },
      { t: "19:47", label: "IndicBERT evaluated public humiliation & education denial indicators" },
      { t: "19:48", label: "Prioritized into High Queue (Score 74)" }
    ]
  },
  {
    id: "SAATHI-483888",
    docket: "NHAA/2026/09/84888",
    channel: "Portal (Chat / Assisted)",
    language: "Tamil / English",
    receivedAt: "2026-09-14T18:10:00+05:30",
    complainant: {
      name: "K. Murugan",
      mobile: "+91 97890 12345",
      role: "Informer (Youth Committee Coordinator)",
      category: "Scheduled Caste (SC - Adi Dravidar)",
      gender: "Male, 29 yrs"
    },
    incident: {
      location: "Nallampalli Village, Dharmapuri",
      policeStation: "PS Nallampalli",
      district: "Dharmapuri",
      state: "Tamil Nadu",
      date: "2026-09-11",
      category: "economic_boycott",
      categoryLabel: "Social & Economic Boycott of Dalit Colony",
      description: "Following a temple procession dispute, the village council imposed a blanket fine of Rs. 5000 on anyone interacting with our community. Local grocery stores are refusing to sell milk and rations to our families, and bus drivers are ordered not to stop at our colony."
    },
    safetyFlag: {
      active: false,
      type: "None",
      detail: "Collective social and economic blockade; non-violent but severe statutory violation."
    },
    priorityScore: 68,
    priorityLevel: "High",
    overallConfidence: "High",
    confidence: "High",
    caseSummary: "Social and economic boycott cutting off food, milk, and public transport access in Dharmapuri.",
    questionsSource: "groq_ai",
    statutorySections: "Section 3(1)(zc) of SC/ST (PoA) Act (Imposing Economic/Social Boycott - Non Bailable)",
    reliefEntitlement: "Immediate administrative food supplies and interim relief under Rule 12(4)",
    assessment: {
      textScore: 70,
      acousticScore: null,
      detectedEmotions: ["isolation (84%)", "distress (70%)", "helplessness (65%)"],
      checkinScore: 70,
      contextScore: 75
    },
    signals: {
      text: { available: true, confidence: "High", note: "IndicBERT v3: 70/100 · Economic blockade, denial of rations & social boycott verified." },
      acoustic: { available: false, confidence: "N/A", note: "Text portal intake mode." },
      checkin: { available: true, confidence: "High", note: "Dynamic check-in: 70/100 · Food insecurity and mobility restriction reported." }
    },
    breakdown: {
      text: { available: true, effectiveWeight: 0.375, score: 70, contribution: 26.3 },
      acoustic: { available: false, effectiveWeight: 0.0, score: null, contribution: 0.0 },
      checkin: { available: true, effectiveWeight: 0.25, score: 70, contribution: 17.5 },
      context: { available: true, effectiveWeight: 0.375, score: 75, contribution: 28.1 }
    },
    dynamicAnswers: [
      { dimension: "Economic Obstruction", selectedLabel: "Complete denial of groceries, rations, and water supplies", flagSafety: false },
      { dimension: "Mobility & Transport", selectedLabel: "Buses and autos ordered not to enter our colony", flagSafety: false },
      { dimension: "Panchayat Coercion", selectedLabel: "Blanket community fines imposed for interacting with us", flagSafety: false }
    ],
    saathiAssessment: {
      distressLevel: "Moderate",
      traumaIndicators: "Moderate (Social Isolation)",
      functionalImpact: "High (Severe Food & Essential Supply Blockade)",
      safetyFlag: false
    },
    suggestedAction: "Issue urgent memo to District Collector Dharmapuri for emergency provisions and anti-boycott enforcement.",
    copilotSuggestions: [
      "Under Section 3(1)(zc), economic boycott is a non-bailable offense carrying up to 5 years imprisonment.",
      "Recommending the District Collector dispatch revenue inspectors with food rations today.",
      "DLSA Dharmapuri is being notified to file a public protection petition."
    ],
    timeline: [
      { t: "18:10", label: "Intake recorded via Web Portal" },
      { t: "18:12", label: "Triage algorithm detected statutory boycott criteria under Section 3(1)(zc)" },
      { t: "18:14", label: "Priority assigned: High (Score 68)" }
    ]
  },
  {
    id: "SAATHI-483860",
    docket: "NHAA/2026/09/84860",
    channel: "14566 Helpline (Voice)",
    language: "Hindi",
    receivedAt: "2026-09-14T16:20:00+05:30",
    complainant: {
      name: "Advocate Rajesh Kumar",
      mobile: "+91 98960 54321",
      role: "NGO Legal Representative (Samavesh Welfare Society)",
      category: "Scheduled Caste (SC - Valmiki)",
      gender: "Male, 38 yrs"
    },
    incident: {
      location: "Sector 3, Urban Estate, Civil Lines",
      policeStation: "PS Civil Lines",
      district: "Rohtak",
      state: "Haryana",
      date: "2026-08-25",
      category: "police_inaction",
      categoryLabel: "Police Inaction & Refusal to File PoA FIR",
      description: "Grievance against SHO for refusing to invoke the SC/ST Prevention of Atrocities Act in an assault complaint lodged three weeks ago. The investigating officer has failed to file the mandatory preliminary report within the 60-day statutory limit."
    },
    safetyFlag: {
      active: false,
      type: "None",
      detail: "Procedural and administrative delay; no ongoing physical threat."
    },
    priorityScore: 48,
    priorityLevel: "Moderate",
    overallConfidence: "High",
    confidence: "High",
    caseSummary: "SHO refusal to invoke PoA sections and failure to submit statutory preliminary enquiry in Rohtak.",
    questionsSource: "domain_fallback",
    statutorySections: "Section 4 of SC/ST (PoA) Act (Punishment for Neglect of Duties by Public Servant)",
    reliefEntitlement: "Mandatory investigation completion by DSP rank officer within 60 days (Rule 7)",
    assessment: {
      textScore: 45,
      acousticScore: 50,
      detectedEmotions: ["frustration (65%)", "procedural_delay (72%)"],
      checkinScore: 50,
      contextScore: 60
    },
    signals: {
      text: { available: true, confidence: "High", note: "IndicBERT v3: 45/100 · Legal procedural delay, administrative dereliction reported." },
      acoustic: { available: true, confidence: "High", note: "Acoustic: Composed legal tone, clear pacing, articulate diction." },
      checkin: { available: true, confidence: "High", note: "Check-in: 50/100 · Seeking institutional administrative compliance." }
    },
    breakdown: {
      text: { available: true, effectiveWeight: 0.30, score: 45, contribution: 13.5 },
      acoustic: { available: true, effectiveWeight: 0.20, score: 50, contribution: 10.0 },
      checkin: { available: true, effectiveWeight: 0.20, score: 50, contribution: 10.0 },
      context: { available: true, effectiveWeight: 0.30, score: 60, contribution: 18.0 }
    },
    dynamicAnswers: [
      { dimension: "Procedural Obstacle", selectedLabel: "Investigating Officer delayed case beyond statutory timeline", flagSafety: false },
      { dimension: "Current Safety", selectedLabel: "Safe distance / Legal advocacy in progress", flagSafety: false }
    ],
    saathiAssessment: {
      distressLevel: "Moderate",
      traumaIndicators: "Low",
      functionalImpact: "Moderate (Procedural Impediment)",
      safetyFlag: false
    },
    suggestedAction: "Forward complaint to Deputy Commissioner of Police & District Vigilance Cell under Section 4.",
    copilotSuggestions: [
      "Generate Section 4 notice for the Investigating Officer regarding mandatory 60-day investigation limit.",
      "Remind complainant that under Rule 7, only an officer of DSP rank or above can investigate SC/ST offenses.",
      "Queue case for State Level Vigilance and Monitoring Committee (SLVMC) tracking."
    ],
    timeline: [
      { t: "16:20", label: "Legal advocate intake recorded" },
      { t: "16:22", label: "Procedural compliance check evaluated" },
      { t: "16:25", label: "Routed to Moderate Priority queue" }
    ]
  },
  {
    id: "SAATHI-483840",
    docket: "NHAA/2026/09/84840",
    channel: "IVRS (Basic Phone)",
    language: "Hindi",
    receivedAt: "2026-09-14T14:10:00+05:30",
    complainant: {
      name: "Anita Ahirwar",
      mobile: "+91 91112 67890",
      role: "Student (Complainant)",
      category: "Scheduled Caste (SC - Ahirwar)",
      gender: "Female, 21 yrs"
    },
    incident: {
      location: "TT Nagar, Bhopal",
      policeStation: "PS TT Nagar",
      district: "Bhopal",
      state: "Madhya Pradesh",
      date: "2026-09-10",
      category: "relief_compensation",
      categoryLabel: "Post-Matric Welfare & Entitlement Verification",
      description: "Inquiring about post-matric scholarship entitlement verification and scholarship disbursement timeline under the Dr. Ambedkar National Welfare Portal."
    },
    safetyFlag: {
      active: false,
      type: "None",
      detail: "Administrative welfare enquiry; no atrocity or safety concern."
    },
    priorityScore: 22,
    priorityLevel: "Low",
    overallConfidence: "High",
    confidence: "High",
    caseSummary: "Inquiry on post-matric scholarship disbursement and welfare eligibility in Bhopal.",
    questionsSource: "domain_fallback",
    statutorySections: "Post-Matric Scholarship Scheme for SC Students, MoSJE",
    reliefEntitlement: "Routine education entitlement under MoSJE guidelines",
    assessment: {
      textScore: 15,
      acousticScore: 20,
      detectedEmotions: ["neutral (90%)", "inquiry (85%)"],
      checkinScore: 10,
      contextScore: 25
    },
    signals: {
      text: { available: true, confidence: "High", note: "IndicBERT v3: 15/100 · Routine welfare inquiry, zero distress language." },
      acoustic: { available: true, confidence: "High", note: "Acoustic: Calm, steady conversational tone." },
      checkin: { available: true, confidence: "High", note: "Check-in: 10/100 · No safety or physical concerns reported." }
    },
    breakdown: {
      text: { available: true, effectiveWeight: 0.30, score: 15, contribution: 4.5 },
      acoustic: { available: true, effectiveWeight: 0.20, score: 20, contribution: 4.0 },
      checkin: { available: true, effectiveWeight: 0.20, score: 10, contribution: 2.0 },
      context: { available: true, effectiveWeight: 0.30, score: 25, contribution: 7.5 }
    },
    dynamicAnswers: [
      { dimension: "Inquiry Type", selectedLabel: "General student scholarship guidance", flagSafety: false }
    ],
    saathiAssessment: {
      distressLevel: "Low",
      traumaIndicators: "None",
      functionalImpact: "Low",
      safetyFlag: false
    },
    suggestedAction: "Provide standard welfare guidance and SMS link to MP Scholarship 2.0 portal.",
    copilotSuggestions: [
      "Send SMS with National Scholarship Portal (NSP) link and toll-free student guidance helpline.",
      "Check student Aadhaar seeding status with bank account.",
      "Mark inquiry as resolved."
    ],
    timeline: [
      { t: "14:10", label: "IVRS inquiry session initiated" },
      { t: "14:12", label: "Categorized as General Student Entitlement" },
      { t: "14:15", label: "Assigned Low Priority (Score 22)" }
    ]
  }
];

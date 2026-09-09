/**
 * Mock case queue for the SAATHI Operator Dashboard demo.
 * In a real deployment this file doesn't exist — the dashboard fetches from
 * GET /dashboard/queue and GET /cases/{id}/interactions/{iid}/assessment,
 * as described in the API section of the techstack document.
 */
window.SAATHI_MOCK_CASES = [
  {
    id: "SAATHI-483920",
    docket: "NHAA/2026/04/1182",
    channel: "14566 call",
    language: "Hindi (code-mixed)",
    receivedAt: "2026-09-04T10:12:00+05:30",
    safetyFlag: {
      active: true,
      type: "Immediate danger statement",
      detail: "Caller stated the person named in the complaint was present nearby during the call.",
    },
    priorityScore: 91,
    priorityLevel: "Urgent",
    confidence: "High",
    signals: {
      text: { available: true, confidence: "High", note: "Fear- and intimidation-coded language; explicit threat statement detected." },
      acoustic: { available: true, confidence: "Medium", note: "Elevated pitch variance, frequent pauses, faster-than-baseline speech rate." },
      checkin: { available: true, confidence: "High", note: "Reported 'very afraid'; reported not safe to talk freely." },
    },
    timeline: [
      { t: "00:04", label: "Call started, calm tone" },
      { t: "00:41", label: "Voice tension rising, pause frequency increases" },
      { t: "01:15", label: "Explicit danger statement — Safety Flag raised" },
      { t: "01:16", label: "Routed to Immediate Human Review" },
    ],
    suggestedAction: "Immediate human review — do not wait for fusion score.",
    copilotSuggestions: [
      "Are you somewhere safe to talk right now?",
      "I'm staying on the line with you — can you tell me if you're able to move to a safer location?",
      "I'm flagging this for urgent follow-up right now.",
    ],
    transcriptExcerpt: "\u201c...they're still outside, I don't know what to do, please...\u201d",
  },
  {
    id: "SAATHI-483915",
    docket: "NHAA/2026/04/1180",
    channel: "Portal (chat)",
    language: "English",
    receivedAt: "2026-09-04T09:47:00+05:30",
    safetyFlag: { active: false },
    priorityScore: 62,
    priorityLevel: "High",
    confidence: "Medium",
    signals: {
      text: { available: true, confidence: "High", note: "Hopelessness- and distress-coded language across the message." },
      acoustic: { available: false, confidence: null, note: "No audio — text-only channel; fusion re-normalised across text, check-in and safety context." },
      checkin: { available: true, confidence: "Medium", note: "Reported 'anxious'; did not answer the safety question." },
    },
    timeline: [
      { t: "—", label: "Complaint submitted via portal" },
      { t: "—", label: "Text analysis complete — distress language detected" },
      { t: "—", label: "Routed to High-priority queue" },
    ],
    suggestedAction: "Prioritised human review; consider counselling referral.",
    copilotSuggestions: [
      "Thank you for sharing this — take your time, you don't have to explain everything at once.",
      "Would it help to talk to someone from our support team today?",
    ],
    transcriptExcerpt: "\u201c...I don't really see the point in continuing with this complaint, nothing changes...\u201d",
  },
  {
    id: "SAATHI-483902",
    docket: "NHAA/2026/04/1175",
    channel: "14566 call",
    language: "Hindi",
    receivedAt: "2026-09-04T09:05:00+05:30",
    safetyFlag: { active: false },
    priorityScore: 34,
    priorityLevel: "Moderate",
    confidence: "Medium",
    signals: {
      text: { available: true, confidence: "Medium", note: "Some distress language, largely coherent narrative." },
      acoustic: { available: true, confidence: "Low", note: "Background noise limited signal quality." },
      checkin: { available: true, confidence: "High", note: "Reported 'calm'; reported safe to talk." },
    },
    timeline: [
      { t: "00:02", label: "Call started" },
      { t: "00:30", label: "Complaint narrated, steady tone" },
      { t: "02:10", label: "Check-in completed" },
    ],
    suggestedAction: "Continue normal grievance process; offer support information.",
    copilotSuggestions: [
      "Thank you for explaining that clearly — here's what happens next with your complaint.",
    ],
    transcriptExcerpt: "\u201c...they denied me entry to the shop, I want this on record...\u201d",
  },
  {
    id: "SAATHI-483888",
    docket: "NHAA/2026/04/1169",
    channel: "IVRS (basic phone)",
    language: "Hindi",
    receivedAt: "2026-09-04T08:40:00+05:30",
    safetyFlag: { active: false },
    priorityScore: 18,
    priorityLevel: "Low",
    confidence: "Low",
    signals: {
      text: { available: false, confidence: null, note: "No transcript — DTMF-only interaction on a basic phone." },
      acoustic: { available: false, confidence: null, note: "Not available on this channel." },
      checkin: { available: true, confidence: "Medium", note: "Keypad check-in: reported feeling calm (press-1 response)." },
    },
    timeline: [
      { t: "—", label: "IVRS session started" },
      { t: "—", label: "Keypad check-in completed" },
    ],
    suggestedAction: "Normal workflow — low confidence, monitor if a follow-up interaction occurs.",
    copilotSuggestions: [],
    transcriptExcerpt: "(No transcript available — DTMF check-in only.)",
  },
];

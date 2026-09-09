# SAATHI — Frontend Files

Two independent front ends, matching the stack and design decisions in
`techstack.docx` and `architecture_and_workflow.docx`. Both are plain
HTML/CSS/JS — no build step, no framework dependency — so they can be opened
directly or dropped into an existing site without needing a bundler.

## 1. `victim-widget/` — embeds into the existing NHAA site

This is the caller-facing SAATHI panel, built to be dropped into
**dosje.gov.in** (or wherever NHAA's site actually lives) with two tags:

```html
<link rel="stylesheet" href="saathi-widget.css">
<script src="saathi-widget.js"></script>
<script>
  SaathiWidget.init({
    apiBase: "https://api.saathi.example.gov.in", // your real backend
    defaultLang: "en"
  });
</script>
```

It doesn't assume the host page runs React, or anything else — a script-tag
embed is the realistic path onto a site your team doesn't control the stack
of. `demo.html` is a mock-up of the NHAA page (colors, layout, and the
existing floating chat icon reproduced approximately from the screenshots)
so you can check placement and see it isn't fighting with the site's
existing "Samajik Sahayak" widget in the opposite corner — open it directly
in a browser to try the flow.

**What's real vs. what needs a backend:**
- Consent → complaint text/voice → check-in → confirmation screen: fully
  working client-side flow, including actual microphone recording via
  `MediaRecorder`.
- The "I need help right now" button and the quiet/silent-exit control:
  both genuinely fire immediately and don't wait on anything else.
- Every step that would reach the safety engine or the assessment pipeline
  (`_sendToApi`) does a real `fetch()` to `apiBase` if one is configured; with
  no backend configured it just logs to the console so the widget is still
  fully demoable standalone.

## 2. `operator-dashboard/` — internal tool, not embedded publicly

The operator-facing screen described in the architecture doc — this is
**not** meant to go on the public site; it's a separate internal tool for
NHAA staff. Open `index.html` directly, or serve the folder statically.

- `mock-data.js` stands in for `GET /dashboard/queue` — four sample cases,
  one with an active safety flag, one with a missing acoustic signal (text
  channel), one on a basic-phone IVRS channel with almost nothing available.
  Swap this file out for a real fetch once the API exists.
- The safety banner, priority gauge, evidence panels (each with its own
  confidence/availability state), timeline, Co-Pilot suggestions, override
  control, and audit log are all live and interactive against the mock data.
- `dashboard.js` has comments marking exactly which calls need to become
  real `fetch()` calls to the API endpoints listed in the techstack doc
  (`/cases/{id}/operator-action`, `/cases/{id}/referral`, etc.).

## Design notes

- The victim widget's palette is pulled directly from the NHAA site
  screenshots (government blue, white cards, a restrained tricolor hairline)
  so it reads as part of the site rather than a bolted-on third-party
  chat tool.
- The operator dashboard uses its own calmer navy/teal palette with
  color-coded priority levels (teal → amber → orange → red) — it's an
  internal tool, so it isn't constrained to match the public site.
- Both respect `prefers-reduced-motion` and are keyboard-navigable.
- Both were checked with actual rendering (not just written blind) —
  screenshots were taken and one real bug (the safety banner not hiding,
  a CSS specificity conflict between a `.class` display rule and the
  native `[hidden]` attribute) was caught and fixed before delivery.

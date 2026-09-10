# SAATHI — Frontend Architecture & Portal Modules

Government of India (DOSJE / NHAA) replicated citizen interface and internal operator intelligence suite. Plain HTML5, CSS3 (UX4G standard), and modern JavaScript — zero build steps or heavyweight runtime dependencies required.

---

## 1. Citizen Portal & Grievance Lifecycle

The public interface directly replicates the official National Helpline Against Atrocities (**`nhapoa.dosje.gov.in`**) user experience:

- **`index.html`**: NHAA / SAMBAL Portal Homepage.
- **`register-grievance.html`**: 5-step statutory grievance registration workflow:
  1. *Grievance Registration*: Sector categorization, FIR status, and applicant role selection (*Informer, Victim, NGO*).
  2. *Informer Details*: Contact particulars and residential details with statutory data protection.
  3. *Victim Details*: Caste/Tribe category identification and jurisdictional police station mapping.
  4. *Grievance Details & Embedded SAATHI Screening*:
     - Incident narrative statement with **live microphone recording** (`MediaRecorder` waveform visualizer).
     - **Embedded SAATHI Impact Screening**: 3 operational distress check-ins (sleep disruption, trauma intrusions, functional impairment) + active peril alert toggle.
     - Auto-linkages to national helplines: **Tele-MANAS (`14416`)** & **DLSA Free Legal Aid (`15100`)**.
  5. *Review & Submit*: Final case declaration, unique Docket ID generation (e.g., `NHAA/2026/09/84920`), and automatic synchronization to the Operator Dashboard.
- **`register-rescue.html`**: Rapid emergency intake page directly wired to the **Critical Safety Engine Bypass**.
- **`track-status.html`**: Real-time milestone tracker with continuous care access and 30-day statutory appeal notice.
- **`saathi-service.js`**: Client-side triage scoring engine, multimodal distress calculation, and `localStorage` case docket synchronization.

---

## 2. `operator-dashboard/` — Internal Officer Triage Tool

Operator-facing decision support screen for NHAA call center staff, Welfare Officers, and District Magistrates:

- **`index.html`**: Operator interface layout.
- **`dashboard.js`**: Interactive queue manager, safety alert handler, and live docket ingestion from citizen submissions.
- **`dashboard.css`**: Professional government dashboard styling.
- **`mock-data.js`**: Realistic sample cases across diverse channels and confidence levels.

---

## 3. `workflow-diagram/` — Architecture Flow Simulator

Interactive evaluation visualizer demonstrating SAATHI's twin-path processing logic:

- **`index.html`**: Visualizer container.
- **`diagram.js` & `call.js`**: Step-by-step token animations comparing standard multimodal distress analysis against immediate deterministic safety bypass.

---

## 4. `assets/` — Production UX4G Design Assets

- **`nhapoa-layout.css`**: UX4G design tokens, typography, grid layouts, responsive breakpoints, and official color scheme.
- **`indian-flag.svg`**: National Flag of India.
- **`emblem-header.svg`**: State Emblem of India (Ashoka Lion Capital).
- **`samavesh-logo.svg`**: SAMAVESH initiative logo.
- **`sambal-logo.svg`**: SAMBAL (NHAA 2.0) portal logo.

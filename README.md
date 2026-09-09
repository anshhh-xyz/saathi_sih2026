# SAATHI — AI-Based Real-Time Stress & Trauma Assessment Module for NHAA (14566)

> **Smart India Hackathon 2026** · Problem Statement ID: **SIH26093**  
> **Theme:** MedTech / BioTech / HealthTech (Software Category)  
> **Team Name:** **NeuroNex**  
> **Target System:** National Helpline Against Atrocities (NHAA - 14566), Ministry of Social Justice & Empowerment (MoSJE)  
> *"AI That Listens. Humans Who Help. Turning Signals into Safer Support."*

---

## 📌 Executive Summary & The Problem

The **National Helpline Against Atrocities (14566)** is a nationwide grievance intake portal for victims of caste-based atrocities and civil rights violations under the **SC/ST (PoA) Act, 1989** and the **Protection of Civil Rights Act, 1955**.

### The Critical Gap
- **Procedural vs. Human Impact:** The existing system records **WHAT** happened (accused particulars, date, IPC/PoA sections, location), but completely misses **HOW** it impacts the victim.
- **Identical on Paper, Different in Reality:** Two complaints can read identically in writing (e.g. land obstruction or verbal harassment), but:
  - **Complainant A** is in an acute suicidal crisis, experiencing severe panic, or facing active death threats.
  - **Complainant B** is seeking standard procedural follow-up.
- **Delayed Intervention:** In an unprioritized FIFO queue, by the time an investigating officer or welfare officer opens the file days later, severe psychological trauma or physical intimidation may have escalated irreversibly.

---

## 💡 The Solution: SAATHI Architecture

**SAATHI** (*Support and Assessment Assistant for Trauma and Helpline Intake*) is a real-time decision-support and triage layer that operates beside the existing NHAA workflow at first contact. It **never makes autonomous decisions, never issues clinical diagnoses, and never replaces the human operator.**

```
                         [Incoming Interaction: 14566 Voice or Web Portal]
                                                │
         ┌──────────────────────────────────────┴──────────────────────────────────────┐
         ▼                                                                             ▼
┌────────────────────────────────┐                            ┌──────────────────────────────────────────────┐
│     PATH 1: SAFETY ENGINE      │                            │       PATH 2: PRIORITY SCORING PIPELINE      │
│  (Independent & Deterministic) │                            │       (Confidence-Aware Multimodal Fusion)   │
├────────────────────────────────┤                            ├──────────────────────────────────────────────┤
│ • Continuous pattern match     │                            │ 1. Text Analysis (30%):                      │
│ • Active violence / threats    │                            │    MuRIL / IndicBERT distress scoring        │
│ • Self-harm / suicidal intent  │                            │ 2. Acoustic Analysis (20%):                  │
│ • Hostage / coercion           │                            │    Pitch, jitter, pauses, speaking rate      │
└──────────────┬─────────────────┘                            │ 3. Contextual Self-Report Check-in (20%):    │
               │                                              │    Sleep, fear, intrusive thoughts           │
               │ [Triggered]                                  │ 4. Non-Critical Contextual Signals (30%)     │
               ▼                                              └──────────────────────┬───────────────────────┘
┌────────────────────────────────┐                                                   ▼
│     CRITICAL SAFETY FLAG       │                                    ┌──────────────────────────────┐
│  • Bypasses all score maths    │                                    │     0-100 PRIORITY SCORE     │
│  • Immediate operator alert    │                                    │ Low · Moderate · High · Urgent│
└──────────────┬─────────────────┘                                    └──────────────┬───────────────┘
               │                                                                     │
               └──────────────────────────────┬──────────────────────────────────────┘
                                              ▼
                          ┌───────────────────────────────────────┐
                          │       OPERATOR CO-PILOT SCREEN        │
                          │ • Evidence breakdown for each signal  │
                          │ • Confidence indicator per modality   │
                          │ • Institutional Linkage:              │
                          │   - Tele-MANAS (14416) for mental care│
                          │   - DLSA (15100) for free legal aid   │
                          │ • Operator Override + Audit Log       │
                          └───────────────────────────────────────┘
```

### Key Technical Pillars
1. **Speech-to-Text (ASR):** AI4Bharat IndicConformer / IndicWhisper for Indian accents and Hindi-English code-mixed Hinglish.
2. **Text Distress Model:** Fine-tuned transformer models (MuRIL / IndicBERT) detecting terror, panic, and helplessness.
3. **Acoustic Extraction:** Prosodic feature analysis using `librosa` and `parselmouth` (Praat) measuring pitch trembling, speech rate, and pause ratios.
4. **Missing-Modality Confidence Fusion:** Dynamically renormalizes weights when inputs are missing (e.g. text complaints without audio) to ensure graceful, honest degradation.
5. **Deterministic Safety Engine:** Zero-tolerance rule & regex engine ensuring near 100% recall on explicit danger signals without generative hallucinations.

---

## 📂 Repository Structure

```
├── README.md                           # Main project documentation & overview
├── push_to_github.py                   # Automated push script with SSL verification
├── docs/                               # Complete project documents from Google Drive
│   ├── SIH_STRUCTURE.docx              # SIH pitching & defense structure
│   ├── architecture_and_workflow.docx  # System design & triage workflow specification
│   ├── current_workflow_and_its_problem.docx # Problem statement deep-dive
│   ├── deployment_brief.docx           # Web & 14566 telephony deployment architecture
│   ├── improvements_scopes.docx        # Prioritized technical roadmap
│   ├── neuronex_SIH_26093.pptx         # Official SIH 2026 Presentation Slides
│   ├── priors_and_questions_updated.docx # 300+ line judge Q&A preparation
│   ├── ques_brief.docx                 # Quick revision sheet (Top 15 judge answers)
│   └── techstack_updated.docx          # Model selection rationale & benchmarks
└── frontend/                           # Client interfaces & applications
    ├── index.html                      # NHAA / SAMBAL Portal Homepage
    ├── register-grievance.html         # Official 5-step grievance registration + SAATHI screening
    ├── track-status.html               # Real-time case milestone tracker + ongoing care card
    ├── register-rescue.html            # Emergency rescue intake (Safety Engine Bypass)
    ├── saathi-service.js               # Client-side triage engine & localStorage docket sync
    ├── assets/                         # Official UX4G design system & vector graphics
    │   ├── nhapoa-layout.css           # Production layout styles from nhapoa.dosje.gov.in
    │   ├── indian-flag.svg             # National Flag of India
    │   ├── emblem-header.svg           # State Emblem of India (Ashoka Lion)
    │   ├── samavesh-logo.svg           # Official SAMAVESH scheme emblem
    │   ├── sambal-logo.svg             # SAMBAL (NHAA 2.0) emblem
    │   └── icons/                      # 26 official UX4G vector navigation & form icons
    ├── operator-dashboard/             # Internal Officer Triage Tool
    │   ├── index.html                  # Priority queue, safety alert banner, evidence panels
    │   ├── dashboard.js                # Triage queue manager & live docket sync
    │   └── dashboard.css               # Government officer dashboard styling
    ├── victim-widget/                  # Embeddable script-tag citizen widget
    │   ├── demo.html                   # Interactive demo with microphone audio recording
    │   ├── saathi-widget.js            # Standalone widget logic
    │   └── saathi-widget.css           # Floating panel design
    └── workflow-diagram/               # Interactive comparison of NHAA current vs. SAATHI
        └── index.html                  # Side-by-side interactive flow visualizer
```

---

## 🖥️ Frontend Modules & Grievance Journey

### 1. Grievance Registration ([`register-grievance.html`](frontend/register-grievance.html))
- Replicated 1:1 with the **official `nhapoa.dosje.gov.in` UX4G layout**.
- **Step 1 (Grievance Registration):** Grievance Related To (*FIR, Relief, Charge Sheet, Corruption*), FIR status check, and Role selection cards (*As an Informer / As a Victim / As an NGO*).
- **Step 2 (Informer Details):** Contact and address particulars with statutory data confidentiality protection.
- **Step 3 (Victim Details):** Victim particulars, SC/ST category selection, and police jurisdiction.
- **Step 4 (Grievance Details & Embedded SAATHI Screening):**
  - Incident statement with **Real Browser Microphone Audio Recording** (`MediaRecorder` live waveform).
  - **Embedded SAATHI Impact Screening:** 3 non-diagnostic questions (*Sleep Disturbance, Intrusive Distress, Functional Living Impact*) + Active Danger Alert toggle.
  - Automatic institutional linkages: **Tele-MANAS (`14416`)** & **DLSA Free Legal Aid (`15100`)**.
- **Step 5 (Review & Submit):** Complete case dossier, legal declaration, instant unique Docket ID generation (e.g. `NHAA/2026/09/84920`), and automatic sync to the **Operator Dashboard**.

### 2. Status Tracking ([`track-status.html`](frontend/track-status.html))
- Real-time case milestone timeline (*Lodged $\rightarrow$ Verified $\rightarrow$ Assigned to DSP/Welfare Officer $\rightarrow$ Field Enquiry $\rightarrow$ Relief Sanction*).
- Embedded continuous care card for ongoing psychological and legal assistance.
- Statutory 30-day appeal notice.

### 3. Emergency Rescue Intake ([`register-rescue.html`](frontend/register-rescue.html))
- Rapid intake for victims facing active, life-threatening mob violence or confinement.
- Direct integration with SAATHI's **Critical Safety Engine Bypass**.

### 4. Officer Triage Co-Pilot ([`operator-dashboard/index.html`](frontend/operator-dashboard/index.html))
- Real-time incoming queue organized into 4 priority bands (*Low, Moderate, High, Urgent*).
- Red alert banners for cases with an active Safety Flag.
- Independent evidence breakdown cards (Text, Acoustic, and Self-Report) with confidence indicators and manual operator override controls.

---

## 🚀 How to Run Locally

You can run the web application locally with any simple HTTP server:

```bash
# Navigate to the frontend directory
cd frontend

# Start a local web server (Python 3)
python3 -m http.server 8080
```

Open in your browser:
- **Grievance Registration:** [http://localhost:8080/register-grievance.html](http://localhost:8080/register-grievance.html)
- **Track Status:** [http://localhost:8080/track-status.html](http://localhost:8080/track-status.html)
- **Emergency Rescue:** [http://localhost:8080/register-rescue.html](http://localhost:8080/register-rescue.html)
- **Portal Home:** [http://localhost:8080/index.html](http://localhost:8080/index.html)
- **Operator Dashboard:** [http://localhost:8080/operator-dashboard/index.html](http://localhost:8080/operator-dashboard/index.html)
- **Workflow Diagram:** [http://localhost:8080/workflow-diagram/index.html](http://localhost:8080/workflow-diagram/index.html)

---

## 🛡️ Ethics, Safety & Government Compliance

- **Decision-Support, Not Diagnosis:** SAATHI detects operational distress signals to prioritize human attention; it does not issue medical or psychiatric diagnoses.
- **Human-in-the-Loop:** All consequential actions (police dispatch, docket reassignment, relief approval) remain strictly under human control.
- **Data Privacy & Protection:** Compliant with the **Digital Personal Data Protection (DPDP) Act, 2023** and confidentiality mandates under the **SC/ST (Prevention of Atrocities) Act, 1989**.

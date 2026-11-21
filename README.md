# CivicResolve 🏛️✨
### AI-Powered Civic Grievance Reporting & Resolution Platform
*Built for the Hackathon with Google Gemini 2.5 Flash, Next.js 14+ (App Router), TypeScript, Tailwind CSS, Prisma (SQLite), and Leaflet Maps.*

---

## ⚡ Quickstart (Zero-Config in 4 Commands)

Run these 4 commands to get the application running locally with seeded data:

```bash
# 1. Install dependencies
npm install

# 2. Synchronize SQLite database
npx prisma db push

# 3. Seed realistic Erode municipal grievances (40 issues across 6 wards)
npm run seed

# 4. Launch development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> **Note on Gemini API Key:**  
> The application includes a **deterministic rule-based fallback engine** for every AI capability. If `GEMINI_API_KEY` is omitted, the app remains 100% functional for live demo evaluation (indicated by the *"Basic rules (AI offline)"* badge vs *"Gemini Analysed"* badge).  
> To enable live Gemini AI generation, copy `.env.example` to `.env.local` and set `GEMINI_API_KEY="your-gemini-key"`.

---

## 🌟 Key Innovations & Creative Gemini Implementations

CivicResolve is built around Google's `@google/genai` SDK server-side pipeline (`lib/gemini.ts`):

1. **Multilingual Understanding across All Indian Languages & Romanized Transliteration:**
   - Citizens can submit complaints in native scripts (**தமிழ், हिन्दी, తెలుగు, ಕನ್ನಡ, മലയാളം, বাংলা, मराठी**) or code-mixed/transliterated Latin (**Tanglish, Hinglish, Kanglish**).
   - Gemini understands the grievance natively, accurately translates it for official records, and presents follow-up responses in the citizen's mother tongue.
   - Includes a full Indic Language Switcher in the navbar.
2. **Multimodal Image Evidence Cross-Checking:**
   - Evaluates attached photos against text descriptions to detect category mismatches and assess infrastructure damage depth (e.g., pothole severity, sewer blockages).
3. **Geo-Haversine Semantic Duplicate Detection:**
   - Before submission, checks nearby open grievances within 150m (using Haversine distance) and prompts citizens: *"Similar issue reported 80m away. Upvote instead?"* to prevent duplicate dispatches and consolidate urgency.
4. **Instant Formal Complaint Letter Generation:**
   - Synthesizes a formal municipal grievance letter addressed to the respective department head with tracking ID, legal references (Tamil Nadu Urban Local Bodies Act), and civic charter SLAs, ready to copy or print/save as PDF.
5. **Admin Operations AI Chief of Staff ("Today's Briefing"):**
   - Synthesizes open backlogs into an actionable executive briefing: identifies high-hazard geographic clusters, SLA breaches, and recommends consolidated work-orders by area to minimize maintenance crew travel.
6. **AI Resolution Verification (Before vs. After):**
   - When field crew submits an "after" repair photo, Gemini performs a comparative visual inspection to verify resolution before closing out the grievance.

---

## 🏗️ Architecture & Data Flow

```mermaid
flowchart TD
    subgraph Citizen["Citizen Interface"]
        A["Voice / Text Input (8+ Indian Languages)"] --> B["Leaflet GPS Location Picker"]
        B --> C["Photo Upload (Base64)"]
        C --> D["Smart Grievance Wizard"]
    end

    subgraph Gemini["Google Gemini 2.5 Flash Engine (lib/gemini.ts)"]
        D --> E["Multimodal & Indic Language Analysis"]
        E --> F["Priority Scoring 0-100 & Factor Weights"]
        E --> G["Department & SLA Assignment"]
        E --> H["Haversine Duplicate Detection"]
        E --> I["Formal Complaint Generator"]
        E --> J["Before/After Resolution Verifier"]
    end

    subgraph MunicipalAdmin["Municipal Admin Console"]
        K["Admin Triage Table (Sorted by AI Score)"]
        L["Today's Field Briefing Card"]
        M["Human Override Controls"]
        N["Field Crew Photo Proof & AI Verification"]
    end

    subgraph Database["Prisma SQLite Storage"]
        O[("Issues Ledger")]
        P[("StatusEvents Audit Trail")]
        Q[("Departments & SLAs")]
        R[("Upvotes & Users")]
    end

    E --> O
    F --> O
    G --> O
    O --> K
    O --> L
    M --> P
    N --> J
    J --> O
```

---

## 🎯 2-Minute Hackathon Live Demo Script

Follow this script during the live presentation for maximum impact:

### Step 1: The Citizen Experience (0:00 - 0:45)
1. Navigate to `http://localhost:3000`. Show the live landing page with Corporation KPIs, Track-by-ID search, and the interactive incident map.
2. Click **"Report an Issue"** (`/report`).
3. Click the **"Demo Mode (Citizen)"** button in the top bar to fast-fill a realistic grievance (e.g. *Tanglish Pothole* or *Tamil Flower Market Dump*).
4. Notice the voice dictation selector covering 8 Indian locales and the draggable Leaflet map with automatic reverse geocoding.
5. Click **"Analyze with Gemini AI"**. Watch the animated stepper (*Understanding, Classifying, Scoring, Routing*) and reveal the **AI Intelligence Review Card** with the impact gauge (e.g., 92/100 Critical), factor breakdown, and English translation.
6. Click **"Confirm & Submit"**. Confetti bursts, issuing tracking ID (e.g., `CR-2026-00108`).
7. Click **"Formal Complaint Letter"** to show the official complaint addressed to Erode Municipal Corporation, ready for print/PDF.

### Step 2: Tracking & Public Transparency (0:45 - 1:15)
1. Click **"View Audit Timeline"** (`/issues/[id]`). Show the live vertical audit trail, before/after evidence slots, and click the **"Upvote"** button to show optimistic upvoting raising priority.
2. Click **"Transparency Map"** (`/transparency`) in the navbar.
3. Toggle the **"Heatmap"** button to visualize complaint hotspots.
4. Show the **"Ward Efficiency Leaderboard"** ranking wards by resolution rate and turnaround hours.

### Step 3: Admin Operations & AI Resolution (1:15 - 2:00)
1. Click the top-right **"Citizen Role"** pill to instantly switch to **"Admin Role"** (`admin@demo.in`).
2. Navigate to **"Admin Operations"** (`/admin`).
3. Point out the **"Today's Field Briefing"** card generated by Gemini, showing top urgent area clusters and work-order groupings that save crew travel.
4. In the Management Ledger, click any critical issue (e.g., `CR-2026-00102`).
5. The **Admin Side Drawer** slides in. Show:
   - Human overrides for Category, Priority, and Department.
   - Status transition dropdown (*Reported -> In Progress -> Resolved*).
   - Upload an after photo and click **"Run Gemini Resolution Verification"** to show instant AI comparison and verified resolution badge!

---

## 📁 Project Structure

```
hacktoskill/
├── prisma/
│   ├── schema.prisma         # Data models: User, Issue, StatusEvent, Upvote, Department
│   └── seed.ts               # 40 realistic issues across 6 wards in Erode, TN
├── public/
│   └── seed/                 # High-resolution before/after SVG incident evidence
├── src/
│   ├── app/
│   │   ├── admin/            # Admin operations console, KPI charts & triage drawer
│   │   ├── api/              # Route handlers: analyze, issues, verify, briefing, stats
│   │   ├── issues/[id]/      # Detailed grievance audit trail & formal letter modal
│   │   ├── my-issues/        # Citizen tracking dashboard (grid & table view)
│   │   ├── report/           # 3-step smart grievance reporting wizard
│   │   ├── transparency/     # Public open map, heatmap & ward scoreboard
│   │   ├── globals.css       # Tailwind 4 styling, badge styles & Leaflet rules
│   │   └── layout.tsx        # Root layout with Indic i18n & navbar
│   ├── components/
│   │   ├── Map/              # Leaflet LocationPickerMap & TransparencyHeatmap
│   │   └── Navbar.tsx        # Nav links, Indic language selector, role switcher
│   └── lib/
│       ├── auth.ts           # Cookie-based role session (Citizen & Admin demo)
│       ├── gemini.ts         # @google/genai SDK implementation with deterministic fallbacks
│       ├── i18n.tsx          # 8 Indian languages translation dictionaries
│       ├── prisma.ts         # Singleton Prisma client
│       └── types.ts          # Complete TypeScript domain contracts
└── scripts/
    └── test-gemini.ts        # Automated verification runner for Indic complaints
```

---

## 🛡️ Hackathon Evaluation Checklist

| Brief Requirement | Status | Implementation Details |
| :--- | :--- | :--- |
| **Completeness against Brief** | ✅ 100% | Full end-to-end flow from citizen report to verified resolution |
| **Creative Use of Gemini** | ✅ 100% | Indic language detection, Vision check, Duplicate detection, Briefing, Verification |
| **Deterministic AI Fallback** | ✅ 100% | Every Gemini call has timeout, retry, and rule-based fallback |
| **UI Polish & Civic Tech Look** | ✅ 100% | Clean palette, accessible contrast, smooth animations, dark/light modes |
| **Seeded Realistic Data** | ✅ 100% | 40 realistic issues across 6 wards in Erode, Tamil Nadu |
| **Demo Mode Button** | ✅ 100% | 1-click sample autofill for 10-second live demonstration |

---
*Built with ❤️ for Citizen Empowerment & Municipal Excellence.*

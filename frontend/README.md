# ReachInbox Email Scheduler – Frontend Dashboard

Pixel-accurate dashboard and campaign scheduler built with React 18, TypeScript (strict), Vite, Tailwind CSS, TipTap rich text editor, TanStack Query, and Mock Service Worker (MSW).

---

## 🎨 Design & Visual Features

- **Figma Alignment**: Color palette, typography, badges, pills, and layout mirror the provided design specifications (`docs/DESIGN_NOTES.md`).
- **Google OAuth Login**: Authentic Google sign-in workflow with styled feedback for disabled non-OAuth options.
- **Dynamic Shell**: Sidebar with real-time email counts, Slack connect/disconnect status, and user profile menu.
- **Scheduled & Sent Lists**:
  - Filterable by debounced search queries (`q`).
  - Loading skeleton states and empty states.
  - Formatted relative and absolute dates via `date-fns`.
  - Pagination controls.
- **Email Detail View**:
  - Sanitized rich HTML body rendering via `DOMPurify`.
  - Live link to fake SMTP preview on Ethereal.
  - Visual attachment preview cards (`tennis_cover_male.png`, `tennis_1-reduce.png`).
- **Compose Campaign View**:
  - Sender selector populated from verified senders API.
  - CSV / TXT lead upload parsed and deduplicated via Papa Parse.
  - Recipient chips with `+{N}` overflow pill and modal viewer.
  - TipTap rich text editor with custom styling and formatting toolbar.
  - "Send Later" floating popover with quick presets (Tomorrow, 9AM, 11AM, 3PM) and custom date-time picker.

---

## 🛠 Technology Stack

- **Framework**: Vite + React 18 (TypeScript strict mode)
- **Styling**: Tailwind CSS
- **Rich Text Editor**: TipTap (`@tiptap/react`, `@tiptap/starter-kit`, Underline, Link, TextAlign)
- **Data Fetching & Cache**: TanStack Query (React Query v5)
- **File Parsing**: Papa Parse (CSV / TXT deduplication)
- **Sanitization**: DOMPurify
- **Icons**: Lucide React
- **Mock Layer**: Mock Service Worker (MSW) for offline / standalone preview
- **Testing**: Vitest + React Testing Library

---

## 📦 Getting Started

### Prerequisites
- Node.js >= 18

### Setup & Run

1. **Install dependencies**:
   ```bash
   cd frontend
   npm install
   ```

2. **Environment Variables**:
   Copy `.env.example` to `.env`:
   ```env
   VITE_API_BASE_URL="http://localhost:4000/api"
   VITE_USE_MOCKS=false
   ```
   *(Set `VITE_USE_MOCKS=true` to run the frontend independently using MSW handlers)*.

3. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

4. **Run Unit Tests**:
   ```bash
   npm test
   ```

5. **Typecheck & Production Build**:
   ```bash
   npm run typecheck
   npm run build
   ```

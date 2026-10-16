# Design Notes & Visual Specifications

Measurements, colors, and layout properties derived from forensic inspection of design screenshots in `docs/design/` (`login.png`, `homepage_scheduled.png`, `homepage_sent.png`, `email_detail.png`, `compose_empty.png`, `compose_chips.png`, `send_later_popover.png`).

---

## Global Design System Tokens

### Typography
- **Primary Font Family**: Inter / system sans-serif (`font-sans`, e.g., `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`).
- **Heading 1 / Page Titles**: 20px - 24px, Font Weight: 600 (Semi-bold), Line Height: 1.25.
- **Section Headers (e.g., 'CORE')**: 11px - 12px, Font Weight: 600, Uppercase, Tracking: wider (`letter-spacing: 0.05em`), Color: `#8D8D8D` / `#9CA3AF`.
- **Body Regular**: 14px, Font Weight: 400 (Regular), Line Height: 1.5, Color: `#1F2937` (`#111827`).
- **Body Medium / Labels**: 13px - 14px, Font Weight: 500 (Medium).
- **Subtext / Muted / Placeholders**: 12px - 13px, Font Weight: 400, Color: `#6B7280` (`#9CA3AF`).
- **Badges / Pills**: 11px - 12px, Font Weight: 500 / 600.

### Color Palette (Hex)
- **Brand Primary Green**: `#00A63E` (Darker hover: `#008A33`, active: `#00732A`).
- **Brand Green Soft / Active Background**: `#E5F6EC` (RGB: 229, 246, 236).
- **Brand Green Border / Tint**: `#99DCB2` / `#86EFAC`.
- **Canvas / Page Background**: `#FAFAFA` (RGB: 250, 250, 250) or `#FFFFFF` inside cards.
- **Card / Surface Background**: `#FFFFFF` (RGB: 255, 255, 255).
- **Sidebar Surface**: `#FFFFFF`.
- **Dividers & Borders**: `#E5E7EB` (neutral-200) / `#F3F4F6` (neutral-100).
- **Input Fill**: `#F4F5F7` / `#F9FAFB` (subtle off-white/gray).
- **Input Border**: `#E5E7EB` (focus ring: `#00A63E`).
- **Status - Scheduled**: Amber/Orange pill background `#FEF3C7` (or `#FFF7ED`), text `#D97706` / `#DD784D` (clock icon + date/time).
- **Status - Sent**: Soft green pill `#DEF7EC` / `#E5F6EC`, text `#03543F` / `#00A63E` (or neutral gray pill `#F3F4F6`).
- **Status - Failed**: Soft red pill `#FDE8E8`, text `#9B1C1C` / `#DC2626`.
- **Status - Processing**: Soft blue pill `#E1EFFE`, text `#1E429F`.
- **Detail Callout Banner**: Background `#FEF9C3` (amber-100), left border `#F59E0B` (amber-500), text `#78350F` / `#92400E`.

### Border Radii
- **Buttons / Inputs**: 6px - 8px (`rounded-md` / `rounded-lg`).
- **Pills / Badges / Search Bar**: 9999px (`rounded-full`).
- **Cards / Modal Containers / Popovers**: 12px - 16px (`rounded-xl`).
- **Editor Container**: 10px - 12px (`rounded-xl`).

### Shadows
- **Cards / Popovers**: `0 4px 20px -2px rgba(0, 0, 0, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)`.
- **Dropdowns / Tooltips**: `0 10px 15px -3px rgba(0, 0, 0, 0.1)`.

---

## Frame-by-Frame Specifications

### 1. Frame: Login (`login.png`)
- **Layout Structure**:
  - Full viewport background: Centered layout on `#FAFAFA` / `#FFFFFF`.
  - Centered card: Width ~380px - 400px, padding: 32px (horizontal: 32px, vertical: 36px), border radius: 12px, border: 1px solid `#E5E7EB`, subtle shadow.
- **Exact Texts & Labels**:
  - Title: "Login" (centered, 22px, font-bold `#111827`, margin-bottom: 24px).
  - Button 1: "Login with Google" (includes official Google 'G' 4-color SVG logo, centered text, font-medium 14px `#1F2937`).
    - Background: `#E5F6EC` (light green tint), hover `#D6F1E0`, height: 44px, border-radius: 8px.
  - Divider: "or sign up through email" (12px, font-normal `#9CA3AF`, with horizontal rule on both sides `#E5E7EB`).
  - Input 1: Placeholder / label "Email ID" (height: 42px, background: `#F4F5F7`, border: 1px solid `#E5E7EB`, border-radius: 8px, text: 14px `#374151`).
  - Input 2: Placeholder / label "Password" (height: 42px, background: `#F4F5F7`, border: 1px solid `#E5E7EB`, border-radius: 8px, type: password).
  - Button 2: "Login" (solid brand green `#00A63E`, text: white `#FFFFFF`, font-semibold 14px, height: 42px, border-radius: 8px, hover `#008A33`).
- **Interactive Behavior**:
  - Clicking "Login with Google" navigates to `/api/auth/google` to trigger real OAuth flow.
  - Email/Password form and "Login" button: Non-functional per requirements (inputs disabled, button displays informative toast: "Only Google login is enabled for this assignment").
- **Assumptions**:
  - Card max-width assumed 380px on standard desktop screens.

---

### 2. Frame: Homepage with Scheduled Selected (`homepage_scheduled.png`)
- **Layout Structure**:
  - Two-column dashboard layout:
    - Sidebar: Fixed width ~240px - 260px, height 100vh, background `#FFFFFF`, right border 1px solid `#E5E7EB`, padding: 20px 16px.
    - Main Content Area: Flex-1, background `#FAFAFA`, padding: 24px 32px.
- **Sidebar Elements**:
  - Top Logo: "ON8" or "ONE" bold stylized logo mark (22px font-bold `#111827`).
  - User Profile Card (immediately below logo):
    - Avatar: 36px circle with user picture or initials.
    - Name: "Oliver Brown" (14px font-semibold `#111827`).
    - Email: "oliver.brown@domain.io" (12px `#6B7280`).
    - Dropdown chevron: Down arrow icon triggering user menu (with "Logout" and "Connect / Disconnect Slack").
  - Compose Button:
    - Pill button with 1.5px solid border `#00A63E`, background: transparent / white, text `#00A63E`, font-medium 14px, full width, height: 40px, rounded-full, hover background `#E5F6EC`.
    - Text: "Compose".
  - Section Label: "CORE" (11px, font-bold uppercase `#9CA3AF`, margin-top: 24px, margin-bottom: 8px, padding-left: 8px).
  - Navigation Items:
    - Item 1: "Scheduled" (Active State):
      - Icon: Clock icon (`#00A63E`).
      - Label: "Scheduled" (14px font-medium `#00A63E`).
      - Background: `#E5F6EC` (light green), rounded-lg (8px), padding: 10px 12px.
      - Pill Badge: Right-aligned, background `#FFFFFF` or `#D5F0DF`, text `#00A63E` (or count "2", 12px font-semibold).
    - Item 2: "Sent" (Inactive State):
      - Icon: Paper-plane icon (`#6B7280`).
      - Label: "Sent" (14px font-normal `#4B5563`).
      - Hover background `#F3F4F6`, rounded-lg.
      - Count Badge: "108" (`#9CA3AF`, 12px font-normal).
- **Top Bar (Main Area)**:
  - Search Input: Pill-shaped (`rounded-full`), height: 40px, width ~320px - 400px, background `#F4F5F7`, border: 1px solid `#E5E7EB`.
    - Left icon: Magnifying glass search icon (`#9CA3AF`).
    - Placeholder: "Search" (`#9CA3AF`, 14px).
  - Action Icons (right of search input):
    - Filter Icon: Funnel SVG icon (`#6B7280`, hover `#111827`).
    - Refresh Icon: Circular sync arrow SVG icon (`#6B7280`, hover `#111827`). Triggers TanStack Query invalidation.
- **List View (Scheduled Emails)**:
  - Table / Card rows separated by subtle border / dividers (`#E5E7EB`).
  - Row 1:
    - Recipient: "To: Jane Smith" (14px font-semibold `#111827`, width ~160px).
    - Status Badge: Clock icon + "Oct 28, 08:30 PM" (orange/amber text `#DD784D` / `#D97706`, pill background `#FEF3C7`, padding: 4px 10px, rounded-full, 12px font-medium).
    - Subject & Preview: "Meeting follow up - Scheduled - Hi Jane, I just wanted to follow up on our meeting..." (14px, subject bold `#111827`, preview `#6B7280`).
    - Star Icon: Star outline SVG on far right (`#9CA3AF`, visual only).
  - Row 2:
    - Recipient: "To: Mike" (14px font-semibold `#111827`).
    - Status Badge: Clock icon + "Oct 28, 08:30 PM" (orange/amber pill badge).
    - Subject & Preview: "Sweet, great to meet you - Scheduled - Hi Mike, just wanted to follow up on our meeting..."
    - Star Icon: Star outline SVG on far right.
- **Interactive Behavior**:
  - Clicking any email row navigates to `/emails/:id`.
  - Typing in search triggers debounced query parameter `q`.
  - Refresh icon refetches active query.

---

### 3. Frame: Homepage with Sent Selected (`homepage_sent.png`)
- **Layout Structure**: Same layout as Scheduled homepage.
- **Sidebar Elements**:
  - Navigation Item "Sent" (Active State):
    - Icon: Paper-plane icon (`#00A63E`).
    - Label: "Sent" (14px font-medium `#00A63E`).
    - Background: `#E5F6EC`, rounded-lg (8px), padding: 10px 12px.
    - Pill Badge: "108" (`#00A63E`, 12px font-semibold).
  - Navigation Item "Scheduled" (Inactive State):
    - Background: Transparent, label `#4B5563`, count badge "2".
- **List View (Sent Emails)**:
  - Row 1:
    - Recipient: "To: Sarah Wilson" (14px font-semibold).
    - Status Badge: Pill badge "Sent" (green or neutral `#E5F6EC` / `#F3F4F6`, text `#03543F` / `#374151`, 12px font-medium).
    - Subject & Preview: "Re: Project Update - Thanks for the update, Sarah! Looks good!"
    - Star Icon: Star outline SVG.
  - Row 2:
    - Recipient: "To: David" / "To: Support" (14px font-semibold).
    - Status Badge: Pill badge "Failed" (soft red `#FDE8E8`, text `#9B1C1C`, 12px font-medium).
    - Subject & Preview: "Issue with login - I am facing trouble logging in to the dashboard..."
    - Star Icon: Star outline SVG.
- **Interactive Behavior**: Clicking row navigates to `/emails/:id`.

---

### 4. Frame: Email Detail View (`email_detail.png`)
- **Layout Structure**:
  - Header: Back navigation arrow button (`<-`), Email subject heading.
  - Sender Info Bar: Avatar, sender name, email, recipient, timestamp.
  - Body Area: Sanitized HTML body, custom highlight box, visual attachments card list.
- **Exact Texts & Labels**:
  - Back Button & Title: `<-` Back arrow, Title: "Oliver, hello there! | MJWYT44 BMW5ZW01" (18px font-semibold `#111827`).
  - Sender Line:
    - Circle Avatar: 36px diameter, background green `#00A63E` (or `#16A34A`), white letter "A".
    - Sender Name: "Amanda Clark" (14px font-semibold `#111827`).
    - Sender Email: `<amanda@example.com>` (13px `#6B7280`).
    - "to me" indicator with dropdown chevron icon (`#9CA3AF`).
    - Timestamp: Right-aligned, "Jan 2, 10:20 AM" (12px `#6B7280`).
  - Email Body:
    - "Hey Oliver,"
    - "You've just RECEIVED something"
    - Highlight Callout Box:
      - Background: `#FEF9C3` (amber-50 / amber-100), left border 3px solid `#F59E0B`.
      - Padding: 16px 20px, rounded-r-lg.
      - Text line 1: `* Extremely Exclusive—Only 4 Spots Worldwide Per Year | $20,000 Investment *` (font-semibold `#78350F`).
      - Text line 2: `To explore securing your private transformation, simply reply 'YES' to this email then -` (13px `#92400E`).
    - "Your coach for world-class performance,"
    - "David"
    - "P.S. Always remember that you can develop world-class technique! 🚀"
  - Attachments Area (below body):
    - Attachment Card 1:
      - Thumbnail: Tennis player image (`tennis_cover_male.png`).
      - Filename: `tennis_cover_male.png` (12px font-medium `#111827`).
      - Size: `1.1 MB` (11px `#6B7280`).
    - Attachment Card 2:
      - Thumbnail: Tennis player image (`tennis_1-reduce.png`).
      - Filename: `tennis_1-reduce.png` (12px font-medium `#111827`).
      - Size: `1.1 MB` (11px `#6B7280`).
- **Interactive Behavior**:
  - Clicking `<-` navigates back to previous list (`/dashboard/scheduled` or `/dashboard/sent`).
  - If Ethereal `previewUrl` exists, render an "Open Ethereal Preview" link button at top.
  - Attachments are visual representations per requirements.

---

### 5. Frame: Compose New Email (Empty State) (`compose_empty.png`)
- **Layout Structure**:
  - Header: Left back arrow `<-` + "Compose New Email" (18px font-semibold).
  - Header Right Actions:
    - Attachment/paperclip icon (visual).
    - Clock icon (triggers Send Later popover).
    - "Send Later" / "Send" button: Pill button with green border `#00A63E` or solid green, text "Send Later".
  - Main Form Fields:
    - Row 1 ("From"): Label "From" (14px font-medium `#374151`, width ~60px), dropdown pill button showing active sender: `oliver.brown@domain.io v` (border 1px solid `#E5E7EB`, rounded-lg, padding: 6px 12px).
    - Row 2 ("To"): Label "To" (14px font-medium `#374151`, width ~60px), text input with placeholder `recipient@example.com`, flex-1.
      - Right action: "Upload List" button with paperclip/upload icon, text `#00A63E`, 13px font-medium. Clicking opens CSV/TXT file picker.
    - Row 3 ("Subject"): Label "Subject" (14px font-medium `#374151`), input with placeholder `Subject`, full width.
    - Row 4 (Scheduling Configs):
      - Field 1: Label "Delay between 2 emails", number input box with default `00` (or `20` seconds), width ~70px, border 1px solid `#E5E7EB`, rounded-md, text-center.
      - Field 2: Label "Hourly Limit", number input box with default `00` (or `50`), width ~70px, border 1px solid `#E5E7EB`, rounded-md, text-center.
    - Row 5 (Rich Text Editor):
      - Container: Border 1px solid `#E5E7EB`, rounded-xl, background `#FAFAFA`, min-height 280px.
      - TipTap Toolbar (top of editor container, background `#FFFFFF`, border-bottom 1px solid `#E5E7EB`, padding: 8px 12px, flex items-center gap-2):
        - Undo, Redo icons
        - Vertical separator line (`#E5E7EB`)
        - "Tt v" font formatting dropdown (Normal, H1, H2, H3)
        - Vertical separator line
        - Bold (B), Italic (I), Underline (U), Strikethrough (S)
        - Vertical separator line
        - Bullet List, Numbered List
        - Vertical separator line
        - Align Left, Align Center, Align Right
        - Vertical separator line
        - Blockquote, Code block, Link icon
      - Editor Content Area: Placeholder "Type Your Reply...", padding: 16px.

---

### 6. Frame: Compose with Recipient Chips and "+4" (`compose_chips.png`)
- **Layout Structure**: Same Compose form, with populated "To" field.
- **Recipient Chips**:
  - Individual recipient chip:
    - Oval pill container: Height 28px, background `#E5F6EC`, border 1px solid `#99DCB2` / `#00A63E`, border-radius 9999px, padding: 2px 10px.
    - Text: `sam@gmail.com` (12px font-medium `#065F46` / `#1F2937`).
    - Remove button: Optional 'x' icon on hover.
  - Overflow indicator pill:
    - Container: Oval pill, background `#E5F6EC`, border 1px solid `#00A63E`, padding: 2px 8px.
    - Text: `+4` (12px font-semibold `#00A63E`). Hovering displays tooltip or expanded list of remaining emails.
  - "Upload List" button: Remains visible on right-hand side.

---

### 7. Frame: Send Later Popover (`send_later_popover.png`)
- **Layout Structure**:
  - Floating card popover anchored to the clock / "Send Later" button.
  - Dimensions: Width ~260px - 280px, background `#FFFFFF`, border: 1px solid `#E5E7EB`, border-radius: 12px, shadow-xl, padding: 16px 20px.
- **Exact Texts & Labels**:
  - Header: "Send Later" (15px font-semibold `#111827`, margin-bottom: 14px).
  - Date & Time Picker Field:
    - Text: "Pick date & time" (or input placeholder, 13px `#9CA3AF`).
    - Calendar icon on right (`#9CA3AF`).
    - Bottom border or input box `#E5E7EB`.
  - Quick Option List (vertical stack, spacing 10px):
    - Option 1: "Tomorrow" (13px font-normal `#374151`, hover `#00A63E`). Sets date to tomorrow, current time.
    - Option 2: "Tomorrow, 09:00 AM" (or 10:00 AM) (13px font-normal `#374151`, hover `#00A63E`).
    - Option 3: "Tomorrow, 11:00 AM" (13px font-normal `#374151`, hover `#00A63E`).
    - Option 4: "Tomorrow, 3:00 PM" (13px font-normal `#374151`, hover `#00A63E`).
  - Action Footer (bottom row, flex justify-end gap-3, margin-top: 18px):
    - "Cancel" button: Text button, 13px font-medium `#6B7280`, hover `#111827`. Closes popover without changes.
    - "Done" button: Pill button with green border `#00A63E`, text `#00A63E`, 13px font-medium, padding: 4px 16px, rounded-full, hover background `#E5F6EC`. Applies selected time to `startTime`.

---

## Explicit Assumptions & Notes
1. **Logo ("ON8" / "ONE")**: Exact SVG asset is not provided; we will implement a clean, stylized typography logo matching the font and visual weight.
2. **Email Password Sign-in**: The Login card displays email/password inputs and a "Login" button, but the API CONTRACT only specifies Google OAuth (`/api/auth/google`). As required, email/password UI is rendered disabled/with a friendly toast.
3. **Star Icon**: The star icon on email list rows is visual only and does not persist state.
4. **Attachments in Compose**: The paperclip icon in Compose is visual only (note in README per instructions).
5. **Detail View Images**: The email detail view shows two tennis player sample attachments (`tennis_cover_male.png`, `tennis_1-reduce.png`). We generate or bundle clean asset placeholders for realistic preview.
6. **Date Formatting**: List views display friendly date strings (e.g., `Oct 28, 08:30 PM`, `Jan 2, 10:20 AM`) using `date-fns`.

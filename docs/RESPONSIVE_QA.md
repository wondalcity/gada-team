# Responsive QA Checklist

Test on: iPhone 14 Pro (390×844), iPad Air (820×1180), Desktop 1440×900

## Breakpoints
| Name | Range | Tailwind prefix |
|------|-------|-----------------|
| Mobile | < 640px | (default) |
| Tablet | 640px – 1024px | sm – lg |
| Desktop | > 1024px | lg+ |

---

## 1. Worker Onboarding

| Step | Mobile (390px) | Tablet (820px) | Desktop (1440px) |
|------|---------------|----------------|------------------|
| Login page split panel | Single column, form centered | Two columns | Two columns: gradient left, form right |
| OTP input | Full-width, large tap targets | Same | Centered narrow form |
| Onboarding step progress | Top progress bar spans full width | Same | Same |
| Role selection cards | 1-col stacked | 2-col grid | 3-col grid |
| Basic info fields | Full-width stacked | Same | Constrained max-width container |
| Nationality/visa section | Stacked fields | Same | Inline row layout |
| Category multi-select | Scrollable chip grid, wraps to multiple rows | Same | Same |
| Pay range inputs | Stacked min/max | Side-by-side | Side-by-side |
| CTA button ("다음") | Full-width, fixed bottom | Full-width, fixed bottom | Right-aligned, inline |

Checks:
- [ ] Login: desktop split-panel renders with gradient left side and form right side simultaneously
- [ ] Login: mobile shows only form, gradient panel is hidden (not just off-screen)
- [ ] Onboarding: progress indicator spans full width on 390px without overflow
- [ ] Onboarding: step labels truncate gracefully if too long on mobile
- [ ] Onboarding: nationality field hides properly on mobile viewport (no empty space)
- [ ] Role cards: 1-column stacked on mobile (390px)
- [ ] Role cards: 3-column grid on desktop (1440px)
- [ ] Role card active state visible on touch (not only on hover)
- [ ] Category multi-select: chips wrap correctly and don't overflow card boundary
- [ ] "다음" / "완료" button: always visible above system keyboard on mobile
- [ ] Form fields: minimum 44px height on mobile for tap targets

---

## 2. Job Search

| Element | Mobile (390px) | Tablet (820px) | Desktop (1440px) |
|---------|---------------|----------------|------------------|
| Filter trigger button | Bottom-center pill (fixed) | Bottom-center pill (fixed) | Hidden (sidebar visible) |
| FilterDrawer | Bottom sheet, ~90vh with drag handle | Bottom sheet | Left sidebar (sticky, collapsible) |
| Job grid | 1 column, full-width cards | 2 columns | 2 columns |
| Job card | Full-width, stacked info layout | Same | Same |
| Distance badge | Top-right absolute positioned | Same | Same |
| Search bar | Full-width, top of page | Same | Full-width |
| Sort dropdown | Inline with search bar (truncated) | Inline | Inline |
| Region filter row | Horizontal scroll | Horizontal scroll | Wrap |
| Skill/visa chip filters | Horizontal scroll in filter drawer | Inline grid | Inline grid |

Checks:
- [ ] Mobile: filter trigger pill button is visible (fixed bottom-center), min 44px height
- [ ] Mobile: filter trigger shows active filter count badge
- [ ] Mobile: FilterDrawer bottom sheet slides up smoothly (transition animation)
- [ ] Mobile: FilterDrawer drag handle visible at top of sheet
- [ ] Mobile: body scroll locked when FilterDrawer is open
- [ ] Mobile: FilterDrawer backdrop tap closes the drawer
- [ ] Desktop: JobFilters left sidebar visible by default, no bottom filter button shown
- [ ] Desktop: filter sidebar does not scroll with page content (sticky)
- [ ] Tablet: filter behavior matches mobile (bottom sheet trigger)
- [ ] All filter interactions are keyboard accessible (focus states visible)
- [ ] Location picker GPS button: minimum 44px tap target on mobile
- [ ] Radius chips row: horizontally scrollable on narrow screens (no wrapping overflow)
- [ ] Pay range slider: thumb handles are at least 44px for mobile interaction
- [ ] Job card "지원하기" button: full-width or min 44px height on mobile
- [ ] Distance badge: does not overlap job title text at 390px
- [ ] Job grid: single column on 390px without horizontal scroll

---

## 3. Team Creation

| Step | Mobile (390px) | Tablet (820px) | Desktop (1440px) |
|------|---------------|----------------|------------------|
| Wizard stepper header | Condensed (numbers only, no labels) | Numbers with short labels | Full step labels |
| Step progress bar | Spans full width | Same | Max-width container |
| Form input fields | Full-width, stacked | Same | Max-width form container |
| Region multi-select | Full-width chips, scroll | Same | Dropdown or chips panel |
| Equipment code picker | Scrollable chip grid | Same | Same |
| "다음" / "완료" buttons | Full-width at bottom | Same | Right-aligned |
| Back button | Left-aligned, text only | Same | Same |

Checks:
- [ ] Step progress bar / stepper is readable at 390px (numbers not clipped)
- [ ] Step labels: truncated or hidden on narrow screens, no overflow
- [ ] All form input fields: minimum 44px height on mobile
- [ ] All form inputs: full-width at 390px (no horizontal overflow)
- [ ] "다음" button: always visible, not hidden behind soft keyboard
- [ ] Keyboard appears for text input: layout reflows without hiding the active field
- [ ] Region multi-select: selected region chips visible without truncation
- [ ] Equipment code chips: wrap into multiple rows correctly on mobile
- [ ] Wizard back navigation: button accessible without scrolling on small screens
- [ ] Team creation success screen: centered, readable at 390px

---

## 4. Job Posting (Employer)

| Element | Mobile (390px) | Tablet (820px) | Desktop (1440px) |
|---------|---------------|----------------|------------------|
| Job wizard header | Full-width progress bar | Same | Same |
| Wizard steps | Full-screen step content | Same | Form left + live preview right |
| Live preview panel | Hidden | Hidden | Visible right sidebar |
| Site picker cards | 1-column stacked | 2-column grid | 3-column grid |
| Fixed bottom action bar | Shows (Next/Save Draft/Publish) | Same | Hidden (actions in sidebar/top bar) |
| Pay type selector | Full-width segmented | Same | Inline |
| Date picker | Full-screen overlay | Same | Dropdown inline |
| Application type chips | Horizontal row, wraps if needed | Same | Inline |
| Visa type multi-select | Stacked checkboxes or chips | Same | Chip group |

Checks:
- [ ] Mobile: live preview sidebar is hidden (not rendered, or display:none)
- [ ] Mobile: sticky bottom action bar (다음/임시저장/게시) shows above keyboard
- [ ] Mobile: bottom action bar does not overlap form content
- [ ] Desktop: live preview sidebar renders job card in real-time as form fills
- [ ] Desktop: preview sidebar does not cause layout shift when content changes
- [ ] Site picker cards: touch targets sufficient on mobile (full-card tap area)
- [ ] Site picker: "새 현장 추가" card is visually distinct
- [ ] Application type chips: wrap to next line correctly at 390px (no overflow)
- [ ] Pay amount input: numeric keyboard triggered on mobile (inputMode="numeric")
- [ ] Headcount inputs (min/max): side-by-side on desktop, stacked on mobile
- [ ] Schedule day-of-week toggles: tap targets min 44px on mobile
- [ ] Wizard step validation errors: visible without scrolling on mobile

---

## 5. ATS (Employer + Admin)

| Layout | Mobile (390px) | Tablet (820px) | Desktop (1440px) |
|--------|---------------|----------------|------------------|
| Employer ATS | Card list, full-width | Card list | Table 60% + sticky side panel 40% |
| Admin ATS | Card list, full-width | Card list | Table 60% + sticky side panel 40% |
| Application card | Full-width, key info visible | Same | N/A (table row) |
| Side panel | N/A (navigates to full detail page) | N/A | Fixed right, internally scrollable |
| Status dropdown | Native select (full-width) | Same | Custom dropdown in panel |
| Scout / Verify buttons | Inline in card | Same | In side panel |
| Status timeline | Stacked vertical list | Same | In side panel |
| Filter bar | Stacked vertically | Inline row | Inline row |

Checks:
- [ ] Mobile: application card list has no horizontal scroll at 390px
- [ ] Mobile: card tap navigates to full-page application detail
- [ ] Mobile detail page: all applicant snapshot sections accessible via vertical scroll
- [ ] Mobile detail page: status dropdown rendered as native select for usability
- [ ] Desktop: side panel height = viewport height, scrolls internally
- [ ] Desktop: side panel does not overflow viewport vertically (no page-level scroll caused by panel)
- [ ] Desktop: table + panel layout maintains 60/40 split without overflow
- [ ] Desktop table: columns have minimum widths to prevent excessive text truncation
- [ ] Status dropdown: all valid next-state options visible (not clipped by panel boundary)
- [ ] Scout button (⭐): minimum 44px tap target on mobile
- [ ] Verify button (✓): minimum 44px tap target on mobile
- [ ] Status timeline: readable at 390px (text not overflowing or overlapping)
- [ ] Timeline connector lines: render correctly at narrow widths
- [ ] Employer note textarea: resizable or sufficiently tall on desktop; full-width on mobile
- [ ] "더 보기" pagination or infinite scroll in table: works on both mobile and desktop

---

## 6. Admin CRUD Screens

| Screen | Mobile (390px) | Desktop (1440px) |
|--------|---------------|------------------|
| List pages (workers, jobs) | Horizontally scrollable table or card view | Full table visible |
| Filter bar | Stacked vertically (collapsible) | Horizontal inline row |
| Detail pages | Full-page with sections | Side panel or full-page |
| Content intro form | Single column | Two-column (preview alongside form) |
| FAQ inline edit | Full-width expanding row | Same |
| Category slide-in panel | Full-width bottom sheet or page | Right slide-in panel |
| SMS send tool | Stacked single column | Two-column with preview |
| SMS broadcast 3-step | Full-screen steps | Stepped form with summary |

Checks:
- [ ] Admin sidebar: collapses to icon-only mode at < 1024px
- [ ] Admin sidebar: fully hidden on mobile (< 640px), opened by hamburger
- [ ] Mobile: hamburger icon minimum 44px tap target
- [ ] Mobile: sidebar open state shows overlay backdrop; tapping backdrop closes sidebar
- [ ] Mobile: sidebar close button accessible (X or back-swipe)
- [ ] DataTable: minimum column widths set to prevent severe text truncation
- [ ] DataTable: horizontal scroll enabled on mobile (not clipped)
- [ ] Table rows: tap target sufficient for row click on mobile (min 44px height)
- [ ] Filter bars: wrap to stacked layout at 640px without overlap
- [ ] Content intro form: dynamic arrays (work characteristics, skills, pricing rows) usable at 390px
  - [ ] Add row button: full-width on mobile
  - [ ] Remove row button: minimum 44px tap area
  - [ ] Row inputs: full-width stacked, not side-by-side on mobile
- [ ] SMS send single: variable input fields stack on mobile
- [ ] SMS live preview panel: hidden on mobile; toggled via "미리보기" button
- [ ] SMS broadcast Step 2: recipient list scrollable without page layout break
- [ ] Admin /notifications: broadcast form scrollable on mobile (no content cut off)
- [ ] Role badge chips in /settings/admins: wrap correctly at 390px

---

## 7. Navigation & Shell

| Element | Mobile | Tablet | Desktop |
|---------|--------|--------|---------|
| Top navigation bar | Logo + hamburger (web) / logo + bell (web worker) | Same as mobile | Full nav links + bell + avatar |
| Bottom navigation (worker web) | 4-tab bar (홈/검색/지원현황/알림) | Hidden | Hidden |
| Admin sidebar | Hidden, opened by hamburger | Icon-only collapsed | Full expanded |

Checks:
- [ ] Worker web TopNav: shows logo and bell icon on mobile, no overflowing links
- [ ] Worker web BottomNav: renders above iOS home indicator (safe-area-inset-bottom)
- [ ] Worker web BottomNav: unread notification badge visible on "알림" tab
- [ ] Worker web BottomNav: active tab highlighted correctly
- [ ] Admin TopBar: breadcrumb collapses gracefully at 390px
- [ ] Admin sidebar: transition animation smooth (no flicker) on open/close

---

## 8. Modals, Sheets & Overlays

| Component | Mobile | Tablet | Desktop |
|-----------|--------|--------|---------|
| ApplyModal | Full-screen or near-full bottom sheet | Bottom sheet | Centered modal (max-w-lg) |
| Confirm dialogs | Centered alert or bottom sheet | Centered modal | Centered modal |
| FilterDrawer | Bottom sheet (90vh) | Bottom sheet | Inline sidebar |
| Toast notifications | Top or bottom safe-area | Same | Bottom-right corner |
| Image lightbox (if any) | Full-screen | Full-screen | Centered overlay |

Checks:
- [ ] ApplyModal: no content hidden behind keyboard on mobile
- [ ] ApplyModal: close (X) button: min 44px tap target
- [ ] ApplyModal: cover letter textarea scroll works inside modal (scroll chain doesn't hijack modal)
- [ ] Confirm dialogs: appear above all other content (z-index correct)
- [ ] Toast notifications: visible above soft keyboard when keyboard is open
- [ ] Toast: auto-dismiss after 3–5 seconds
- [ ] All bottom sheets: drag handle present and functional
- [ ] All bottom sheets: close on backdrop tap
- [ ] Overflow scroll within modals/sheets: works smoothly (no page-body scroll leak)
- [ ] Modals: focus trap active (Tab key stays within modal while open)
- [ ] Modals: Escape key closes modal on desktop

---

## 9. General Mobile Checks

- [ ] No horizontal scroll on any page at 390px viewport width
- [ ] Bottom navigation bar renders above system home indicator (safe-area-inset-bottom applied)
- [ ] All interactive elements: minimum 44×44px tap target size
- [ ] Font sizes: minimum 14px body text, no sub-12px text anywhere
- [ ] Line-height and letter-spacing: readable on small screens without text collision
- [ ] Modals and bottom sheets: backdrop click / tap closes the overlay
- [ ] Toast / alert messages: visible above on-screen keyboard
- [ ] Inputs with numeric keyboard: inputMode="numeric" or type="tel" where appropriate
- [ ] Pull-to-refresh: not accidentally triggered by vertical page scroll (if implemented)
- [ ] Pinch-to-zoom: not blocked on content pages (user-scalable not disabled)
- [ ] Long text (job descriptions, names): truncates with ellipsis or wraps — does not break layout
- [ ] Korean and Vietnamese text: correct font rendering at all sizes
- [ ] Images: do not overflow their containers at any breakpoint
- [ ] Empty state illustrations / icons: scale correctly at 390px

---

## 10. Accessibility Checks (Cross-Breakpoint)

- [ ] All interactive elements have visible focus outlines (not outline:none without replacement)
- [ ] Color alone is not the only differentiator for status (badge + color used together)
- [ ] Icon-only buttons have aria-label attributes
- [ ] Form fields have associated label elements
- [ ] Error messages are associated to their fields via aria-describedby
- [ ] Skip-to-main-content link present on desktop pages
- [ ] Images have alt text (decorative images: alt="")
- [ ] Modal focus: focus moves to modal on open; returns to trigger on close
- [ ] No content disappears at any supported breakpoint (hidden via display:none is OK; lost via overflow without scroll is not)

# GADA Manual QA Checklist

## Test Accounts (local dev)
| Role | Phone | Dev User ID | Notes |
|------|-------|-------------|-------|
| Worker | +82-10-1001-0001 | 1 | Korean worker, H2 visa |
| Worker (VI) | +82-10-1002-0002 | 2 | Vietnamese worker, E9 visa |
| Team Leader | +82-10-1003-0003 | 3 | Leads a concrete crew |
| Employer | +82-10-2001-0001 | 4 | Company owner |
| Admin | +82-10-9001-0001 | 5 | Super admin |

---

## 1. Authentication & Onboarding

### 1.1 Phone Auth
- [ ] OTP send triggers on valid Korean phone number (+82-10-...)
- [ ] Invalid phone formats are rejected with clear error message
- [ ] OTP input shows 6-digit masked field
- [ ] Expired OTP shows appropriate error
- [ ] Successful OTP redirects to onboarding for new users
- [ ] Successful OTP redirects to home for returning users
- [ ] OTP resend button becomes active after cooldown (60s)
- [ ] Firebase phone auth initializes without console errors

### 1.2 Worker Onboarding (4-step flow)
- [ ] Step 1 — Role selection: WORKER / TEAM_LEADER / EMPLOYER cards render
- [ ] Step 1 — Selecting a role highlights that card with active state
- [ ] Step 2 — Basic info: full name + birth date validation works
- [ ] Step 2 — Full name: minimum 2 characters enforced
- [ ] Step 2 — Birth date: future dates rejected
- [ ] Step 3 — Identity: nationality/visa section hidden for KR nationality
- [ ] Step 3 — Identity: visa type dropdown shows for non-KR nationalities
- [ ] Step 3 — Identity: E9, H2, F4, F5 visa options present
- [ ] Step 4 — Preferences: job category multi-select works (min 1 required)
- [ ] Step 4 — Pay range: min/max validation (min ≤ max enforced)
- [ ] Step 4 — Pay range: empty values allowed (no preference)
- [ ] Completing onboarding sets user status to ACTIVE
- [ ] EMPLOYER role: 2-step fast path (role → name only, skips identity/preferences steps)
- [ ] Back button on each step navigates to previous step without data loss
- [ ] Progress bar accurately reflects current step (1/4, 2/4, 3/4, 4/4)

### 1.3 Return User Login
- [ ] Active WORKER: redirects to /jobs
- [ ] Active EMPLOYER: redirects to /employer
- [ ] Active TEAM_LEADER: redirects to /jobs
- [ ] PENDING user (incomplete onboarding): shown prompt to complete profile
- [ ] SUSPENDED user: shown suspension message with reason if available
- [ ] DELETED user: access denied with appropriate error
- [ ] JWT token stored correctly in session (Firebase auth state persists on page refresh)

---

## 2. Job Discovery

### 2.1 Job List (/jobs)
- [ ] Jobs load on page open (public, no auth required)
- [ ] Each card shows: title, company name, location, pay, category chip, application type
- [ ] Pay display: hourly/daily/monthly format matches job configuration
- [ ] Application type badges render (개인/팀/업체)
- [ ] Distance badge shows when location filter is active
- [ ] "직종 가이드" chip links to /guides/{categoryCode}
- [ ] "지원하기" button visible on each card
- [ ] Empty state (no results) shows helpful message with filter reset option
- [ ] Loading skeleton renders while fetching (not blank screen)
- [ ] Pagination / infinite scroll loads more jobs correctly

### 2.2 Search & Filters
- [ ] Keyword search filters results as typed (debounced ~300ms)
- [ ] Region filter (sido/sigungu) narrows results
- [ ] Location GPS button requests browser permission; shows radius chips after grant
- [ ] Location permission denied: graceful fallback message shown
- [ ] Radius chip selection (5km, 10km, 20km, 50km) updates distance filter
- [ ] Pay range sliders: results update after "적용하기" button
- [ ] Pay range min/max validation on slider inputs
- [ ] Visa type filter works for E9, H2, F4
- [ ] Health check required toggle filters correctly
- [ ] Application type filter (개인/팀/업체) works individually and in combination
- [ ] FilterDrawer (mobile): opens as bottom sheet with smooth animation
- [ ] FilterDrawer (mobile): staged state — does not refetch until "적용하기" is tapped
- [ ] FilterDrawer (mobile): "초기화" clears all selections within drawer
- [ ] Active filter count badge shows on filter button when filters applied
- [ ] "거리순" sort works when location is active
- [ ] "최신순" (default sort) works correctly
- [ ] All filters stack (AND logic) correctly

### 2.3 Job Detail
- [ ] All job info renders: title, company, site, pay, schedule, requirements
- [ ] Construction phase and trade category displayed
- [ ] Visa requirements section shows accepted visa types
- [ ] Health check requirement displayed when applicable
- [ ] "지원하기" button opens ApplyModal
- [ ] ApplyModal: INDIVIDUAL / TEAM / COMPANY type cards rendered
- [ ] ApplyModal: TEAM card shows user's team name if user has an active team
- [ ] ApplyModal: TEAM card disabled with tooltip if user has no team
- [ ] Cover letter textarea: optional field, 500 character limit with live counter
- [ ] Cover letter: counter turns red at 450+ characters
- [ ] Successful apply: success state shown, modal closes on dismiss
- [ ] Duplicate apply: error message shown ("이미 지원한 공고입니다")
- [ ] Apply while unauthenticated: redirected to login, return URL preserved
- [ ] Closed/paused job: "지원하기" button disabled with reason

---

## 3. Applications (/applications)

- [ ] "내 지원현황" page loads for authenticated users
- [ ] Unauthenticated access redirects to /login
- [ ] All application cards show: job title, company, application type badge, status badge
- [ ] Status badges render with correct colors: 지원완료(blue), 검토중(yellow), 합격(green), 불합격(red), 취소(gray)
- [ ] Status filter tabs (전체/지원완료/검토중/합격/불합격/취소) filter correctly
- [ ] Tab count badges reflect filtered totals
- [ ] Scout badge (⭐) shows when isScouted=true
- [ ] Verified badge (✓) shows when isVerified=true
- [ ] Application date displayed on each card
- [ ] Withdraw button only shows for APPLIED (지원완료) status
- [ ] Withdraw confirm dialog prevents accidental withdrawal ("정말 취소하시겠습니까?")
- [ ] After withdraw: status changes to WITHDRAWN in list (optimistic update)
- [ ] Withdrawn application: no withdraw button, cannot re-apply immediately
- [ ] Empty state (no applications): shows prompt to browse /jobs
- [ ] Application snapshot shows data from time of application (not current job data)

---

## 4. Teams (/teams)

### 4.1 Team Creation
- [ ] WORKER / TEAM_LEADER can navigate to /teams/new
- [ ] EMPLOYER cannot access /teams/new (redirected or hidden)
- [ ] Step 1: team name (required), team type, description fields
- [ ] Step 1: team name uniqueness validation (API error shown)
- [ ] Step 2: operating regions multi-select (sido/sigungu)
- [ ] Step 2: equipment codes multi-select works
- [ ] Step 3: preferred pay range (min/max)
- [ ] Step 3: headcount (min/max members)
- [ ] Wizard back navigation preserves data
- [ ] Created team appears in /teams/mine immediately after creation
- [ ] Creator is automatically assigned TEAM_LEADER role within team

### 4.2 Team Management
- [ ] Team detail page shows all members with role badges
- [ ] Leader badge displayed for team leader
- [ ] Member count shown correctly
- [ ] Leader can invite member by phone number
- [ ] Invite validation: phone number format checked before send
- [ ] Invite error: user not found shows clear message
- [ ] Invite success: confirmation message shown
- [ ] Invitee sees pending invitation in /invitations (or notifications)
- [ ] Invitee can accept invitation: status set to ACTIVE, appears in team members
- [ ] Invitee can reject invitation: invitation removed
- [ ] Pending invitations show expiry date if applicable
- [ ] Edit team: updates name, description, regions, equipment correctly
- [ ] Edit team: changes reflected immediately after save
- [ ] Disband team: confirm dialog shown ("팀을 해산하시겠습니까?")
- [ ] Disband: all members' team association cleared
- [ ] Remove member: leader can remove non-leader members
- [ ] Leave team: non-leader member can leave team

---

## 5. Employer Flows (/employer)

### 5.1 Company Setup
- [ ] /employer redirects to /login for unauthenticated users
- [ ] /employer/company auto-creates skeleton if no company exists for this user
- [ ] Company PENDING status shows yellow banner ("검토 중입니다")
- [ ] Company SUSPENDED status shows red banner ("계정이 정지되었습니다")
- [ ] Company ACTIVE status: no banner, full access to job posting
- [ ] Company form saves: business name, registration number, representative name
- [ ] Business registration number validation (10-digit format)
- [ ] Site creation form: name, address, latitude/longitude fields
- [ ] Site address lookup (if integrated) or manual coordinate entry
- [ ] Multiple sites can be created under one company
- [ ] Site list shows all sites with status badges

### 5.2 Job Posting
- [ ] "공고 등록" navigates to job wizard
- [ ] Job wizard Step 1: site picker cards show all existing sites
- [ ] Step 1: "새 현장 추가" option navigates to site creation flow
- [ ] Job wizard Step 2: all 7 required sections fillable
  - [ ] Title and description (required)
  - [ ] Category (construction trade) picker
  - [ ] Schedule (시작일, 종료일, 요일, 시간)
  - [ ] Pay amount and pay type (hourly/daily/monthly)
  - [ ] Headcount
  - [ ] Visa requirements (multi-select)
  - [ ] Health check required toggle
- [ ] Application type multi-select: INDIVIDUAL / TEAM / COMPANY independently selectable
- [ ] At least one application type required to proceed
- [ ] Save draft functionality saves without publishing
- [ ] Published job appears in /jobs search results
- [ ] Published job shows employer's company name correctly
- [ ] Job status toggle: PUBLISHED ↔ PAUSED
- [ ] Paused job does not appear in /jobs search
- [ ] Paused job shows "지원 마감" badge to workers
- [ ] Delete job: confirm dialog shown
- [ ] Deleted job: removed from employer's job list

### 5.3 Employer ATS (/employer/applications)
- [ ] ATS list loads all applications for employer's active jobs
- [ ] Application list sortable by date, status
- [ ] Desktop: table 60% (left) + sticky side panel 40% (right)
- [ ] Side panel shows full applicant profile snapshot
- [ ] Applicant snapshot includes: name, nationality, visa, certifications, experience
- [ ] Status dropdown only shows valid next states (per transition rules)
- [ ] APPLIED → UNDER_REVIEW transition executes successfully
- [ ] UNDER_REVIEW → SHORTLISTED transition works
- [ ] SHORTLISTED → INTERVIEW_PENDING works
- [ ] INTERVIEW_PENDING → INTERVIEW_COMPLETED works
- [ ] INTERVIEW_COMPLETED → HIRED or REJECTED
- [ ] HIRED marks as final — no further status changes allowed
- [ ] REJECTED: optional rejection reason text input
- [ ] Scout button marks is_scouted=true; shows ⭐ badge in list immediately
- [ ] Scout toggle: clicking again un-scouts (if implemented)
- [ ] Note textarea: employer memo saves on blur or explicit save button
- [ ] Note persists on page reload
- [ ] Bulk status update (if implemented): applies to selected rows

---

## 6. Job Guides (/guides)

- [ ] /guides page loads with category grid
- [ ] Category grid renders with emoji icons and Korean names
- [ ] Locale switcher shows three options: 한국어 / English / Tiếng Việt
- [ ] Locale switcher refetches content in selected language
- [ ] URL updates to reflect locale selection (e.g., ?locale=vi)
- [ ] Categories with published content show green "가이드 있음" badge
- [ ] Categories without content show gray "준비중" badge
- [ ] "준비중" categories have disabled link (not clickable or shows coming-soon)
- [ ] Category detail page loads at /guides/{categoryCode}
- [ ] Hero image renders; gradient fallback shows when image missing
- [ ] Page title and subtitle display in selected locale
- [ ] Work characteristics cards render with orange-50 background
- [ ] Skills section shows chips colored by level:
  - [ ] 필수 (required): red chip
  - [ ] 권장 (recommended): blue chip
  - [ ] 고급 (advanced): purple chip
- [ ] Pricing reference table shows formatted Korean Won amounts (₩ or 만원)
- [ ] FAQ section: accordion items expand and collapse correctly
- [ ] Only one FAQ item open at a time (or multiple — verify expected behavior)
- [ ] Related jobs section shows live jobs for that category
- [ ] Related jobs link to job detail pages correctly
- [ ] Desktop: sticky TOC (table of contents) sidebar visible on right
- [ ] Desktop TOC: active section highlighted as user scrolls
- [ ] Desktop TOC: clicking TOC item smooth-scrolls to section

---

## 7. Notifications

- [ ] Bell icon shows in TopNav for authenticated users
- [ ] Bell icon hidden / replaced with login button for unauthenticated users
- [ ] Red badge appears when unreadCount > 0
- [ ] Badge count reflects actual unread count (or shows 99+ for large counts)
- [ ] /notifications page loads notification feed
- [ ] Notifications grouped by date sections: 오늘 / 어제 / 이번 주 / 이전
- [ ] Empty state: "알림이 없습니다" message shown when feed is empty
- [ ] Unread notification: white background with blue left border
- [ ] Read notification: gray background, no border
- [ ] Clicking notification: marks it as read (optimistic UI update)
- [ ] Clicking notification: navigates to relevant page (e.g., application status change → /applications)
- [ ] "모두 읽음" button appears when unreadCount > 0
- [ ] "모두 읽음" marks all notifications as read, badge clears
- [ ] MobileBottomNav shows "알림" tab with unread badge count
- [ ] Notification badge syncs between TopNav bell and BottomNav tab
- [ ] New notification arrives in real-time or on next page focus (polling/SSE)
- [ ] Application status change notification received by worker
- [ ] Team invitation notification received by invitee

---

## 8. Admin Backoffice (/admin, port 3001)

### 8.1 Authentication
- [ ] Admin login page renders at / (root of port 3001)
- [ ] Login form: admin ID and password fields
- [ ] Invalid credentials: error message shown
- [ ] Successful login: token stored in localStorage as "gada_admin_token"
- [ ] Authenticated admin: redirected to /dashboard
- [ ] Token expiry: admin redirected to login with session expired message
- [ ] Logout: localStorage token cleared, redirected to /
- [ ] Sidebar collapses to icon-only mode on click (toggle button)
- [ ] Collapsed sidebar: tooltips show menu item names on hover
- [ ] Mobile: hamburger icon opens slide-in sidebar with overlay

### 8.2 Workers
- [ ] /workers list loads with status filter tabs (전체/활성/보류/정지/삭제)
- [ ] Worker search by name or phone number works
- [ ] Worker list pagination works correctly
- [ ] Worker row: name, phone, nationality, visa type, status badge, registration date
- [ ] Click worker row: navigates to worker detail page
- [ ] Worker detail: full profile — health check, languages, certifications, experience
- [ ] Worker detail: job application history visible
- [ ] Worker detail: team membership shown if applicable
- [ ] Status change: ACTIVE ↔ SUSPENDED with reason input
- [ ] Delete button: soft-deletes worker, row shows "삭제됨" badge
- [ ] Restore button (on deleted row): reactivates worker (status → ACTIVE)
- [ ] Restore requires SUPER_ADMIN or OPERATIONS_ADMIN role

### 8.3 Applications (ATS)
- [ ] /applications admin list loads all applications across all employers
- [ ] Filter by employer, job, status, date range
- [ ] Desktop: table left + sticky side panel right (same as employer ATS)
- [ ] ApplicationDetailPanel shows all snapshot sections
- [ ] Snapshot sections: basic info, work history, certifications, preferences
- [ ] Status dropdown in admin: respects valid state transitions
- [ ] Status change in admin triggers notification to worker (if implemented)
- [ ] Scout button (⭐): marks is_scouted=true
- [ ] Verify button (✓): marks is_verified=true, shows verification badge
- [ ] Scout and Verify: state persists on page reload
- [ ] Status history timeline renders in correct chronological order
- [ ] Timeline: each entry shows previous status, new status, timestamp, actor
- [ ] Mobile: card list view with tap-to-open full detail page
- [ ] Mobile detail page: all sections accessible via scroll

### 8.4 Content Management
- [ ] /content hub shows stats cards (total intros, total FAQs, locale coverage)
- [ ] /content/intro list shows all job intro guides with locale badges
- [ ] Locale badges (KO / EN / VI) correctly reflect published content per locale
- [ ] "새 가이드 등록" opens new intro creation form
- [ ] New intro form: category picker (must select existing construction trade)
- [ ] New intro form: work characteristics — dynamic add/remove rows work
- [ ] New intro form: skills — dynamic add/remove with level selector
- [ ] New intro form: pricing rows — dynamic add/remove
- [ ] New intro form: image gallery — dynamic add/remove URL inputs
- [ ] "저장 및 게시" button publishes content immediately
- [ ] Published content appears on /guides (web, port 3000)
- [ ] Edit existing intro: form pre-populated with current data
- [ ] Edit and save: changes reflected on /guides without delay (or after cache TTL)
- [ ] Delete intro: confirm dialog, removes from /guides
- [ ] /content/faqs list shows all FAQs with category and locale info
- [ ] FAQ inline editing: click row to expand edit form
- [ ] FAQ inline editing: save on blur or explicit save button
- [ ] FAQ delete: row removed after confirmation
- [ ] /content/categories list shows all job categories
- [ ] Slide-in edit panel for categories: edits English name (en) and Vietnamese name (vi)
- [ ] Category name changes reflected in /guides category grid

### 8.5 SMS Management
- [ ] /sms-templates list shows all templates with locale badges
- [ ] Template detail shows: name, locale, content body with {{variable}} placeholders
- [ ] "새 템플릿" form: name, locale selector, body textarea
- [ ] New template: dynamic variable array — add/remove variable names
- [ ] Variable preview renders substituted text in preview pane
- [ ] Template save: appears in list immediately
- [ ] Template edit: form pre-populated with current data
- [ ] Template delete: confirm dialog before removal
- [ ] /sms-logs shows send history with: recipient, template name, status badge, timestamp
- [ ] Status badges: SENT (green), PENDING (yellow), FAILED (red)
- [ ] Log search by phone number or date range
- [ ] FAILED log row: "재시도" (retry) button triggers resend
- [ ] Retry success: log entry status updates to SENT
- [ ] Retry failure: error message shown, status stays FAILED
- [ ] /sms-send single send:
  - [ ] Template selector dropdown works
  - [ ] Recipient phone number input
  - [ ] Variable input fields render per template's variable list
  - [ ] Live preview renders {{variable}} substitution in real-time
  - [ ] Send button dispatches SMS, confirmation shown
- [ ] /sms-send broadcast (multi-send):
  - [ ] Step 1: template selection
  - [ ] Step 2: recipient selection (by role, status filter or upload)
  - [ ] Step 2: recipient count displayed
  - [ ] Step 3: review — final preview with recipient count
  - [ ] Step 3: confirm sends to all recipients
  - [ ] Broadcast completion: shows success count / failure count summary

### 8.6 Admin Roles & Permissions
- [ ] /settings/admins lists all users with ADMIN role
- [ ] Columns: name, email/phone, sub-role, last login
- [ ] Role dropdown: SUPER_ADMIN / OPERATIONS_ADMIN / CONTENT_ADMIN / SETTLEMENT_ADMIN
- [ ] Role change saved immediately (no page reload required)
- [ ] Role badges render with correct Korean labels:
  - [ ] SUPER_ADMIN → "슈퍼관리자" (purple)
  - [ ] OPERATIONS_ADMIN → "운영관리자" (blue)
  - [ ] CONTENT_ADMIN → "콘텐츠관리자" (green)
  - [ ] SETTLEMENT_ADMIN → "정산관리자" (orange)
- [ ] CONTENT_ADMIN: can access /content/* but not /workers or /settings
- [ ] OPERATIONS_ADMIN: can access /workers, /applications but not /settings
- [ ] SETTLEMENT_ADMIN: can access settlement pages only
- [ ] SUPER_ADMIN: unrestricted access to all sections
- [ ] Role restriction: unauthorized sections show 403 message or redirect to /dashboard

---

## 9. Error States

- [ ] 404 pages show gracefully with navigation back to home
- [ ] API down (port 8090 unreachable): loading skeletons shown, not blank screens
- [ ] Network error mid-operation: toast error message with retry option
- [ ] Unauthorized API response (401): redirects to /login with return URL
- [ ] Forbidden API response (403): shows "권한이 없습니다" message
- [ ] Server error (500): generic error message with support contact info
- [ ] Form validation errors: inline messages displayed under each invalid field
- [ ] Form submission error: fields retain user input, error message shown above form
- [ ] Image load failure: graceful fallback (placeholder icon or alt text)
- [ ] Empty lists: descriptive empty state messages (not raw "null" or blank)

---

## 10. Performance

- [ ] Job list initial load < 2s on local dev
- [ ] Filter changes reflect within < 500ms on local dev
- [ ] Admin table pagination navigates within < 500ms
- [ ] Onboarding steps navigate without perceptible delay
- [ ] Images lazy-load: profile photos and hero images use loading="lazy"
- [ ] No console errors on any page (warnings acceptable)
- [ ] No memory leaks: navigating between pages multiple times doesn't degrade performance
- [ ] API requests: no duplicate requests (React StrictMode double-invocation handled)
- [ ] Toast notifications auto-dismiss after 3–5 seconds
- [ ] Modal open/close animations complete without jank

# GADA Admin Console — Information Architecture

## Admin Roles

| Role | Access |
|------|--------|
| SUPER_ADMIN | Full access to all sections |
| OPERATIONS_ADMIN | Workers, Employers, Teams, Companies, Sites, Jobs, Applications, Contracts |
| CONTENT_ADMIN | Content (Intro, FAQs, Categories), Notifications, SMS Templates |
| SETTLEMENT_ADMIN | Contracts, Pay records, Settlement reports |

## Navigation Structure

### 대시보드
- `/dashboard` — Platform overview stats

### 인력 관리 (OPERATIONS_ADMIN+)
- `/workers` — Worker list, detail, edit, delete/restore
- `/employers` — Employer list, detail, edit, delete/restore
- `/teams` — Team list, detail, edit, delete/restore

### 공고 관리 (OPERATIONS_ADMIN+)
- `/companies` — Company list, detail, status change, delete/restore
- `/sites` — Site list, detail, delete/restore
- `/jobs` — Job list, detail, status change, delete/restore
- `/applications` — ATS overview, detail, status transitions

### 계약 관리 (SETTLEMENT_ADMIN+)
- `/contracts` — Contract list, detail, status change

### 콘텐츠 (CONTENT_ADMIN+)
- `/content` — Content hub
- `/content/intro` — Job intro content CRUD
- `/content/faqs` — FAQ CRUD
- `/content/categories` — Category management
- `/notifications` — Notification management, broadcast
- `/sms-templates` — SMS template CRUD

### 설정 (SUPER_ADMIN)
- `/settings` — Platform settings
- `/settings/admins` — Admin user management + role assignment

## CRUD Matrix

| Entity | List | Detail | Create | Edit | Soft Delete | Restore | Role |
|--------|------|--------|--------|------|-------------|---------|------|
| Worker | ✓ | ✓ | — | ✓ | ✓ | ✓ | OPS |
| Employer | ✓ | ✓ | — | ✓ | ✓ | ✓ | OPS |
| Team | ✓ | ✓ | — | ✓ | ✓ | ✓ | OPS |
| Company | ✓ | ✓ | — | ✓ | ✓ | ✓ | OPS |
| Site | ✓ | ✓ | — | — | ✓ | ✓ | OPS |
| Job | ✓ | ✓ | — | ✓ | ✓ | ✓ | OPS |
| Application | ✓ | ✓ | — | Status | ✓ | — | OPS |
| Contract | ✓ | ✓ | — | Status | ✓ | — | SETTLE |
| IntroContent | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | CONTENT |
| FAQ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | CONTENT |
| Notification | ✓ | ✓ | ✓ | — | ✓ | — | CONTENT |
| SmsTemplate | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | CONTENT |

## Audit Log Events (per entity action)
- `ADMIN_WORKER_DELETED`, `ADMIN_WORKER_RESTORED`
- `ADMIN_EMPLOYER_DELETED`, `ADMIN_EMPLOYER_RESTORED`
- `ADMIN_TEAM_DELETED`, `ADMIN_TEAM_RESTORED`
- `ADMIN_COMPANY_STATUS_CHANGED`, `ADMIN_COMPANY_DELETED`
- `ADMIN_JOB_STATUS_CHANGED`, `ADMIN_JOB_DELETED`
- `ADMIN_APPLICATION_STATUS_CHANGED`, `ADMIN_APPLICATION_DELETED`
- `ADMIN_CONTRACT_STATUS_CHANGED`
- `ADMIN_NOTIFICATION_BROADCAST`
- `ADMIN_SMS_TEMPLATE_CREATED`, `ADMIN_SMS_TEMPLATE_UPDATED`
- `ADMIN_ROLE_ASSIGNED`

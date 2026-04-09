# GADA Hiring Platform — Schema Review: Admin & Employer Perspectives

**Reviewer**: Frontend Admin agent  
**Date**: 2026-04-01  
**Based on**: V1 + V3 migrations  
**Scope**: Internal Admin (GADA ops) + Employer Dashboard (사업주)

---

## Table of Contents

1. [Missing Fields for Admin/Employer](#section-1-missing-fields-for-adminemployer)
2. [Index Gaps for Admin CRUD](#section-2-index-gaps-for-admin-crud)
3. [Employer-Specific Query Patterns](#section-3-employer-specific-query-patterns)
4. [Recommendations Summary](#section-4-recommendations-summary)

---

## Section 1: Missing Fields for Admin/Employer

### 1.1 `users` table — Admin User Management

**Current fields**: `id, public_id, phone, firebase_uid, role, status, created_at, updated_at, deleted_at`

**Missing fields**:

| Field | Type | Justification |
|---|---|---|
| `banned_reason` | `TEXT` | When admin suspends a user, reason must be stored for compliance and appeals. Currently status can be set to `SUSPENDED` but the reason is lost. |
| `admin_note` | `TEXT` | Ops team needs to attach internal notes to users (e.g., "Repeat fraudster", "VIP client"). Not shown to user. |
| `last_login_at` | `TIMESTAMPTZ` | Critical for admin dashboards — filter "inactive users not logged in for 30+ days", identify churned users. Firebase does not reliably push this into the DB. |

**Proposed ALTER**:
```sql
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS banned_reason  TEXT,
    ADD COLUMN IF NOT EXISTS admin_note     TEXT,
    ADD COLUMN IF NOT EXISTS last_login_at  TIMESTAMPTZ;
```

---

### 1.2 `companies` table — Company Verification

**Current fields**: `id, public_id, name, business_registration_number, ceo_name, address, phone, email, website_url, description, logo_url, status, verified_at, created_at, updated_at, deleted_at`

**Missing fields**:

| Field | Type | Justification |
|---|---|---|
| `rejection_reason` | `TEXT` | When GADA ops rejects a pending company (e.g., fake BRN), the reason must be stored so the employer sees why they were rejected and can re-submit. Without this, employers get a silent failure. |
| `admin_note` | `TEXT` | Ops internal notes per company — "Called on 2026-04-01, awaiting BRN correction". |
| `verified_by` | `BIGINT REFERENCES users(id)` | Which admin user performed the verification. Needed for the audit trail: "Who approved this company?" |
| `employee_count` | `INTEGER` | Useful for KPI segmentation (SME vs. large enterprise). Currently not capturable. |
| `industry_type` | `VARCHAR(100)` | Further segmentation — e.g., 'GENERAL_CONSTRUCTION', 'SPECIALTY', 'LANDSCAPING'. Enables category-specific analytics. |

**Proposed ALTER**:
```sql
ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS rejection_reason  TEXT,
    ADD COLUMN IF NOT EXISTS admin_note        TEXT,
    ADD COLUMN IF NOT EXISTS verified_by       BIGINT REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS employee_count    INTEGER CHECK (employee_count > 0),
    ADD COLUMN IF NOT EXISTS industry_type     VARCHAR(100);
```

---

### 1.3 `employer_profiles` table — Employer Dashboard

**Current fields**: `id, public_id, user_id, company_id, full_name, position, role, created_at, updated_at, deleted_at`

**Missing fields**:

| Field | Type | Justification |
|---|---|---|
| `last_login_at` | `TIMESTAMPTZ` | Essential for ops monitoring of employer activity — "This employer hasn't logged in since posting the job". |
| `department` | `VARCHAR(100)` | Large companies have HR, site managers, accountants — all may be `STAFF` but from different departments. |

**Multi-role support assessment**: The `employer_role` ENUM (`OWNER`, `MANAGER`, `STAFF`) exists and the `employer_profiles.role` column is present. The `UNIQUE(user_id, company_id)` constraint means one user can have at most one role per company. **This correctly supports multi-employer per company with differentiated roles.** No structural change needed, but the API layer must enforce that only `OWNER`s can add/remove members and change roles.

**Proposed ALTER**:
```sql
ALTER TABLE employer_profiles
    ADD COLUMN IF NOT EXISTS last_login_at  TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS department     VARCHAR(100);
```

---

### 1.4 `jobs` table — Job Posting & Moderation

**Current fields include**: `site_id, company_id, title, status, view_count, application_count, published_at`

**Missing fields**:

| Field | Type | Justification |
|---|---|---|
| `poster_user_id` | `BIGINT REFERENCES users(id)` | Which specific employer user created this job posting. Currently `company_id` is stored but not the individual. For audit ("who posted this job?") and for employer UI ("my postings" vs. "all company postings"), this FK is critical. |
| `closed_by` | `BIGINT REFERENCES users(id)` | When an admin force-closes a job, the actor should be recorded. `status = CLOSED` can happen from multiple paths (employer closes, admin force-closes, auto-expiry). |
| `closed_reason` | `VARCHAR(200)` | Complements `closed_by` — "Force-closed: suspicious content", "Filled", "Expired". |

**`view_count` race condition**: The current `view_count INTEGER` on `jobs` is updated with a plain `UPDATE jobs SET view_count = view_count + 1`. Under concurrent reads this causes row-level lock contention. Two mitigations:

- **Option A** (recommended for scale): Create a separate `job_view_events` table and aggregate counts asynchronously.
- **Option B** (simpler, acceptable for MVP): Use `UPDATE jobs SET view_count = view_count + 1 WHERE id = $1` — PostgreSQL handles this atomically at the row level using MVCC, but it still creates write hotspots for popular jobs. Consider batching updates via a Redis counter flushed periodically.

**Proposed `job_view_events` table** (Option A):
```sql
CREATE TABLE IF NOT EXISTS job_view_events (
    id         BIGSERIAL   PRIMARY KEY,
    job_id     BIGINT      NOT NULL REFERENCES jobs (id) ON DELETE CASCADE,
    user_id    BIGINT      REFERENCES users (id),          -- NULL for anonymous views
    viewed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_hash    VARCHAR(64)                                 -- hashed IP for dedup
);

CREATE INDEX IF NOT EXISTS idx_job_view_events_job_id   ON job_view_events (job_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_view_events_user_job ON job_view_events (user_id, job_id)
    WHERE user_id IS NOT NULL;
```

**Proposed ALTER for `jobs`**:
```sql
ALTER TABLE jobs
    ADD COLUMN IF NOT EXISTS poster_user_id  BIGINT REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS closed_by       BIGINT REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS closed_reason   VARCHAR(200);
```

---

### 1.5 `applications` table — Application Oversight & Inbox

**Current fields**: `id, job_id, application_type, applicant_user_id, team_id, company_id, status, cover_letter, employer_note, reviewed_by, reviewed_at, created_at, updated_at, deleted_at`

**Missing fields**:

| Field | Type | Justification |
|---|---|---|
| `rejection_reason` | `TEXT` | When an employer rejects an application, the worker should receive a reason (visible in their app). Storing it separately from `employer_note` (which is internal) avoids leaking internal notes to workers. |
| `shortlisted_at` | `TIMESTAMPTZ` | Denormalized timestamp for the SHORTLISTED transition. The `application_status_history` table stores the full history, but querying it for "show me recently shortlisted applications" requires an expensive JOIN. A denormalized column on `applications` enables fast dashboard queries. |
| `accepted_at` | `TIMESTAMPTZ` | Same rationale — employer analytics query "time-to-hire from application to acceptance". |
| `rejected_at` | `TIMESTAMPTZ` | Same rationale — used for time-to-decision reporting. |

**Note on `application_status_history`**: The existing history table is the authoritative audit record. The denormalized timestamp columns above are purely for query performance. They should be updated by a trigger on `application_status_history` inserts.

**Proposed ALTER**:
```sql
ALTER TABLE applications
    ADD COLUMN IF NOT EXISTS rejection_reason  TEXT,
    ADD COLUMN IF NOT EXISTS shortlisted_at    TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS accepted_at       TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS rejected_at       TIMESTAMPTZ;
```

**Trigger to keep denormalized timestamps in sync**:
```sql
CREATE OR REPLACE FUNCTION sync_application_status_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.to_status = 'SHORTLISTED' THEN
        UPDATE applications SET shortlisted_at = NEW.created_at WHERE id = NEW.application_id;
    ELSIF NEW.to_status = 'ACCEPTED' THEN
        UPDATE applications SET accepted_at = NEW.created_at WHERE id = NEW.application_id;
    ELSIF NEW.to_status = 'REJECTED' THEN
        UPDATE applications SET rejected_at = NEW.created_at WHERE id = NEW.application_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_application_timestamps
AFTER INSERT ON application_status_history
FOR EACH ROW EXECUTE FUNCTION sync_application_status_timestamps();
```

---

### 1.6 `audit_logs` table — Audit Log Viewer

**Current fields**: `id, entity_type, entity_id, action, actor_id, actor_role, old_data, new_data, ip_address, user_agent, created_at`

**Missing fields**:

| Field | Type | Justification |
|---|---|---|
| `request_id` | `VARCHAR(64)` | Distributed tracing correlation ID (e.g., UUID or `X-Request-ID` header value). When a single user action fans out to multiple DB writes, all audit entries for that request share the same `request_id`. Without this, correlating "what else happened in the same request?" requires guessing by timestamp proximity. Critical for debugging and compliance investigations. |
| `session_id` | `VARCHAR(128)` | Firebase session or JWT `jti` claim. Enables "show all actions in this login session" — useful for security reviews and bot detection. |

**Proposed ALTER**:
```sql
ALTER TABLE audit_logs
    ADD COLUMN IF NOT EXISTS request_id  VARCHAR(64),
    ADD COLUMN IF NOT EXISTS session_id  VARCHAR(128);

CREATE INDEX IF NOT EXISTS idx_audit_logs_request_id ON audit_logs (request_id)
    WHERE request_id IS NOT NULL;
```

---

### 1.7 `sms_send_logs` table — SMS Log Viewer

**Current fields**: `id, template_id, template_code, to_phone, user_id, content, variables, locale, status, provider, provider_msg_id, error_code, error_message, sent_at, delivered_at, created_at, updated_at`

**Missing fields**:

| Field | Type | Justification |
|---|---|---|
| `retry_count` | `INTEGER NOT NULL DEFAULT 0` | The current schema has no field to track how many times delivery was re-attempted. Without this, it is impossible for admin to filter "messages that failed after 3 retries" vs. "messages not yet retried". Essential for the SMS log viewer and for debugging provider-side failures. |
| `next_retry_at` | `TIMESTAMPTZ` | Pairs with `retry_count` — when is the next scheduled retry for a FAILED message? Enables an admin view "SMS queue" showing pending retries. |
| `sender_user_id` | `BIGINT REFERENCES users(id)` | Who triggered this SMS? Currently `user_id` is the recipient. There should be a clear column for the initiating actor (could be the system, an admin, or an employer triggering a notification). Rename to `recipient_user_id` or add `triggered_by_user_id`. |

**Proposed ALTER**:
```sql
ALTER TABLE sms_send_logs
    ADD COLUMN IF NOT EXISTS retry_count         INTEGER     NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS next_retry_at       TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS triggered_by_user_id BIGINT     REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_sms_logs_retry ON sms_send_logs (status, next_retry_at)
    WHERE status = 'FAILED' AND next_retry_at IS NOT NULL;
```

---

### 1.8 Multi-employer Role Assessment

The schema supports multiple employers per company through the combination of:
- `employer_profiles.company_id` (FK to companies)
- `employer_profiles.role` (ENUM: `OWNER`, `MANAGER`, `STAFF`)
- `UNIQUE(user_id, company_id)` constraint allows one role per user-company pair

**Gap**: There is no `is_primary_owner` boolean or similar constraint to enforce that exactly one `OWNER` exists per company. If the sole OWNER leaves, the company becomes ownerless. **Recommendation**: Add a database-level check or trigger to enforce minimum one OWNER per active company, or handle this constraint in application logic.

---

## Section 2: Index Gaps for Admin CRUD

The following indexes are missing for efficient admin panel queries.

### 2.1 User Management Indexes

```sql
-- Filter by role + status + created_at range (admin user list with filters)
CREATE INDEX IF NOT EXISTS idx_users_role_status_created
    ON users (role, status, created_at DESC)
    WHERE deleted_at IS NULL;

-- Filter by created_at for date range queries (admin: "users registered this week")
CREATE INDEX IF NOT EXISTS idx_users_created_at
    ON users (created_at DESC)
    WHERE deleted_at IS NULL;

-- Lookup by last_login_at (after adding the column above)
-- CREATE INDEX IF NOT EXISTS idx_users_last_login
--     ON users (last_login_at DESC)
--     WHERE deleted_at IS NULL AND last_login_at IS NOT NULL;
```

**Note**: `idx_users_role_status` (on `role, status`) exists in V1 but does not include `created_at`, making date-range pagination on the admin user list require a sequential scan on the partial result.

---

### 2.2 Company Verification Indexes

```sql
-- Filter pending companies sorted by creation date (verification queue)
CREATE INDEX IF NOT EXISTS idx_companies_status_created
    ON companies (status, created_at DESC)
    WHERE deleted_at IS NULL;

-- Filter verified companies by verified_at (audit: "verified this month")
CREATE INDEX IF NOT EXISTS idx_companies_verified_at
    ON companies (verified_at DESC)
    WHERE verified_at IS NOT NULL AND deleted_at IS NULL;

-- Name search: idx_companies_name_trgm already exists in V1 — NO CHANGE NEEDED
```

---

### 2.3 Job Moderation Indexes

```sql
-- Filter by company + status (employer's job list, admin moderation by company)
CREATE INDEX IF NOT EXISTS idx_jobs_company_status
    ON jobs (company_id, status, created_at DESC)
    WHERE deleted_at IS NULL;

-- Filter by category + region (admin job search by trade and location)
CREATE INDEX IF NOT EXISTS idx_jobs_category_sido
    ON jobs (job_category_id, company_id)
    WHERE deleted_at IS NULL;

-- Filter by status + created_at (admin: "jobs published this week")
CREATE INDEX IF NOT EXISTS idx_jobs_status_created
    ON jobs (status, created_at DESC)
    WHERE deleted_at IS NULL;

-- Note: jobs must JOIN sites to filter by sido/sigungu.
-- The V3 partial indexes idx_sites_sido, idx_sites_sigungu cover the sites side.
-- A covering index on jobs that includes sido is not possible without denormalizing
-- sido/sigungu onto jobs itself. RECOMMENDATION: add sido + sigungu to jobs as
-- denormalized columns (mirroring the V3 approach used for sites).
```

**Recommendation — denormalize region onto `jobs`**:
```sql
ALTER TABLE jobs
    ADD COLUMN IF NOT EXISTS sido    VARCHAR(50),
    ADD COLUMN IF NOT EXISTS sigungu VARCHAR(50);

-- Back-fill from sites JOIN
UPDATE jobs j
SET    sido    = s.sido,
       sigungu = s.sigungu
FROM   sites s
WHERE  j.site_id = s.id
  AND  j.sido IS NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_sido    ON jobs (sido)    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_sigungu ON jobs (sigungu) WHERE deleted_at IS NULL;
```

---

### 2.4 Application Oversight Indexes

```sql
-- Filter by job + status (employer inbox per job)
-- idx_applications_job_status already exists in V1 — NO CHANGE NEEDED

-- Filter by application_type + status (admin: filter TEAM applications that are PENDING)
CREATE INDEX IF NOT EXISTS idx_applications_type_status
    ON applications (application_type, status, created_at DESC)
    WHERE deleted_at IS NULL;

-- Filter by created_at range (admin oversight: "applications this week")
CREATE INDEX IF NOT EXISTS idx_applications_created_at
    ON applications (created_at DESC)
    WHERE deleted_at IS NULL;

-- Employer review queue: all unreviewed applications across a company's jobs
-- (requires jobs JOIN, but having job_id indexed with status helps)
CREATE INDEX IF NOT EXISTS idx_applications_job_status_created
    ON applications (job_id, status, created_at DESC)
    WHERE deleted_at IS NULL;
```

---

### 2.5 SMS Log Viewer Indexes

The V3 migration already adds:
- `idx_sms_logs_user_id`
- `idx_sms_logs_status` (status, created_at DESC)
- `idx_sms_logs_to_phone` (to_phone, created_at DESC)
- `idx_sms_logs_created_at`

**Missing**:

```sql
-- Filter by template_code + created_at range (admin: "how many AUTH_OTP sent today?")
CREATE INDEX IF NOT EXISTS idx_sms_logs_template_code_created
    ON sms_send_logs (template_code, created_at DESC)
    WHERE template_code IS NOT NULL;

-- Filter FAILED messages (admin retry management — after adding retry_count column)
-- idx_sms_logs_retry defined above in Section 1.7
```

---

### 2.6 Audit Log Viewer Indexes

V1 already defines:
- `idx_audit_logs_entity` (entity_type, entity_id)
- `idx_audit_logs_actor_id`
- `idx_audit_logs_created_at`

**Missing**:

```sql
-- Filter by entity_type + actor_id + date range (admin: "all actions by user X on companies")
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_actor
    ON audit_logs (entity_type, actor_id, created_at DESC);

-- Filter by actor_role + date range (admin: "all ADMIN actions this month")
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_role_created
    ON audit_logs (actor_role, created_at DESC)
    WHERE actor_role IS NOT NULL;
```

---

## Section 3: Employer-Specific Query Patterns

### 3.1 Employer's Job List

Returns all jobs for a company with application count, view count, and site info. This is the primary employer dashboard table.

```sql
SELECT
    j.id,
    j.public_id,
    j.title,
    j.status,
    j.pay_min,
    j.pay_max,
    j.pay_unit,
    j.start_date,
    j.end_date,
    j.published_at,
    j.created_at,
    j.application_count,       -- denormalized counter on jobs
    j.view_count,              -- denormalized counter (or aggregate from job_view_events)
    s.name          AS site_name,
    s.address       AS site_address,
    s.sido          AS site_sido,
    s.sigungu       AS site_sigungu,
    s.status        AS site_status,
    jc.name_ko      AS category_name,
    -- count active allowed application types
    (
        SELECT COUNT(*)
        FROM job_allowed_application_types jat
        WHERE jat.job_id = j.id
    )               AS allowed_app_types_count
FROM   jobs j
JOIN   sites s          ON s.id = j.site_id
LEFT JOIN job_categories jc ON jc.id = j.job_category_id
WHERE  j.company_id = $1           -- :companyId
  AND  j.deleted_at IS NULL
  -- optional filters passed as query params:
  -- AND j.status = $2
  -- AND s.sido = $3
ORDER BY j.created_at DESC
LIMIT  $2 OFFSET $3;
```

**Note**: If `job_view_events` table is adopted (Option A in Section 1.4), replace `j.view_count` with:
```sql
(SELECT COUNT(*) FROM job_view_events jve WHERE jve.job_id = j.id) AS view_count
```
Or use a materialized view refreshed periodically for performance.

---

### 3.2 Applications for a Job (Application Inbox)

Returns all applications for a specific job with the applicant's profile joined — handles all three applicant types (INDIVIDUAL, TEAM, COMPANY).

```sql
SELECT
    a.id,
    a.public_id,
    a.application_type,
    a.status,
    a.cover_letter,
    a.employer_note,
    a.rejection_reason,      -- after adding column per Section 1.5
    a.shortlisted_at,
    a.accepted_at,
    a.rejected_at,
    a.created_at,
    -- INDIVIDUAL applicant fields
    wp.id                AS worker_profile_id,
    wp.full_name         AS worker_name,
    wp.nationality       AS worker_nationality,
    wp.visa_type         AS worker_visa_type,
    wp.health_check_status AS worker_health_check,
    wp.health_check_expiry AS worker_health_check_expiry,
    wp.desired_pay_min,
    wp.desired_pay_max,
    wp.desired_pay_unit,
    u_w.phone            AS worker_phone,
    -- TEAM applicant fields
    t.id                 AS team_id,
    t.name               AS team_name,
    t.member_count       AS team_member_count,
    u_tl.phone           AS team_leader_phone,
    -- COMPANY applicant fields
    co.id                AS applicant_company_id,
    co.name              AS applicant_company_name,
    co.phone             AS applicant_company_phone
FROM   applications a
-- INDIVIDUAL joins
LEFT JOIN users          u_w  ON u_w.id = a.applicant_user_id
LEFT JOIN worker_profiles wp   ON wp.user_id = a.applicant_user_id AND wp.deleted_at IS NULL
-- TEAM joins
LEFT JOIN teams          t    ON t.id = a.team_id AND t.deleted_at IS NULL
LEFT JOIN users          u_tl ON u_tl.id = t.leader_id
-- COMPANY joins
LEFT JOIN companies      co   ON co.id = a.company_id AND co.deleted_at IS NULL
WHERE  a.job_id    = $1        -- :jobId
  AND  a.deleted_at IS NULL
  -- optional filters:
  -- AND a.application_type = $2::application_type
  -- AND a.status           = $3::application_status
ORDER BY a.created_at DESC
LIMIT  $4 OFFSET $5;
```

---

### 3.3 Worker Pool Search (Scout Feature)

Returns public worker profiles filterable by visa type, nationality, health check status, job category, and region. Supports the employer's "Find Workers" / scouting screen.

```sql
SELECT
    wp.id,
    wp.public_id,
    wp.full_name,
    wp.nationality,
    wp.visa_type,
    wp.health_check_status,
    wp.health_check_expiry,
    wp.desired_job_categories,
    wp.desired_pay_min,
    wp.desired_pay_max,
    wp.desired_pay_unit,
    wp.bio,
    wp.profile_image_url,
    wp.updated_at,
    u.phone
FROM   worker_profiles wp
JOIN   users           u  ON u.id = wp.user_id
WHERE  wp.is_public   = TRUE
  AND  wp.deleted_at  IS NULL
  AND  u.status       = 'ACTIVE'
  -- visa filter (multi-select):
  AND  ($1::visa_type[] IS NULL OR wp.visa_type = ANY($1::visa_type[]))
  -- nationality filter:
  AND  ($2 IS NULL OR wp.nationality = $2)
  -- health check filter:
  AND  ($3::health_check_status IS NULL OR wp.health_check_status = $3::health_check_status)
  -- job category filter (JSONB contains any of the requested categories):
  AND  ($4::jsonb IS NULL OR wp.desired_job_categories ?| (SELECT array_agg(v) FROM jsonb_array_elements_text($4::jsonb) AS v))
ORDER BY wp.updated_at DESC
LIMIT  $5 OFFSET $6;
```

**For name search (trigram)**:
```sql
-- Add to WHERE clause when search term provided:
AND ($7 IS NULL OR wp.full_name ILIKE '%' || $7 || '%')
-- Or use trigram similarity for typo-tolerance:
AND ($7 IS NULL OR wp.full_name % $7)
-- The idx_worker_profiles_fullname_trgm index (added in V3) covers this.
```

---

### 3.4 Company Analytics Query

Returns a summary dashboard for a company: job counts by status, application counts by status, and total hired (ACCEPTED) workers.

```sql
WITH job_stats AS (
    SELECT
        status,
        COUNT(*) AS cnt
    FROM   jobs
    WHERE  company_id = $1
      AND  deleted_at  IS NULL
    GROUP BY status
),
app_stats AS (
    SELECT
        a.status,
        COUNT(*) AS cnt
    FROM   applications a
    JOIN   jobs         j ON j.id = a.job_id
    WHERE  j.company_id = $1
      AND  a.deleted_at IS NULL
      AND  j.deleted_at IS NULL
    GROUP BY a.status
),
site_stats AS (
    SELECT
        COUNT(*)                                      AS total_sites,
        COUNT(*) FILTER (WHERE status = 'ACTIVE')     AS active_sites,
        COUNT(*) FILTER (WHERE status = 'COMPLETED')  AS completed_sites
    FROM   sites
    WHERE  company_id = $1
      AND  deleted_at  IS NULL
)
SELECT
    -- Job breakdown
    COALESCE(SUM(CASE WHEN js.status = 'DRAFT'     THEN js.cnt ELSE 0 END), 0) AS jobs_draft,
    COALESCE(SUM(CASE WHEN js.status = 'PUBLISHED' THEN js.cnt ELSE 0 END), 0) AS jobs_published,
    COALESCE(SUM(CASE WHEN js.status = 'PAUSED'    THEN js.cnt ELSE 0 END), 0) AS jobs_paused,
    COALESCE(SUM(CASE WHEN js.status = 'CLOSED'    THEN js.cnt ELSE 0 END), 0) AS jobs_closed,
    COALESCE(SUM(CASE WHEN js.status = 'ARCHIVED'  THEN js.cnt ELSE 0 END), 0) AS jobs_archived,
    -- Application breakdown
    COALESCE(SUM(CASE WHEN aps.status = 'PENDING'     THEN aps.cnt ELSE 0 END), 0) AS apps_pending,
    COALESCE(SUM(CASE WHEN aps.status = 'REVIEWING'   THEN aps.cnt ELSE 0 END), 0) AS apps_reviewing,
    COALESCE(SUM(CASE WHEN aps.status = 'SHORTLISTED' THEN aps.cnt ELSE 0 END), 0) AS apps_shortlisted,
    COALESCE(SUM(CASE WHEN aps.status = 'ACCEPTED'    THEN aps.cnt ELSE 0 END), 0) AS apps_accepted,
    COALESCE(SUM(CASE WHEN aps.status = 'REJECTED'    THEN aps.cnt ELSE 0 END), 0) AS apps_rejected,
    -- Site breakdown
    ss.total_sites,
    ss.active_sites,
    ss.completed_sites
FROM      (SELECT 1 AS dummy) base
LEFT JOIN job_stats  js  ON TRUE
LEFT JOIN app_stats  aps ON TRUE
CROSS JOIN site_stats ss
GROUP BY ss.total_sites, ss.active_sites, ss.completed_sites;
```

---

## Section 4: Recommendations Summary

### Critical for Admin MVP

These gaps will block core admin workflows from being built correctly.

**1. Add `rejection_reason` to `companies`**
```sql
ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS rejection_reason  TEXT,
    ADD COLUMN IF NOT EXISTS admin_note        TEXT,
    ADD COLUMN IF NOT EXISTS verified_by       BIGINT REFERENCES users(id);
```
*Impact*: Without `rejection_reason`, employers have no way to understand why their company was rejected. This causes support burden and re-submission without fixing the underlying issue.

**2. Add `poster_user_id` to `jobs`**
```sql
ALTER TABLE jobs
    ADD COLUMN IF NOT EXISTS poster_user_id  BIGINT REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS closed_by       BIGINT REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS closed_reason   VARCHAR(200);
```
*Impact*: Admin job moderation requires knowing which employer posted a flagged job. Without `poster_user_id`, the admin can only see the company, not the individual.

**3. Add `banned_reason` and `admin_note` to `users`**
```sql
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS banned_reason  TEXT,
    ADD COLUMN IF NOT EXISTS admin_note     TEXT,
    ADD COLUMN IF NOT EXISTS last_login_at  TIMESTAMPTZ;
```
*Impact*: User suspension without recorded reason is a compliance and legal risk. `last_login_at` enables activity filtering which is the most common admin user-list filter.

**4. Add `rejection_reason` + denormalized timestamps to `applications`**
```sql
ALTER TABLE applications
    ADD COLUMN IF NOT EXISTS rejection_reason  TEXT,
    ADD COLUMN IF NOT EXISTS shortlisted_at    TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS accepted_at       TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS rejected_at       TIMESTAMPTZ;
```
*Impact*: Employer dashboard "application inbox" needs fast filtering by stage. Querying `application_status_history` for every row is expensive; denormalized timestamps resolve this. `rejection_reason` is required to communicate feedback to workers.

**5. Add `request_id` to `audit_logs`**
```sql
ALTER TABLE audit_logs
    ADD COLUMN IF NOT EXISTS request_id  VARCHAR(64),
    ADD COLUMN IF NOT EXISTS session_id  VARCHAR(128);
CREATE INDEX IF NOT EXISTS idx_audit_logs_request_id
    ON audit_logs (request_id) WHERE request_id IS NOT NULL;
```
*Impact*: Without distributed tracing correlation IDs, investigating multi-step operations (e.g., "company approved → employer notified → SMS sent") requires timestamp guessing. Essential for production debugging.

---

### Important for Employer UX

**6. Resolve `view_count` race condition on `jobs`**

Option A (recommended): Create `job_view_events` table (full SQL in Section 1.4).
Option B (acceptable for MVP): Use Redis counter flushed to `jobs.view_count` every 60 seconds via a background job.

*Impact*: Under load (e.g., a popular job gets 1,000 simultaneous views), plain `UPDATE jobs SET view_count = view_count + 1` creates a write hotspot. The employer analytics screen will show inconsistent counts.

**7. Denormalize `sido`/`sigungu` onto `jobs`**
```sql
ALTER TABLE jobs
    ADD COLUMN IF NOT EXISTS sido    VARCHAR(50),
    ADD COLUMN IF NOT EXISTS sigungu VARCHAR(50);
-- Back-fill and create indexes per Section 2.3
```
*Impact*: Admin "filter jobs by region" and employer "post job to a region" queries currently require `JOIN sites` on every request. Denormalization (matching the V3 pattern already used on `sites`) removes this JOIN and enables a simple indexed filter.

**8. Add `retry_count` and `next_retry_at` to `sms_send_logs`**
```sql
ALTER TABLE sms_send_logs
    ADD COLUMN IF NOT EXISTS retry_count   INTEGER     NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ;
```
*Impact*: The SMS log admin screen cannot show retry state without these fields. FAILED messages with no retry metadata look indistinguishable from new failures.

---

### Audit / Compliance Additions

**9. Add `last_login_at` update mechanism**

After adding `users.last_login_at`, ensure the Firebase auth webhook or JWT validation middleware updates this field on every successful login. This avoids stale data in the admin user activity filter.

**10. Enforce company OWNER constraint**

Add an application-layer guard (or a trigger) to prevent removing the last `OWNER` from a company's `employer_profiles`. Without this, companies can become ownerless, blocking all employer dashboard access permanently.

```sql
-- Example trigger (enforce at least one OWNER per company):
CREATE OR REPLACE FUNCTION enforce_company_owner()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND NEW.role != 'OWNER') THEN
        IF OLD.role = 'OWNER' THEN
            IF NOT EXISTS (
                SELECT 1 FROM employer_profiles
                WHERE  company_id = OLD.company_id
                  AND  role       = 'OWNER'
                  AND  id         != OLD.id
                  AND  deleted_at IS NULL
            ) THEN
                RAISE EXCEPTION 'Company must have at least one OWNER';
            END IF;
        END IF;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_company_owner
BEFORE UPDATE OR DELETE ON employer_profiles
FOR EACH ROW EXECUTE FUNCTION enforce_company_owner();
```

**11. Audit log retention policy**

`audit_logs` has no TTL mechanism. For GDPR / Korean Personal Information Protection Act (PIPA) compliance, add a `retention_policy` marker or a scheduled archival job. Consider partitioning `audit_logs` by month using PostgreSQL declarative partitioning:

```sql
-- Future migration: convert to range-partitioned table by created_at
-- This allows dropping old partitions without a full table scan DELETE.
```

---

## Appendix: All New ALTER Statements (Consolidated)

```sql
-- users
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS banned_reason  TEXT,
    ADD COLUMN IF NOT EXISTS admin_note     TEXT,
    ADD COLUMN IF NOT EXISTS last_login_at  TIMESTAMPTZ;

-- companies
ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS rejection_reason  TEXT,
    ADD COLUMN IF NOT EXISTS admin_note        TEXT,
    ADD COLUMN IF NOT EXISTS verified_by       BIGINT REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS employee_count    INTEGER CHECK (employee_count > 0),
    ADD COLUMN IF NOT EXISTS industry_type     VARCHAR(100);

-- employer_profiles
ALTER TABLE employer_profiles
    ADD COLUMN IF NOT EXISTS last_login_at  TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS department     VARCHAR(100);

-- jobs
ALTER TABLE jobs
    ADD COLUMN IF NOT EXISTS poster_user_id  BIGINT REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS closed_by       BIGINT REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS closed_reason   VARCHAR(200),
    ADD COLUMN IF NOT EXISTS sido            VARCHAR(50),
    ADD COLUMN IF NOT EXISTS sigungu         VARCHAR(50);

-- applications
ALTER TABLE applications
    ADD COLUMN IF NOT EXISTS rejection_reason  TEXT,
    ADD COLUMN IF NOT EXISTS shortlisted_at    TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS accepted_at       TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS rejected_at       TIMESTAMPTZ;

-- audit_logs
ALTER TABLE audit_logs
    ADD COLUMN IF NOT EXISTS request_id  VARCHAR(64),
    ADD COLUMN IF NOT EXISTS session_id  VARCHAR(128);

-- sms_send_logs
ALTER TABLE sms_send_logs
    ADD COLUMN IF NOT EXISTS retry_count          INTEGER     NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS next_retry_at        TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS triggered_by_user_id BIGINT      REFERENCES users(id);
```

# GADA Hiring Platform — Schema Review: Worker & Job-Seeker UX

**Reviewer**: Frontend Worker-Web agent  
**Date**: 2026-04-01  
**Scope**: V3 schema (V1 + V3 migration), reviewed from the worker/job-seeker perspective  
**Source files reviewed**:
- `apps/api/src/main/resources/db/migration/V1__init_schema.sql`
- `apps/api/src/main/resources/db/migration/V3__production_schema.sql`
- `docs/V3_schema_design.md`

---

## Table of Contents

1. [Missing Fields](#section-1-missing-fields)
2. [Index Gaps for Worker Search](#section-2-index-gaps-for-worker-search)
3. [Query Pattern Analysis](#section-3-query-pattern-analysis)
4. [Recommendations Summary](#section-4-recommendations-summary)

---

## Section 1: Missing Fields

### Flow 1 — Worker Profile Setup

#### `worker_profiles`

- Missing: `preferred_regions` (JSONB) — The profile stores `desired_job_categories` but has no location preference array. A worker who wants to work only in 경기도 or 인천광역시 has no way to express this. The employer-side counterpart (`jobs` → `sites.sido/sigungu`) exists; the worker side is asymmetric.
  ```sql
  ALTER TABLE worker_profiles
      ADD COLUMN IF NOT EXISTS preferred_regions JSONB NOT NULL DEFAULT '[]';
  -- [{\"sido\": \"경기도\", \"sigungu\": \"수원시\"}, {\"sido\": \"서울특별시\", \"sigungu\": null}]

  CREATE INDEX IF NOT EXISTS idx_worker_profiles_preferred_regions
      ON worker_profiles USING gin (preferred_regions);
  ```

- Missing: `years_experience` (SMALLINT) — There is no top-level "total years in construction" field. Individual equipment rows have `years_experience`, but the worker profile summary visible to employers has no headline experience figure. Employers browsing profiles need this for quick triage.
  ```sql
  ALTER TABLE worker_profiles
      ADD COLUMN IF NOT EXISTS years_experience SMALLINT
          CHECK (years_experience >= 0 AND years_experience <= 60);
  ```

- Ambiguous field: `languages` (JSONB, column name) — The column exists and stores a language array, but the name `languages` is generic. On the frontend "Languages spoken" tab, the API response key will be `languages` which conflicts with any i18n framework property of the same name. Renaming would be a breaking migration, but the V3 design doc should note this risk. A workaround is to alias it `languages_spoken` in all API DTOs from day one.

  No DDL change required — handle at the API/DTO layer:
  ```
  -- Recommendation: alias in SELECT queries
  -- worker_profiles.languages AS languages_spoken
  ```

#### `certifications`

- Field concern: `is_verified` (BOOLEAN) — A simple boolean cannot express the full verification lifecycle. When a worker uploads a certificate image, `is_verified = FALSE`. An admin then reviews it. But there is no "under review" state, no rejected state, and no `verified_by` audit trail. For a platform where visa-category workers' certifications are legally significant, this gap creates ambiguity.
  ```sql
  -- Option A: add a verification_status enum (recommended)
  DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_status') THEN
          CREATE TYPE verification_status AS ENUM
              ('UNSUBMITTED', 'PENDING_REVIEW', 'VERIFIED', 'REJECTED');
      END IF;
  END $$;

  ALTER TABLE certifications
      ADD COLUMN IF NOT EXISTS verification_status verification_status
          NOT NULL DEFAULT 'UNSUBMITTED',
      ADD COLUMN IF NOT EXISTS verified_by         BIGINT REFERENCES users (id),
      ADD COLUMN IF NOT EXISTS verified_at         TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS rejection_reason    TEXT;

  -- Keep is_verified as a derived/computed boolean for backward compat:
  -- is_verified = (verification_status = 'VERIFIED')
  -- Or drop is_verified once all callers use verification_status.
  ```

---

### Flow 2 — Job Browsing

#### `jobs`

- Missing: `accommodation_provided` (BOOLEAN) — 숙소 제공 여부 is one of the top three filtering criteria for Vietnamese and migrant workers choosing between jobs. It is currently buried inside the free-text `description`. Without a structured boolean, it cannot be filtered or displayed as a badge on the listing card.
  ```sql
  ALTER TABLE jobs
      ADD COLUMN IF NOT EXISTS accommodation_provided  BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS meal_provided           BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS transportation_provided BOOLEAN NOT NULL DEFAULT FALSE;
  ```

- Missing: `preferred_nationality` (VARCHAR(10)) — The existing `nationality_requirements` JSONB array holds the full list, but querying a JSONB array for equality in a WHERE clause requires a GIN index and `@>` operator, which is unfamiliar to junior backend devs and ORMs. A denormalized scalar `preferred_nationality` (e.g. `'VN'` or `'ANY'`) enables a simple `= 'VN'` filter for the most common case.
  ```sql
  ALTER TABLE jobs
      ADD COLUMN IF NOT EXISTS preferred_nationality VARCHAR(10) DEFAULT NULL;
  -- NULL = no restriction (same as empty nationality_requirements)

  CREATE INDEX IF NOT EXISTS idx_jobs_preferred_nationality
      ON jobs (preferred_nationality) WHERE deleted_at IS NULL;
  ```

- Missing: composite index for the most common listing filter — category + sido + status. See Section 2 for detail.

---

### Flow 3 — Job Detail View

All fields required for the detail page appear in the schema. However, `accommodation_provided`, `meal_provided`, and `transportation_provided` are missing (covered above under Flow 2). The detail page would need to render these as benefit badges, which are currently unstructured.

No additional missing columns beyond those listed in Flow 2.

---

### Flow 4 — Application Submission

#### `applications`

- Missing: `pay_expectation` (INTEGER) — When a worker applies, they often negotiate pay. The job has `pay_min`/`pay_max` but the application has no field for the worker's proposed rate. Without this, all pay negotiation happens off-platform (phone call) and cannot be tracked or displayed in the employer's review queue.
  ```sql
  ALTER TABLE applications
      ADD COLUMN IF NOT EXISTS pay_expectation      INTEGER,
      ADD COLUMN IF NOT EXISTS pay_expectation_unit pay_unit;
  -- Nullable — only set when worker intentionally proposes a rate
  ```

#### `application_members` (team roster snapshot — V3 new table)

- Missing: `profile_image_url` (VARCHAR(500)) — The roster snapshot captures `full_name`, `nationality`, `visa_type`, `health_check_status`, but not `profile_image_url`. The employer's team application review page shows a member grid with photos. Without this, the frontend must fire N additional queries to fetch each member's `worker_profiles.profile_image_url`, creating an N+1 problem at review time.
  ```sql
  ALTER TABLE application_members
      ADD COLUMN IF NOT EXISTS profile_image_url VARCHAR(500);
  ```

---

### Flow 5 — Application Tracking

The `application_status_history` table exists and covers the timeline requirement. No missing fields for the core status timeline.

However:
- Missing: `withdrawn_reason` on `applications` — The status `WITHDRAWN` exists in the enum, but there is no field to record why the worker withdrew. This is useful for UX ("Why did you withdraw? — Found other job / Pay too low / Changed mind") and for employer analytics.
  ```sql
  ALTER TABLE applications
      ADD COLUMN IF NOT EXISTS withdrawn_reason TEXT;
  ```

- Missing index for "My applications" sorted by time — See Section 2.

---

### Flow 6 — Scout Inbox

#### `scouts`

- Missing: `expires_at` (TIMESTAMPTZ) — Scouts without an expiry date remain in the inbox indefinitely. A worker who received a scout 6 months ago for a job that has since closed still sees it as actionable. Employers need scouts to auto-expire so their dashboard does not show stale "awaiting response" items. The `updated_at` trigger was added in V3 for other tables but `scouts` was not included (it lacks `updated_at` entirely).
  ```sql
  ALTER TABLE scouts
      ADD COLUMN IF NOT EXISTS expires_at  TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW();

  -- Default expiry: 14 days from sent (set by application layer)
  -- Or add a DB default: NOW() + INTERVAL '14 days'
  ALTER TABLE scouts
      ALTER COLUMN expires_at SET DEFAULT NOW() + INTERVAL '14 days';

  CREATE INDEX IF NOT EXISTS idx_scouts_expires_at
      ON scouts (expires_at) WHERE expires_at IS NOT NULL;
  ```

- Note: `scouts` is missing from the V3 trigger block (`trigger_set_updated_at`). The table has no `updated_at` column at all (V1 schema). When a scout is read or responded to, the only timestamps are `read_at` and `responded_at`. This is acceptable if `updated_at` is not needed, but the trigger block in V3 should not reference `scouts` to avoid an error — and it currently does not, which is correct.

---

### Flow 7 — Team Management

#### `teams`

- Missing: `max_members` (SMALLINT) — There is no cap on how many people can join a team. A 반장 (foreman) creating a squad for a specific job may want to set `max_members = 5`. Without this, the frontend cannot show "3 / 5 slots filled" on the team card, and cannot prevent over-enrollment.
  ```sql
  ALTER TABLE teams
      ADD COLUMN IF NOT EXISTS max_members SMALLINT
          CHECK (max_members IS NULL OR max_members >= 1);
  -- NULL = unlimited
  ```

- Missing: `avatar_url` (VARCHAR(500)) — Teams have `intro_short`, `intro_long`, `intro_multilingual`, but no team profile photo/logo. The team listing card on the employer side and the team profile page on the worker side both need a visual identity beyond a text name.
  ```sql
  ALTER TABLE teams
      ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);
  ```

#### `team_members`

- Missing: `invited_by` (BIGINT → users.id) — There is no record of who invited a member. This is needed for: (a) audit trail when a dispute arises about who added an unauthorized member; (b) UI showing "Invited by 홍길동 on 3월 1일"; (c) cascade removal logic if the inviter leaves.
  ```sql
  ALTER TABLE team_members
      ADD COLUMN IF NOT EXISTS invited_by BIGINT REFERENCES users (id) ON DELETE SET NULL;
  ```

- Missing: `invitation_status` + invitation flow — Currently `team_members` rows can only represent accepted members. There is no pending invitation state. A worker who receives a team invite needs to accept or decline it. Without this, the invite is implicit (admin-forced insert), which violates the worker's autonomy.
  ```sql
  DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invitation_status') THEN
          CREATE TYPE invitation_status AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');
      END IF;
  END $$;

  ALTER TABLE team_members
      ADD COLUMN IF NOT EXISTS invitation_status invitation_status NOT NULL DEFAULT 'ACCEPTED',
      ADD COLUMN IF NOT EXISTS invited_at         TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS responded_at        TIMESTAMPTZ;

  -- For legacy rows already in the table: DEFAULT 'ACCEPTED' is appropriate
  ```

---

### Flow 8 — Profile Visibility

#### `worker_profiles`

- `is_public` (BOOLEAN) exists — this is sufficient for the basic toggle.

- Missing: `hidden_fields` (JSONB) — A worker may want their profile discoverable but hide specific fields (e.g., show name and skills but hide `birth_date` and `contact info`). Currently `is_public = TRUE` exposes all fields to any employer who can query the profile.
  ```sql
  ALTER TABLE worker_profiles
      ADD COLUMN IF NOT EXISTS hidden_fields JSONB NOT NULL DEFAULT '[]';
  -- Example: ["birth_date", "health_check_status"]
  -- API layer reads this array and nulls out those fields before serializing
  ```

---

## Section 2: Index Gaps for Worker Search

### 2.1 Job Browsing: Category + Region + Status Composite Index

**Missing index:**
```sql
CREATE INDEX IF NOT EXISTS idx_jobs_category_sido_status
    ON jobs (job_category_id, status)
    INCLUDE (published_at)
    WHERE status = 'PUBLISHED' AND deleted_at IS NULL;
```
**When it fires**: The job listing page filters `WHERE j.job_category_id = $1 AND j.status = 'PUBLISHED'` sorted by `published_at DESC`. Without this composite index, Postgres falls back to `idx_jobs_status` (status-only) and then filters by category in a sequential scan over potentially thousands of PUBLISHED rows.

**Missing index for sido filter:**
```sql
-- Jobs filtered by region require joining to sites, so the index lives on sites:
-- idx_sites_sido already exists from V3. Ensure the join path is covered:
CREATE INDEX IF NOT EXISTS idx_jobs_site_id_status
    ON jobs (site_id, status, published_at DESC)
    WHERE status = 'PUBLISHED' AND deleted_at IS NULL;
```
**When it fires**: `WHERE j.site_id IN (SELECT id FROM sites WHERE sido = $1)` — enables index-only lookup of jobs for a given site set without a sequential scan of the full jobs table.

---

### 2.2 "Jobs Near Me" — Geo Search on Sites

**Existing index**: `idx_sites_lat_lng ON sites (latitude, longitude)` — this is a B-tree on two columns, which is suboptimal for radial distance queries using the Haversine formula.

**Better approach** (if PostGIS is available):
```sql
-- If PostGIS is enabled:
ALTER TABLE sites ADD COLUMN IF NOT EXISTS geog geography(POINT, 4326);
UPDATE sites SET geog = ST_MakePoint(longitude, latitude)::geography
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sites_geog ON sites USING GIST (geog)
    WHERE deleted_at IS NULL;
```
**When it fires**: `WHERE ST_DWithin(s.geog, ST_MakePoint($lon, $lat)::geography, $meters)` — GIST index enables O(log n) radius search vs. full sequential scan with Haversine.

**If PostGIS is not available** (keep existing B-tree but add a bounding-box pre-filter):
```sql
-- The existing idx_sites_lat_lng already supports bounding-box queries:
-- WHERE latitude BETWEEN $lat - $delta AND $lat + $delta
--   AND longitude BETWEEN $lon - $delta AND $lon + $delta
-- No new DDL needed, but the query must use bounding box pre-filter
-- before computing exact Haversine distance.
```

---

### 2.3 "My Applications" — Applicant + Status + Created At

**Missing index** (the existing `idx_applications_applicant_user_id` is single-column and cannot support sorted filtered queries efficiently):
```sql
CREATE INDEX IF NOT EXISTS idx_applications_worker_history
    ON applications (applicant_user_id, status, created_at DESC)
    WHERE deleted_at IS NULL;
```
**When it fires**: `WHERE applicant_user_id = $1 AND status = ANY($2) ORDER BY created_at DESC LIMIT 20` — the application history screen with status tab filter. The existing single-column index forces Postgres to fetch all rows for the user and then sort; the composite index returns only the filtered+sorted slice.

---

### 2.4 "Unread Scouts" — Target User + is_read = false

**Existing index**: `idx_scouts_unread ON scouts (target_user_id, is_read) WHERE is_read = FALSE` — this already exists in V1. It correctly covers the unread inbox query.

**Gap**: there is no equivalent index for team scouts:
```sql
CREATE INDEX IF NOT EXISTS idx_scouts_unread_team
    ON scouts (target_team_id, is_read, created_at DESC)
    WHERE is_read = FALSE AND target_team_id IS NOT NULL;
```
**When it fires**: When a team leader checks the team's scout inbox: `WHERE target_team_id = $1 AND is_read = FALSE ORDER BY created_at DESC`.

---

### 2.5 Employer Browsing Worker Profiles — Nationality + Visa Type + is_public

**Missing index** (the three individual indexes exist but not a composite):
```sql
CREATE INDEX IF NOT EXISTS idx_worker_profiles_search
    ON worker_profiles (nationality, visa_type, is_public)
    WHERE is_public = TRUE AND deleted_at IS NULL;
```
**When it fires**: An employer filters the worker directory by `nationality = 'VN' AND visa_type = 'E9' AND is_public = TRUE`. The existing single-column indexes (`idx_worker_profiles_nationality`, `idx_worker_profiles_visa_type`) each return a large set that Postgres must intersect using a bitmap AND scan. The composite index returns the final filtered set directly.

---

### 2.6 "Jobs with Welfare Benefits" Filter (new columns)

Once `accommodation_provided`, `meal_provided`, `transportation_provided` are added:
```sql
CREATE INDEX IF NOT EXISTS idx_jobs_welfare
    ON jobs (accommodation_provided, meal_provided, transportation_provided)
    WHERE status = 'PUBLISHED' AND deleted_at IS NULL;
```
**When it fires**: Worker filters "숙소 제공 = YES" on the job listing page. Without this, every PUBLISHED job row must be scanned to evaluate the boolean.

---

## Section 3: Query Pattern Analysis

### 3.1 Job Listing Page

**Conceptual query:**
```sql
SELECT
    j.id,
    j.public_id,
    j.title,
    j.pay_min,
    j.pay_max,
    j.pay_unit,
    j.start_date,
    j.end_date,
    j.application_count,
    j.published_at,
    j.accommodation_provided,   -- to be added
    j.meal_provided,            -- to be added
    j.transportation_provided,  -- to be added
    s.sido,
    s.sigungu,
    s.name           AS site_name,
    s.latitude,
    s.longitude,
    c.name           AS company_name,
    c.logo_url,
    jc.name_ko       AS category_name,
    jc.icon_url      AS category_icon_url
FROM   jobs j
JOIN   sites         s  ON j.site_id         = s.id
JOIN   companies     c  ON j.company_id      = c.id
LEFT   JOIN job_categories jc ON j.job_category_id = jc.id
WHERE  j.status    = 'PUBLISHED'
  AND  j.deleted_at IS NULL
  AND  ($category_id IS NULL OR j.job_category_id = $category_id)
  AND  ($sido       IS NULL OR s.sido            = $sido)
  AND  ($sigungu    IS NULL OR s.sigungu          = $sigungu)
ORDER  BY j.published_at DESC
LIMIT  $limit OFFSET $offset;
```

**Key indexes that must exist for this to be fast:**
1. `idx_jobs_published` — `(status, published_at DESC) WHERE status='PUBLISHED' AND deleted_at IS NULL` — already exists in V1. Drives the ORDER BY + status filter.
2. `idx_jobs_category_id` — already exists in V1. Drives the category filter.
3. `idx_sites_sido` — added in V3. Drives the region filter on the joined `sites` table.
4. `idx_jobs_site_id_status` — **missing, needs to be added** (Section 2.2). Without it, the join between jobs and sites filtered by sido requires a hash join over the full published jobs set.
5. `idx_companies_status` — existing. Company lookup is by PK so no additional index needed.

**Performance note**: The `$sido` filter hits `sites.sido` (indexed), then the jobs-to-sites join. If `$sido` is provided without `$category_id`, Postgres must choose between starting from the jobs index or the sites index. A materialized view or denormalizing `sido`/`sigungu` directly onto `jobs` (like V3 did for `sites`) would eliminate this join for the listing page hot path.

---

### 3.2 My Applications List

**Conceptual query:**
```sql
SELECT
    a.id,
    a.public_id,
    a.status,
    a.application_type,
    a.created_at,
    a.cover_letter,
    a.pay_expectation,           -- to be added
    a.pay_expectation_unit,      -- to be added
    a.withdrawn_reason,          -- to be added
    j.title                      AS job_title,
    j.pay_min,
    j.pay_max,
    j.pay_unit,
    j.start_date,
    c.name                       AS company_name,
    c.logo_url,
    s.sido,
    s.sigungu,
    -- Latest status history entry for timeline preview
    ash_latest.to_status         AS latest_status_change,
    ash_latest.created_at        AS latest_status_changed_at
FROM   applications a
JOIN   jobs         j  ON a.job_id       = j.id
JOIN   sites        s  ON j.site_id      = s.id
JOIN   companies    c  ON j.company_id   = c.id
LEFT   JOIN LATERAL (
    SELECT to_status, created_at
    FROM   application_status_history
    WHERE  application_id = a.id
    ORDER  BY created_at DESC
    LIMIT  1
) ash_latest ON TRUE
WHERE  a.applicant_user_id = $user_id
  AND  a.deleted_at        IS NULL
  AND  ($status IS NULL OR a.status = $status)
ORDER  BY a.created_at DESC
LIMIT  $limit OFFSET $offset;
```

**Key indexes:**
1. `idx_applications_worker_history` — **missing, needs to be added** (Section 2.3). The composite `(applicant_user_id, status, created_at DESC)` index is the primary driver of this query.
2. `idx_app_status_history_application_id` — exists in V1. Used by the LATERAL join to find the latest status entry.
3. `idx_jobs_site_id` — exists in V1. Used for the jobs → sites join.

**N+1 risk**: The LATERAL subquery fires once per application row. For a user with 50+ applications, this is 50 small indexed lookups. Acceptable with the index, but for pagination loads of 20 items, it is 20 lookups — fine.

---

### 3.3 Team Profile Page

**Conceptual query:**
```sql
SELECT
    t.id,
    t.public_id,
    t.name,
    t.intro_short,
    t.intro_long,
    t.intro_multilingual,
    t.is_nationwide,
    t.regions,
    t.member_count,
    t.status,
    t.avatar_url,                -- to be added
    t.max_members,               -- to be added
    -- Leader info
    leader_wp.full_name          AS leader_name,
    leader_wp.profile_image_url  AS leader_image_url,
    leader_wp.nationality        AS leader_nationality,
    leader_wp.visa_type          AS leader_visa_type,
    -- Member list (collected as JSON array by app layer or JSON_AGG)
    JSON_AGG(
        JSON_BUILD_OBJECT(
            'user_id',            tm.user_id,
            'role',               tm.role,
            'joined_at',          tm.joined_at,
            'invited_by',         tm.invited_by,      -- to be added
            'invitation_status',  tm.invitation_status, -- to be added
            'full_name',          wp.full_name,
            'profile_image_url',  wp.profile_image_url,
            'nationality',        wp.nationality,
            'visa_type',          wp.visa_type,
            'health_check_status', wp.health_check_status
        ) ORDER BY tm.role DESC, tm.joined_at ASC
    ) FILTER (WHERE tm.left_at IS NULL) AS members
FROM   teams t
JOIN   team_members   tm_leader ON t.leader_id = tm_leader.user_id AND tm_leader.team_id = t.id
JOIN   worker_profiles leader_wp ON tm_leader.user_id = leader_wp.user_id
JOIN   team_members   tm ON tm.team_id = t.id AND tm.left_at IS NULL
JOIN   worker_profiles wp ON tm.user_id = wp.user_id
WHERE  t.public_id  = $public_id
  AND  t.deleted_at IS NULL
GROUP  BY t.id, leader_wp.full_name, leader_wp.profile_image_url,
          leader_wp.nationality, leader_wp.visa_type;
```

**Key indexes:**
1. `idx_team_members_team_id` — exists in V1. Essential for the member JOIN.
2. `idx_worker_profiles_search` — **missing, needs to be added** (Section 2.5). Without it, each `worker_profiles` row fetched for members requires a sequential scan on user_id (no index on `worker_profiles.user_id` for profile lookup — only PK index exists; the user_id unique constraint implies a B-tree which will be used here, so this is acceptable).
3. A unique index on `worker_profiles(user_id)` already exists as `uq_worker_profiles_user_id` — lookups by `user_id` for member resolution are index-covered.

**Note**: `JSON_AGG` over many members is computed in the DB. For teams with 20+ members this is fine. For a paginated member list, split into a separate query.

---

### 3.4 Scout Inbox

**Conceptual query:**
```sql
SELECT
    sc.id,
    sc.public_id,
    sc.message,
    sc.is_read,
    sc.read_at,
    sc.responded_at,
    sc.response,
    sc.created_at,
    sc.expires_at,               -- to be added
    -- Job details
    j.title                      AS job_title,
    j.pay_min,
    j.pay_max,
    j.pay_unit,
    j.start_date,
    -- Site / region
    s.sido,
    s.sigungu,
    s.name                       AS site_name,
    -- Sender (employer)
    ep.full_name                 AS sender_name,
    c.name                       AS sender_company_name,
    c.logo_url                   AS sender_company_logo
FROM   scouts sc
JOIN   jobs            j  ON sc.job_id        = j.id
JOIN   sites           s  ON j.site_id        = s.id
JOIN   employer_profiles ep ON sc.sender_user_id = ep.user_id
JOIN   companies        c  ON ep.company_id   = c.id
WHERE  sc.target_user_id = $user_id
  AND  ($unread_only IS FALSE OR sc.is_read = FALSE)
  AND  (sc.expires_at IS NULL OR sc.expires_at > NOW())  -- hide expired
ORDER  BY sc.is_read ASC, sc.created_at DESC
LIMIT  $limit OFFSET $offset;
```

**Key indexes:**
1. `idx_scouts_unread` — exists in V1. `(target_user_id, is_read) WHERE is_read = FALSE` — perfect for the "unread only" tab.
2. `idx_scouts_target_user_id` — exists in V1. Used for the "all scouts" tab (no is_read filter).
3. `idx_scouts_expires_at` — **missing, needs to be added** (Section 1, Flow 6). Filters out expired scouts.
4. `idx_employer_profiles_company_id` — exists in V1. Used for the employer → company join.

**Performance note**: The `ORDER BY sc.is_read ASC, sc.created_at DESC` sort puts unread items first. For a user with many scouts, this requires a sort step unless a composite index `(target_user_id, is_read, created_at DESC)` is added:
```sql
CREATE INDEX IF NOT EXISTS idx_scouts_inbox_sorted
    ON scouts (target_user_id, is_read ASC, created_at DESC)
    WHERE target_user_id IS NOT NULL;
```

---

## Section 4: Recommendations Summary

### Critical — Blocking Worker Flows

These are fields/indexes without which a specific worker flow cannot function at all.

| # | Item | Blocking Flow | SQL |
|---|------|---------------|-----|
| C1 | `accommodation_provided`, `meal_provided`, `transportation_provided` BOOLEAN on `jobs` | Flow 2: Job browsing — these are primary filter criteria for migrant workers. Currently unstructured. | `ALTER TABLE jobs ADD COLUMN IF NOT EXISTS accommodation_provided BOOLEAN NOT NULL DEFAULT FALSE; ALTER TABLE jobs ADD COLUMN IF NOT EXISTS meal_provided BOOLEAN NOT NULL DEFAULT FALSE; ALTER TABLE jobs ADD COLUMN IF NOT EXISTS transportation_provided BOOLEAN NOT NULL DEFAULT FALSE;` |
| C2 | `team_members.invited_by` + `invitation_status` enum | Flow 7: Team management — without invitation state, a worker cannot accept/decline a team invite; members can only be force-added by admin insert | See Flow 7 DDL above |
| C3 | `scouts.expires_at` TIMESTAMPTZ | Flow 6: Scout inbox — without expiry, stale scouts accumulate indefinitely and workers cannot distinguish active vs. dead opportunities | `ALTER TABLE scouts ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '14 days';` |
| C4 | `worker_profiles.preferred_regions` JSONB | Flow 1: Profile setup — the profile form has a region preference step but no column to store it | `ALTER TABLE worker_profiles ADD COLUMN IF NOT EXISTS preferred_regions JSONB NOT NULL DEFAULT '[]';` |

### Important — Degrades UX Without These

| # | Item | Affected Flow | SQL |
|---|------|---------------|-----|
| I1 | Composite index `idx_applications_worker_history (applicant_user_id, status, created_at DESC)` | Flow 5: Application tracking — without this, "My Applications" page query scans all applications for the user then sorts in memory | `CREATE INDEX IF NOT EXISTS idx_applications_worker_history ON applications (applicant_user_id, status, created_at DESC) WHERE deleted_at IS NULL;` |
| I2 | Composite index `idx_jobs_category_sido_status` and `idx_jobs_site_id_status` | Flow 2: Job browsing — category+region filter degrades to bitmap scan on two single-column indexes | See Section 2.1 DDL |
| I3 | `certifications.verification_status` enum replacing `is_verified` boolean | Flow 1: Profile setup — workers cannot see if their cert is under review or was rejected; admin cannot act on a queue | See Flow 1 DDL above |
| I4 | `applications.pay_expectation` + `pay_expectation_unit` | Flow 4: Application submission — pay negotiation must happen off-platform; employer cannot see proposed rate in review queue | `ALTER TABLE applications ADD COLUMN IF NOT EXISTS pay_expectation INTEGER; ALTER TABLE applications ADD COLUMN IF NOT EXISTS pay_expectation_unit pay_unit;` |
| I5 | `teams.max_members` SMALLINT | Flow 7: Team management — foreman cannot cap squad size; "X/Y slots filled" UI is impossible | `ALTER TABLE teams ADD COLUMN IF NOT EXISTS max_members SMALLINT CHECK (max_members IS NULL OR max_members >= 1);` |
| I6 | `application_members.profile_image_url` VARCHAR(500) | Flow 4: Team application roster — employer review page must fire N extra queries to load member photos | `ALTER TABLE application_members ADD COLUMN IF NOT EXISTS profile_image_url VARCHAR(500);` |
| I7 | `idx_scouts_inbox_sorted (target_user_id, is_read ASC, created_at DESC)` | Flow 6: Scout inbox — sort for unread-first inbox requires in-memory sort without this index | See Section 3.4 DDL |
| I8 | `idx_scouts_unread_team` for team scout inbox | Flow 6: Scout inbox — team leader's scout tab has no covering index for team-targeted scouts | See Section 2.4 DDL |

### Nice-to-Have — Future Improvement

| # | Item | Rationale |
|---|------|-----------|
| N1 | `worker_profiles.years_experience` SMALLINT | Headline figure for employer browsing; currently requires computing from individual equipment rows |
| N2 | `worker_profiles.hidden_fields` JSONB | Granular privacy control beyond the blunt `is_public` toggle |
| N3 | `teams.avatar_url` VARCHAR(500) | Team visual identity for listing cards; currently teams are text-only |
| N4 | `applications.withdrawn_reason` TEXT | UX improvement + employer analytics on why workers leave; no blocking impact |
| N5 | `preferred_nationality` scalar on `jobs` (denormalized from `nationality_requirements` JSONB) | Simplifies the most common employer filter query; GIN index on JSONB works but is less intuitive |
| N6 | PostGIS `geography` column on `sites` + GIST index | Proper O(log n) radius search; Haversine over B-tree lat/lng is correct but slower at scale |
| N7 | Denormalize `sido`/`sigungu` onto `jobs` directly (as V3 did for `sites`) | Eliminates the jobs→sites join on the hot listing page; trade-off is stale data on site address change |
| N8 | `idx_worker_profiles_preferred_regions` GIN index on `preferred_regions` JSONB | Needed once `preferred_regions` is added — enables matching workers to jobs in a given region |

---

## Appendix: Quick-Reference DDL (All Critical + Important Changes)

```sql
-- C1: Welfare benefit flags on jobs
ALTER TABLE jobs
    ADD COLUMN IF NOT EXISTS accommodation_provided  BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS meal_provided           BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS transportation_provided BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_jobs_welfare
    ON jobs (accommodation_provided, meal_provided, transportation_provided)
    WHERE status = 'PUBLISHED' AND deleted_at IS NULL;

-- C2: Team invitation flow
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invitation_status') THEN
        CREATE TYPE invitation_status AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');
    END IF;
END $$;

ALTER TABLE team_members
    ADD COLUMN IF NOT EXISTS invited_by        BIGINT REFERENCES users (id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS invitation_status invitation_status NOT NULL DEFAULT 'ACCEPTED',
    ADD COLUMN IF NOT EXISTS invited_at        TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS responded_at      TIMESTAMPTZ;

-- C3: Scout expiry
ALTER TABLE scouts
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '14 days';

CREATE INDEX IF NOT EXISTS idx_scouts_expires_at
    ON scouts (expires_at) WHERE expires_at IS NOT NULL;

-- C4: Worker preferred regions
ALTER TABLE worker_profiles
    ADD COLUMN IF NOT EXISTS preferred_regions JSONB NOT NULL DEFAULT '[]';

CREATE INDEX IF NOT EXISTS idx_worker_profiles_preferred_regions
    ON worker_profiles USING gin (preferred_regions);

-- I1: My Applications composite index
CREATE INDEX IF NOT EXISTS idx_applications_worker_history
    ON applications (applicant_user_id, status, created_at DESC)
    WHERE deleted_at IS NULL;

-- I2: Job listing composite indexes
CREATE INDEX IF NOT EXISTS idx_jobs_site_id_status
    ON jobs (site_id, status, published_at DESC)
    WHERE status = 'PUBLISHED' AND deleted_at IS NULL;

-- I3: Certification verification status
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_status') THEN
        CREATE TYPE verification_status AS ENUM
            ('UNSUBMITTED', 'PENDING_REVIEW', 'VERIFIED', 'REJECTED');
    END IF;
END $$;

ALTER TABLE certifications
    ADD COLUMN IF NOT EXISTS verification_status verification_status NOT NULL DEFAULT 'UNSUBMITTED',
    ADD COLUMN IF NOT EXISTS verified_by         BIGINT REFERENCES users (id),
    ADD COLUMN IF NOT EXISTS verified_at         TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS rejection_reason    TEXT;

-- I4: Application pay expectation
ALTER TABLE applications
    ADD COLUMN IF NOT EXISTS pay_expectation      INTEGER,
    ADD COLUMN IF NOT EXISTS pay_expectation_unit pay_unit;

-- I5: Team max members + avatar
ALTER TABLE teams
    ADD COLUMN IF NOT EXISTS max_members SMALLINT CHECK (max_members IS NULL OR max_members >= 1),
    ADD COLUMN IF NOT EXISTS avatar_url  VARCHAR(500);

-- I6: Application member profile image snapshot
ALTER TABLE application_members
    ADD COLUMN IF NOT EXISTS profile_image_url VARCHAR(500);

-- I7: Scout inbox sorted index
CREATE INDEX IF NOT EXISTS idx_scouts_inbox_sorted
    ON scouts (target_user_id, is_read ASC, created_at DESC)
    WHERE target_user_id IS NOT NULL;

-- I8: Team scout unread index
CREATE INDEX IF NOT EXISTS idx_scouts_unread_team
    ON scouts (target_team_id, is_read, created_at DESC)
    WHERE is_read = FALSE AND target_team_id IS NOT NULL;

-- Composite worker profile search index
CREATE INDEX IF NOT EXISTS idx_worker_profiles_search
    ON worker_profiles (nationality, visa_type, is_public)
    WHERE is_public = TRUE AND deleted_at IS NULL;
```

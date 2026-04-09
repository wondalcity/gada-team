# GADA Hiring — Backend Architecture

> **Status**: Canonical contract — backend and frontend agents implement against this document.
> **Stack**: Kotlin, Spring Boot 3.3.4, PostgreSQL, Firebase Auth, QueryDSL
> **Root package**: `com.gada.api`
> **Repo**: `/Users/leewonyuep/gada-hiring/apps/api`

---

## 1. Package Boundaries

```
com.gada.api
├── domain/                      # Pure domain models — no Spring, no persistence imports
│   ├── company/                 # Company, Site, Region, SiteStatus, CompanyStatus
│   ├── job/                     # Job, JobCategory, JobIntroContent, JobStatus, PayUnit
│   ├── user/                    # User, WorkerProfile, EmployerProfile, UserRole, UserStatus, VisaType, HealthCheckStatus
│   ├── team/                    # Team, TeamMember, TeamType, TeamStatus, TeamMemberRole
│   ├── matching/                # Application, ApplicationStatusHistory, Scout
│   ├── notification/            # Notification, NotificationType
│   └── audit/                   # AuditLog
│
├── infrastructure/              # All persistence, external service adapters
│   └── persistence/
│       ├── company/             # CompanyRepository, SiteRepository (QueryDSL)
│       ├── job/                 # JobRepository, JobCategoryRepository (QueryDSL)
│       ├── user/                # UserRepository, EmployerProfileRepository, WorkerProfileRepository
│       └── audit/               # AuditRepository
│
├── application/                 # Orchestration / use-case layer
│   ├── company/                 # CompanyUseCase
│   ├── job/                     # JobUseCase
│   ├── auth/                    # AuthUseCase
│   └── audit/                   # AuditService
│
├── presentation/                # HTTP boundary
│   └── v1/
│       ├── company/             # CompanyController, CompanyRequest, CompanyResponse
│       ├── job/                 # JobController, JobRequest, JobResponse
│       ├── auth/                # AuthController, AuthRequest, AuthResponse
│       ├── admin/               # AdminController
│       └── health/              # HealthController
│
├── config/                      # Spring configuration beans (Security, JPA, Firebase, Redis, Swagger)
└── common/                      # ApiResponse, PageResponse, BaseEntity, exceptions
```

### Layer Import Rules

| Layer | MAY import | MAY NOT import |
|-------|-----------|----------------|
| **domain** | Kotlin stdlib; `javax.persistence.@Entity` / `@Column` only | Spring beans (`@Component`, `@Service`, etc.), repositories, JPA `EntityManager`, HTTP types |
| **infrastructure** | domain entities, JPA/QueryDSL (`JPAQueryFactory`, `EntityManager`), Spring Data | presentation DTOs, HTTP types |
| **application** | domain entities, infrastructure repositories | HTTP types (`HttpServletRequest`, Spring MVC annotations), JPA `EntityManager` directly |
| **presentation** | application use-cases, `common` DTOs | JPA types, infrastructure repositories, domain repositories directly |

Dependency direction (no circular deps allowed):

```
presentation → application → domain
infrastructure → domain
infrastructure → application  (implements interfaces declared in application)
common ← all layers
```

---

## 2. API URL Conventions

All endpoints are prefixed `/api/v1`.

### public_id Routing Rule

External URLs **ALWAYS** use the UUID `public_id` field, never the internal `Long id`.

- ✅ `GET /api/v1/companies/{publicId}` — publicId is a UUID string
- ❌ `GET /api/v1/companies/{id}` — Long internal ID must never appear in URLs

### Full URL Inventory

```
# Auth (public)
POST   /api/v1/auth/login
POST   /api/v1/auth/onboard
GET    /api/v1/auth/me

# Reference data (public)
GET    /api/v1/categories
GET    /api/v1/categories/{publicId}
GET    /api/v1/regions?sido=서울특별시

# Jobs (public read, employer write)
GET    /api/v1/jobs                            # paginated list
GET    /api/v1/jobs/{publicId}                 # detail (increments view count)
POST   /api/v1/jobs                            # create (EMPLOYER, body has sitePublicId)
PUT    /api/v1/jobs/{publicId}                 # update (EMPLOYER, own jobs)
PATCH  /api/v1/jobs/{publicId}/status          # publish/pause/close (EMPLOYER)
DELETE /api/v1/jobs/{publicId}                 # soft delete (EMPLOYER)
GET    /api/v1/jobs/mine                       # my posted jobs (EMPLOYER)

# Companies (employer-scoped)
POST   /api/v1/companies
GET    /api/v1/companies/mine
GET    /api/v1/companies/{publicId}            # public profile
PUT    /api/v1/companies/{publicId}
PATCH  /api/v1/companies/{publicId}/verify     # ADMIN only

# Sites (nested under company)
GET    /api/v1/companies/{publicId}/sites
POST   /api/v1/companies/{publicId}/sites
GET    /api/v1/sites/{publicId}
PUT    /api/v1/sites/{publicId}
PATCH  /api/v1/sites/{publicId}/status

# Admin
GET    /api/v1/admin/companies
GET    /api/v1/admin/jobs
GET    /api/v1/admin/users
GET    /api/v1/admin/applications

# Health
GET    /api/v1/health
GET    /api/v1/health/detailed
```

---

## 3. Response Format

All responses use a unified envelope.

```json
// Success — single object
{ "success": true, "data": { ... } }

// Success — paginated list
{
  "success": true,
  "data": {
    "content": [...],
    "page": 0,
    "size": 20,
    "totalElements": 143,
    "totalPages": 8,
    "isFirst": true,
    "isLast": false
  }
}

// Error
{
  "success": false,
  "message": "사람을 찾을 수 없습니다.",
  "errorCode": "NOT_FOUND"
}
```

### HTTP Status Code Policy

| Status | Meaning | errorCode |
|--------|---------|-----------|
| `200 OK` | Read + update success | — |
| `201 Created` | Resource created | — |
| `204 No Content` | Delete / soft-delete success | — |
| `400 Bad Request` | Validation error | `VALIDATION_ERROR` |
| `401 Unauthorized` | Missing / invalid Firebase token | `UNAUTHORIZED` |
| `403 Forbidden` | Valid token but wrong role or ownership | `FORBIDDEN` |
| `404 Not Found` | Resource not found | `NOT_FOUND` |
| `409 Conflict` | Duplicate resource | `CONFLICT` |
| `500 Internal Server Error` | Unhandled exception | `INTERNAL_SERVER_ERROR` |

---

## 4. Pagination Query Parameters

Standard params applied to all list endpoints:

| Param | Type | Default | Constraint |
|-------|------|---------|-----------|
| `page` | integer | `0` | 0-indexed |
| `size` | integer | `20` | max `100` |
| `sort` | string | varies per endpoint | field,direction pairs — e.g. `createdAt,desc` |

---

## 5. Audit Log Writing Strategy

Audit entries are written via `AuditService.record()`.

### Trigger Table

| Trigger | entity_type | action |
|---------|-------------|--------|
| Company created | `COMPANY` | `CREATE` |
| Company verified | `COMPANY` | `STATUS_CHANGE` |
| Job published | `JOB` | `STATUS_CHANGE` |
| Job force-closed by admin | `JOB` | `STATUS_CHANGE` |
| Application status changed | `APPLICATION` | `STATUS_CHANGE` |
| User suspended | `USER` | `STATUS_CHANGE` |
| Any soft delete | `{entity}` | `DELETE` |
| Admin override | `{entity}` | `ADMIN_OVERRIDE` |

### `AuditService.record()` Signature

```kotlin
fun record(
    entityType: String,
    entityId: Long,
    action: String,
    actorId: Long?,
    actorRole: String?,
    oldData: Any? = null,
    newData: Any? = null,
    requestId: String? = null,
)
```

### Rules

- Fire **async** (non-blocking) — use `@Async` or a coroutine scope; never block the request thread.
- **Never throw** — wrap the entire body in `try/catch`; log failures, do not propagate.
- `old_data` / `new_data` stored as JSONB snapshots of the entity **DTO** (not the full JPA entity).

---

## 6. Error Code Registry

```
# Auth
UNAUTHORIZED            401  Firebase token missing or invalid
FORBIDDEN               403  Insufficient role or ownership
ALREADY_ONBOARDED       409  User attempted to onboard a second time
PHONE_REQUIRED          400  Firebase account has no phone number

# Company
COMPANY_NOT_FOUND       404
COMPANY_ALREADY_EXISTS  409  Employer already has a registered company
COMPANY_NOT_VERIFIED    403  Action requires verified company status

# Site
SITE_NOT_FOUND          404
SITE_ACCESS_DENIED      403  Site does not belong to the caller's company

# Job
JOB_NOT_FOUND           404
JOB_ACCESS_DENIED       403
JOB_PUBLISH_BLOCKED     409  Cannot publish: company is not verified

# General
NOT_FOUND               404  Generic — use specific codes whenever possible
CONFLICT                409  Generic
VALIDATION_ERROR        400
INTERNAL_SERVER_ERROR   500
```

---

## 7. Filter & Sort Conventions

Applied to `GET /api/v1/jobs`:

| Param | Type | Behaviour |
|-------|------|-----------|
| `keyword` | string | Trigram search on `title` |
| `sido` | string | Exact match on `sites.sido` |
| `sigungu` | string | Exact match on `sites.sigungu` |
| `categoryCode` | string | Match on `job_categories.code` |
| `categoryId` | uuid | Match on `job_categories.public_id` |
| `payMin` | int | Minimum of `pay_min` |
| `payUnit` | enum | `HOURLY` \| `DAILY` \| `WEEKLY` \| `MONTHLY` |
| `accommodationProvided` | boolean | Filter by accommodation flag |
| `mealProvided` | boolean | Filter by meal flag |
| `sort` | enum | `latest` (default) \| `payDesc` \| `payAsc` |

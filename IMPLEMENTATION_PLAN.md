# Trinity Pixels - Implementation Plan

## Overview
This plan implements all improvement suggestions across 7 phases over ~6-8 weeks.

---

## Phase 1: Security & Core Validation (Week 1)
**Goal:** Secure the API and add input validation

### 1.1 Input Validation Middleware (High Priority)
| Task | File | Effort | Description |
|------|------|--------|-------------|
| Install `express-validator` | package.json | 1h | Add validation library |
| Create validation middleware | `src/middleware/validate.js` | 2h | Reusable validation helpers |
| Validate auth routes | `routes/auth.js` | 2h | Register/login input validation |
| Validate client routes | `routes/clients.js` | 2h | Client creation/update validation |
| Validate leads routes | `routes/leads.js` | 1h | Lead search/filter validation |
| Validate settings routes | `routes/settings.js` | 1h | Settings update validation |

### 1.2 Rate Limiting (High Priority)
| Task | File | Effort | Description |
|------|------|--------|-------------|
| Install `express-rate-limit` | package.json | 1h | Add rate limiting library |
| Add auth rate limit | `src/index.js` | 1h | 5 requests/min on `/api/auth` |
| Add payment rate limit | `routes/payments.js` | 1h | 10 requests/min on `/api/payments` |
| Add plivo rate limit | `routes/plivo.js` | 1h | 30 requests/min on telephony routes |
| Add global rate limit | `src/index.js` | 1h | 100 requests/min default |

### 1.3 Security Hardening (High Priority)
| Task | File | Effort | Description |
|------|------|--------|-------------|
| Add strict CORS | `src/index.js` | 1h | Replace origin with exact FRONTEND_URL |
| Add helmet.js | `src/index.js` | 2h | Security headers (CSP, HSTS, etc) |
| Add JWT expiry | `src/middleware/auth.js` | 1h | Set 24h expiry, refresh token flow |
| Add request logging | `src/index.js` | 2h | Add `morgan` for audit trail |

### 1.4 Validation Schema Examples
```javascript
// src/middleware/validate.js
const { body, param, query } = require('express-validator');

exports.validateRegister = [
  body('name').isLength({ min: 2, max: 100 }).trim(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be 8+ chars')
];

exports.validateClientId = [
  param('id').isUUID()
];
```

---

## Phase 2: Database & Performance (Week 2)
**Goal:** Optimize queries and add proper data management

### 2.1 Pagination System
| Task | File | Effort | Description |
|------|------|--------|-------------|
| Add pagination utility | `src/utils/pagination.js` | 2h | Offset/cursor pagination helpers |
| Update leads route | `routes/leads.js` | 2h | Add `page`, `limit` query params |
| Update clients route | `routes/clients.js` | 2h | Paginate admin client list |
| Update recordings route | frontend | 1h | Frontend pagination UI |

### 2.2 Database Optimizations
| Task | File | Effort | Description |
|------|------|--------|-------------|
| Create composite indexes | `src/db/schema.sql` | 1h | Add indexes for common queries |
| Configure connection pool | `src/db/pool.js` | 2h | Tune max connections, timeouts |
| Add query logging | `src/db/pool.js` | 1h | Log slow queries in development |

### 2.3 Migration System
| Task | File | Effort | Description |
|------|------|--------|-------------|
| Install `node-pg-migrate` | package.json | 1h | Migration tool |
| Create migrations folder | `src/db/migrations/` | 1h | Organized migration files |
| Add soft delete columns | migration | 2h | Add `deleted_at` to tables |
| Add prompt versioning | migration | 2h | Create `prompt_versions` table |

### 2.4 Index Creation SQL
```sql
-- Add to schema.sql or migration
CREATE INDEX IF NOT EXISTS idx_call_leads_client_timestamp
ON call_leads(client_id, call_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_leads_status_created
ON call_leads(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_subscriptions_client_status
ON subscriptions(client_id, status);
```

---

## Phase 3: Frontend UX Improvements (Week 2-3)
**Goal:** Improve user experience and accessibility

### 3.1 Loading & Error States
| Task | File | Effort | Description |
|------|------|--------|-------------|
| Install `react-hot-toast` | package.json | 1h | Toast notifications |
| Add global error boundary | `app/layout.tsx` | 2h | Catch React errors gracefully |
| Add loading.tsx files | dashboard routes | 2h | Suspense loading states |
| Add error.tsx files | dashboard routes | 2h | Error UI for each route |

### 3.2 Form Validation
| Task | File | Effort | Description |
|------|------|--------|-------------|
| Install `react-hook-form` + `zod` | package.json | 1h | Form + schema validation |
| Refactor signup page | `app/signup/page.tsx` | 3h | Add client-side validation |
| Refactor login page | `app/login/page.tsx` | 2h | Add client-side validation |
| Refactor settings page | `app/dashboard/settings/` | 2h | Form validation |

### 3.3 UI Enhancements
| Task | File | Effort | Description |
|------|------|--------|-------------|
| Add dark mode toggle | `tailwind.config.ts` | 2h | Dark theme support |
| Make sidebar collapsible | `components/Sidebar.tsx` | 2h | Mobile-responsive sidebar |
| Add skeleton loaders | API response components | 2h | Loading skeletons |
| Add accessibility attributes | Key components | 2h | ARIA labels, keyboard nav |

### 3.4 API Error Handling
```typescript
// lib/api.ts
export async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    toast.error(error.error || 'Something went wrong');
    throw new Error(error.error);
  }

  return res.json();
}
```

---

## Phase 4: AI Agent Enhancements (Week 3)
**Goal:** Improve AI reliability and analytics

### 4.1 Prompt Versioning
| Task | File | Effort | Description |
|------|------|--------|-------------|
| Create prompt_versions table | migration | 1h | Store all prompt versions |
| Update agent routes | `routes/agent.js` | 3h | Use versioning system |
| Add prompt rollback API | `routes/agent.js` | 2h | Ability to revert prompts |

### 4.2 A/B Testing Improvements
| Task | File | Effort | Description |
|------|------|--------|-------------|
| Make A/B deterministic | `routes/agent.js` | 2h | Hash caller number for variant |
| Track variant performance | `routes/plivo.js` | 2h | Record which variant was used |
| Add analytics endpoint | `routes/admin.js` | 2h | Compare A vs B metrics |

### 4.3 Fallback & Resilience
| Task | File | Effort | Description |
|------|------|--------|-------------|
| Add default prompt fallback | `routes/agent.js` | 1h | If DB fails, use hardcoded default |
| Add prompt validation | `routes/agent.js` | 2h | Validate prompt length/completeness |

### 4.4 Call Quality Metrics
| Task | File | Effort | Description |
|------|------|--------|-------------|
| Add completion rate tracking | `routes/plivo.js` | 2h | Track calls that complete successfully |
| Add escalation rate tracking | `routes/plivo.js` | 2h | Track when calls transfer to humans |
| Add AI accuracy endpoint | `routes/agent.js` | 2h | Report on AI performance |

---

## Phase 5: Telephony & Payments (Week 4)
**Goal:** Enhance call handling and payment reliability

### 5.1 Telephony Improvements
| Task | File | Effort | Description |
|------|------|--------|-------------|
| Add S3/R2 integration | `routes/plivo.js` | 4h | Store recordings in cloud |
| Add DTMF menu support | `routes/plivo.js` | 3h | Collect caller inputs |
| Add call transfer queuing | `routes/plivo.js` | 3h | Better human handoff |
| Add webhook retry logic | `routes/plivo.js` | 2h | Exponential backoff |

### 5.2 Payment Improvements
| Task | File | Effort | Description |
|------|------|--------|-------------|
| Add idempotency check | `routes/payments.js` | 2h | Prevent duplicate webhooks |
| Install `pdfkit` | package.json | 1h | Invoice generation |
| Add invoice endpoint | `routes/payments.js` | 3h | Download PDF invoices |
| Add webhook retry | `routes/payments.js` | 2h | Handle payment failures |

### 5.3 Real-time Alerts
| Task | File | Effort | Description |
|------|------|--------|-------------|
| Add WebSocket server | `src/index.js` | 3h | Real-time updates |
| Add frontend WebSocket hook | `lib/useSocket.ts` | 2h | Connect to server |
| Emit balance alerts | cron job | 2h | Real-time threshold alerts |

---

## Phase 6: DevOps & Monitoring (Week 5)
**Goal:** Improve deployment reliability and observability

### 6.1 Health Checks
| Task | File | Effort | Description |
|------|------|--------|-------------|
| Add DB ping to health | `src/index.js` | 1h | Verify DB connection |
| Add container healthchecks | `docker-compose.yml` | 2h | Health check for all services |

### 6.2 Graceful Shutdown
| Task | File | Effort | Description |
|------|------|--------|-------------|
| Add SIGTERM handler | `src/index.js` | 2h | Drain active requests |
| Add DB pool cleanup | `src/index.js` | 1h | Close connections on shutdown |

### 6.3 CI/CD Pipeline
| Task | File | Effort | Description |
|------|------|--------|-------------|
| Add GitHub Actions workflow | `.github/workflows/ci.yml` | 3h | Test + build on PR |
| Add test suite | `tests/` | 5h | Unit + integration tests |
| Add security scanning | `.github/workflows/ci.yml` | 2h | Dependency vulnerability scan |

### 6.4 Secrets Management
| Task | File | Effort | Description |
|------|------|--------|-------------|
| Document secret rotation | README | 1h | Process for rotating secrets |
| Add Docker secrets | docker-compose.yml | 2h | Use Docker secrets in production |

---

## Phase 7: Analytics & Reporting (Week 5-6)
**Goal:** Add business intelligence and insights

### 7.1 Dashboard Enhancements
| Task | File | Effort | Description |
|------|------|--------|-------------|
| Add real-time call widget | dashboard | 3h | WebSocket-powered live stats |
| Add conversion funnel | analytics page | 3h | Lead → booking visualization |
| Add revenue metrics | usage page | 3h | MRR/ARR tracking |

### 7.2 Retention & Churn
| Task | File | Effort | Description |
|------|------|--------|-------------|
| Add user activity table | migration + API | 3h | Track DAU/MAU |
| Add retention report | admin page | 3h | Cohort analysis |
| Add churn alerts | cron job | 2h | Detect at-risk customers |

### 7.3 Reporting Features
| Task | File | Effort | Description |
|------|------|--------|-------------|
| Add export to CSV | leads page | 2h | Export call data |
| Add scheduled reports | cron job | 3h | Weekly email summaries |
| Add custom date filters | all analytics | 2h | Date range picker |

---

## Implementation Order Summary

| Week | Phase | Key Deliverables |
|------|-------|-------------------|
| 1 | Phase 1 | Input validation, rate limiting, security headers |
| 2 | Phase 2 | Pagination, indexes, migrations |
| 3 | Phase 3 | Loading states, form validation, dark mode |
| 3-4 | Phase 4 | Prompt versioning, A/B improvements |
| 4 | Phase 5 | Webhook retry, payments, real-time alerts |
| 5 | Phase 6 | [x] Health checks, CI/CD, graceful shutdown |
| 5-6 | Phase 7 | [x] Analytics, retention, reporting |
| 6-8 | Phase 8 | [x] Growth features, compliance, legal pages |

---

## Dependencies to Install

```bash
# Backend
npm install express-validator express-rate-limit helmet morgan node-pg-migrate pdfkit

# Frontend
npm install react-hook-form zod react-hot-toast @tanstack/react-query
```

---

## File Structure After Implementation

```
backend/
├── src/
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── validate.js        # NEW
│   │   └── rateLimit.js       # NEW
│   ├── utils/
│   │   └── pagination.js      # NEW
│   ├── routes/
│   │   ├── agent.js           # Enhanced
│   │   ├── plivo.js           # Enhanced
│   │   └── payments.js       # Enhanced
│   └── db/
│       ├── migrations/        # NEW
│       └── pool.js           # Enhanced
└── tests/                     # NEW

frontend/
├── src/
│   ├── components/
│   │   ├── ErrorBoundary.tsx  # NEW
│   │   └── Sidebar.tsx       # Enhanced
│   ├── lib/
│   │   ├── api.ts            # Enhanced
│   │   ├── useSocket.ts      # NEW
│   │   └── useLocalStorage.ts # NEW
│   └── app/
│       ├── signup/page.tsx   # Enhanced
│       └── dashboard/
│           └── loading.tsx   # NEW
```
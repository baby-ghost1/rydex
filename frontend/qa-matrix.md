# RydEx Phase 3 QA Matrix

## Cross-Browser & Device Coverage

| Browser / OS | Viewport | Orientation | Status | Notes |
|---|---|---|---|---|
| Chrome 126+ (Windows/macOS) | 375×667, 1440×900 | — | ☐ | |
| Safari 17+ (macOS) | 375×667, 1440×900 | — | ☐ | |
| Safari iOS 17+ (iPhone 15) | 393×852 | Portrait / Landscape | ☐ | |
| Chrome Android 126+ (Pixel 8) | 412×915 | Portrait / Landscape | ☐ | |
| Firefox 127+ (Windows/macOS) | 375×667, 1440×900 | — | ☐ | |
| Edge 126+ (Windows) | 375×667, 1440×900 | — | ☐ | |

## Critical User Journeys

| Journey | Pages | Device | Keyboard | Screen Reader | Visual Regression | Target Size |
|---|---|---|---|---|---|---|
| Home → Search → Results → Checkout → Bookings | `/`, `/book`, `/book/[id]`, `/bookings` | Desktop / Mobile | ✅ | ✅ | ✅ | ✅ |
| Partner Onboarding | `/dashboard/partner/onboarding` | Desktop | ✅ | ✅ | ✅ | ✅ |
| Admin Vendor Review | `/dashboard/admin/vendors/[id]` | Desktop | ✅ | ✅ | ✅ | ✅ |
| Auth (Login/Register/Forgot) | `/login`, `/forgot-password`, `/verify-email` | Mobile / Desktop | ✅ | ✅ | ✅ | ✅ |
| Live Ride (Chat, OTP, Tracking) | `/bookings/[id]` | Mobile | ✅ | ✅ | ✅ | ✅ |
| Fleet Browse & Filter | `/fleet` | Desktop / Mobile | ✅ | ✅ | ✅ | ✅ |
| Contact Form | `/contact` | Mobile / Desktop | ✅ | ✅ | ✅ | ✅ |

## Accessibility Checkpoints (WCAG 2.1 AA)

| Checkpoint | Scope | Tool/Method | Pass Criteria |
|---|---|---|---|
| Color contrast ≥ 4.5:1 (text) / 3:1 (large text) | All text | axe-core / DevTools | No violations |
| Color contrast ≥ 3:1 (UI components) | Buttons, inputs, borders | axe-core / DevTools | No violations |
| Focus visible on all interactive elements | All pages | Keyboard tab | Visible ring, 2px offset |
| Focus order logical | All pages | Keyboard tab | DOM order = visual order |
| Focus trap in dialogs/drawers | Modal, ChatDrawer | Keyboard tab | Tab cycles within panel |
| ARIA labels on icon-only buttons | All icon buttons | axe-core / inspection | `aria-label` present |
| Heading hierarchy (h1→h2→h3) | All pages | axe-core / inspection | No skipped levels |
| Live regions for dynamic updates | SearchWidget, ChatDrawer, RideDetail | Screen reader (NVDA/VoiceOver) | Announcements heard |
| Form labels associated | All forms | axe-core / inspection | `htmlFor` + `id` |
| Error messages announced | SearchWidget, AuthForm, Checkout | Screen reader | `role="alert"` / `aria-live` |
| Touch targets ≥ 44×44px | All buttons, inputs, links | DevTools / ruler | All meet minimum |

## Visual Regression Checklist

| Component | Baseline | Dark/Light | States Tested |
|---|---|---|---|
| SiteNav (desktop) | ✅ | Light | Default, hover, focus, active, mobile menu open |
| SiteNav (mobile) | ✅ | Light | Closed, open, account menu |
| SearchWidget | ✅ | Light | Default, error, loading, date/time focus |
| VehicleCard | ✅ | Light | Default, hover, active, compact |
| CategoryTabs | ✅ | Light / Dark | Active, inactive, focus |
| LocationInput | ✅ | Light | Closed, open with results, loading, error |
| Modal / ChatDrawer | ✅ | Light | Open, focus trap, close |
| AuthForm (login/register/verify) | ✅ | Light | Default, error, loading, password toggle |
| Homepage hero + sections | ✅ | Light / Dark (nav) | All viewports |
| Footer | ✅ | Dark | Links, contact info |
| Bookings list | ✅ | Light | Empty, loading, populated, tabs |
| Checkout | ✅ | Light | Steps: vehicle, locations, date, payment, fare |
| RideDetail | ✅ | Light | All statuses, OTP panels, fare summary |
| DashboardShell + Sidebar | ✅ | Light | Collapsed, expanded, mobile drawer |
| Partner Onboarding wizard | ✅ | Light | Steps 1–6, validation, KYC |
| Admin Vendor Detail | ✅ | Light | Tabs, KYC video, vehicle list |

## Target Size Audit (≥ 44×44px / 2.75rem)

| Element Type | Locations Checked | Method | Result |
|---|---|---|---|
| Primary buttons (`.btn-*`) | All pages | DevTools computed | All ≥ 44px |
| Icon buttons (`.icon-button`) | Nav, modals, cards | DevTools computed | All ≥ 44px |
| Form inputs (`.input`) | Search, auth, checkout, contact | DevTools computed | All ≥ 44px |
| Tab chips (`.category-tabs button`) | Home, book, fleet, dashboards | DevTools computed | All ≥ 44px |
| Listbox options | LocationInput suggestions | DevTools computed | All ≥ 44px |
| OTP digit inputs | OtpInput | DevTools computed | 44px (lg) |
| Rating stars (interactive) | RideDetail, RatingStars | DevTools computed | 44px (lg) |
| Toggle switches | PartnerControls live location | DevTools computed | 44px |
| Pagination / Load more | Fleet, bookings, admin | DevTools computed | All ≥ 44px |

## Keyboard Navigation Test Cases

| Component | Test | Expected |
|---|---|---|
| SiteNav | Tab through links, Enter to follow, Escape closes mobile menu | Focus visible, menus close |
| SearchWidget | Tab through category tabs, inputs, swap, submit | Logical order, errors focused |
| LocationInput | Type → ArrowDown/Up → Enter selects, Escape closes | Combobox behavior |
| CategoryTabs | Arrow keys between tabs, Home/End, Enter/Space activates | Roving tabindex |
| Modal | Tab cycles within, Escape closes, focus returns to trigger | Focus trap |
| ChatDrawer | Tab through messages, suggestions, input, send | Focus trap, Escape closes |
| AuthForm | Tab through fields, show/hide password, submit, mode switch | Labels, errors focused |
| RideDetail | Tab through timeline, fare, partner controls, OTP inputs | All interactive reachable |
| DashboardShell | Tab through sidebar, header actions, account menu | Mobile drawer trap |
| Partner Onboarding | Tab through each step, file uploads, selects, submits | Step focus management |

## Screen Reader Test Cases (NVDA / VoiceOver)

| Page | Scenario | Expected Announcement |
|---|---|---|
| Home | Hero + search | "Book Any Vehicle, heading level 1", "Search landmark" |
| SearchWidget | Validation error | "Check your trip details, alert", then each error |
| LocationInput | Results appear | "5 places found. Use the arrow keys to browse." |
| LocationInput | Select result | "Connaught Place, New Delhi, option 1 of 5, selected" |
| ChatDrawer | New message arrives | Message text announced (polite) |
| RideDetail | Status changes | "Ride progress updated. Accepted." |
| AuthForm | Submit with errors | "Email is required, alert" then focus email field |
| Checkout | Fare updates | "Estimated total, ₹450" (polite) |
| Bookings | Filter tab change | "Active, selected" |

## Responsive Breakpoints

| Breakpoint | Width | Pages Verified |
|---|---|---|
| Mobile | 375px | Home, Book, Fleet, Bookings, RideDetail, Auth, Contact, Dashboards |
| Tablet | 768px | Home, Book, Fleet, Dashboard sidebar collapse |
| Desktop | 1440px | All pages |
| Large | 1920px | Home, Dashboard admin/partner overview |

## Performance Budgets

| Metric | Budget | Tool |
|---|---|---|
| LCP (Home) | ≤ 2.5s | Lighthouse / WebPageTest |
| CLS (All) | ≤ 0.1 | Lighthouse |
| TBT (All) | ≤ 200ms | Lighthouse |
| JS Bundle (gz) | ≤ 170KB | Next.js analyze |

## Test Execution

```bash
# From the repo root
npm run typecheck          # shared + backend + frontend
npm run lint               # eslint
npm run test               # vitest unit tests

# From frontend/
npm run build              # production build (validated)
npm run test:a11y          # axe-core WCAG 2.1 AA + focus + 44px targets
npm run test:e2e           # critical user journeys
npm run test:visual        # screenshot regression (first run: test:visual:update)
npm run test:qa            # all Playwright suites
```

Prerequisites: `npm install` at the repo root plus
`npx playwright install --with-deps`. Authenticated dashboard specs require
seeded demo accounts (`npm run seed` in `backend/`). Lighthouse/WebPageTest
metrics are collected manually against the production build until a CI runner
is configured.

## Sign-Off

| Role | Name | Date | ✅ |
|---|---|---|---|
| Design | | | ☐ |
| Frontend Lead | | | ☐ |
| Accessibility | | | ☐ |
| QA | | | ☐ |
| Product | | | ☐ |
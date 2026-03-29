# Feature Landscape

**Domain:** Open-source school management platform (DACH market, Untis alternative)
**Researched:** 2026-03-29
**Competitors analyzed:** Untis/WebUntis, AlekSIS, FET, SchoolFox, Schulmanager Online, EduPage

## Table Stakes

Features users expect. Missing = product feels incomplete. These are non-negotiable for any school management platform targeting the DACH market.

### TS-1: Automatic Timetable Generation

| Aspect | Detail |
|--------|--------|
| **Why expected** | Core reason schools adopt scheduling software. FET solves this in 5-20min for complex timetables. Untis has owned this space for decades. Without this, there is no product. |
| **Complexity** | **High** -- This is a Constraint Satisfaction Problem requiring either genetic algorithms, simulated annealing, or hybrid approaches. The algorithm must handle hundreds of variables simultaneously. |
| **Sub-features** | |
| Hard constraints | Teacher clash prevention (no teacher in two places), room capacity limits, teaching day boundaries (Mon-Fri time windows), student group clash prevention |
| Soft constraints | Pedagogical rules (no same subject twice per day), teacher daily limits (max hours/consecutive periods), preferred time slots, room proximity/zoning, balanced weekly distribution |
| Multi-week timetables | A/B week support, bi-weekly lessons, monthly recurring sessions -- common in Austrian gymnasiums |
| Block planning | Doppelstunden (double periods), flexible block lengths for BHS/HTL practical sessions |
| School type agnosticism | Must handle Volksschule (simple), AHS (moderate), BHS/HTL/HAK (complex with workshops, labs, practical blocks) |
| Output formats | HTML, PDF, iCal export; per-teacher, per-class, per-room views |
| **Notes** | FET handles this well algorithmically but is desktop-only with no web interface. Untis has the best solver but is proprietary. The timetabling engine is the hardest part of the entire project and the primary technical risk. |

### TS-2: Digital Class Book (Digitales Klassenbuch)

| Aspect | Detail |
|--------|--------|
| **Why expected** | Austrian and German schools are mandated to keep class registers. WebUntis digital class book is the de facto standard. Paper class books are being phased out. Schools will not switch to a platform that cannot replace their class book. |
| **Complexity** | **Medium** -- CRUD-heavy but requires careful data modeling for regulatory compliance. |
| **Sub-features** | |
| Attendance tracking | Per-period student presence/absence/late marking with timestamps |
| Absence management | Absence types (sick, excused, unexcused), parent-submitted sick notes, digital excuse letters |
| Teaching content documentation | Per-lesson topic recording, homework documentation |
| Student notes | Free-form notes per student per period (behavior, participation, incidents) |
| Grade entry | Per-subject grades, oral/written/practical grade types, weighted averages |
| Absence statistics | Aggregated absence reports per student, per class, per time range |
| Multi-device access | Must work on desktop, tablet (in-classroom), and phone (on excursions) |
| **Notes** | This is legally required documentation in DACH schools. The digital class book must fully replace the paper version -- partial coverage is not acceptable. WebUntis has set the bar here. |

### TS-3: Substitution Planning (Vertretungsplanung)

| Aspect | Detail |
|--------|--------|
| **Why expected** | Teacher absences happen daily. Every school needs to handle this. WebUntis auto-suggests 3 best-matching substitutes based on availability, workload balance, and subject qualification. |
| **Complexity** | **Medium-High** -- Requires real-time availability data, teacher workload tracking, and intelligent suggestion algorithms. |
| **Sub-features** | |
| Absence registration | Teacher absence entry with reason, duration, affected periods |
| Automatic substitute suggestions | Algorithm-based suggestions considering: availability, qualification, workload fairness, previous substitution count |
| Substitution types | Direct substitution, supervision-only, cancellation, room reassignment, distance learning switch |
| Push notification to substitutes | Opt-in confirmation before assignment (WebUntis feature: teacher agrees via push before being assigned) |
| Handover notes | Absent teacher can leave notes per period for the substitute; substitute can see class book content |
| Statistics | Substitution counter per teacher (how many given/received), cancellation rates |
| Activity-based substitutions | Excursions, events, and special activities that create open periods |
| **Notes** | This is tightly coupled to the timetable engine and the class book. Substitution changes must instantly propagate to all timetable views. |

### TS-4: Timetable Viewing (Multi-Role)

| Aspect | Detail |
|--------|--------|
| **Why expected** | Every user interacts with the timetable daily. WebUntis and Untis Mobile provide per-role views. This is the most frequently accessed feature. |
| **Complexity** | **Low-Medium** -- Read-heavy, but must handle real-time updates and multiple view types. |
| **Sub-features** | |
| Per-role views | Teacher view (my schedule), student/parent view (my class schedule), admin view (all schedules) |
| Daily/weekly toggle | Day view for mobile, week view for desktop, both must be fast |
| Real-time updates | Substitutions, cancellations, room changes reflected instantly |
| Color coding | Subject-based colors, visual indicators for cancelled/changed/substituted periods |
| Push notifications | Schedule changes trigger mobile push notifications |
| Widget support | Home screen widget showing today's schedule (mobile) |
| **Notes** | Untis Mobile gets criticized for UX issues (wrong view defaults, profiles hidden in menus). This is a UX opportunity. |

### TS-5: Room and Resource Management

| Aspect | Detail |
|--------|--------|
| **Why expected** | Schools have limited rooms, labs, gyms, and equipment. Double-booking prevention is essential. WebUntis offers room booking, resource reservation, and utilization reports. |
| **Complexity** | **Medium** -- Calendar-based booking with conflict detection. |
| **Sub-features** | |
| Room catalog | Room types (classroom, lab, gym, auditorium), capacity, equipment tags |
| Double-booking prevention | Hard constraint: no two classes in one room at the same time |
| Ad-hoc room booking | Teachers book available rooms for one-off sessions |
| Resource reservation | Equipment booking (tablet carts, projectors, lab equipment, musical instruments) |
| Room change propagation | Room changes update all affected timetable views instantly |
| Utilization reports | Room usage statistics, peak hours, underutilized spaces |
| **Notes** | Tightly integrated with timetable engine (room assignment during generation) and substitution planning (room reassignment during substitution). |

### TS-6: School Communication

| Aspect | Detail |
|--------|--------|
| **Why expected** | SchoolFox has proven that parent-school communication is a standalone product category. Parents expect digital communication. Schools currently juggle email, WhatsApp, paper letters, and SchoolFox. A platform that handles scheduling but not communication will lose to the combo of WebUntis + SchoolFox. |
| **Complexity** | **Medium** -- Messaging system with role-based access, but read receipts and translation add complexity. |
| **Sub-features** | |
| One-to-many messages | Teacher/admin broadcasts to class, grade, or entire school |
| One-to-one messages | Private teacher-parent conversations about individual students |
| Read receipts (Lesebestaetigung) | Teacher sees who read the message and who did not -- critical for important announcements |
| Attachments | Photos, PDFs, documents attached to messages |
| Absence notification by parents | Parents notify school of child's absence with one click; serves as digital excuse letter |
| Surveys/polls | Quick polls for event planning, feedback gathering |
| **Notes** | SchoolFox charges separately for this. Bundling communication into the core platform is a significant value proposition. Multi-language translation (SchoolFox supports 40 languages) is a differentiator, not table stakes. |

### TS-7: Role-Based Access Control (RBAC)

| Aspect | Detail |
|--------|--------|
| **Why expected** | DSGVO requirement. Different users must see only what they are authorized to see. Parents see their child; teachers see their classes; admins see everything. |
| **Complexity** | **Medium** -- Permission system spanning all modules. |
| **Sub-features** | |
| Standard roles | Administrator, school director (Schulleitung), teacher, parent/guardian, student |
| Per-module permissions | Fine-grained access per feature (e.g., teacher can view class book, parent can view grades but not teacher notes) |
| Data scoping | Parent sees only their child's data; teacher sees only their classes |
| Audit trail | Who accessed what, when -- DSGVO compliance requirement |
| **Notes** | Must be designed from the start, not bolted on. RBAC is the backbone of DSGVO compliance. |

### TS-8: DSGVO (GDPR) Compliance

| Aspect | Detail |
|--------|--------|
| **Why expected** | Legal requirement for all schools in Austria, Germany, and Switzerland. Non-negotiable. Schools will not adopt non-compliant software. |
| **Complexity** | **Medium** -- Pervasive concern that affects all features. Not a single module but a cross-cutting concern. |
| **Sub-features** | |
| Consent management | Track and manage parental consent for data processing |
| Data deletion (Loeschkonzept) | Right to be forgotten: ability to fully delete a student's data upon request |
| Data export | Students/parents can request export of all their data (Art. 15 DSGVO) |
| Data minimization | Collect only necessary data; no unnecessary tracking |
| Encryption at rest and in transit | TLS for transport, encrypted database fields for sensitive data |
| Retention policies | Automated data retention with configurable expiration |
| Audit logging | Immutable log of data access and modifications |
| Data processing agreement (AVV) | Template/documentation for school-to-hoster data processing agreements |
| **Notes** | This is not a feature to ship later. It must be baked into the architecture from day 1. Every data model, every API endpoint, every query must respect DSGVO. Untis is ISO-certified and DSGVO-compliant -- the bar is high. |

### TS-9: Mobile Access

| Aspect | Detail |
|--------|--------|
| **Why expected** | Parents and students primarily access via phone. Teachers use tablets in classrooms. Untis Mobile exists. Any platform without mobile access is dead on arrival. |
| **Complexity** | **Medium** -- Responsive web may suffice for MVP; native apps raise complexity significantly. |
| **Sub-features** | |
| Responsive web app | Full functionality on mobile browsers |
| Push notifications | Schedule changes, new messages, absence alerts |
| Offline capability | View today's timetable without network (nice-to-have, not critical for MVP) |
| **Notes** | Untis Mobile has a 4.5/5 app store rating but a 46/100 safety score and many UX complaints. A well-designed PWA could be competitive without the overhead of native apps. |

### TS-10: Data Import/Export

| Aspect | Detail |
|--------|--------|
| **Why expected** | Schools do not start from zero. They have existing data in Untis, SIS systems, or spreadsheets. Migration path is essential for adoption. |
| **Complexity** | **Low-Medium** -- CSV/XML import parsers, Untis format compatibility. |
| **Sub-features** | |
| Untis data import | Import from Untis XML/GPU format (timetables, teacher data, room data) -- critical for migration |
| CSV import/export | Generic data import for student lists, teacher lists, room data |
| SIS integration | Connect to external Student Information Systems via API or file exchange |
| Calendar export | iCal/ICS export for personal calendars |
| **Notes** | AlekSIS already supports Untis import. This is a strong adoption enabler -- schools can try the platform without re-entering all their data. |

---

## Differentiators

Features that set the product apart. Not expected, but create competitive advantage against Untis and the fragmented open-source landscape.

### D-1: Open API (REST/GraphQL)

| Aspect | Detail |
|--------|--------|
| **Value proposition** | Untis API is JSON-RPC based, read-only for rooms, cannot delete students/classes via API, and requires partnership for access. An open, well-documented REST/GraphQL API is a massive differentiator for the open-source community. |
| **Complexity** | **Medium** -- API-first architecture means this is built in from the start, not an afterthought. |
| **What this enables** | Third-party integrations, custom dashboards, SIS connectors, mobile app alternatives, school-specific automation |
| **Notes** | WebUntis API follows OneRoster 1.1 spec but with significant limitations. SchoolFlow's API-first approach means the UI is just one consumer -- any school or developer can build their own client. |

### D-2: Plugin/Connector System

| Aspect | Detail |
|--------|--------|
| **Value proposition** | AlekSIS proves the modular app model works for school software. Untis is monolithic with limited extensibility. A plugin system lets schools add only what they need and lets the community build extensions. |
| **Complexity** | **High** -- Plugin architecture, lifecycle management, dependency resolution, security sandboxing. |
| **Sub-features** | |
| Calendar connectors | Sync with Google Calendar, Outlook, Apple Calendar |
| Collaboration connectors | MS Teams, Google Workspace integration (SSO, calendar sync) |
| SIS connectors | Import/export student data from external SIS systems |
| Authentication connectors | LDAP, Active Directory, OAuth/OIDC (Keycloak, Azure AD) |
| Community plugins | Plugin registry where community can publish extensions |
| **Notes** | This must be designed early (plugin API contracts) but the marketplace itself can ship later. The key is that the core architecture supports extensibility from the start. |

### D-3: Self-Hosted by Default (Single-Tenant)

| Aspect | Detail |
|--------|--------|
| **Value proposition** | Schools keep full control of their data. No vendor lock-in. DSGVO compliance is simpler when data stays on school infrastructure. Untis is cloud-hosted by the company -- schools cannot self-host. |
| **Complexity** | **Medium** -- Docker/Kubernetes deployment, documentation, upgrade paths. |
| **Sub-features** | |
| Docker Compose deployment | Single command setup for small schools |
| Kubernetes deployment | Helm charts for larger deployments |
| Backup/restore | Automated backup scripts, documented restore procedures |
| Update mechanism | Rolling updates without downtime |
| **Notes** | Self-hosting is the core philosophy. A hosted option can come later (community-run or commercial), but the default is self-hosted. |

### D-4: Modern, Clean UX

| Aspect | Detail |
|--------|--------|
| **Value proposition** | Untis UX is widely criticized: outdated design, confusing navigation, view defaults that annoy users, profiles hidden in menus. WebUntis looks like 2010. A modern, intuitive UI is a genuine differentiator. |
| **Complexity** | **Medium** -- Design investment, not technical complexity. |
| **Key UX improvements over Untis** | |
| Consistent navigation | Sidebar with clear module structure, not buried menus |
| Smart defaults | Open to today's view, remember user preferences |
| Fast interactions | No full page reloads, instant schedule updates |
| Accessibility | WCAG 2.1 AA compliance, keyboard navigation, screen reader support |
| Dark mode | Appreciated by teachers using projectors in classrooms |
| **Notes** | This is not about flashy design -- it is about making daily tasks (checking schedule, marking attendance, sending a message) take fewer clicks and less cognitive load than Untis. |

### D-5: Multi-Language Translation in Communication

| Aspect | Detail |
|--------|--------|
| **Value proposition** | SchoolFox supports 40 languages with one-click translation. In DACH schools, many parents are non-native speakers (migration background). Auto-translation of school messages removes communication barriers. |
| **Complexity** | **Medium** -- Integration with translation API (DeepL preferred for DACH/European languages). |
| **Notes** | SchoolFox charges for this as a separate product. Including it in the communication module is a strong value-add for inclusive schools. |

### D-6: Parent-Teacher Day Online Booking (Elternsprechtag)

| Aspect | Detail |
|--------|--------|
| **Value proposition** | WebUntis offers this as a premium feature. Parents book time slots online, teachers mark unavailable times, no waiting on the day itself. Eliminates paper-based sign-up sheets. |
| **Complexity** | **Low-Medium** -- Appointment booking with availability management. |
| **Sub-features** | |
| Teacher availability setup | Teachers mark available/unavailable time slots |
| Parent self-booking | Parents book slots from home, see available times |
| Teacher-initiated invitations | Teacher invites specific parent to parent-teacher day |
| Schedule download | Both parties can download their appointment overview |
| Online meeting option | Option to conduct parent-teacher meeting via video link |
| **Notes** | This is a crowd-pleaser. Parents love it because no more queuing. Teachers love it because they see who is coming. Relatively low effort, high impact. |

### D-7: Analytics and Reporting Dashboard

| Aspect | Detail |
|--------|--------|
| **Value proposition** | WebUntis has basic reports. Schools need data-driven insights: attendance trends, substitution load distribution, room utilization, grade analytics. Most school platforms offer minimal analytics. |
| **Complexity** | **Medium** -- Aggregation queries, visualization components, configurable dashboards. |
| **Sub-features** | |
| Attendance dashboard | Trends, at-risk students (high absence rates), class comparisons |
| Substitution analytics | Teacher workload fairness, cancellation rates, coverage efficiency |
| Room utilization | Peak times, underutilized rooms, optimization suggestions |
| Teacher workload | Hours taught, substitutions given, overtime indicators |
| Exportable reports | PDF/CSV export for school board, inspectors, authorities |
| **Notes** | This is where data from class book, timetable, and substitution planning converge. The platform that makes this data actionable wins the admin's trust. |

### D-8: Homework and Exam Management

| Aspect | Detail |
|--------|--------|
| **Value proposition** | WebUntis includes homework and exam entries in the timetable. Students see upcoming exams and homework directly in their schedule. Not all competitors offer this integrated view. |
| **Complexity** | **Low-Medium** -- CRUD with calendar integration. |
| **Sub-features** | |
| Homework assignment | Teacher assigns homework linked to a lesson; visible in student timetable |
| Exam scheduling | Exam dates entered with collision detection (no two exams same day for same class) |
| Student/parent visibility | Homework and exams appear in timetable and push notifications |
| **Notes** | This bridges class book and timetable. Simple to implement but high daily-use value for students and parents. |

### D-9: Course Registration (Kurswahl)

| Aspect | Detail |
|--------|--------|
| **Value proposition** | For Oberstufe (upper secondary) in AHS and BHS, students choose elective courses. WebUntis allows online course registration that feeds directly into timetable generation. |
| **Complexity** | **Medium** -- Registration workflow, capacity limits, conflict detection, integration with timetable generator. |
| **Notes** | Not needed for Volksschulen or Unterstufe. Important for AHS Oberstufe and BHS. Can be a later-phase feature but is a real differentiator for larger schools. |

---

## Anti-Features

Features to explicitly NOT build. These are scope traps that seem logical but lead to product bloat, competing with established products, or mission drift.

### AF-1: E-Learning / LMS (Learning Management System)

| Anti-Feature | Why Avoid | What to Do Instead |
|---|---|---|
| Course content hosting, quizzes, assignments, grading rubrics, discussion forums | Moodle owns this space with massive adoption in DACH schools. Building an LMS means competing with a mature, well-funded open-source project. It is a completely different product domain with different user workflows. | Provide a connector/plugin for Moodle integration. Link to Moodle courses from the timetable. Let the LMS be the LMS. |

### AF-2: Student Information System (SIS) / Stammdatenverwaltung

| Anti-Feature | Why Avoid | What to Do Instead |
|---|---|---|
| Master student records, enrollment management, transcripts (Zeugnisse), student lifecycle management | SIS is a separate product category with complex regulatory requirements per state/canton (Bildungsdirektionen have different data models). Austrian schools use systems like Sokrates (official SIS). Building a SIS means navigating per-state regulatory mazes. | Provide API connectors and CSV import/export to integrate with existing SIS. Support data sync from Sokrates and similar systems. |

### AF-3: Financial / Budget Management

| Anti-Feature | Why Avoid | What to Do Instead |
|---|---|---|
| Fee collection, invoicing, payment processing, budget tracking | Not core to school scheduling/organization. Requires financial compliance, payment gateway integration, tax handling. Completely different domain expertise. | Out of scope entirely. Schools have separate financial systems. If needed, a plugin can bridge the gap. |

### AF-4: Video Conferencing Engine

| Anti-Feature | Why Avoid | What to Do Instead |
|---|---|---|
| Built-in video calling, virtual classrooms, screen sharing | WebRTC infrastructure is expensive and complex. Jitsi, Zoom, MS Teams, BigBlueButton already exist. Schools already have these tools. | Provide connectors to embed/link video calls from Teams, Zoom, Jitsi, BigBlueButton. Generate meeting links directly from the timetable. |

### AF-5: Multi-Tenant Cloud SaaS (v1)

| Anti-Feature | Why Avoid | What to Do Instead |
|---|---|---|
| Shared infrastructure, tenant isolation, central billing, SaaS marketplace | Massively increases architectural complexity. Tenant isolation, noisy neighbor problems, central billing, compliance per tenant. Premature for v1. | Ship single-tenant self-hosted first. Multi-tenant can be a future version once the core product is proven. |

### AF-6: Full Zeugniserstellung (Report Card Generation)

| Anti-Feature | Why Avoid | What to Do Instead |
|---|---|---|
| Complete report card generation with per-state templates, legal text, official formats | Each Austrian Bundesland and German Bundesland has different Zeugnis formats, legal text requirements, and approval workflows. This is SIS territory. | Store grades in the class book. Export grade data via API for external Zeugnis generation tools. |

### AF-7: School Website / CMS

| Anti-Feature | Why Avoid | What to Do Instead |
|---|---|---|
| Public school website builder, news/blog system, event calendar for the public | Schools already use WordPress, Typo3, or state-provided CMS. Unrelated to scheduling/management. | Provide RSS/iCal feeds that school websites can embed. Let the CMS be the CMS. |

### AF-8: Student Behavior Tracking / Disciplinary System

| Anti-Feature | Why Avoid | What to Do Instead |
|---|---|---|
| Behavior point systems, disciplinary records, reward systems | Culturally sensitive, varies wildly by school type and philosophy. Adds significant complexity with little overlap to scheduling. | Free-form notes in the class book cover basic documentation. Dedicated behavior systems are a plugin opportunity. |

---

## Feature Dependencies

```
TS-1: Timetable Engine
  |
  +---> TS-4: Timetable Viewing (reads from engine output)
  |       |
  |       +---> TS-9: Mobile Access (timetable is most-viewed on mobile)
  |
  +---> TS-5: Room Management (rooms are assigned during generation)
  |
  +---> TS-3: Substitution Planning (modifies timetable in real-time)
  |       |
  |       +---> D-7: Analytics (substitution stats require sub data)
  |
  +---> D-9: Course Registration (feeds into timetable generation)

TS-2: Digital Class Book
  |
  +---> TS-7: RBAC (class book is the most permission-sensitive module)
  |
  +---> TS-8: DSGVO Compliance (class book holds the most personal data)
  |
  +---> D-7: Analytics (attendance/grade analytics require class book data)
  |
  +---> D-8: Homework/Exam (extends class book with assignment tracking)

TS-6: Communication
  |
  +---> TS-7: RBAC (who can message whom)
  |
  +---> D-5: Multi-Language Translation (enhances messages)
  |
  +---> D-6: Parent-Teacher Day Booking (communication sub-feature)

TS-7: RBAC (foundational -- required by almost everything)
  |
  +---> TS-8: DSGVO Compliance (RBAC enforces data scoping)

TS-10: Data Import
  |
  +---> TS-1: Timetable Engine (imported data populates timetable)

D-1: Open API
  |
  +---> D-2: Plugin System (plugins consume the API)
```

**Critical path:** RBAC + DSGVO --> Timetable Engine --> Class Book --> Substitution Planning --> Communication

---

## MVP Recommendation

### Must ship in v1 (Minimum Viable Product)

Prioritize in this order:

1. **TS-7: RBAC** + **TS-8: DSGVO Compliance** -- Foundational. Build once, build right. Everything depends on this.
2. **TS-1: Automatic Timetable Generation** -- This is the raison d'etre. Without this, there is no product. Start with basic constraints, iterate.
3. **TS-4: Timetable Viewing** -- The timetable must be viewable. Include per-role views, daily/weekly toggle, push notifications.
4. **TS-2: Digital Class Book** -- Core daily-use feature. Attendance, teaching content, basic grade entry.
5. **TS-5: Room Management** -- Tightly coupled to timetable. Ship basic room catalog and conflict prevention.
6. **TS-3: Substitution Planning** -- Daily operational need. Basic absence handling + manual substitute assignment. Auto-suggestions can come in v1.1.
7. **TS-10: Data Import** -- Untis XML import is critical for adoption. Schools will not manually re-enter data.
8. **TS-9: Mobile Access** -- Responsive web app as MVP. PWA with push notifications.

### Ship in v1.1 (Fast Follow)

9. **TS-6: Communication** -- Important but schools already have SchoolFox. Can wait one release cycle.
10. **D-1: Open API** -- If API-first architecture is followed, this is nearly free. Document and publish.
11. **D-8: Homework/Exam Management** -- Low effort, high value extension of class book.
12. **D-6: Parent-Teacher Day Booking** -- Crowd-pleaser, relatively simple.

### Defer to v2+

- **D-2: Plugin System** -- Design the extension points early, ship the plugin marketplace later.
- **D-5: Multi-Language Translation** -- Requires translation API integration, adds cost.
- **D-7: Analytics Dashboard** -- Needs data volume to be useful. Ship after schools have been using the platform.
- **D-9: Course Registration** -- Only relevant for Oberstufe. Niche feature for later.
- **D-3: Self-Hosted Tooling** -- Docker Compose from day 1, but Helm charts and advanced deployment can come later.
- **D-4: Modern UX** -- Not deferred per se, but the "polish" level increases over time. Ship clean from the start, refine with user feedback.

---

## Competitive Landscape Summary

| Feature | Untis/WebUntis | AlekSIS | FET | SchoolFox | EduPage | SchoolFlow (target) |
|---------|---------------|---------|-----|-----------|---------|-------------------|
| Timetable generation | Best-in-class | Via Untis import | Excellent algorithm | No | Yes | Must match FET quality |
| Digital class book | Full | Yes (app) | No | Basic | Yes | Full |
| Substitution planning | Full + auto-suggest | Via Untis | No | No | Yes | Full + auto-suggest |
| Communication | WebUntis Messages | No | No | Best-in-class | Basic | Strong (bundled) |
| Room management | Full + booking | No | No | No | Basic | Full |
| Parent-teacher day | Full + online | No | No | Yes | Basic | Full + online |
| Open API | Limited (JSON-RPC) | Yes (Django) | No | No | No | Full REST/GraphQL |
| Self-hosted | No | Yes | Desktop only | No | No | Yes (default) |
| Open source | No | Yes (AGPL) | Yes (AGPL) | No | No | Yes |
| Modern UX | Outdated | Basic | Desktop GUI | Good | Decent | Modern (target) |
| Plugin system | No | Yes (Django apps) | No | No | No | Yes |
| DSGVO compliant | Yes (ISO certified) | Yes | N/A (local) | Yes | Yes | Yes (by design) |
| Mobile app | Native (iOS/Android) | No native | No | Native | Native | PWA (v1), Native (v2) |

---

## Sources

- [WebUntis Product Page](https://www.untis.at/en/products/webuntis) -- MEDIUM confidence (official marketing)
- [WebUntis Digital Class Register](https://www.untis.at/en/products/webuntis/class-register) -- MEDIUM confidence
- [WebUntis Substitution Planning](https://www.untis.at/en/products/webuntis/online-substitution-planning) -- MEDIUM confidence
- [WebUntis Booking/Room Management](https://www.untis.at/en/products/webuntis/booking) -- MEDIUM confidence
- [WebUntis Parent-Teacher Day](https://www.untis.at/en/products/webuntis/parent-teacher-day) -- MEDIUM confidence
- [WebUntis Student Features](https://www.untis.at/en/products/webuntis/student) -- MEDIUM confidence
- [AlekSIS Features](https://aleksis.org/features/) -- HIGH confidence (official docs)
- [FET Official Site](https://lalescu.ro/liviu/fet/) -- HIGH confidence (official docs)
- [SchoolFox Features](https://foxeducation.com/en/schoolfox/features/) -- MEDIUM confidence (official marketing)
- [Schulmanager Online](https://www.schulmanager-online.de/) -- MEDIUM confidence
- [WebUntis API Documentation](https://help.untis.at/hc/de/articles/4886785534354-API-documentation-for-integration-partners) -- HIGH confidence
- [Untis Mobile Reviews](https://justuseapp.com/en/app/926186904/untis-mobile/reviews) -- MEDIUM confidence (user reviews)
- [GetApp WebUntis Reviews](https://www.getapp.com/education-childcare-software/a/webuntis/) -- MEDIUM confidence
- [Education Space Consultancy - Timetabling Constraints](https://educationspaceconsultancy.com/hard-and-soft-timetabling-constraints-not-only-a-working-timetable-but-a-great-timetable/) -- MEDIUM confidence
- [School Timetabling with Constraint Programming (Medium)](https://medium.com/suboptimally-speaking/school-timetabling-with-constraint-programming-495f1126c28d) -- LOW confidence

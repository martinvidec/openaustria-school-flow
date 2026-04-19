# Phase 10: Schulstammdaten & Zeitraster — Pattern Map

**Mapped:** 2026-04-19
**Files analyzed:** 24 (10 backend, 12 frontend, 2 schema/migration)
**Analogs found:** 22 / 24

> Inputs: `10-CONTEXT.md` (D-01..D-15), `10-RESEARCH.md` (§1-8), `10-UI-SPEC.md` (§1-16). Skill registry not present (`.claude/skills/` missing). Project conventions per `CLAUDE.md`: Prisma 7, NestJS 11, React 19, Vite 8, TanStack Query 5, TanStack Router 1, shadcn/ui, Tailwind 4, Zustand 5, German UI / English API, RFC 9457 errors.

## File Classification

### Backend (apps/api)

| New / Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---------------------|------|-----------|----------------|---------------|
| `apps/api/prisma/schema.prisma` (modify §30-153) | schema | declarative | `apps/api/prisma/schema.prisma` (existing School/SchoolYear blocks) | exact |
| `apps/api/prisma/migrations/<ts>_10_add_school_ab_week_enabled/migration.sql` | migration | DDL | `apps/api/prisma/migrations/20260329172431_phase2_school_data_model_dsgvo/migration.sql` | role-match |
| `apps/api/prisma/migrations/<ts>_10_school_year_multi_active/migration.sql` | migration | DDL + DML backfill | same as above (extend with raw partial-index SQL) | role-match (no exact partial-index precedent) |
| `apps/api/prisma/seed.ts` (modify lines ~340-352) | script | one-shot setup | existing `seed.ts` (in-place edit) | exact |
| `apps/api/src/modules/school/school.controller.ts` (modify) | controller | request-response, CRUD | itself (extend with `abWeekEnabled` semantics, leave file structure) | exact |
| `apps/api/src/modules/school/school.service.ts` (modify) | service | CRUD | itself (extend update DTO handling) | exact |
| `apps/api/src/modules/school/dto/update-school.dto.ts` (modify) | dto | validation | itself (add explicit `abWeekEnabled` field) | exact |
| `apps/api/src/modules/school/school-time-grid.controller.ts` (NEW) | controller | request-response, write-with-guard | `apps/api/src/modules/resource/resource.controller.ts` | role-match (nested route under `schools/:id`) |
| `apps/api/src/modules/school/school-time-grid.service.ts` (NEW) | service | CRUD + impact-check | `apps/api/src/modules/resource/resource.service.ts` (ConflictException pattern) | role-match |
| `apps/api/src/modules/school/dto/update-time-grid.dto.ts` (NEW) | dto | validation | `apps/api/src/modules/school/dto/create-time-grid.dto.ts` | exact |
| `apps/api/src/modules/school/school-year.controller.ts` (NEW) | controller | request-response, CRUD + state-transition (activate) | `apps/api/src/modules/resource/resource.controller.ts` | role-match |
| `apps/api/src/modules/school/school-year.service.ts` (NEW) | service | CRUD + orphan-guard | `apps/api/src/modules/resource/resource.service.ts` | role-match |
| `apps/api/src/modules/school/dto/update-school-year.dto.ts` (NEW) | dto | validation | `apps/api/src/modules/school/dto/create-school-year.dto.ts` (PartialType) + `update-school.dto.ts` | exact |
| `apps/api/src/modules/school/school.module.ts` (modify) | module | DI wiring | itself (add new providers/controllers) | exact |
| `apps/api/src/modules/school/school.service.spec.ts` (modify) | test | unit (service) | itself + `apps/api/src/modules/resource/resource.service.spec.ts` | exact |
| `apps/api/src/modules/school/school-time-grid.service.spec.ts` (NEW) | test | unit | `apps/api/src/modules/school/school.service.spec.ts` | exact |
| `apps/api/src/modules/school/school-year.service.spec.ts` (NEW) | test | unit | `apps/api/src/modules/school/school.service.spec.ts` | exact |
| TimetableRun creation site (TBD via grep — `apps/api/src/modules/solver/...` or `timetable/...`) | service | mutation (default-source copy) | (no analog yet — see "No Analog Found") | none |

### Shared (packages/shared)

| New / Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---------------------|------|-----------|----------------|---------------|
| `packages/shared/src/schemas/school.schema.ts` (NEW) | schema | validation (Zod) | NONE — no Zod schemas exist yet | none (introduces canonical Zod folder) |
| `packages/shared/src/schemas/time-grid.schema.ts` (NEW) | schema | validation (Zod) | NONE | none |
| `packages/shared/src/schemas/school-year.schema.ts` (NEW) | schema | validation (Zod) | NONE | none |
| `packages/shared/src/types/school.ts` (NEW) | types | DTO contract | `packages/shared/src/types/room.ts` | role-match |
| `packages/shared/src/index.ts` (modify) | barrel | re-exports | itself (add new lines) | exact |
| `packages/shared/package.json` (modify) | config | deps | itself (add `zod`) | exact |
| `apps/web/package.json` (modify) | config | deps | itself (add `react-hook-form`, `@hookform/resolvers`, `zod`) | exact |

### Frontend (apps/web)

| New / Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---------------------|------|-----------|----------------|---------------|
| `apps/web/src/routes/_authenticated/admin/school.settings.tsx` (NEW) | route/page | composition shell | `apps/web/src/routes/_authenticated/admin/timetable-edit.tsx` (route + tab usage) + `resources.tsx` (CRUD layout) | role-match |
| `apps/web/src/components/admin/school-settings/SchoolDetailsTab.tsx` (NEW) | component (form) | request-response | `apps/web/src/routes/_authenticated/admin/resources.tsx` (Dialog form section, lines 215-303) | role-match (RHF replaces useState) |
| `apps/web/src/components/admin/school-settings/TimeGridTab.tsx` (NEW) | component (form + DnD table) | request-response with optimistic-impact-check | `timetable-edit.tsx` (DnD wiring lines 115-231) + `ResourceList.tsx` (table lines 57-119) | role-match (combined) |
| `apps/web/src/components/admin/school-settings/SchoolYearsTab.tsx` (NEW) | component (list + dialogs) | CRUD | `resources.tsx` + `ResourceList.tsx` | role-match |
| `apps/web/src/components/admin/school-settings/OptionsTab.tsx` (NEW) | component (toggle + banner) | request-response | `apps/web/src/components/timetable/ABWeekTabs.tsx` (Tabs primitive usage) | role-match |
| `apps/web/src/components/admin/school-settings/PeriodsEditor.tsx` (NEW) | component (DnD-sortable table/cards) | event-driven (drag) + form | `timetable-edit.tsx` lines 115-231 | role-match |
| `apps/web/src/components/admin/school-settings/UnsavedChangesDialog.tsx` (NEW) | component (dialog) | event-driven | `apps/web/src/components/rooms/ResourceList.tsx` lines 122-155 (Delete-Confirm dialog) | role-match |
| `apps/web/src/components/admin/school-settings/DestructiveEditDialog.tsx` (NEW) | component (dialog, 3-button) | event-driven | `ResourceList.tsx` Delete-Confirm + `resources.tsx` form Dialog | role-match |
| `apps/web/src/components/admin/school-settings/HolidaysList.tsx` (NEW) | component (nested list) | CRUD | `ResourceList.tsx` | role-match |
| `apps/web/src/components/admin/school-settings/AutonomousDaysList.tsx` (NEW) | component (nested list) | CRUD | `ResourceList.tsx` | role-match |
| `apps/web/src/hooks/useSchool.ts` (NEW) | hook | TanStack Query (read + mutate) | `apps/web/src/hooks/useResources.ts` | exact |
| `apps/web/src/hooks/useTimeGrid.ts` (NEW) | hook | TanStack Query | `apps/web/src/hooks/useResources.ts` | exact |
| `apps/web/src/hooks/useSchoolYears.ts` (NEW) | hook | TanStack Query | `apps/web/src/hooks/useResources.ts` | exact |
| `apps/web/src/components/layout/AppSidebar.tsx` (modify) | component | declarative nav | itself (add nav entry to `navItems` array, line 33-106) | exact |
| `apps/web/src/components/layout/MobileSidebar.tsx` (modify) | component | declarative nav | itself (mirror entry) | exact |
| `apps/web/src/stores/school-context-store.ts` (modify) | store | client state | itself (extend with `activeSchoolYearId`, `abWeekEnabled` mirroring) | exact |

---

## Pattern Assignments

### Backend Patterns

#### `apps/api/prisma/schema.prisma` (schema modification)

**Analog:** existing schema §30-153 (the very block being modified)

**Diff to apply** (per RESEARCH §1.1, §1.2):
```prisma
model School {
  // ... existing fields ...
  abWeekEnabled Boolean @default(false) @map("ab_week_enabled")
}

model SchoolYear {
  id       String @id @default(uuid())
  schoolId String @map("school_id")        // DROP @unique
  school   School @relation(fields: [schoolId], references: [id], onDelete: Cascade)

  name          String
  startDate     DateTime @map("start_date")
  semesterBreak DateTime @map("semester_break")
  endDate       DateTime @map("end_date")
  isActive      Boolean  @default(false) @map("is_active")

  holidays       Holiday[]
  autonomousDays AutonomousDay[]

  @@index([schoolId])
  @@map("school_years")
}
```

**Convention notes (from existing schema):** snake_case via `@map()`, plural table names via `@@map()`, `uuid()` IDs.

---

#### `apps/api/prisma/migrations/<ts>_10_school_year_multi_active/migration.sql` (NEW)

**Analog:** `apps/api/prisma/migrations/20260329172431_phase2_school_data_model_dsgvo/migration.sql` (only structural example in repo — single combined migration; this phase splits into two)

**Pattern (header + DDL style)** — match existing migration's pattern of leading `--` comment per block:
```sql
-- DropConstraint / DropIndex
ALTER TABLE "school_years" DROP CONSTRAINT IF EXISTS "school_years_school_id_key";
DROP INDEX IF EXISTS "school_years_school_id_key";

-- AddColumn
ALTER TABLE "school_years" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT false;

-- Backfill (each existing row becomes the active year for its school —
-- safe because schoolId WAS unique, so at most one row per school)
UPDATE "school_years" SET "is_active" = true;

-- CreateIndex (non-unique lookup)
CREATE INDEX "school_years_school_id_idx" ON "school_years" ("school_id");

-- CreateIndex (partial unique — at most one active year per school;
-- declared in raw SQL because Prisma 7 schema does not support WHERE clauses)
CREATE UNIQUE INDEX "school_years_active_per_school"
  ON "school_years" ("school_id") WHERE "is_active" = true;
```

**Required workflow:** generate skeleton with `npx prisma migrate dev --create-only --name 10_school_year_multi_active`, then hand-edit. Per RESEARCH §1.2, keep the partial-index SQL self-contained for clean drift detection.

---

#### `apps/api/prisma/seed.ts` (modify lines ~340-352)

**Analog:** the file itself (per RESEARCH §7.1)

**Pattern shift:** replace `findUnique({ where: { schoolId } })` with `findFirst({ where: { schoolId, isActive: true } })`. Old pattern:
```ts
await prisma.schoolYear.findUnique({ where: { schoolId: school.id } });
```
New pattern (mirrors RESEARCH §7.1 example):
```ts
const existingYear = await prisma.schoolYear.findFirst({
  where: { schoolId: school.id, isActive: true },
});
if (!existingYear) {
  await prisma.schoolYear.create({
    data: { schoolId: school.id, name: '2025/2026', startDate: ..., endDate: ..., semesterBreak: ..., isActive: true },
  });
}
const schoolYear = await prisma.schoolYear.findFirstOrThrow({
  where: { schoolId: school.id, isActive: true },
});
```

---

#### `apps/api/src/modules/school/school-time-grid.controller.ts` (NEW)

**Analog:** `apps/api/src/modules/resource/resource.controller.ts` (closest example of nested-resource controller under `schools/:schoolId/...`)

**Imports pattern** (resource.controller.ts lines 1-23):
```typescript
import { Controller, Get, Post, Patch, Delete, Body, Param, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SchoolTimeGridService } from './school-time-grid.service';
import { UpdateTimeGridDto } from './dto/update-time-grid.dto';
import { CheckPermissions } from '../auth/decorators/check-permissions.decorator';
```

**Decorator stack** (resource.controller.ts lines 25-29 + 30-42):
```typescript
@ApiTags('school-time-grid')
@ApiBearerAuth()
@Controller('schools/:schoolId/time-grid')
export class SchoolTimeGridController {
  constructor(private timeGridService: SchoolTimeGridService) {}

  @Put()
  @CheckPermissions({ action: 'update', subject: 'school' })   // RESEARCH §6.2 — TimeGrid reuses 'school' subject
  @ApiOperation({ summary: 'Update the time grid (D-11)' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 409, description: 'Active runs reference removed periods (D-13)' })
  async update(
    @Param('schoolId') schoolId: string,
    @Body() dto: UpdateTimeGridDto,
    @Query('force') force?: string,
  ) {
    return this.timeGridService.update(schoolId, dto, { force: force === 'true' });
  }
}
```

**Route convention** (per Phase 1 D-13): global `/api/v1` prefix is applied at app-level — controllers declare path WITHOUT the prefix (this is why `school.controller.ts:10` says `@Controller('schools')` not `'/api/v1/schools'`). Maintain that.

---

#### `apps/api/src/modules/school/school-time-grid.service.ts` (NEW)

**Analog:** `apps/api/src/modules/resource/resource.service.ts` (ConflictException + Prisma chain), augmented with the impact-check skeleton from RESEARCH §5.2

**Imports pattern** (resource.service.ts lines 1-9):
```typescript
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../config/database/prisma.service';
import { UpdateTimeGridDto } from './dto/update-time-grid.dto';
```

**Core pattern — guard-then-write** (resource.service.ts lines 18-40 for ConflictException shape; combined with RESEARCH §5.2 impact-check):
```typescript
@Injectable()
export class SchoolTimeGridService {
  constructor(private prisma: PrismaService) {}

  async update(schoolId: string, dto: UpdateTimeGridDto, opts: { force: boolean }) {
    // Load active runs and their lesson period numbers
    const activeRuns = await this.prisma.timetableRun.findMany({
      where: { schoolId, isActive: true },
      include: { lessons: { select: { periodNumber: true, dayOfWeek: true } } },
    });

    const removedPeriodNumbers = this.computeRemovedPeriods(/* old vs dto */);
    const impactedRuns = activeRuns.filter((run) =>
      run.lessons.some((l) => removedPeriodNumbers.includes(l.periodNumber)),
    );

    if (impactedRuns.length > 0 && !opts.force) {
      throw new ConflictException({
        message: `${impactedRuns.length} aktiver Stundenplan verwendet dieses Zeitraster.`,
        // ProblemDetailFilter (apps/api/src/common/filters/problem-detail.filter.ts:60-77)
        // wraps this into application/problem+json automatically
      });
    }

    // proceed with delete-and-recreate periods inside a transaction
    return this.prisma.$transaction(async (tx) => { /* ... */ });
  }
}
```

**Error-format pattern (NO custom code needed):** the global `ProblemDetailFilter` in `apps/api/src/common/filters/problem-detail.filter.ts:14-77` automatically maps `ConflictException` → `409` + `application/problem+json`. Throw the standard NestJS exception; the filter does the rest.

---

#### `apps/api/src/modules/school/school-year.controller.ts` (NEW)

**Analog:** `apps/api/src/modules/resource/resource.controller.ts` (closest CRUD-on-nested-resource example)

**Routes** (mirror resource.controller.ts lines 27, 31-49, 52-59, 61-72, 74-82, plus an `activate` action):
```typescript
@ApiTags('school-years')
@ApiBearerAuth()
@Controller('schools/:schoolId/school-years')
export class SchoolYearController {
  constructor(private schoolYearService: SchoolYearService) {}

  @Post()
  @CheckPermissions({ action: 'create', subject: 'school-year' })  // NEW subject per RESEARCH §6.2
  async create(@Param('schoolId') schoolId: string, @Body() dto: CreateSchoolYearDto) { ... }

  @Get()
  @CheckPermissions({ action: 'read', subject: 'school-year' })
  async findAll(@Param('schoolId') schoolId: string) { ... }

  @Patch(':yearId')
  @CheckPermissions({ action: 'update', subject: 'school-year' })
  async update(@Param('yearId') yearId: string, @Body() dto: UpdateSchoolYearDto) { ... }

  @Post(':yearId/activate')
  @HttpCode(HttpStatus.OK)
  @CheckPermissions({ action: 'activate', subject: 'school-year' })
  async activate(@Param('schoolId') schoolId: string, @Param('yearId') yearId: string) { ... }

  @Delete(':yearId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CheckPermissions({ action: 'delete', subject: 'school-year' })
  async remove(@Param('yearId') yearId: string) { ... }
}
```

**Permission catalogue addition** (RESEARCH §6.2): register subject `school-year` with actions `create | read | update | delete | activate` in the permissions seed/registry. Grep `subject: 'resource'` to find the registration site during planning.

---

#### `apps/api/src/modules/school/school-year.service.ts` (NEW)

**Analog:** `apps/api/src/modules/resource/resource.service.ts` (CRUD + ConflictException + ownership-style guard)

**Activate-with-atomic-swap** (transaction pattern for partial-unique-index invariant):
```typescript
async activate(schoolId: string, yearId: string) {
  return this.prisma.$transaction(async (tx) => {
    await tx.schoolYear.updateMany({
      where: { schoolId, isActive: true },
      data: { isActive: false },
    });
    return tx.schoolYear.update({ where: { id: yearId }, data: { isActive: true } });
  });
}
```

**Orphan-delete guard** (D-10 — modeled on `resource.service.ts:170-194` ownership check + `school.service.ts:104-107` not-found check):
```typescript
async remove(yearId: string) {
  const year = await this.prisma.schoolYear.findUnique({ where: { id: yearId } });
  if (!year) throw new NotFoundException('Schuljahr nicht gefunden.');
  if (year.isActive) {
    throw new ConflictException('Aktives Schuljahr kann nicht geloescht werden. Setzen Sie zuerst ein anderes Schuljahr aktiv.');
  }
  // Orphan-check — Holidays/AutonomousDays excluded per D-10. Exact reference set is "Claude's Discretion" per CONTEXT.md.
  // Suggested initial set: TimetableRun.schoolYearId references (if any), ClassbookEntry.schoolYearId, etc. Grep "schoolYearId" to enumerate.
  const refs = await this.countReferences(yearId);
  if (refs > 0) {
    throw new ConflictException(`Schuljahr kann nicht geloescht werden: ${refs} verbundene Eintraege.`);
  }
  await this.prisma.schoolYear.delete({ where: { id: yearId } });
}
```

---

#### `apps/api/src/modules/school/school.module.ts` (modify)

**Analog:** itself (current 11 lines)

**Diff:**
```typescript
import { Module } from '@nestjs/common';
import { SchoolController } from './school.controller';
import { SchoolService } from './school.service';
import { SchoolTimeGridController } from './school-time-grid.controller';
import { SchoolTimeGridService } from './school-time-grid.service';
import { SchoolYearController } from './school-year.controller';
import { SchoolYearService } from './school-year.service';

@Module({
  controllers: [SchoolController, SchoolTimeGridController, SchoolYearController],
  providers: [SchoolService, SchoolTimeGridService, SchoolYearService],
  exports: [SchoolService, SchoolTimeGridService, SchoolYearService],
})
export class SchoolModule {}
```

---

#### `apps/api/src/modules/school/dto/update-time-grid.dto.ts` and `dto/update-school-year.dto.ts` (NEW)

**Analog:** `apps/api/src/modules/school/dto/create-time-grid.dto.ts` + the `PartialType` pattern from `update-school.dto.ts:1-4`

**Pattern (mirror update-school.dto.ts):**
```typescript
import { PartialType } from '@nestjs/swagger';
import { CreateTimeGridDto } from './create-time-grid.dto';
export class UpdateTimeGridDto extends PartialType(CreateTimeGridDto) {}
```

For `UpdateSchoolDto` (existing, modify): explicitly add `abWeekEnabled` field with `@IsBoolean() @IsOptional()` decorators (the `PartialType` pattern derives from `CreateSchoolDto`, so add `abWeekEnabled` to `CreateSchoolDto` first or override here).

---

#### Backend tests — `*.spec.ts` (NEW + modified)

**Analog:** `apps/api/src/modules/school/school.service.spec.ts:1-76` (closest in-module precedent; uses Vitest globals via `vi.fn()`)

**Mock-Prisma boilerplate pattern** (school.service.spec.ts lines 22-46):
```typescript
const mockPrismaService = {
  schoolYear: {
    create: vi.fn().mockResolvedValue(mockYear),
    findMany: vi.fn().mockResolvedValue([mockYear]),
    findUnique: vi.fn().mockResolvedValue(mockYear),
    findFirst: vi.fn().mockResolvedValue(mockYear),
    update: vi.fn().mockResolvedValue(mockYear),
    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    delete: vi.fn().mockResolvedValue(mockYear),
  },
  $transaction: vi.fn(async (cb) => cb(mockPrismaService)),
};

beforeEach(async () => {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      SchoolYearService,
      { provide: PrismaService, useValue: mockPrismaService },
    ],
  }).compile();
  service = module.get<SchoolYearService>(SchoolYearService);
});

afterEach(() => { vi.clearAllMocks(); });
```

**Assertion shapes** (school.service.spec.ts lines 48-77): one `it()` per behavior, assert specific Prisma arg shapes via `mock.calls[0][0]`. NotFoundException via `await expect(...).rejects.toThrow(NotFoundException)`.

---

### Frontend Patterns

#### `apps/web/src/routes/_authenticated/admin/school.settings.tsx` (NEW)

**Analog (route shell):** `apps/web/src/routes/_authenticated/admin/timetable-edit.tsx:43-47` (createFileRoute + component declaration)

**Imports + route pattern** (timetable-edit.tsx lines 1-2, 17-18, 38-40, 43-47):
```tsx
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSchoolContext } from '@/stores/school-context-store';
import { SchoolDetailsTab } from '@/components/admin/school-settings/SchoolDetailsTab';
// ... three more tabs

export const Route = createFileRoute('/_authenticated/admin/school/settings')({
  validateSearch: z.object({
    tab: z.enum(['details', 'timegrid', 'years', 'options']).optional(),
  }),
  component: SchoolSettingsPage,
});
```

**Tab-shell composition** (combine `ABWeekTabs.tsx:21-35` Tabs primitive + RESEARCH §2.2 + UI-SPEC §1.4):
```tsx
function SchoolSettingsPage() {
  const schoolId = useSchoolContext((s) => s.schoolId);
  const { tab = 'details' } = Route.useSearch();
  const navigate = Route.useNavigate();
  const setTab = (value: string) =>
    navigate({ search: (prev) => ({ ...prev, tab: value as 'details' | 'timegrid' | 'years' | 'options' }) });

  return (
    <div className="space-y-6">
      {/* Breadcrumbs + H1 per UI-SPEC §1.2/§1.3 */}
      <Tabs value={tab} onValueChange={guardedTabChange(setTab)}>
        <TabsList>
          <TabsTrigger value="details">Stammdaten</TabsTrigger>
          <TabsTrigger value="timegrid" disabled={!schoolId}>Zeitraster</TabsTrigger>
          <TabsTrigger value="years" disabled={!schoolId}>Schuljahre</TabsTrigger>
          <TabsTrigger value="options" disabled={!schoolId}>Optionen</TabsTrigger>
        </TabsList>
        <TabsContent value="details"><SchoolDetailsTab /></TabsContent>
        <TabsContent value="timegrid">{schoolId && <TimeGridTab />}</TabsContent>
        <TabsContent value="years">{schoolId && <SchoolYearsTab />}</TabsContent>
        <TabsContent value="options">{schoolId && <OptionsTab />}</TabsContent>
      </Tabs>
    </div>
  );
}
```

**Page-level loading/error/empty states** — copy from `resources.tsx` lines 151-189 (Card + spinner + error + empty-state Card pattern). Reuse verbatim for each tab's data-load gate.

---

#### `apps/web/src/components/admin/school-settings/*Tab.tsx` (NEW — all four)

**Form scaffolding analog:** `apps/web/src/routes/_authenticated/admin/resources.tsx:55-127` (form-state + dialog management). Phase 10 replaces `useState` with `useForm` per CONTEXT.md D-15 / RESEARCH §3.1.

**Pattern shift (from resources.tsx useState to RHF — new convention):**
```tsx
// OLD pattern (resources.tsx:63):
const [form, setForm] = useState<ResourceFormState>(EMPTY_FORM);

// NEW pattern (Phase 10 establishes this for v1.1):
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SchoolDetailsSchema, type SchoolDetailsInput } from '@schoolflow/shared';

const form = useForm<SchoolDetailsInput>({
  resolver: zodResolver(SchoolDetailsSchema),
  defaultValues: school ?? DEFAULT_VALUES,
});
const { formState: { isDirty, isSubmitting }, register, handleSubmit, reset } = form;
```

**Save-mutation handler** (mirror `resources.tsx` lines 98-127 onSubmit pattern + `useResources.ts` mutation usage):
```tsx
const updateSchool = useUpdateSchool(schoolId);
const onSubmit = handleSubmit((values) => {
  updateSchool.mutate(values, {
    onSuccess: (server) => reset(server),  // CRITICAL — RESEARCH §8: clears isDirty
  });
});
```

**Field-and-Label pattern** (resources.tsx lines 217-233, must use shadcn `<Label>` per UI-SPEC §10.2 typography exception):
```tsx
<div className="space-y-2">
  <Label htmlFor="name">Schulname</Label>
  <Input id="name" {...register('name')} disabled={isSubmitting} />
  {form.formState.errors.name && (
    <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
  )}
</div>
```

**Save button + dirty-state CTA** (mirror resources.tsx:305-317 `DialogFooter` style):
```tsx
<div className="flex justify-end gap-2">
  <Button type="button" variant="secondary" onClick={() => reset()} disabled={!isDirty || isSubmitting}>
    Verwerfen
  </Button>
  <Button type="submit" disabled={!isDirty || isSubmitting}>
    {isSubmitting ? 'Wird gespeichert...' : 'Speichern'}
  </Button>
</div>
```

---

#### `apps/web/src/components/admin/school-settings/PeriodsEditor.tsx` (NEW)

**DnD analog:** `apps/web/src/routes/_authenticated/admin/timetable-edit.tsx:115-231` (DnD sensors, handleDragStart/Over/End/Cancel)

**Sensor + DndContext setup** (timetable-edit.tsx lines 115-120):
```tsx
const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 8 } });
const keyboardSensor = useSensor(KeyboardSensor);
const sensors = useSensors(pointerSensor, keyboardSensor);
```

**Sortable wrapping (NEW — uses `@dnd-kit/sortable`, already installed but no in-repo example yet):**
```tsx
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
  <SortableContext items={periods.map(p => p.id)} strategy={verticalListSortingStrategy}>
    {periods.map(p => <SortablePeriodRow key={p.id} period={p} />)}
  </SortableContext>
</DndContext>
```

**Responsive table-vs-cards** (UI-SPEC §4.3/§4.4; ResourceList.tsx:60-119 provides desktop `<table>` pattern):
```tsx
{/* Desktop dense table (md and up) */}
<div className="hidden md:block rounded-md border overflow-hidden">
  <table className="w-full text-sm">{/* ResourceList.tsx structure */}</table>
</div>

{/* Mobile cards */}
<div className="md:hidden space-y-3">
  {periods.map(p => (
    <Card key={p.id}>{/* drag handle + delete in header, fields below */}</Card>
  ))}
</div>
```

**Time inputs** (UI-SPEC §4.6 + RESEARCH §4.2 — no in-repo precedent):
```tsx
<Input type="time" {...register(`periods.${idx}.startTime`)} className="h-11 md:h-10" />
```
Computed duration via `date-fns` (already installed): `differenceInMinutes(parse(end,'HH:mm',new Date()), parse(start,'HH:mm',new Date()))`.

---

#### `apps/web/src/components/admin/school-settings/UnsavedChangesDialog.tsx` (NEW — reusable for Phases 11–16)

**Analog:** `apps/web/src/components/rooms/ResourceList.tsx:122-155` (Delete-Confirm Dialog with destructive copy)

**Dialog structure pattern** (ResourceList.tsx lines 122-155):
```tsx
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Props {
  open: boolean;
  onDiscard: () => void;
  onCancel: () => void;
  onSaveAndContinue: () => void;
  isSaving?: boolean;
}

export function UnsavedChangesDialog({ open, onDiscard, onCancel, onSaveAndContinue, isSaving }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ungespeicherte Aenderungen</DialogTitle>
          <DialogDescription>
            Sie haben Aenderungen, die noch nicht gespeichert wurden.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="secondary" onClick={onCancel} disabled={isSaving}>Abbrechen</Button>
          <Button variant="destructive" onClick={onDiscard} disabled={isSaving}>Verwerfen</Button>
          <Button onClick={onSaveAndContinue} disabled={isSaving}>
            {isSaving ? 'Wird gespeichert...' : 'Speichern & weiter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**TanStack Router blocker integration** (NEW — no in-repo precedent per RESEARCH §3.3):
```tsx
import { useBlocker } from '@tanstack/react-router';

const blocker = useBlocker({
  shouldBlockFn: () => isDirty && !isSubmitting,
  withResolver: true,
});
// Render <UnsavedChangesDialog> when blocker.status === 'blocked'
```

---

#### `apps/web/src/components/admin/school-settings/DestructiveEditDialog.tsx` (NEW)

**Analog:** same `ResourceList.tsx:122-155` Dialog pattern, but with 3 buttons (D-13 verbatim copy: "Nur speichern" / "Speichern + Solver neu starten" / "Abbrechen"). Triggered when the TimeGrid PUT returns 409 — see RESEARCH §5.3.

---

#### `apps/web/src/hooks/useSchool.ts`, `useTimeGrid.ts`, `useSchoolYears.ts` (NEW)

**Analog:** `apps/web/src/hooks/useResources.ts` (canonical CRUD-hook bundle pattern: query-keys factory + useQuery + useMutation×N)

**Imports pattern** (useResources.ts lines 1-4):
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import type { SchoolDto } from '@schoolflow/shared';
```

**Query-key factory** (useResources.ts lines 6-8 + useTimetable.ts lines 11-22 — use the latter's hierarchical style for school-yearS):
```typescript
export const schoolKeys = {
  one: (schoolId: string) => ['school', schoolId] as const,
};
export const timeGridKeys = {
  one: (schoolId: string) => ['time-grid', schoolId] as const,
};
export const schoolYearKeys = {
  all: (schoolId: string) => ['school-years', schoolId] as const,
  one: (schoolId: string, yearId: string) => ['school-years', schoolId, yearId] as const,
};
```

**Read hook** (useResources.ts lines 13-23):
```typescript
export function useSchool(schoolId: string | undefined) {
  return useQuery({
    queryKey: schoolKeys.one(schoolId ?? ''),
    queryFn: async (): Promise<SchoolDto> => {
      const res = await apiFetch(`/api/v1/schools/${schoolId}`);
      if (!res.ok) throw new Error('Failed to load school');
      return res.json();
    },
    enabled: !!schoolId,
  });
}
```

**Mutation hook** (useResources.ts lines 29-48 — CRITICAL: per RESEARCH §8, invalidate the SPECIFIC key, not blanket):
```typescript
export function useUpdateSchool(schoolId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: UpdateSchoolDto): Promise<SchoolDto> => {
      const res = await apiFetch(`/api/v1/schools/${schoolId}`, {
        method: 'PUT',
        body: JSON.stringify(dto),
      });
      if (!res.ok) throw new Error('Aktualisierung fehlgeschlagen');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: schoolKeys.one(schoolId) });  // SPECIFIC key
      toast.success('Stammdaten gespeichert');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
```

**409-handling for TimeGrid mutation** (RESEARCH §5.3; NEW pattern — no in-repo precedent):
```typescript
mutationFn: async (dto: UpdateTimeGridDto): Promise<TimeGridDto> => {
  const res = await apiFetch(`/api/v1/schools/${schoolId}/time-grid${force ? '?force=true' : ''}`, {
    method: 'PUT',
    body: JSON.stringify(dto),
  });
  if (res.status === 409) {
    const problem = await res.json();
    throw Object.assign(new Error(problem.detail), { status: 409, problem });
  }
  if (!res.ok) throw new Error('Aktualisierung fehlgeschlagen');
  return res.json();
},
```

---

#### `apps/web/src/components/layout/AppSidebar.tsx` (modify) and `MobileSidebar.tsx` (modify)

**Analog:** the file itself — `AppSidebar.tsx:33-106` `navItems` array

**Insertion pattern** (insert into the array between `Datenimport` and `Raeume`, per UI-SPEC §1 + RESEARCH §2.3):
```typescript
import { Building2 } from 'lucide-react';   // add to imports

// Insert at array position right after 'Datenimport':
{
  label: 'Schulverwaltung',
  href: '/admin/school/settings',
  icon: Building2,
  roles: ['admin', 'schulleitung'],
},
```

Mirror in `MobileSidebar.tsx:29-90` (same `navItems` shape).

---

#### `apps/web/src/stores/school-context-store.ts` (modify)

**Analog:** the file itself — `school-context-store.ts:9-60` (existing Zustand `create` + state slice + setter)

**Extension pattern** (preserve existing field shapes; add new fields to interface, defaults, and `setContext` payload):
```typescript
interface SchoolContextState {
  // ... existing fields ...
  activeSchoolYearId: string | null;
  abWeekEnabled: boolean;

  setContext: (data: { /* existing */ activeSchoolYearId?: string | null; abWeekEnabled?: boolean }) => void;
}
```

Existing setter pattern at line 47-59 already shows the `?? null` default convention — extend with `data.abWeekEnabled ?? false`.

**Also wire empty-flow timing** (RESEARCH §8 pitfall): the Stammdaten POST onSuccess handler must call `setContext({ schoolId: server.id, ... })` BEFORE Tabs 2-4 become interactive. Re-render is automatic via Zustand subscription.

---

### Shared / Schema Patterns

#### `packages/shared/src/schemas/school.schema.ts` (NEW), `time-grid.schema.ts` (NEW), `school-year.schema.ts` (NEW)

**No in-repo analog exists** — Phase 10 introduces the canonical Zod folder per CONTEXT.md D-15.

**Pattern (per RESEARCH §3.1):**
```typescript
import { z } from 'zod';

export const SchoolDetailsSchema = z.object({
  name: z.string().min(1, 'Name erforderlich'),
  schoolType: z.enum(['VS', 'MS', 'AHS_UNTER', 'AHS_OBER', 'BHS']),  // mirror Prisma enum (migration §3-5)
  address: z.string().optional(),
});
export type SchoolDetailsInput = z.infer<typeof SchoolDetailsSchema>;

export const PeriodSchema = z.object({
  periodNumber: z.number().int().positive(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'HH:MM erwartet'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'HH:MM erwartet'),
  isBreak: z.boolean(),
  label: z.string().optional(),
}).refine((p) => p.endTime > p.startTime, { message: 'Ende muss nach Start liegen', path: ['endTime'] });

export const TimeGridSchema = z.object({
  periods: z.array(PeriodSchema).min(1),
  schoolDays: z.array(z.enum(['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'])),
}).superRefine((tg, ctx) => {
  // Overlap/gap checks per CONTEXT.md D-15
  const sorted = [...tg.periods].sort((a, b) => a.periodNumber - b.periodNumber);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i - 1].endTime > sorted[i].startTime) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Perioden duerfen sich nicht ueberlappen', path: ['periods', i, 'startTime'] });
    }
  }
});
```

**Field-name convention:** English (Phase 1 D-15) — `schoolType`, `startTime`, `endTime`, `abWeekEnabled`. UI strings (error messages) in German.

---

#### `packages/shared/src/types/school.ts` (NEW)

**Analog:** `packages/shared/src/types/room.ts` (closest existing DTO-types module — same project)

**Re-export pattern (after creation):** add to `packages/shared/src/index.ts:1-13` matching the existing barrel style:
```typescript
export * from './types/school';
export * from './schemas/school.schema';
export * from './schemas/time-grid.schema';
export * from './schemas/school-year.schema';
```

---

#### `packages/shared/package.json` and `apps/web/package.json` (modify)

**Analog:** the files themselves

**Install commands** (per RESEARCH §3.1 — confirm pnpm filter syntax aligns with repo's monorepo layout):
```bash
pnpm --filter @schoolflow/shared add zod
pnpm --filter @schoolflow/web add zod react-hook-form @hookform/resolvers
```

Pin per CLAUDE.md "Version Pinning Strategy": `^` for minor flexibility on these libs; document exact versions installed in PLAN.

---

## Shared Patterns

### Authentication / Authorization

**Source:** `apps/api/src/modules/auth/decorators/check-permissions.decorator.ts:1-11`
**Apply to:** every new controller endpoint in this phase

```typescript
@CheckPermissions({ action: 'update', subject: 'school' })           // existing subject for School + TimeGrid + abWeekEnabled
@CheckPermissions({ action: 'create', subject: 'school-year' })      // NEW subject (RESEARCH §6.2)
@CheckPermissions({ action: 'activate', subject: 'school-year' })    // NEW action
```

CASL evaluates these via the global `PermissionsGuard`. Subject registration lives in `apps/api/src/modules/auth/casl/casl-ability.factory.ts:13-40` (Permission table → CASL builder); seed the new `school-year` permission rows during the migration commit.

---

### Error Handling (RFC 9457)

**Source:** `apps/api/src/common/filters/problem-detail.filter.ts:14-77`
**Apply to:** every service in this phase — throw standard NestJS exceptions

```typescript
throw new NotFoundException('Schuljahr nicht gefunden.');
throw new ConflictException('Aktives Schuljahr kann nicht geloescht werden.');
throw new BadRequestException('Ueberlappende Perioden sind nicht zulaessig.');
```

The filter at `problem-detail.filter.ts:60-77` automatically wraps these into `application/problem+json` with `type`, `title`, `status`, `detail`, `instance`, `traceId`. **Do not write custom error formatters.** German `detail` strings, English `title` (from the status map at lines 47-56).

---

### Validation (defense-in-depth)

**Sources:**
- Server: `apps/api/src/modules/school/dto/create-time-grid.dto.ts:5-34` (class-validator decorators — `@IsString @Matches(/^\d{2}:\d{2}$/) @IsBoolean @IsInt @Min`)
- Client + shared: NEW Zod schemas in `packages/shared/src/schemas/` (Phase 10 establishes)

**Apply to:** every endpoint that accepts a body. Server keeps existing class-validator on DTOs (no removal); client uses Zod via `zodResolver`. Both reference the same shape — Zod is the source of truth, class-validator is a guard rail.

Existing Time-format regex `/^\d{2}:\d{2}$/` from `create-time-grid.dto.ts:13,18` is the canonical pattern — mirror in Zod.

---

### TanStack Query Cache Discipline

**Source:** `apps/web/src/hooks/useResources.ts:6-8` (key factory) + `useTimetable.ts:11-22` (hierarchical keys)
**Apply to:** all 3 new hooks in `apps/web/src/hooks/useSchool.ts`, `useTimeGrid.ts`, `useSchoolYears.ts`

**Critical (RESEARCH §8 pitfall):** invalidate the SPECIFIC key after mutate, not blanket:
```typescript
qc.invalidateQueries({ queryKey: timeGridKeys.one(schoolId) });   // YES
qc.invalidateQueries();                                            // NO — blanket invalidates everything
```

Pro-Tab-Save (D-02) means each tab uses its own query key; per-tab mutations must invalidate only their own slice.

---

### TanStack Router File-Based Routing

**Source:** `apps/web/src/routes/_authenticated/admin/timetable-edit.tsx:43-47` + `resources.tsx:29-31`

**Apply to:** the new `school.settings.tsx` route file. Dot-notation in filename → nested URL: `school.settings.tsx` → `/admin/school/settings` (RESEARCH §2.1).

---

### Toast Feedback

**Source:** `apps/web/src/hooks/useResources.ts:40-46` and `useTimetableEdit.ts:31-38`
**Apply to:** every mutation hook (success + error). German strings:

```typescript
onSuccess: () => toast.success('Stammdaten gespeichert'),
onError: (e) => toast.error(`Speichern fehlgeschlagen: ${e.message}`),
```

The `sonner` package is already installed and wired via `apps/web/src/components/ui/sonner.tsx`.

---

### Mobile Touch Targets (MOBILE-ADM-02)

**Source:** `apps/web/src/components/timetable/ABWeekTabs.tsx:26-32` (`min-h-[44px]`) and `resources.tsx:145` (`min-h-[44px]`)
**Apply to:** all interactive elements rendered in `*Tab.tsx` mobile variants. UI-SPEC §10.5 codifies — desktop `h-10`, mobile `h-11`.

---

## No Analog Found

Files / sections with no close analog in the codebase. The planner should rely on RESEARCH.md and UI-SPEC.md for the implementation details below.

| File / Concern | Role | Data Flow | Reason |
|----------------|------|-----------|--------|
| `apps/api/prisma/migrations/<ts>_10_school_year_multi_active/migration.sql` (partial-unique-index DDL) | migration | DDL | No prior partial-index migration in repo. RESEARCH §1.2 supplies SQL verbatim. |
| TimetableRun creation site (e.g. `apps/api/src/modules/solver/solver.service.ts` or `timetable.service.ts`) — exact line(s) require a grep during planning | service | mutation | Phase 10 must inject `School.abWeekEnabled` as default into newly-created runs (RESEARCH §7.2 / Pitfalls). No precedent — this is a one-line addition wherever `prisma.timetableRun.create({ ... })` is called. |
| `apps/web/src/components/admin/school-settings/PeriodsEditor.tsx` (responsive editable table + sortable + time inputs) | component | event-driven (drag) + form | No "responsive editable table" exists; no `<input type="time">` usage. dnd-kit/sortable is installed but unused. UI-SPEC §4 + RESEARCH §4.1-4.3 are the spec. |
| `useBlocker` integration for unsaved-changes navigation guard | hook usage | event-driven | Zero usages in repo (RESEARCH §3.3). TanStack Router 1.168+ feature; introduce here as canonical pattern. |
| Zod schemas in `packages/shared/src/schemas/` (entire folder) | schema | validation | First Zod schemas in the project. RESEARCH §3.1 + CONTEXT.md D-15. |
| RHF + zodResolver wiring in tab forms | component (form) | request-response | RHF not yet installed. Phase 10 introduces it as the canonical form stack for v1.1 admin screens. |

## Metadata

**Analog search scope:**
- `apps/api/src/modules/{school,resource,auth,timetable,solver,substitution}/...`
- `apps/api/src/common/filters/`
- `apps/api/prisma/{schema.prisma, migrations/, seed.ts}`
- `apps/web/src/{routes/_authenticated/admin/, components/{ui,layout,rooms,timetable,settings,dnd}, hooks/, stores/, lib/}`
- `packages/shared/src/{index.ts, types/, constants/}`

**Files scanned (read in full or relevant sections):** ~28
- Backend: school.controller.ts, school.service.ts, school.module.ts, school.service.spec.ts, school/dto/{create-school-year, update-school, create-time-grid}.dto.ts, resource.{controller,service,module}.ts, resource/dto/resource.dto.ts, common/filters/problem-detail.filter.ts, auth/decorators/check-permissions.decorator.ts, auth/permissions/permissions.service.ts, auth/casl/casl-ability.factory.ts, prisma/migrations/20260329172431_phase2_school_data_model_dsgvo/migration.sql
- Frontend: routes/_authenticated/admin/{timetable-edit, resources}.tsx, components/{layout/AppSidebar, layout/MobileSidebar, rooms/ResourceList, timetable/ABWeekTabs}.tsx, hooks/{useResources, useTimetableEdit, useTimetable}.ts, stores/school-context-store.ts, lib/api.ts
- Shared: packages/shared/src/index.ts (full)

**Pattern extraction date:** 2026-04-19

**Project skills directory:** none found (`.claude/skills/` and `.agents/skills/` both absent)

**Project conventions applied (CLAUDE.md):**
- API prefix `/api/v1/` global (controllers omit it) — Phase 1 D-13
- German UI strings, English API field names — Phase 1 D-15
- RFC 9457 errors via global filter — Phase 1 D-12
- Pin strategy: NestJS `^11`, Prisma `^7`, React `^19`, TS `~6.0`
- GSD workflow enforced — file edits flow through `/gsd:execute-phase`

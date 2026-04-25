import { Injectable, UnprocessableEntityException, Logger } from '@nestjs/common';
import { PrismaService } from '../../config/database/prisma.service';
import {
  DEFAULT_CONSTRAINT_WEIGHTS,
  CONFIGURABLE_CONSTRAINT_NAMES,
} from './dto/constraint-weight.dto';

/**
 * Phase 14 D-05/D-06/D-07 — Service for school-scoped soft-constraint weight overrides.
 *
 * Storage: ConstraintWeightOverride Prisma model in tall format
 *   (one row per [schoolId, constraintName]).
 *
 * Used by:
 *   - ConstraintWeightOverrideController (admin CRUD)
 *   - TimetableService.startSolve (resolution chain — D-06)
 */
@Injectable()
export class ConstraintWeightOverrideService {
  private readonly logger = new Logger(ConstraintWeightOverrideService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Returns the merged weight map for a school: DB overrides on top of
   * DEFAULT_CONSTRAINT_WEIGHTS (9 entries).
   *
   * Used by GET /constraint-weights so the frontend can render 9 sliders
   * with default values + persisted overrides in one shot.
   */
  async findBySchool(schoolId: string): Promise<Record<string, number>> {
    const rows = await this.prisma.constraintWeightOverride.findMany({
      where: { schoolId },
    });
    const overrides: Record<string, number> = {};
    for (const row of rows) {
      overrides[row.constraintName] = row.weight;
    }
    return { ...DEFAULT_CONSTRAINT_WEIGHTS, ...overrides };
  }

  /**
   * Returns ONLY the persisted overrides (without defaults) — used by
   * TimetableService.startSolve resolution chain (D-06 step 0).
   *
   * Returning bare overrides allows mergeWithSchoolDefaults to layer
   * defaults < school < per-run consistently.
   */
  async findOverridesOnly(schoolId: string): Promise<Record<string, number>> {
    const rows = await this.prisma.constraintWeightOverride.findMany({
      where: { schoolId },
    });
    const overrides: Record<string, number> = {};
    for (const row of rows) {
      overrides[row.constraintName] = row.weight;
    }
    return overrides;
  }

  /**
   * Returns MAX(updatedAt) across this school's overrides, or null if none exist.
   *
   * Surfaces in GET /constraint-weights response so the frontend DriftBanner
   * (Plan 14-02) can detect "weights changed after last solve" without an
   * extra round-trip.
   */
  async findLastUpdatedAt(schoolId: string): Promise<Date | null> {
    const result = await this.prisma.constraintWeightOverride.aggregate({
      where: { schoolId },
      _max: { updatedAt: true },
    });
    return result._max.updatedAt ?? null;
  }

  /**
   * Atomic replace-all (D-07).
   *
   * Validates whitelist + bounds BEFORE touching the DB so a single bad
   * entry can never partially mutate the school's set.
   *
   * Throws RFC 9457 422 with a detail object the ProblemDetailFilter
   * forwards as `application/problem+json`.
   */
  async bulkReplace(
    schoolId: string,
    weights: Record<string, number>,
    userId?: string,
  ): Promise<Record<string, number>> {
    // 1) Whitelist check — every key must be a known soft-constraint name.
    for (const name of Object.keys(weights)) {
      if (!CONFIGURABLE_CONSTRAINT_NAMES.includes(name)) {
        throw new UnprocessableEntityException({
          type: 'schoolflow://errors/unknown-constraint-name',
          title: 'Unbekannte Constraint-Bezeichnung',
          status: 422,
          detail: `Constraint '${name}' ist nicht editierbar. Erlaubte Werte: ${CONFIGURABLE_CONSTRAINT_NAMES.join(
            ', ',
          )}`,
          constraintName: name,
        });
      }
    }

    // 2) Bounds check — weights must be integer 0..100.
    for (const [name, weight] of Object.entries(weights)) {
      if (!Number.isInteger(weight) || weight < 0 || weight > 100) {
        throw new UnprocessableEntityException({
          type: 'schoolflow://errors/weight-out-of-range',
          title: 'Ungültige Gewichtung',
          status: 422,
          detail: `Gewichtung für '${name}' (${weight}) liegt nicht im erlaubten Bereich 0..100.`,
          constraintName: name,
          weight,
        });
      }
    }

    // 3) Atomic transaction: delete-all + create-many.
    //    createMany with empty data[] is a no-op so an empty `weights` body
    //    correctly resets the school back to defaults.
    const inserts = Object.entries(weights).map(([constraintName, weight]) => ({
      schoolId,
      constraintName,
      weight,
      updatedBy: userId ?? null,
    }));

    if (inserts.length === 0) {
      await this.prisma.constraintWeightOverride.deleteMany({ where: { schoolId } });
    } else {
      await this.prisma.$transaction([
        this.prisma.constraintWeightOverride.deleteMany({ where: { schoolId } }),
        this.prisma.constraintWeightOverride.createMany({ data: inserts }),
      ]);
    }

    this.logger.log(
      `Bulk-replaced ${inserts.length} weight override(s) for school ${schoolId}`,
    );

    return this.findBySchool(schoolId);
  }

  /**
   * Reset a single override row (D-07 reset-icon).
   * Idempotent — does not error if row is absent.
   */
  async resetOne(schoolId: string, constraintName: string): Promise<void> {
    await this.prisma.constraintWeightOverride.deleteMany({
      where: { schoolId, constraintName },
    });
  }
}

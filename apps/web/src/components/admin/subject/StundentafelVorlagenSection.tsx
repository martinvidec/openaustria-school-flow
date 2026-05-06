import { useMemo } from 'react';
import {
  AUSTRIAN_STUNDENTAFELN,
  getSchoolTypeLabel,
} from '@schoolflow/shared';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';

/**
 * StundentafelVorlagenSection — Phase 11 Plan 11-02 SUBJECT-03 (D-10).
 * Read-only Tabs per Schultyp. Source: AUSTRIAN_STUNDENTAFELN moved to
 * @schoolflow/shared in Plan 11-02 Wave 0.
 *
 * Per-Schultyp panel: groups templates 1..4 into a merged table — one
 * row per unique {name, shortName, lehrverpflichtungsgruppe}, columns
 * Jg.1..Jg.4 show the weeklyHours sum for that subject in that year
 * (0 → muted-foreground).
 */

interface MergedRow {
  name: string;
  shortName: string;
  lehrverpflichtungsgruppe: string;
  hours: [number, number, number, number]; // index 0 = Jg.1
}

function buildSchoolTypeRows(schoolType: string): {
  rows: MergedRow[];
  totals: [number, number, number, number];
} {
  const templates = AUSTRIAN_STUNDENTAFELN.filter((t) => t.schoolType === schoolType);
  const rowMap = new Map<string, MergedRow>();
  for (const t of templates) {
    const yearIdx = t.yearLevel - 1;
    if (yearIdx < 0 || yearIdx > 3) continue;
    for (const s of t.subjects) {
      const key = `${s.shortName}|${s.lehrverpflichtungsgruppe}|${s.name}`;
      let row = rowMap.get(key);
      if (!row) {
        row = {
          name: s.name,
          shortName: s.shortName,
          lehrverpflichtungsgruppe: s.lehrverpflichtungsgruppe,
          hours: [0, 0, 0, 0],
        };
        rowMap.set(key, row);
      }
      row.hours[yearIdx] += s.weeklyHours;
    }
  }
  const rows = Array.from(rowMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name, 'de'),
  );
  const totals: [number, number, number, number] = [0, 0, 0, 0];
  for (const r of rows) {
    for (let i = 0; i < 4; i++) totals[i] += r.hours[i];
  }
  return { rows, totals };
}

export function StundentafelVorlagenSection() {
  const schoolTypes = useMemo(() => {
    const set = new Set<string>();
    for (const t of AUSTRIAN_STUNDENTAFELN) set.add(t.schoolType);
    return Array.from(set).sort();
  }, []);

  if (schoolTypes.length === 0) return null;

  return (
    <section data-testid="stundentafel-vorlagen">
      <h2 className="text-lg font-semibold">Stundentafel-Vorlagen</h2>
      <p className="text-sm text-muted-foreground mt-1 mb-4">
        Offizielle Austrian-Stundentafeln pro Schultyp. Informativ — die
        Anwendung auf eine Klasse erfolgt in der Klassenverwaltung.
      </p>

      <Tabs defaultValue={schoolTypes[0]} className="w-full">
        <TabsList className="flex-wrap h-auto">
          {schoolTypes.map((st) => (
            <TabsTrigger key={st} value={st} className="min-h-11">
              {getSchoolTypeLabel(st)}
            </TabsTrigger>
          ))}
        </TabsList>
        {schoolTypes.map((st) => {
          const { rows, totals } = buildSchoolTypeRows(st);
          return (
            <TabsContent key={st} value={st} className="mt-4">
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 font-medium">Fach</th>
                      <th className="text-center py-2 px-3 w-16 font-medium">Kürzel</th>
                      <th className="text-center py-2 px-3 w-16 font-medium">Jg. 1</th>
                      <th className="text-center py-2 px-3 w-16 font-medium">Jg. 2</th>
                      <th className="text-center py-2 px-3 w-16 font-medium">Jg. 3</th>
                      <th className="text-center py-2 px-3 w-16 font-medium">Jg. 4</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={`${r.shortName}-${r.lehrverpflichtungsgruppe}`}>
                        <td className="py-1.5 px-3">{r.name}</td>
                        <td className="py-1.5 px-3 text-center">
                          <span className="bg-muted rounded px-1.5 py-1 text-xs font-mono">
                            {r.shortName}
                          </span>
                        </td>
                        {r.hours.map((h, idx) => (
                          <td
                            key={idx}
                            className={`py-1.5 px-3 text-center tabular-nums ${
                              h === 0 ? 'text-muted-foreground' : 'text-foreground'
                            }`}
                          >
                            {h || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="text-xs text-muted-foreground border-t pt-2 mt-2">
                  Wochenstunden gesamt pro Jahrgang: {totals[0]} · {totals[1]} · {totals[2]} · {totals[3]}
                </div>
                <div className="text-xs text-muted-foreground mt-3">
                  <span
                    className="text-muted-foreground/60 cursor-not-allowed"
                    title="Verfügbar ab Phase 12"
                  >
                    Zur Klassenverwaltung →
                  </span>
                </div>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-2">
                {rows.map((r) => (
                  <Card key={`${r.shortName}-${r.lehrverpflichtungsgruppe}`}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <span className="bg-muted rounded px-1.5 py-1 text-xs font-mono shrink-0">
                        {r.shortName}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{r.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Jg. 1–4: {r.hours.map((h) => h || '—').join(' · ')}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <div className="text-xs text-muted-foreground border-t pt-2 mt-2">
                  Wochenstunden gesamt pro Jahrgang: {totals[0]} · {totals[1]} · {totals[2]} · {totals[3]}
                </div>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </section>
  );
}

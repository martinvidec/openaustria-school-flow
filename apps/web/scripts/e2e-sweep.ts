/**
 * `pnpm e2e:sweep` — standalone sweep of E2E leftover rows in the dev DB.
 *
 * Same logic that runs in `globalSetup` before every Playwright session,
 * exposed for ad-hoc use (e.g. cleaning up after a hard-killed UAT session
 * before showing the app to a stakeholder). See #79.
 */
import { sweepE2ELeftovers, totalSwept } from '../e2e/helpers/sweep-leftovers';

async function main(): Promise<void> {
  const counts = await sweepE2ELeftovers();
  const total = totalSwept(counts);
  if (total === 0) {
    console.log('e2e-sweep: no leftover rows (DB already clean).');
    return;
  }
  console.log(`e2e-sweep: removed ${total} leftover row(s):`);
  for (const [table, count] of Object.entries(counts)) {
    if (count > 0) console.log(`  ${table.padEnd(28)} ${count}`);
  }
}

main().catch((err) => {
  console.error('e2e-sweep failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});

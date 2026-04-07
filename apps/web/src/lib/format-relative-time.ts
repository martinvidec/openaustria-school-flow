/**
 * Formats a date string as a German relative timestamp for conversation previews.
 *
 * Per UI-SPEC copywriting:
 *   - <1 min:   "Gerade eben"
 *   - <60 min:  "vor {N} Min."
 *   - <24 h:    "vor {N} Std."
 *   - Yesterday: "Gestern"
 *   - <7 days:  "vor {N} Tagen"
 *   - Older:    "DD.MM.YYYY"
 *
 * Uses simple Date arithmetic -- no external dependency.
 */
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  // Future dates or invalid dates: show formatted date
  if (diffMs < 0 || isNaN(diffMs)) {
    return formatDate(date);
  }

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHrs = Math.floor(diffMin / 60);

  if (diffMin < 1) {
    return 'Gerade eben';
  }

  if (diffMin < 60) {
    return `vor ${diffMin} Min.`;
  }

  if (diffHrs < 24) {
    return `vor ${diffHrs} Std.`;
  }

  // Check if yesterday (calendar day, not 24h window)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86_400_000);
  const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (dateDay.getTime() === yesterday.getTime()) {
    return 'Gestern';
  }

  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffDays < 7) {
    return `vor ${diffDays} Tagen`;
  }

  return formatDate(date);
}

function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

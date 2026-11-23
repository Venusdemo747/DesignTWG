/**
 * Timezone-aware and DST-safe business day arithmetic for designTWG (America/Toronto).
 * Excludes weekends (Saturday, Sunday) and statutory Ontario, Canada holidays.
 */

export const DEFAULT_TIMEZONE = "America/Toronto";

// Ontario Statutory Holidays (standard observed dates)
export function isOntarioStatutoryHoliday(date: Date): boolean {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth(); // 0-indexed (0 = Jan, 11 = Dec)
  const day = date.getUTCDate();
  const dayOfWeek = date.getUTCDay(); // 0 = Sun, 6 = Sat

  // New Year's Day (Jan 1)
  if (month === 0 && day === 1) return true;

  // Family Day (3rd Monday in February)
  if (month === 1 && dayOfWeek === 1 && day >= 15 && day <= 21) return true;

  // Canada Day (July 1)
  if (month === 6 && day === 1) return true;

  // Civic Holiday (1st Monday in August)
  if (month === 7 && dayOfWeek === 1 && day <= 7) return true;

  // Labour Day (1st Monday in September)
  if (month === 8 && dayOfWeek === 1 && day <= 7) return true;

  // Thanksgiving Day (2nd Monday in October)
  if (month === 9 && dayOfWeek === 1 && day >= 8 && day <= 14) return true;

  // Christmas Day (Dec 25)
  if (month === 11 && day === 25) return true;

  // Boxing Day (Dec 26)
  if (month === 11 && day === 26) return true;

  return false;
}

/**
 * Checks whether a given timestamp falls on a weekend in America/Toronto time.
 */
export function isWeekend(date: Date, timezone = DEFAULT_TIMEZONE): boolean {
  // Format day of week in target timezone (Sun = 0, Mon = 1, ..., Sat = 6)
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
  });
  const dayStr = formatter.format(date);
  return dayStr === "Sat" || dayStr === "Sun";
}

/**
 * Determines whether a date is a valid Canadian/Toronto business day.
 */
export function isBusinessDay(date: Date, timezone = DEFAULT_TIMEZONE): boolean {
  if (isWeekend(date, timezone)) return false;
  if (isOntarioStatutoryHoliday(date)) return false;
  return true;
}

/**
 * Computes business days elapsed between two dates in America/Toronto timezone.
 * DST-Safe: evaluates calendar days in Toronto local time rather than fixed 86400s intervals.
 */
export function getBusinessDaysDiff(
  startDateInput: Date | string,
  endDateInput: Date | string,
  timezone = DEFAULT_TIMEZONE
): number {
  const start = new Date(startDateInput);
  const end = new Date(endDateInput);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return 0;
  }

  if (start > end) {
    return -getBusinessDaysDiff(end, start, timezone);
  }

  let businessDays = 0;
  // Step through day by day
  const current = new Date(start);
  // Normalize to 12:00:00 UTC to avoid DST edge-hour boundary clipping
  current.setUTCHours(12, 0, 0, 0);

  const target = new Date(end);
  target.setUTCHours(12, 0, 0, 0);

  while (current < target) {
    current.setUTCDate(current.getUTCDate() + 1);
    if (isBusinessDay(current, timezone)) {
      businessDays += 1;
    }
  }

  return businessDays;
}

/**
 * Adds N business days to a starting date in America/Toronto.
 */
export function addBusinessDays(
  startDateInput: Date | string,
  businessDaysToAdd: number,
  timezone = DEFAULT_TIMEZONE
): Date {
  const current = new Date(startDateInput);
  current.setUTCHours(12, 0, 0, 0);

  let added = 0;
  while (added < businessDaysToAdd) {
    current.setUTCDate(current.getUTCDate() + 1);
    if (isBusinessDay(current, timezone)) {
      added += 1;
    }
  }

  return current;
}

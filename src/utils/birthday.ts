const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseMmdd(mmdd: string | undefined | null): { month: number; day: number } | null {
  if (!mmdd || typeof mmdd !== 'string') return null;
  const m = mmdd.match(/^(\d{2})-(\d{2})$/);
  if (!m) return null;
  const month = parseInt(m[1], 10);
  const day = parseInt(m[2], 10);
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  return { month, day };
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Days from `today` until the next occurrence of birthday `mmdd` (rolls
 * forward to next year if this year's date has passed). Leap-day birthdays
 * (02-29) on non-leap years count as Mar 1. Returns `null` for malformed input.
 */
export function daysUntilBirthday(
  mmdd: string | undefined | null,
  today: Date,
): number | null {
  const parsed = parseMmdd(mmdd);
  if (!parsed) return null;
  let { month, day } = parsed;

  // Normalize today to UTC midnight so day math doesn't drift across timezones
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  let year = today.getUTCFullYear();

  // Leap-day on non-leap year → Mar 1
  if (month === 2 && day === 29 && !isLeapYear(year)) {
    month = 3;
    day = 1;
  }

  let target = Date.UTC(year, month - 1, day);
  if (target < todayUtc) {
    year += 1;
    if (month === 2 && day === 29 && !isLeapYear(year)) {
      target = Date.UTC(year, 2, 1);
    } else {
      target = Date.UTC(year, month - 1, day);
    }
  }
  return Math.round((target - todayUtc) / 86_400_000);
}

export function formatBirthday(mmdd: string | undefined | null): string | null {
  const parsed = parseMmdd(mmdd);
  if (!parsed) return null;
  return `${SHORT_MONTHS[parsed.month - 1]} ${parsed.day}`;
}

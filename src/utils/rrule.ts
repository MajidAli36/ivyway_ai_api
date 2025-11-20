import { RRule } from 'rrule';

export function parseRRule(rruleString: string): RRule | null {
  try {
    return RRule.fromString(rruleString);
  } catch {
    return null;
  }
}

export function nextOccurrence(rruleString: string, fromDate: Date): Date | null {
  const rrule = parseRRule(rruleString);
  if (!rrule) return null;
  
  const occurrences = rrule.after(fromDate, true);
  return occurrences ? occurrences : null;
}

export function isDue(date: Date, rruleString?: string | null): boolean {
  if (!rruleString) {
    return date <= new Date();
  }
  
  const rrule = parseRRule(rruleString);
  if (!rrule) return date <= new Date();
  
  const now = new Date();
  return rrule.after(now, true) === null && date <= now;
}


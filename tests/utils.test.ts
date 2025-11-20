import { describe, it, expect } from 'vitest';
import { calculateSM2 } from '../src/utils/sm2';
import { nextOccurrence, parseRRule } from '../src/utils/rrule';

describe('SM-2 Algorithm', () => {
  it('should calculate correct interval for quality 0', () => {
    const result = calculateSM2(0, 2.5, 1);
    expect(result.interval).toBe(1);
    expect(result.ease).toBeLessThanOrEqual(2.35); // Decreased from 2.5
  });

  it('should calculate correct interval for quality 3', () => {
    const result = calculateSM2(3, 2.5, 1);
    expect(result.interval).toBe(1);
    // Quality 3 (good) increases ease, typically to around 2.36
    expect(result.ease).toBeGreaterThan(2.35);
  });

  it('should calculate correct interval for quality 5', () => {
    const result = calculateSM2(5, 2.5, 2);
    expect(result.interval).toBe(6);
    expect(result.ease).toBeGreaterThan(2.5);
  });

  it('should maintain minimum ease of 1.3', () => {
    const result = calculateSM2(0, 1.3, 1);
    expect(result.ease).toBe(1.3);
  });

  it('should set due date in the future', () => {
    const result = calculateSM2(3, 2.5, 1);
    expect(result.due.getTime()).toBeGreaterThan(new Date().getTime());
  });
});

describe('RRULE Parser', () => {
  it('should parse valid RRULE string', () => {
    const rrule = parseRRule('FREQ=WEEKLY;BYDAY=MO,WE,FR');
    expect(rrule).not.toBeNull();
  });

  it('should return null for invalid RRULE', () => {
    const rrule = parseRRule('INVALID_RRULE');
    expect(rrule).toBeNull();
  });

  it('should calculate next occurrence', () => {
    const nextDate = nextOccurrence('FREQ=DAILY', new Date());
    expect(nextDate).not.toBeNull();
    expect(nextDate!.getTime()).toBeGreaterThan(Date.now());
  });

  it('should return null for invalid RRULE on nextOccurrence', () => {
    const nextDate = nextOccurrence('INVALID', new Date());
    expect(nextDate).toBeNull();
  });
});


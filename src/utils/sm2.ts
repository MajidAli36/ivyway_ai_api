// SM-2 Algorithm for Spaced Repetition
export interface SM2Result {
  ease: number;
  interval: number;
  due: Date;
}

export function calculateSM2(
  quality: number, // 0-5 (0: again, 3: good, 5: easy)
  ease: number = 2.5,
  interval: number = 1
): SM2Result {
  if (quality < 3) {
    // Again or hard
    ease = Math.max(1.3, ease - 0.15);
    interval = 1;
  } else {
    // Good or easy
    ease = ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    
    if (interval === 1) {
      interval = 1;
    } else if (interval === 2) {
      interval = 6;
    } else {
      interval = Math.round(interval * ease);
    }
  }

  ease = Math.max(1.3, ease);

  const now = new Date();
  const due = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);

  return {
    ease: Math.round(ease * 100) / 100,
    interval,
    due,
  };
}


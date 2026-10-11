export const DEMO_SCORE_STORAGE_KEY = "nutrigo-demo-score";

export type DemoScore = {
  applesCollected: number;
  collectiblePoints: number;
};

export const emptyDemoScore: DemoScore = {
  applesCollected: 0,
  collectiblePoints: 0,
};

export function readDemoScore(): DemoScore {
  try {
    const stored = localStorage.getItem(DEMO_SCORE_STORAGE_KEY);
    if (!stored) {
      return emptyDemoScore;
    }

    const parsed = JSON.parse(stored) as Partial<DemoScore>;
    return {
      applesCollected:
        typeof parsed.applesCollected === "number" &&
        Number.isFinite(parsed.applesCollected)
          ? parsed.applesCollected
          : 0,
      collectiblePoints:
        typeof parsed.collectiblePoints === "number" &&
        Number.isFinite(parsed.collectiblePoints)
          ? parsed.collectiblePoints
          : 0,
    };
  } catch {
    return emptyDemoScore;
  }
}

export function saveDemoScore(score: DemoScore) {
  localStorage.setItem(DEMO_SCORE_STORAGE_KEY, JSON.stringify(score));
  window.dispatchEvent(new Event("nutrigo-demo-score-updated"));
}

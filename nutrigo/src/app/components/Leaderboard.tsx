"use client";

import { useEffect, useMemo, useState } from "react";
import { readDemoScore } from "@/lib/demo-score";

type LeaderboardEntry = {
  id: string;
  displayName: string;
  steps: number;
  collectiblePoints: number;
  score: number;
  rank: number;
};

type LeaderboardResponse = {
  leaderboard: LeaderboardEntry[];
};

function calculateScore(steps: number, collectiblePoints: number) {
  return collectiblePoints === 0
    ? steps
    : (steps * collectiblePoints) / 10000;
}

interface LeaderboardProps {
  currentSteps: number;
}

export default function Leaderboard({ currentSteps }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [collectiblePoints, setCollectiblePoints] = useState(0);

  useEffect(() => {
    const updateDemoScore = () => {
      setCollectiblePoints(readDemoScore().collectiblePoints);
    };

    updateDemoScore();
    window.addEventListener("storage", updateDemoScore);
    window.addEventListener("nutrigo-demo-score-updated", updateDemoScore);

    fetch("/api/leaderboard")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Unable to load leaderboard");
        }

        return response.json() as Promise<LeaderboardResponse>;
      })
      .then((data) => setEntries(data.leaderboard))
      .catch((error) => console.error("Leaderboard loading failed:", error))
      .finally(() => setLoading(false));

    return () => {
      window.removeEventListener("storage", updateDemoScore);
      window.removeEventListener("nutrigo-demo-score-updated", updateDemoScore);
    };
  }, []);

  const leaderboard = useMemo(() => {
    const demoPlayer: LeaderboardEntry = {
      id: "you",
      displayName: "You",
      steps: currentSteps,
      collectiblePoints,
      score: calculateScore(currentSteps, collectiblePoints),
      rank: 0,
    };

    return [...entries, demoPlayer]
      .sort((left, right) => right.score - left.score)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  }, [collectiblePoints, currentSteps, entries]);

  return (
    <section className="w-full max-w-md rounded-xl border border-gray-700 bg-gray-800 p-5 text-white">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">
            Score: steps when no collectibles; otherwise (steps × collectible
            points) ÷ 10,000
          </p>
        </div>
        
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading rankings...</p>
      ) : (
        <div className="space-y-2">
          {leaderboard.map((entry) => (
            <div
              key={entry.id}
              className={`flex items-center justify-between rounded-lg p-3 ${
                entry.id === "you" ? "bg-purple-900/60" : "bg-gray-700/70"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 text-center font-bold text-purple-300">
                  #{entry.rank}
                </span>
                <div>
                  <p className="font-medium">{entry.displayName}</p>
                  <p className="text-xs text-gray-400">
                    {entry.steps.toLocaleString()} steps ·{" "}
                    {entry.collectiblePoints.toLocaleString()} collectible pts
                  </p>
                </div>
              </div>
              <span className="font-bold text-yellow-300">
                {entry.score.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

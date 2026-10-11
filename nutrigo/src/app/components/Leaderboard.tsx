"use client";

import { useEffect, useMemo, useState } from "react";

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
    : (steps * collectiblePoints) / 100;
}

interface LeaderboardProps {
  currentSteps: number;
}

export default function Leaderboard({ currentSteps }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, []);

  const leaderboard = useMemo(() => {
    const demoPlayer: LeaderboardEntry = {
      id: "you",
      displayName: "You",
      steps: currentSteps,
      collectiblePoints: 0,
      score: calculateScore(currentSteps, 0),
      rank: 0,
    };

    return [...entries, demoPlayer]
      .sort((left, right) => right.score - left.score)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  }, [currentSteps, entries]);

  return (
    <section className="w-full max-w-md rounded-xl border border-gray-700 bg-gray-800 p-5 text-white">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-purple-300">Leaderboard</h2>
          <p className="text-xs text-gray-400">
            Score: steps when no collectibles; otherwise (steps × collectible
            points) ÷ 100
          </p>
        </div>
        <span className="rounded-full bg-purple-500/20 px-3 py-1 text-xs text-purple-200">
          Demo
        </span>
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

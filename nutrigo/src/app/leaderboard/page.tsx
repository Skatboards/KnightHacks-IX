"use client";

import { useState } from "react";
import Leaderboard from "../components/Leaderboard";

export default function LeaderboardPage() {
  const [currentSteps, setCurrentSteps] = useState(3200);

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 bg-gray-900 p-6 text-white">
      <div className="flex w-full max-w-md items-center justify-between">
        <h1 className="text-3xl font-bold text-purple-400">Leaderboard</h1>
        <a
          href="/"
          className="rounded-lg bg-gray-700 px-3 py-2 text-sm font-medium hover:bg-gray-600"
        >
          Back to Map
        </a>
      </div>

      <div className="w-full max-w-md rounded-xl border border-gray-700 bg-gray-800 p-5">
        <label
          htmlFor="leaderboard-steps"
          className="mb-2 block text-sm font-medium text-gray-300"
        >
          Your current steps
        </label>
        <input
          id="leaderboard-steps"
          type="number"
          min="0"
          value={currentSteps}
          onChange={(event) => setCurrentSteps(Number(event.target.value))}
          className="w-full rounded-lg border border-gray-600 bg-gray-700 p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      <Leaderboard currentSteps={currentSteps} />
    </main>
  );
}

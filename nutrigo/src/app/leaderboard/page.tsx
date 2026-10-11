"use client";

import { useState } from "react";
import Leaderboard from "../components/Leaderboard";

export default function LeaderboardPage() {
  const [currentSteps] = useState(3200);

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 bg-gray-900 p-6 text-white">
      <div className="flex w-full max-w-md items-center justify-center">
        <h1 className="text-3xl font-bold text-purple-400">Leaderboard</h1>
      </div>

      <div className="flex w-full max-w-md items-center justify-between rounded-xl border border-gray-700 bg-gray-800 p-5">
        <div>
          <span className="block text-sm font-medium text-gray-400">
            Your current steps
          </span>
          <span className="text-2xl font-bold text-purple-300">
            {currentSteps.toLocaleString()}
          </span>
        </div>
        <div className="rounded-lg bg-purple-950/60 border border-purple-800/50 px-3 py-1.5 text-xs font-semibold text-purple-300">
          Active Today
        </div>
      </div>

      <Leaderboard currentSteps={currentSteps} />

      <div className="w-full max-w-md flex justify-center mt-2 mb-6">
        <a
          href="/Map"
          className="rounded-lg bg-gray-700 px-6 py-3 text-sm font-medium hover:bg-gray-600 transition-colors shadow-lg"
        >
          Back to Map
        </a>
      </div>
    </main>
  );
}
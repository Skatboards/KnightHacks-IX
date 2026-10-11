// src/app/page.tsx
"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  emptyDemoScore,
  readDemoScore,
  saveDemoScore,
} from "@/lib/demo-score";

const MapView = dynamic(
  () => import("./components/MapView").then((mod) => mod.default),
  { ssr: false }
);

const Camera = dynamic(
() => import("./components/camera").then((mod) => mod.default),
{ ssr: false }
);

export default function Home() {
  const [stepGoal, setStepGoal] = useState<number>(5000);
  const [currentSteps, setCurrentSteps] = useState<number>(3200);
  const [demoScore, setDemoScore] = useState(emptyDemoScore);

  useEffect(() => {
    setDemoScore(readDemoScore());
  }, []);

  function handleAppleCollected(points: number) {
    setDemoScore((currentScore) => {
      const nextScore = {
        applesCollected: currentScore.applesCollected + 1,
        collectiblePoints: currentScore.collectiblePoints + points,
      };
      saveDemoScore(nextScore);
      return nextScore;
    });
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gray-900 text-white space-y-6">
      <div className="flex w-full max-w-md items-center justify-between">
        <h1 className="text-3xl font-bold text-purple-400">NutriGo Pathfinder</h1>
        <a
          href="/leaderboard"
          className="rounded-lg bg-purple-600 px-3 py-2 text-sm font-medium hover:bg-purple-500"
        >
          Leaderboard
        </a>
      </div>

      <div className="w-full max-w-md bg-gray-800 p-6 rounded-xl border border-gray-700 space-y-4">
        
        {/* Step Goal Input */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Target Step Goal:
          </label>
          <input
            type="number"
            value={stepGoal}
            onChange={(e) => setStepGoal(Number(e.target.value))}
            className="w-full p-2.5 rounded-lg bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Current Steps Input */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Current Steps Taken:
          </label>
          <input
            type="number"
            value={currentSteps}
            onChange={(e) => setCurrentSteps(Number(e.target.value))}
            className="w-full p-2.5 rounded-lg bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-red-400/30 bg-red-950/40 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-red-200">
              Apples collected
            </p>
            <p className="mt-1 text-2xl font-bold text-white">
              {demoScore.applesCollected}
            </p>
          </div>
          <div className="rounded-lg border border-yellow-400/30 bg-yellow-950/40 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-yellow-200">
              Apple points
            </p>
            <p className="mt-1 text-2xl font-bold text-white">
              {demoScore.collectiblePoints.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Map View */}
        <MapView
          currentSteps={currentSteps}
          stepGoal={stepGoal}
          onCollect={handleAppleCollected}
        />

        {/* Call this component to enable the webcam */}
        <Camera onCollect={handleAppleCollected} />
      </div>
    </main>
  );
}
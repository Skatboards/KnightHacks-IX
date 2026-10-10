"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const MapView = dynamic(
  () => import("./components/MapView").then((mod) => mod.default),
  { ssr: false }
);

export default function Home() {
  const stepGoal = 5000;
  const [currentSteps, setCurrentSteps] = useState<number>(3200);
  const [activeSteps, setActiveSteps] = useState<number>(3200);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gray-900 text-white space-y-6">
      <h1 className="text-3xl font-bold text-purple-400">NutriGo Pathfinder</h1>

      <div className="w-full max-w-md bg-gray-800 p-6 rounded-xl border border-gray-700 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Current Steps (Goal: {stepGoal}):
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={currentSteps}
              onChange={(e) => setCurrentSteps(Number(e.target.value))}
              className="w-full p-2.5 rounded-lg bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              onClick={() => setActiveSteps(currentSteps)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg font-semibold text-white transition"
            >
              Update
            </button>
          </div>
        </div>

        {/* Map only re-calculates when you click Update */}
        <MapView currentSteps={activeSteps} stepGoal={stepGoal} />
      </div>
    </main>
  );
}
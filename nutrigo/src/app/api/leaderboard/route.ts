import { NextResponse } from "next/server";

type LeaderboardEntry = {
  id: string;
  displayName: string;
  steps: number;
  collectiblePoints: number;
  score: number;
};

const demoPlayers = [
  { id: "alex", displayName: "Alex", steps: 8200, collectiblePoints: 650 },
  { id: "jordan", displayName: "Jordan", steps: 7600, collectiblePoints: 1000 },
  { id: "sam", displayName: "Sam", steps: 6400, collectiblePoints: 1150 },
  { id: "taylor", displayName: "Taylor", steps: 5100, collectiblePoints: 500 },
];

export async function GET() {
  const leaderboard: LeaderboardEntry[] = demoPlayers
    .map((player) => ({
      ...player,
      score: player.steps + player.collectiblePoints,
    }))
    .sort((left, right) => right.score - left.score)
    .map((player, index) => ({
      ...player,
      rank: index + 1,
    }));

  return NextResponse.json({
    demo: true,
    scoring: "steps + collectible points",
    leaderboard,
  });
}

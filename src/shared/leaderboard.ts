export const MAX_POINTS = 1000;
export const MIN_POINTS = 5;

const FAST_DECAY_K = Math.log(5) / 5; // moves <= 10
const SLOW_DECAY_K = Math.log(2) / 10; // moves > 10
const FAST_DECAY_COEFFICIENT = 2500;
const SLOW_DECAY_COEFFICIENT = 200;

export function calculatePoints(moves: number): number {
  if (!Number.isFinite(moves) || moves <= 0) {
    return MAX_POINTS;
  }

  const raw =
    moves <= 10
      ? FAST_DECAY_COEFFICIENT * Math.exp(-FAST_DECAY_K * moves)
      : SLOW_DECAY_COEFFICIENT * Math.exp(-SLOW_DECAY_K * moves);

  const capped = Math.min(raw, MAX_POINTS);
  return Math.max(MIN_POINTS, Math.round(capped));
}

export type LeaderboardEntry = {
  userId: string;
  username: string;
  score: number;
  rank: number; // 1-based
};

export type LeaderboardResponse = {
  type: 'leaderboard';
  subredditId: string;
  top: LeaderboardEntry[];
  me: {
    userId: string;
    username: string;
    score: number;
    rank: number | null; // null if the user has no score yet
  } | null;
};

export type CompleteLevelResponse = {
  type: 'complete-level';
  awarded: boolean; // false if this post was already completed by this user
  pointsEarned: number; // 0 if not awarded
  totalScore: number;
};

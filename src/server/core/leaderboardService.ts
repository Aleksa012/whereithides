import { RedisClient } from '@devvit/web/server';
import { calculatePoints, LeaderboardEntry } from '../../shared/leaderboard';

const leaderboardKey = (subredditId: string) => `leaderboard:${subredditId}`;
const completedSetKey = (postId: string) => `completed:${postId}`;
const usernamesKey = (subredditId: string) => `usernames:${subredditId}`;

export type ScoreSubmit = {
  awarded: boolean;
  pointsEarned: number;
  totalScore: number;
};

export async function recordCompletion(
  redis: RedisClient,
  params: {
    subredditId: string;
    postId: string;
    userId: string;
    username: string;
    moves: number;
  }
): Promise<ScoreSubmit> {
  const { subredditId, postId, userId, username, moves } = params;

  const alreadyCompleted = await redis.zRank(completedSetKey(postId), userId);
  if (typeof alreadyCompleted === 'number') {
    const existingScore = await redis.zScore(
      leaderboardKey(subredditId),
      userId
    );
    return { awarded: false, pointsEarned: 0, totalScore: existingScore ?? 0 };
  }

  const pointsEarned = calculatePoints(moves);

  await redis.zAdd(completedSetKey(postId), {
    member: userId,
    score: pointsEarned,
  });
  const totalScore = await redis.zIncrBy(
    leaderboardKey(subredditId),
    userId,
    pointsEarned
  );
  await redis.hSet(usernamesKey(subredditId), { [userId]: username });

  return { awarded: true, pointsEarned, totalScore };
}

export async function getTopLeaderboard(
  redis: RedisClient,
  subredditId: string,
  limit = 100
): Promise<LeaderboardEntry[]> {
  const rows = await redis.zRange(leaderboardKey(subredditId), 0, limit - 1, {
    reverse: true,
    by: 'rank',
  });

  if (!rows || rows.length === 0) return [];

  const names = await redis.hGetAll(usernamesKey(subredditId));

  return rows.map((row, i) => ({
    userId: row.member,
    username: names?.[row.member] ?? row.member,
    score: row.score,
    rank: i + 1,
  }));
}

export async function getUserRankAndScore(
  redis: RedisClient,
  subredditId: string,
  userId: string
): Promise<{ score: number; rank: number } | null> {
  const score = await redis.zScore(leaderboardKey(subredditId), userId);
  if (score === undefined || score === null) return null;

  const ascendingRank = await redis.zRank(leaderboardKey(subredditId), userId);
  const total = await redis.zCard(leaderboardKey(subredditId));

  const rank = total - (ascendingRank ?? 0);

  return { score, rank };
}

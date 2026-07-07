import { RedisClient } from '@devvit/web/server';
import { calculatePoints, LeaderboardEntry } from '../../shared/leaderboard';

// Derives the Redis client's type from context so we don't have to guess
// the exact import path for the RedisClient type.

const leaderboardKey = (subredditId: string) => `leaderboard:${subredditId}`;
const completedSetKey = (postId: string) => `completed:${postId}`;
const usernamesKey = (subredditId: string) => `usernames:${subredditId}`;

/**
 * Records a level completion for a user.
 *
 * Points are only ever awarded the FIRST time a given user completes a
 * given post — replaying an already-completed post never adds more points,
 * it just reports the user's existing total.
 */
export async function recordCompletion(
  redis: RedisClient,
  params: {
    subredditId: string;
    postId: string;
    userId: string;
    username: string;
    moves: number;
  }
): Promise<{ awarded: boolean; pointsEarned: number; totalScore: number }> {
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

  // Order matters: mark completed first so a crash/retry between these two
  // calls can't double-award points (worst case it under-awards, which is
  // the safe failure direction here).
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

/**
 * Returns the top N users on a subreddit's leaderboard, highest score first.
 */
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

/**
 * Returns a single user's score + 1-based rank on a subreddit leaderboard,
 * or null if they don't have a score yet.
 */
export async function getUserRankAndScore(
  redis: RedisClient,
  subredditId: string,
  userId: string
): Promise<{ score: number; rank: number } | null> {
  const score = await redis.zScore(leaderboardKey(subredditId), userId);
  if (score === undefined || score === null) return null;

  // zRank is ascending (0 = lowest score). Convert to a "1st place = highest
  // score" rank: rank = total - ascendingRank.
  const ascendingRank = await redis.zRank(leaderboardKey(subredditId), userId);
  const total = await redis.zCard(leaderboardKey(subredditId));

  const rank = total - (ascendingRank ?? 0);

  return { score, rank };
}

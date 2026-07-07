import { Hono } from 'hono';
import { context, reddit, redis } from '@devvit/web/server';
import { createUserPost } from '../core/post';
import { TileData, validateLevelData } from '../../shared/level';
import { JsonObject } from '@devvit/web/shared';
import {
  getTopLeaderboard,
  getUserRankAndScore,
  recordCompletion,
} from '../core/leaderboardService';
import {
  CompleteLevelResponse,
  LeaderboardResponse,
} from '../../shared/leaderboard';

type ErrorResponse = {
  status: 'error';
  message: string;
};

export const api = new Hono();

api.get('/level', async (c) => {
  const postData = context.postData as {
    levelId: string;
    tiles: TileData[];
    underlyingItems: { index: number; item: number }[];
    mapTileIndex: number | null;
    startTileIndex: number | null;
    winningTileIndex: number | null;
  };

  return c.json({
    type: 'load-level',
    levelId: postData.levelId,
    levelData: {
      tiles: postData.tiles,
      underlyingItems: postData.underlyingItems,
      mapTileIndex: postData.mapTileIndex ?? null,
      startTileIndex: postData.startTileIndex ?? null,
      winningTileIndex: postData.winningTileIndex ?? null,
    },
  });
});

api.post('/level/publish', async (c) => {
  const payload = await c.req.json();

  const title =
    typeof payload?.title === 'string' && payload.title.trim().length > 0
      ? payload.title.trim().slice(0, 300)
      : 'Find it yall';

  const { isValid, errorMessage } = validateLevelData(payload);

  if (!isValid) {
    return c.json({
      errorMessage,
    });
  }

  const {
    tiles,
    underlyingItems,
    mapTileIndex,
    startTileIndex,
    winningTileIndex,
  } = payload;
  const formattedMapTileIndex: number | null =
    mapTileIndex === null || mapTileIndex === undefined
      ? null
      : typeof mapTileIndex === 'number' &&
          Number.isInteger(mapTileIndex) &&
          mapTileIndex >= 0 &&
          mapTileIndex < 64
        ? mapTileIndex
        : null;
  const formattedStartTileIndex: number | null =
    startTileIndex === null || startTileIndex === undefined
      ? null
      : typeof startTileIndex === 'number' &&
          Number.isInteger(startTileIndex) &&
          startTileIndex >= 0 &&
          startTileIndex < 64
        ? startTileIndex
        : null;
  const formattedWinningTileIndex: number | null =
    winningTileIndex === null || winningTileIndex === undefined
      ? null
      : typeof winningTileIndex === 'number' &&
          Number.isInteger(winningTileIndex) &&
          winningTileIndex >= 0 &&
          winningTileIndex < 64
        ? winningTileIndex
        : null;

  const levelId = payload?.levelId;
  const levelData = {
    tiles,
    underlyingItems,
    mapTileIndex: formattedMapTileIndex,
    startTileIndex: formattedStartTileIndex,
    winningTileIndex: formattedWinningTileIndex,
  };

  try {
    const post = await createUserPost(title, {
      levelId,
      ...levelData,
    } as unknown as JsonObject);

    return c.json({
      type: 'publish-level',
      levelId,
      postId: post.id,
      postUrl: post.url,
    });
  } catch (error) {
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message:
          error instanceof Error
            ? `Failed to publish post: ${error.message}`
            : 'Failed to publish post.',
      },
      500
    );
  }
});

api.post('/level/complete', async (c) => {
  const { moves } = await c.req.json<{ moves: number }>();

  if (typeof moves !== 'number' || !Number.isFinite(moves) || moves <= 0) {
    return c.json({ status: 'error', message: 'Invalid moves count.' }, 400);
  }

  const user = await reddit.getCurrentUser();
  if (!user) {
    return c.json({ status: 'error', message: 'Must be logged in.' }, 401);
  }

  const { subredditId, postId } = context;
  if (!subredditId || !postId) {
    return c.json(
      { status: 'error', message: 'Missing subreddit/post context.' },
      400
    );
  }

  const result = await recordCompletion(redis, {
    subredditId,
    postId,
    userId: user.id,
    username: user.username,
    moves,
  });

  return c.json<CompleteLevelResponse>({
    type: 'complete-level',
    ...result,
  });
});

api.get('/leaderboard', async (c) => {
  const { subredditId } = context;
  if (!subredditId) {
    return c.json(
      { status: 'error', message: 'Missing subreddit context.' },
      400
    );
  }

  const top = await getTopLeaderboard(redis, subredditId, 10);

  const user = await reddit.getCurrentUser();
  let me: LeaderboardResponse['me'] = null;

  if (user) {
    const mine = await getUserRankAndScore(redis, subredditId, user.id);
    me = {
      userId: user.id,
      username: user.username,
      score: mine?.score ?? 0,
      rank: mine?.rank ?? null,
    };
  }

  return c.json<LeaderboardResponse>({
    type: 'leaderboard',
    subredditId,
    top,
    me,
  });
});

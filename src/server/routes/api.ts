import { Hono } from 'hono';
import { context } from '@devvit/web/server';
import { createUserPost } from '../core/post';
import { TileData, validateLevelData } from '../../shared/level';
import { JsonObject } from '@devvit/web/shared';

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

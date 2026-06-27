import { Hono } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';
import type {
  DecrementResponse,
  IncrementResponse,
  InitResponse,
} from '../../shared/api';
import { TileData } from '../../shared/level';

type ErrorResponse = {
  status: 'error';
  message: string;
};

export const api = new Hono();

api.get('/init', async (c) => {
  const { postId } = context;

  if (!postId) {
    console.error('API Init Error: postId not found in devvit context');
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: 'postId is required but missing from context',
      },
      400
    );
  }

  try {
    const [count, username] = await Promise.all([
      redis.get('count'),
      reddit.getCurrentUsername(),
    ]);

    return c.json<InitResponse>({
      type: 'init',
      postId: postId,
      count: count ? parseInt(count) : 0,
      username: username ?? 'anonymous',
    });
  } catch (error) {
    console.error(`API Init Error for post ${postId}:`, error);
    let errorMessage = 'Unknown error during initialization';
    if (error instanceof Error) {
      errorMessage = `Initialization failed: ${error.message}`;
    }
    return c.json<ErrorResponse>(
      { status: 'error', message: errorMessage },
      400
    );
  }
});

api.post('/increment', async (c) => {
  const { postId } = context;
  if (!postId) {
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: 'postId is required',
      },
      400
    );
  }

  const count = await redis.incrBy('count', 1);
  return c.json<IncrementResponse>({
    count,
    postId,
    type: 'increment',
  });
});

api.post('/decrement', async (c) => {
  const { postId } = context;
  if (!postId) {
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: 'postId is required',
      },
      400
    );
  }

  const count = await redis.incrBy('count', -1);
  return c.json<DecrementResponse>({
    count,
    postId,
    type: 'decrement',
  });
});

api.post('/level', async (c) => {
  const payload = await c.req.json();
  const tiles = Array.isArray(payload?.tiles) ? payload.tiles : null;
  const validTileValues = new Set<TileData>([
    TileData.BASE_TILE,
    TileData.ROCK,
    TileData.TREE,
    TileData.PICKAXE,
    TileData.SHOVEL,
    TileData.HOLE,
  ]);

  if (
    !tiles ||
    tiles.length !== 64 ||
    !tiles.every(
      (tile: unknown) => typeof tile === 'number' && validTileValues.has(tile)
    )
  ) {
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message:
          'Level payload must contain exactly 64 tiles with supported values.',
      },
      400
    );
  }

  const levelId = payload.levelId
    ? String(payload.levelId)
    : `level-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  await redis.set(`level:${levelId}`, JSON.stringify({ tiles }));

  return c.json({
    type: 'save-level',
    levelId,
  });
});

api.get('/level/:id', async (c) => {
  const levelId = c.req.param('id');
  if (!levelId) {
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: 'Level id is required.',
      },
      400
    );
  }

  const stored = await redis.get(`level:${levelId}`);
  if (!stored) {
    return c.json({
      type: 'load-level',
      levelId,
      levelData: null,
    });
  }

  const parsed = JSON.parse(stored) as { tiles: number[] };
  return c.json({
    type: 'load-level',
    levelId,
    levelData: {
      tiles: parsed.tiles,
    },
  });
});

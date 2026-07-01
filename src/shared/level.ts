export enum TileData {
  BASE_TILE = 0,
  ROCK,
  TREE,
  PICKAXE,
  SHOVEL,
  DIRT,
}

export type LevelData = {
  tiles: TileData[];
  underlyingItems: { index: number; item: TileData }[];
  mapTileIndex: number | null;
};

export const LEVEL_COLS = 8;
export const LEVEL_ROWS = 8;
export const LEVEL_TILE_COUNT = LEVEL_COLS * LEVEL_ROWS;

export const DEFAULT_LEVEL: LevelData = {
  tiles: new Array(LEVEL_TILE_COUNT).fill(TileData.BASE_TILE),
  underlyingItems: [],
  mapTileIndex: null,
};

export const tileBackgroundColor = 0xf4f0d8;
export const tileRockColor = 0x8a8a8a;
export const tileHoleColor = 0x8b4513;

export const getTileColor = (type: TileData | undefined): number => {
  if (type === TileData.ROCK) return tileRockColor;
  if (type === TileData.TREE) return tileHoleColor;
  return tileBackgroundColor;
};

export const levelKey = (levelId: string) => `level:${levelId}`;

export const renderLevel = (tiles: TileData[]) => ({
  cols: LEVEL_COLS,
  rows: LEVEL_ROWS,
  tiles,
});

export const validateLevelData = (payload: LevelData) => {
  const returnObj = (isValid: boolean, errorMessage: string | null) => ({
    isValid,
    errorMessage,
  });

  if (!payload) {
    return returnObj(false, 'Level payload is missing');
  }

  const tiles = Array.isArray(payload.tiles) ? payload.tiles : null;
  const validTileValues = new Set<TileData>([
    TileData.BASE_TILE,
    TileData.ROCK,
    TileData.TREE,
    TileData.PICKAXE,
    TileData.SHOVEL,
    TileData.DIRT,
  ]);

  if (
    !tiles ||
    tiles.length !== 64 ||
    !tiles.every(
      (t: unknown) => typeof t === 'number' && validTileValues.has(t)
    )
  ) {
    return returnObj(
      false,
      'Level payload must contain exactly 64 tiles with supported values.'
    );
  }

  const underlyingItems = Array.isArray(payload?.underlyingItems)
    ? payload.underlyingItems
    : [];

  if (
    !underlyingItems.every(
      (item: { item: TileData; index: number }) =>
        typeof item.index === 'number' && typeof item.item === 'number'
    )
  ) {
    return returnObj(false, 'Level underlying items are corrupted.');
  }

  return returnObj(true, null);
};

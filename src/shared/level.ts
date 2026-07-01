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
  startTileIndex: number | null;
  winningTileIndex: number | null;
};

export const LEVEL_COLS = 8;
export const LEVEL_ROWS = 8;
export const LEVEL_TILE_COUNT = LEVEL_COLS * LEVEL_ROWS;

export const DEFAULT_LEVEL: LevelData = {
  tiles: new Array(LEVEL_TILE_COUNT).fill(TileData.BASE_TILE),
  underlyingItems: [],
  mapTileIndex: null,
  startTileIndex: null,
  winningTileIndex: null,
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

  const validIndexValue = (value: unknown): boolean =>
    value === null ||
    (typeof value === 'number' &&
      Number.isInteger(value) &&
      value >= 0 &&
      value < 64);

  if (!validIndexValue(payload?.startTileIndex)) {
    return returnObj(false, 'Start tile index is invalid.');
  }

  if (!validIndexValue(payload?.winningTileIndex)) {
    return returnObj(false, 'Winning tile index is invalid.');
  }

  if (!validIndexValue(payload?.mapTileIndex)) {
    return returnObj(false, 'Map tile index is invalid.');
  }

  if (
    payload?.startTileIndex !== null &&
    payload?.winningTileIndex !== null &&
    payload.startTileIndex === payload.winningTileIndex
  ) {
    return returnObj(false, 'Start and winning tile cannot be the same tile.');
  }

  if (payload?.startTileIndex !== null) {
    const startType = tiles[payload.startTileIndex];
    if (
      startType !== TileData.BASE_TILE &&
      startType !== TileData.PICKAXE &&
      startType !== TileData.SHOVEL &&
      startType !== TileData.DIRT
    ) {
      return returnObj(
        false,
        'Start tile index must point to a walkable tile.'
      );
    }
  }

  if (payload?.winningTileIndex !== null) {
    const winningType = tiles[payload.winningTileIndex];
    if (winningType !== TileData.BASE_TILE) {
      return returnObj(false, 'Winning tile index must point to a base tile.');
    }
  }

  return returnObj(true, null);
};

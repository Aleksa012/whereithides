export type LevelTileType = 0 | 1 | 2;

export type LevelData = {
  tiles: LevelTileType[];
};

export const LEVEL_COLS = 8;
export const LEVEL_ROWS = 8;
export const LEVEL_TILE_COUNT = LEVEL_COLS * LEVEL_ROWS;

export const DEFAULT_LEVEL: LevelData = {
  tiles: new Array(LEVEL_TILE_COUNT).fill(0) as LevelTileType[],
};

export const tileBackgroundColor = 0xf4f0d8;
export const tileRockColor = 0x8a8a8a;
export const tileHoleColor = 0x8b4513;

export const getTileColor = (type: LevelTileType): number => {
  if (type === 1) return tileRockColor;
  if (type === 2) return tileHoleColor;
  return tileBackgroundColor;
};

export const levelKey = (levelId: string) => `level:${levelId}`;

export const renderLevel = (tiles: LevelTileType[]) => ({
  cols: LEVEL_COLS,
  rows: LEVEL_ROWS,
  tiles,
});

export const validateLevelData = (input: unknown): input is LevelData => {
  if (typeof input !== 'object' || input === null) return false;
  const record = input as LevelData;
  if (!Array.isArray(record.tiles)) return false;
  if (record.tiles.length !== LEVEL_TILE_COUNT) return false;
  return record.tiles.every((tile) => tile === 0 || tile === 1 || tile === 2);
};

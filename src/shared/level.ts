export enum TileData {
  BASE_TILE = 0,
  ROCK,
  TREE,
  PICKAXE,
  SHOVEL,
  HOLE,
}

export type LevelData = {
  tiles: TileData[];
};

export const LEVEL_COLS = 8;
export const LEVEL_ROWS = 8;
export const LEVEL_TILE_COUNT = LEVEL_COLS * LEVEL_ROWS;

export const DEFAULT_LEVEL: LevelData = {
  tiles: new Array(LEVEL_TILE_COUNT).fill(TileData.BASE_TILE),
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

export const validateLevelData = (input: unknown): input is LevelData => {
  if (typeof input !== 'object' || input === null) return false;
  const record = input as LevelData;
  if (!Array.isArray(record.tiles)) return false;
  if (record.tiles.length !== LEVEL_TILE_COUNT) return false;
  return record.tiles.every(
    (tile) =>
      tile === TileData.BASE_TILE ||
      tile === TileData.ROCK ||
      tile === TileData.PICKAXE ||
      tile === TileData.TREE ||
      tile === TileData.SHOVEL ||
      tile === TileData.HOLE
  );
};

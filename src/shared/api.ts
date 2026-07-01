export type LevelData = {
  tiles: number[];
};

export type SaveLevelResponse = {
  type: 'save-level';
  levelId: string;
};

export type LoadLevelResponse = {
  type: 'load-level';
  levelId: string;
  levelData: LevelData | null;
};

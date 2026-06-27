export type InitResponse = {
  type: 'init';
  postId: string;
  count: number;
  username: string;
};

export type IncrementResponse = {
  type: 'increment';
  postId: string;
  count: number;
};

export type DecrementResponse = {
  type: 'decrement';
  postId: string;
  count: number;
};

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

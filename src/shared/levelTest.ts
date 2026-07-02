import { TileData } from './level';

export interface LevelData {
  tiles: TileData[];
  cols: number;
  rows: number;
  startTileIndex: number | null;
  winningTileIndex: number | null;
}

export interface BeatabilityResult {
  beatable: boolean;
  reason?: string | undefined;
  pickaxeReachable: boolean;
}

const ALWAYS_WALKABLE = new Set<TileData>([
  TileData.BASE_TILE,
  TileData.DIRT,
  TileData.PICKAXE,
  TileData.SHOVEL,
]);

function getNeighbours(index: number, cols: number, rows: number): number[] {
  const col = index % cols;
  const row = Math.floor(index / cols);
  const result: number[] = [];
  if (row > 0) result.push(index - cols);
  if (row < rows - 1) result.push(index + cols);
  if (col > 0) result.push(index - 1);
  if (col < cols - 1) result.push(index + 1);
  return result;
}

function dijkstraReachableSet(
  tiles: TileData[],
  cols: number,
  rows: number,
  startIndex: number,
  isWalkable: (type: TileData) => boolean
): Set<number> {
  const distances = new Map<number, number>();
  const visited = new Set<number>();
  const unvisited = new Set<number>();

  for (let i = 0; i < tiles.length; i++) {
    distances.set(i, Infinity);
    unvisited.add(i);
  }
  distances.set(startIndex, 0);

  while (unvisited.size > 0) {
    let current = -1;
    let minDist = Infinity;
    for (const node of unvisited) {
      const d = distances.get(node) ?? Infinity;
      if (d < minDist) {
        minDist = d;
        current = node;
      }
    }

    if (current === -1 || minDist === Infinity) break;

    unvisited.delete(current);
    visited.add(current);

    if (!isWalkable(tiles[current]!) && current !== startIndex) {
      continue;
    }

    for (const neighbour of getNeighbours(current, cols, rows)) {
      if (visited.has(neighbour)) continue;
      if (!isWalkable(tiles[neighbour]!)) continue;

      const newDist = (distances.get(current) ?? 0) + 1;
      if (newDist < (distances.get(neighbour) ?? Infinity)) {
        distances.set(neighbour, newDist);
      }
    }
  }

  const reachable = new Set<number>();
  for (const [index, dist] of distances) {
    if (dist !== Infinity) reachable.add(index);
  }
  return reachable;
}

export function isLevelBeatable(levelData: LevelData): BeatabilityResult {
  const { tiles, cols, rows, startTileIndex, winningTileIndex } = levelData;

  // ── Basic validation ──────────────────────────────────────────────
  if (startTileIndex === null || startTileIndex === undefined) {
    return {
      beatable: false,
      pickaxeReachable: false,
      reason: 'No start tile is set',
    };
  }
  if (winningTileIndex === null || winningTileIndex === undefined) {
    return {
      beatable: false,
      pickaxeReachable: false,
      reason: 'No winning tile is set',
    };
  }

  const reachableWithoutRocks = dijkstraReachableSet(
    tiles,
    cols,
    rows,
    startTileIndex,
    (type) => ALWAYS_WALKABLE.has(type)
  );

  const pickaxeReachable = Array.from(reachableWithoutRocks).some(
    (index) => tiles[index] === TileData.PICKAXE
  );

  if (pickaxeReachable) {
    const reachableWithRocksCleared = dijkstraReachableSet(
      tiles,
      cols,
      rows,
      startTileIndex,
      (type) => ALWAYS_WALKABLE.has(type) || type === TileData.ROCK
    );

    const beatable = reachableWithRocksCleared.has(winningTileIndex);
    return {
      beatable,
      pickaxeReachable: true,
      reason: beatable ? undefined : 'The winning tile is unreachable',
    };
  }

  const beatable = reachableWithoutRocks.has(winningTileIndex);
  return {
    beatable,
    pickaxeReachable: false,
    reason: beatable ? undefined : 'The winning tile is unreachable',
  };
}

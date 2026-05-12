// maze.js — Maze definition and helper utilities

// Maze grid: 0 = free, 1 = wall, 2 = goal
const MAZE = [
  [0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
  [0, 1, 1, 0, 1, 0, 1, 0, 1, 0],
  [0, 0, 0, 0, 1, 0, 0, 0, 1, 0],
  [1, 1, 0, 1, 1, 1, 0, 1, 1, 0],
  [0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
  [0, 1, 1, 1, 0, 1, 1, 1, 0, 1],
  [0, 1, 0, 0, 0, 0, 0, 1, 0, 0],
  [0, 1, 0, 1, 1, 1, 0, 1, 1, 0],
  [0, 0, 0, 1, 0, 0, 0, 0, 1, 0],
  [1, 0, 0, 0, 0, 1, 1, 0, 0, 2],
];

const ROWS = MAZE.length;
const COLS = MAZE[0].length;

const START = [0, 0]; // [row, col]
const GOAL  = [9, 9]; // [row, col]

// Cell type constants
const CELL_FREE = 0;
const CELL_WALL = 1;
const CELL_GOAL = 2;

function isWall(r, c) {
  if (!inBounds(r, c)) return true;
  return MAZE[r][c] === CELL_WALL;
}

function isGoal(r, c) {
  return inBounds(r, c) && MAZE[r][c] === CELL_GOAL;
}

function inBounds(r, c) {
  return r >= 0 && r < ROWS && c >= 0 && c < COLS;
}

function getCellType(r, c) {
  if (!inBounds(r, c)) return CELL_WALL;
  return MAZE[r][c];
}

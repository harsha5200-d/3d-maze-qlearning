"""
train.py — Robot Maze Q-Learning (Python + NumPy)
=================================================
This script trains a Q-Learning agent on the maze and writes
the optimal path to path.json, which is read by index.html.

Usage:
    python train.py [--episodes 1000] [--alpha 0.3] [--gamma 0.9] [--epsilon 0.9]

Requirements:
    pip install numpy
"""

import numpy as np
import json
import argparse
import time
import sys

# ─── RANDOM MAZE GENERATION ───────────────────────────────────────────────────
# 0 = free cell, 1 = wall, 2 = goal
# Generates a new random maze every run, guaranteeing a path from start to goal.

MAZE_ROWS = 10
MAZE_COLS = 10
START = (0, 0)
GOAL  = (MAZE_ROWS - 1, MAZE_COLS - 1)

def _bfs_reachable(maze, start, goal):
    """Check if goal is reachable from start using BFS."""
    rows, cols = maze.shape
    visited = set()
    queue = [start]
    if start not in visited and maze[start[0], start[1]] != 1:
        visited.add(start)
    else:
        return False

    while queue:
        r, c = queue.pop(0)
        if (r, c) == goal:
            return True
        for dr, dc in [(-1,0),(1,0),(0,-1),(0,1)]:
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols and (nr, nc) not in visited and maze[nr, nc] != 1:
                visited.add((nr, nc))
                queue.append((nr, nc))
    return False

def generate_random_maze(rows=MAZE_ROWS, cols=MAZE_COLS, wall_density=0.30):
    """
    Generate a random maze guaranteed to be solvable.
    Uses random wall placement + BFS validation.
    """
    for _ in range(200):  # retry until solvable
        maze = np.zeros((rows, cols), dtype=int)

        # Randomly place walls
        for r in range(rows):
            for c in range(cols):
                if (r, c) == START or (r, c) == GOAL:
                    continue
                if np.random.rand() < wall_density:
                    maze[r, c] = 1

        # Ensure start and goal are free
        maze[START[0], START[1]] = 0
        maze[GOAL[0], GOAL[1]] = 2

        # Validate solvability
        if _bfs_reachable(maze, START, GOAL):
            return maze

    # Fallback: minimal maze with guaranteed path (very unlikely to be needed)
    maze = np.zeros((rows, cols), dtype=int)
    maze[GOAL[0], GOAL[1]] = 2
    return maze

def generate_manual_maze():
    """Interactive prompt for manual maze input."""
    print("\n--- Manual Maze Input ---")
    while True:
        try:
            rows = int(input("Enter number of rows (e.g., 10): "))
            cols = int(input("Enter number of columns (e.g., 10): "))
            if rows > 0 and cols > 0:
                break
            print("Rows and columns must be positive integers.")
        except ValueError:
            print("Invalid input. Please enter integers.")

    while True:
        try:
            start_r = int(input(f"Enter START row (0 to {rows-1}): "))
            start_c = int(input(f"Enter START col (0 to {cols-1}): "))
            if 0 <= start_r < rows and 0 <= start_c < cols:
                break
            print("Start position out of bounds.")
        except ValueError:
            print("Invalid input. Please enter integers.")

    while True:
        try:
            goal_r = int(input(f"Enter GOAL row (0 to {rows-1}): "))
            goal_c = int(input(f"Enter GOAL col (0 to {cols-1}): "))
            if 0 <= goal_r < rows and 0 <= goal_c < cols:
                if (goal_r, goal_c) != (start_r, start_c):
                    break
                else:
                    print("Goal cannot be the same as Start.")
            else:
                print("Goal position out of bounds.")
        except ValueError:
            print("Invalid input. Please enter integers.")

    print(f"\nDefining walls for a {rows}x{cols} maze.")
    print("Enter wall coordinates as 'row,col' (e.g., '1,2').")
    print("Type 'done' when finished.")
    walls = []
    while True:
        wall_input = input("Wall coordinate or 'done': ").strip()
        if wall_input.lower() == 'done':
            break
        try:
            wr, wc = map(int, wall_input.split(','))
            if 0 <= wr < rows and 0 <= wc < cols:
                if (wr, wc) == (start_r, start_c) or (wr, wc) == (goal_r, goal_c):
                    print("Cannot place wall on start or goal.")
                else:
                    walls.append((wr, wc))
                    print(f"Wall added at ({wr},{wc})")
            else:
                print("Wall out of bounds.")
        except ValueError:
            print("Invalid format. Use 'row,col'.")

    maze = np.zeros((rows, cols), dtype=int)
    for wr, wc in walls:
        maze[wr, wc] = 1
    
    maze[start_r, start_c] = 0
    maze[goal_r, goal_c] = 2

    return maze, rows, cols, (start_r, start_c), (goal_r, goal_c)

# Ask user for input method
print("\nMaze Generation Method:")
print("1. Random Maze (Auto-generated)")
print("2. Manual Input (Define dimensions, start, goal, and walls)")
while True:
    choice = input("Select an option (1 or 2): ").strip()
    if choice in ['1', '2']:
        break
    print("Invalid choice. Enter 1 or 2.")

if choice == '1':
    MAZE_ROWS = 10
    MAZE_COLS = 10
    START = (0, 0)
    GOAL  = (MAZE_ROWS - 1, MAZE_COLS - 1)
    MAZE = generate_random_maze(MAZE_ROWS, MAZE_COLS)
    ROWS, COLS = MAZE.shape
else:
    MAZE, ROWS, COLS, START, GOAL = generate_manual_maze()

# Actions: [row_delta, col_delta]
ACTIONS = [
    (-1,  0),   # 0: UP
    ( 1,  0),   # 1: DOWN
    ( 0, -1),   # 2: LEFT
    ( 0,  1),   # 3: RIGHT
]
N_ACTIONS = len(ACTIONS)

ACTION_NAMES = ["UP", "DOWN", "LEFT", "RIGHT"]


# ─── HELPERS ──────────────────────────────────────────────────────────────────
def in_bounds(r, c):
    return 0 <= r < ROWS and 0 <= c < COLS

def is_wall(r, c):
    return not in_bounds(r, c) or MAZE[r, c] == 1

def is_goal(r, c):
    return in_bounds(r, c) and MAZE[r, c] == 2

def get_reward(r, c):
    """Reward after moving to (r, c)."""
    if not in_bounds(r, c) or is_wall(r, c):
        return -100   # wall penalty
    if is_goal(r, c):
        return  100   # goal reward
    return -1         # step cost


# ─── Q-LEARNING TRAINING ──────────────────────────────────────────────────────
def train(episodes: int, alpha: float, gamma: float, epsilon: float):
    """
    Train a Q-Learning agent.

    Returns:
        Q  (ndarray): shape [ROWS, COLS, N_ACTIONS] — Q-table
        episode_rewards (list): total reward per episode
    """
    Q = np.zeros((ROWS, COLS, N_ACTIONS), dtype=np.float64)

    epsilon_start = epsilon
    epsilon_min   = 0.01
    epsilon_decay = (epsilon_start - epsilon_min) / episodes

    episode_rewards = []

    print(f"\n{'='*55}")
    print(f"  Q-Learning Training")
    print(f"  Episodes : {episodes:,}")
    print(f"  Alpha    : {alpha}")
    print(f"  Gamma    : {gamma}")
    print(f"  Epsilon  : {epsilon_start} -> {epsilon_min} (decay)")
    print(f"{'='*55}\n")

    t0 = time.time()

    for ep in range(episodes):
        r, c = START
        total_reward = 0
        max_steps = ROWS * COLS * 4

        for _ in range(max_steps):
            if is_goal(r, c):
                break

            # ε-greedy action selection
            if np.random.rand() < epsilon:
                a = np.random.randint(N_ACTIONS)
            else:
                a = int(np.argmax(Q[r, c]))

            dr, dc = ACTIONS[a]
            nr, nc = r + dr, c + dc

            # Bounce back on wall / out-of-bounds
            hit_wall = is_wall(nr, nc)
            reward   = get_reward(nr, nc)

            if hit_wall:
                nr, nc = r, c   # stay in place

            # Bellman update
            max_next_q = np.max(Q[nr, nc])
            Q[r, c, a] += alpha * (reward + gamma * max_next_q - Q[r, c, a])

            r, c = nr, nc
            total_reward += reward

        episode_rewards.append(total_reward)
        epsilon = max(epsilon_min, epsilon - epsilon_decay)

        # Progress every 10%
        if (ep + 1) % max(1, episodes // 10) == 0:
            elapsed = time.time() - t0
            avg_reward = np.mean(episode_rewards[-max(1, episodes // 10):])
            pct = (ep + 1) / episodes * 100
            bar = "#" * int(pct // 5) + "-" * (20 - int(pct // 5))
            print(f"  [{bar}] {pct:5.1f}%  | ep {ep+1:>{len(str(episodes))}}/{episodes}"
                  f"  | avg_reward: {avg_reward:8.1f}  | eps: {epsilon:.3f}"
                  f"  | {elapsed:.1f}s")

    total_time = time.time() - t0
    print(f"\n  [DONE] Training complete in {total_time:.2f}s\n")
    return Q, episode_rewards


# ─── EXTRACT OPTIMAL PATH ─────────────────────────────────────────────────────
def extract_optimal_path(Q):
    """
    Follow the greedy policy from START to GOAL.
    Returns list of [row, col] positions, or None if no valid path found.
    """
    r, c = START
    path = [[r, c]]
    visited = {(r, c)}
    max_steps = ROWS * COLS * 2

    for _ in range(max_steps):
        if is_goal(r, c):
            return path

        # Try actions sorted by Q-value (best first)
        q_vals   = Q[r, c]
        sorted_a = np.argsort(q_vals)[::-1]  # descending

        moved = False
        for a in sorted_a:
            dr, dc = ACTIONS[a]
            nr, nc = r + dr, c + dc
            if in_bounds(nr, nc) and not is_wall(nr, nc) and (nr, nc) not in visited:
                r, c = nr, nc
                path.append([r, c])
                visited.add((r, c))
                moved = True
                break

        if not moved:
            print("  [WARN] Agent got stuck. Try more episodes.")
            return path

    print("  [WARN] Max steps reached without finding goal.")
    return path


# ─── SAVE OUTPUT ──────────────────────────────────────────────────────────────
def save_results(Q, path, episode_rewards, params):
    """Save path + Q-table summary to path.json AND path_data.js."""

    reached_goal = bool(path and is_goal(*path[-1]))

    output = {
        "meta": {
            "rows": int(ROWS),
            "cols": int(COLS),
            "start": list(START),
            "goal":  list(GOAL),
            "episodes": params["episodes"],
            "alpha":    params["alpha"],
            "gamma":    params["gamma"],
            "epsilon":  params["epsilon"],
            "reached_goal": reached_goal,
            "path_length": len(path) if path else 0,
        },
        "maze": MAZE.tolist(),
        "optimal_path": path if path else [],
        "episode_rewards_sample": [
            float(r) for r in episode_rewards[-100:]
        ],
    }

    # 1) Save path.json (used when served via HTTP)
    out_file = "path.json"
    with open(out_file, "w") as f:
        json.dump(output, f, indent=2)

    # 2) Save path_data.js (works when opened directly as file://)
    #    Sets a global JS variable so no fetch() is needed.
    js_file = "path_data.js"
    with open(js_file, "w") as f:
        f.write("// Auto-generated by train.py — do not edit manually\n")
        f.write("window.PATH_DATA = ")
        json.dump(output, f, indent=2)
        f.write(";\n")

    print(f"  [SAVED] Results saved to {out_file} and {js_file}")
    print(f"  Path length  : {len(path) if path else 0} steps")
    print(f"  Reached goal : {'YES' if reached_goal else 'NO'}")
    if not reached_goal:
        print("  Tip: Try increasing --episodes (e.g. 2000 or 5000)")
    print()

    # Print the path in a readable form
    if path:
        print("  Optimal path:")
        for i, (pr, pc) in enumerate(path):
            label = "START" if (pr, pc) == START else ("GOAL" if is_goal(pr, pc) else f"step {i}")
            print(f"    [{i:>2}] ({pr},{pc})  {ACTION_NAMES[get_step_action(path, i)] if i < len(path)-1 else '-> GOAL'}  | {label}")
    print()


def get_step_action(path, i):
    """Return action index taken from path[i] to path[i+1]."""
    if i + 1 >= len(path):
        return -1
    r0, c0 = path[i]
    r1, c1 = path[i + 1]
    for a, (dr, dc) in enumerate(ACTIONS):
        if r0 + dr == r1 and c0 + dc == c1:
            return a
    return -1


# ─── MAIN ─────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="Train Q-Learning agent on Robot Maze and export optimal path."
    )
    parser.add_argument("--episodes", type=int,   default=1000,  help="Training episodes (default: 1000)")
    parser.add_argument("--alpha",    type=float, default=0.3,   help="Learning rate α (default: 0.3)")
    parser.add_argument("--gamma",    type=float, default=0.9,   help="Discount factor γ (default: 0.9)")
    parser.add_argument("--epsilon",  type=float, default=0.9,   help="Exploration rate ε (default: 0.9)")
    args = parser.parse_args()

    # Validate
    if not (0 < args.alpha <= 1):
        print("Error: alpha must be in (0, 1]"); sys.exit(1)
    if not (0 < args.gamma < 1):
        print("Error: gamma must be in (0, 1)"); sys.exit(1)
    if not (0 < args.epsilon <= 1):
        print("Error: epsilon must be in (0, 1]"); sys.exit(1)

    params = vars(args)

    Q, episode_rewards = train(
        episodes=args.episodes,
        alpha=args.alpha,
        gamma=args.gamma,
        epsilon=args.epsilon,
    )

    path = extract_optimal_path(Q)
    save_results(Q, path, episode_rewards, params)

    print("  >> Now open index.html in your browser to see the robot navigate!")


if __name__ == "__main__":
    main()

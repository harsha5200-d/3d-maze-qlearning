// qlearning.js — Q-Learning algorithm

class QAgent {
    constructor() {
        // Actions: 0=up, 1=down, 2=left, 3=right
        this.actions = [
            [-1, 0], // up
            [1, 0], // down
            [0, -1], // left
            [0, 1], // right
        ];
        this.numActions = this.actions.length;
        this.qtable = null;
        this.trained = false;
        this.episodeRewards = [];
    }

    // Initialize Q-table with zeros
    initQTable() {
        this.qtable = [];
        for (let r = 0; r < ROWS; r++) {
            this.qtable[r] = [];
            for (let c = 0; c < COLS; c++) {
                this.qtable[r][c] = new Float64Array(this.numActions); // all zeros
            }
        }
    }

    // Encode state as [row, col]
    stateToKey(r, c) { return r * COLS + c; }

    // Epsilon-greedy action selection
    selectAction(r, c, epsilon) {
        if (Math.random() < epsilon) {
            return Math.floor(Math.random() * this.numActions);
        }
        return this.greedyAction(r, c);
    }

    // Best action according to Q-table
    greedyAction(r, c) {
        const qvals = this.qtable[r][c];
        let bestA = 0;
        let bestQ = -Infinity;
        for (let a = 0; a < this.numActions; a++) {
            if (qvals[a] > bestQ) { bestQ = qvals[a]; bestA = a; }
        }
        return bestA;
    }

    // Reward function
    getReward(r, c) {
        if (!inBounds(r, c) || isWall(r, c)) return -100;
        if (isGoal(r, c)) return 100;
        return -1;
    }

    // Train the agent for a given number of episodes
    // Returns array of total rewards per episode (for progress display)
    train(episodes, alpha, gamma, epsilon, onProgress) {
        this.initQTable();
        this.episodeRewards = [];
        const epsilonMin = 0.01;
        const epsilonDecay = (epsilon - epsilonMin) / episodes;

        for (let ep = 0; ep < episodes; ep++) {
            let [r, c] = [...START];
            let totalReward = 0;
            let steps = 0;
            const maxSteps = ROWS * COLS * 4;

            while (!isGoal(r, c) && steps < maxSteps) {
                const a = this.selectAction(r, c, epsilon);
                const [dr, dc] = this.actions[a];
                let nr = r + dr;
                let nc = c + dc;

                // Bounce back if out of bounds or wall
                const hitWall = !inBounds(nr, nc) || isWall(nr, nc);
                const reward = hitWall ? -100 : (isGoal(nr, nc) ? 100 : -1);

                if (hitWall) { nr = r; nc = c; }

                // Q-update
                const maxNextQ = Math.max(...Array.from(this.qtable[nr][nc]));
                this.qtable[r][c][a] += alpha * (reward + gamma * maxNextQ - this.qtable[r][c][a]);

                r = nr; c = nc;
                totalReward += reward;
                steps++;
            }

            epsilon = Math.max(epsilonMin, epsilon - epsilonDecay);
            this.episodeRewards.push(totalReward);

            // Fire progress callback every 100 episodes
            if (onProgress && (ep + 1) % 100 === 0) {
                onProgress(ep + 1, episodes, totalReward);
            }
        }

        this.trained = true;
    }

    // Extract optimal path from start to goal using greedy policy
    getOptimalPath() {
        if (!this.trained) return null;

        const path = [];
        let [r, c] = [...START];
        const visited = new Set();
        const maxSteps = ROWS * COLS * 2;

        path.push([r, c]);
        visited.add(r * COLS + c);

        for (let step = 0; step < maxSteps; step++) {
            if (isGoal(r, c)) break;

            const a = this.greedyAction(r, c);
            const [dr, dc] = this.actions[a];
            const nr = r + dr;
            const nc = c + dc;

            // If stuck (wall or revisit), attempt fallback moves
            if (!inBounds(nr, nc) || isWall(nr, nc) || visited.has(nr * COLS + nc)) {
                // Try other actions ordered by Q-value
                const sorted = [...Array(this.numActions).keys()]
                    .sort((x, y) => this.qtable[r][c][y] - this.qtable[r][c][x]);
                let moved = false;
                for (const alt of sorted) {
                    const [ar, ac] = [r + this.actions[alt][0], c + this.actions[alt][1]];
                    if (inBounds(ar, ac) && !isWall(ar, ac) && !visited.has(ar * COLS + ac)) {
                        r = ar; c = ac;
                        path.push([r, c]);
                        visited.add(r * COLS + c);
                        moved = true;
                        break;
                    }
                }
                if (!moved) break; // truly stuck
            } else {
                r = nr; c = nc;
                path.push([r, c]);
                visited.add(r * COLS + c);
            }
        }

        return path;
    }
}

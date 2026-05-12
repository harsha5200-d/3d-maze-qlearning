// main.js — Three.js scene + UI. Reads path_data.js (window.PATH_DATA) from Python training.

// ─── GLOBAL SCENE OBJECTS ─────────────────────────────────────────────────────
let renderer, scene, camera, controls_three;
let wallMeshes = [], floorMeshes = [], goalMesh, robotMesh, pathLine;
let trailMeshes = [];
let isSimulating = false;
let pathData = null;

// ─── CELL SIZE ────────────────────────────────────────────────────────────────
const CELL = 1.1;
const WALL_H = 1.0;
const FLOOR_THICK = 0.12;

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function cellToWorld(r, c, rows, cols) {
    return {
        x: c * CELL - (cols * CELL) / 2 + CELL / 2,
        z: r * CELL - (rows * CELL) / 2 + CELL / 2,
        y: 0
    };
}

// ─── INIT SCENE ───────────────────────────────────────────────────────────────
function initScene() {
    const wrap = document.getElementById('canvas-wrap');

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(wrap.clientWidth, wrap.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x050810);
    wrap.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050810, 0.042);

    camera = new THREE.PerspectiveCamera(50, wrap.clientWidth / wrap.clientHeight, 0.1, 200);
    camera.position.set(0, 16, 14);
    camera.lookAt(0, 0, 0);

    if (typeof THREE.OrbitControls !== 'undefined') {
        controls_three = new THREE.OrbitControls(camera, renderer.domElement);
        controls_three.enableDamping = true;
        controls_three.dampingFactor = 0.08;
        controls_three.minDistance = 5;
        controls_three.maxDistance = 40;
        controls_three.maxPolarAngle = Math.PI / 2.1;
    }

    // Lights
    scene.add(new THREE.AmbientLight(0x8899cc, 0.5));
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(8, 14, 8);
    dir.castShadow = true;
    dir.shadow.mapSize.width = dir.shadow.mapSize.height = 2048;
    dir.shadow.camera.left = -12; dir.shadow.camera.right = 12;
    dir.shadow.camera.top = 12; dir.shadow.camera.bottom = -12;
    dir.shadow.camera.far = 60;
    scene.add(dir);
    const pb = new THREE.PointLight(0x6b8cff, 1.5, 20);
    pb.position.set(-6, 5, -6); scene.add(pb);
    const pg = new THREE.PointLight(0x22d3a0, 1.2, 15);
    pg.position.set(6, 4, 6); scene.add(pg);

    // Build default maze for visual feedback
    buildMazeFromArray(MAZE, ROWS, COLS, START);

    window.addEventListener('resize', function () {
        var w = wrap.clientWidth, h = wrap.clientHeight;
        camera.aspect = w / h; camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    });

    startRenderLoop();
}

// ─── BUILD MAZE FROM ARRAY ────────────────────────────────────────────────────
function buildMazeFromArray(maze, rows, cols, start) {
    wallMeshes.forEach(function (m) { scene.remove(m); }); wallMeshes = [];
    floorMeshes.forEach(function (m) { scene.remove(m); }); floorMeshes = [];
    if (goalMesh) { scene.remove(goalMesh); goalMesh = null; }
    if (robotMesh) { scene.remove(robotMesh); robotMesh = null; }
    clearTrail();
    if (pathLine) { scene.remove(pathLine); pathLine = null; }

    scene.children.filter(function (c) { return c.isGridHelper; }).forEach(function (g) { scene.remove(g); });
    var grid = new THREE.GridHelper(cols * CELL + 1, cols + rows, 0x1a2548, 0x0f1832);
    grid.position.y = -0.06; scene.add(grid);

    var wallMat = new THREE.MeshStandardMaterial({ color: 0x1a2850, roughness: 0.6, metalness: 0.3 });
    var floorMat = new THREE.MeshStandardMaterial({ color: 0x080e1e, roughness: 0.9, metalness: 0.1 });
    var startMat = new THREE.MeshStandardMaterial({ color: 0x6b8cff, emissive: 0x3a55cc, emissiveIntensity: 0.5, roughness: 0.3, metalness: 0.5 });
    var goalMatl = new THREE.MeshStandardMaterial({ color: 0x22d3a0, emissive: 0x0fb87a, emissiveIntensity: 0.7, roughness: 0.2, metalness: 0.6 });

    var wallGeo = new THREE.BoxGeometry(CELL * 0.92, WALL_H, CELL * 0.92);
    var floorGeo = new THREE.BoxGeometry(CELL * 0.95, FLOOR_THICK, CELL * 0.95);

    for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
            var p = cellToWorld(r, c, rows, cols);
            var cell = maze[r][c];
            if (cell === 1) {
                var m = new THREE.Mesh(wallGeo, wallMat);
                m.position.set(p.x, WALL_H / 2, p.z);
                m.castShadow = true; m.receiveShadow = true;
                scene.add(m); wallMeshes.push(m);
            } else if (cell === 2) {
                var geo = new THREE.BoxGeometry(CELL * 0.7, CELL * 0.7, CELL * 0.7);
                goalMesh = new THREE.Mesh(geo, goalMatl);
                goalMesh.position.set(p.x, CELL * 0.35, p.z);
                goalMesh.castShadow = true; scene.add(goalMesh);
                var ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.65, 32),
                    new THREE.MeshBasicMaterial({ color: 0x22d3a0, side: THREE.DoubleSide, transparent: true, opacity: 0.4 }));
                ring.rotation.x = -Math.PI / 2; ring.position.set(p.x, 0.02, p.z);
                scene.add(ring);
                var fm = new THREE.Mesh(floorGeo, new THREE.MeshStandardMaterial({ color: 0x0d2233, roughness: 0.9 }));
                fm.position.set(p.x, -FLOOR_THICK / 2, p.z); fm.receiveShadow = true;
                scene.add(fm); floorMeshes.push(fm);
            } else {
                var mat = (r === start[0] && c === start[1]) ? startMat : floorMat;
                var fm2 = new THREE.Mesh(floorGeo, mat);
                fm2.position.set(p.x, -FLOOR_THICK / 2, p.z); fm2.receiveShadow = true;
                scene.add(fm2); floorMeshes.push(fm2);
            }
        }
    }
    spawnRobot(rows, cols, start);
}

// ─── SPAWN ROBOT ──────────────────────────────────────────────────────────────
function spawnRobot(rows, cols, start) {
    if (robotMesh) { scene.remove(robotMesh); robotMesh = null; }
    var mat = new THREE.MeshStandardMaterial({ color: 0xff8c42, emissive: 0xcc5a10, emissiveIntensity: 0.5, roughness: 0.2, metalness: 0.7 });
    robotMesh = new THREE.Mesh(new THREE.SphereGeometry(0.38, 24, 24), mat);
    var p = cellToWorld(start[0], start[1], rows, cols);
    robotMesh.position.set(p.x, 0.4, p.z);
    robotMesh.castShadow = true;
    var light = new THREE.PointLight(0xff8c42, 1.0, 3);
    light.position.set(0, 0.2, 0);
    robotMesh.add(light);
    scene.add(robotMesh);
}

// ─── PATH LINE ────────────────────────────────────────────────────────────────
function drawPathLine(path, rows, cols) {
    if (pathLine) { scene.remove(pathLine); pathLine = null; }
    var points = path.map(function (pos) {
        var p = cellToWorld(pos[0], pos[1], rows, cols);
        return new THREE.Vector3(p.x, 0.08, p.z);
    });
    var geo = new THREE.BufferGeometry().setFromPoints(points);
    pathLine = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x6b8cff, transparent: true, opacity: 0.55 }));
    scene.add(pathLine);
}

// ─── TRAIL ───────────────────────────────────────────────────────────────────
function addTrailAt(r, c, rows, cols) {
    var p = cellToWorld(r, c, rows, cols);
    var m = new THREE.Mesh(
        new THREE.SphereGeometry(0.10, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xff8c42, transparent: true, opacity: 0.5 })
    );
    m.position.set(p.x, 0.12, p.z);
    scene.add(m); trailMeshes.push(m);
}
function clearTrail() {
    trailMeshes.forEach(function (m) { scene.remove(m); });
    trailMeshes = [];
}

// ─── RENDER LOOP ──────────────────────────────────────────────────────────────
var clock = new THREE.Clock();
function startRenderLoop() {
    (function loop() {
        requestAnimationFrame(loop);
        var t = clock.getElapsedTime();
        if (goalMesh) { goalMesh.rotation.y = t * 1.2; goalMesh.position.y = 0.35 + Math.sin(t * 2) * 0.08; }
        if (robotMesh && !isSimulating) { robotMesh.position.y = 0.4 + Math.sin(t * 3) * 0.04; }
        if (controls_three) controls_three.update();
        renderer.render(scene, camera);
    })();
}

// ─── ANIMATE ROBOT ────────────────────────────────────────────────────────────
function animateRobotAlongPath(path, rows, cols) {
    if (!path || path.length === 0) return;
    clearTrail();
    isSimulating = true;
    var pathIndex = 0;
    var stepDelay = 330;

    function moveStep() {
        if (pathIndex >= path.length) {
            isSimulating = false;
            var goalR = pathData.meta.goal[0], goalC = pathData.meta.goal[1];
            var lastR = path[path.length - 1][0], lastC = path[path.length - 1][1];
            var reachedGoal = (lastR === goalR && lastC === goalC);
            setStatus(reachedGoal ? 'Goal reached! Path: ' + path.length + ' steps' : 'Simulation ended at step ' + path.length, reachedGoal ? 'success' : 'info');
            if (reachedGoal) {
                showToast('Robot reached the Goal!');
                document.getElementById('pathBadge').style.display = 'block';
            }
            document.getElementById('simulateBtn').disabled = false;
            document.getElementById('trailInfo').style.display = 'none';
            return;
        }

        var r = path[pathIndex][0], c = path[pathIndex][1];
        var pos = cellToWorld(r, c, rows, cols);
        var startPos = robotMesh.position.clone();
        var endPos = new THREE.Vector3(pos.x, 0.4, pos.z);
        var dur = stepDelay * 0.8;
        var t0 = performance.now();

        function tween(now) {
            var prog = Math.min((now - t0) / dur, 1);
            var ease = prog < 0.5 ? 2 * prog * prog : -1 + (4 - 2 * prog) * prog;
            robotMesh.position.lerpVectors(startPos, endPos, ease);
            robotMesh.position.y = 0.4 + Math.sin(prog * Math.PI) * 0.18;
            if (prog < 1) {
                requestAnimationFrame(tween);
            } else {
                robotMesh.position.copy(endPos);
                addTrailAt(r, c, rows, cols);
                pathIndex++;
                document.getElementById('trailInfo').style.display = 'block';
                document.getElementById('trailInfo').textContent = 'Step ' + pathIndex + ' / ' + path.length;
                setTimeout(moveStep, stepDelay - dur);
            }
        }
        requestAnimationFrame(tween);
    }
    moveStep();
}

// ─── STATUS / TOAST ───────────────────────────────────────────────────────────
function setStatus(msg, type) {
    var el = document.getElementById('statusText');
    el.textContent = msg;
    el.className = type || 'info';
}
function showToast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg; t.style.display = 'block';
    setTimeout(function () { t.style.display = 'none'; }, 3200);
}

// ─── APPLY PATH DATA (from window.PATH_DATA or fetch or Live Training) ────────
function applyPathData(data, isLive = false) {
    pathData = data;
    var maze = data.maze;
    var path = data.optimal_path;
    var meta = data.meta;

    buildMazeFromArray(maze, meta.rows, meta.cols, meta.start);
    drawPathLine(path, meta.rows, meta.cols);

    document.getElementById('progressBar').style.width = '100%';
    document.getElementById('simulateBtn').disabled = false;
    document.getElementById('epCount').textContent = meta.episodes;
    document.getElementById('pathLen').textContent = meta.path_length;

    if (meta.reached_goal) {
        setStatus((isLive ? 'Live training complete!' : 'Path loaded!') + ' Path: ' + meta.path_length + ' steps', 'success');
        showToast(isLive ? 'AI has learned the path!' : 'Python path loaded!');
    } else {
        setStatus('Training complete but goal NOT reached. Try more episodes.', 'error');
    }
}

// ─── LIVE TRAINING ────────────────────────────────────────────────────────────
function startLiveTraining() {
    if (isSimulating) return;

    const episodes = parseInt(document.getElementById('input-episodes').value);
    const alpha = parseFloat(document.getElementById('input-alpha').value);
    const gamma = parseFloat(document.getElementById('input-gamma').value);
    const epsilon = parseFloat(document.getElementById('input-epsilon').value);

    setStatus('Training AI live in browser...', 'info');
    document.getElementById('trainBtn').disabled = true;
    document.getElementById('simulateBtn').disabled = true;
    document.getElementById('progressBar').style.width = '0%';

    const agent = new QAgent();
    
    // Train in chunks to keep UI responsive
    let currentEp = 0;
    const chunkSize = Math.max(100, Math.floor(episodes / 20));

    agent.initQTable();
    
    function trainingStep() {
        const nextTarget = Math.min(currentEp + chunkSize, episodes);
        
        // Internal loop for the chunk
        for (; currentEp < nextTarget; currentEp++) {
            // Simplified epsilon decay matching qlearning.js logic but controlled here
            const currentEpsilon = Math.max(0.01, epsilon - (currentEp * (epsilon - 0.01) / episodes));
            
            let [r, c] = [...START];
            const maxSteps = ROWS * COLS * 4;
            let steps = 0;

            while (!isGoal(r, c) && steps < maxSteps) {
                const a = agent.selectAction(r, c, currentEpsilon);
                const [dr, dc] = agent.actions[a];
                let nr = r + dr, nc = c + dc;
                const hitWall = !inBounds(nr, nc) || isWall(nr, nc);
                const reward = hitWall ? -100 : (isGoal(nr, nc) ? 100 : -1);
                if (hitWall) { nr = r; nc = c; }
                const maxNextQ = Math.max(...Array.from(agent.qtable[nr][nc]));
                agent.qtable[r][c][a] += alpha * (reward + gamma * maxNextQ - agent.qtable[r][c][a]);
                r = nr; c = nc;
                steps++;
            }
        }

        const pct = (currentEp / episodes) * 100;
        document.getElementById('progressBar').style.width = pct + '%';
        
        // Update path line visually every chunk
        agent.trained = true;
        const currentPath = agent.getOptimalPath();
        if (currentPath) drawPathLine(currentPath, ROWS, COLS);

        if (currentEp < episodes) {
            requestAnimationFrame(trainingStep);
        } else {
            // Finished
            const finalPath = agent.getOptimalPath();
            const liveData = {
                meta: {
                    rows: ROWS, cols: COLS, start: START, goal: GOAL,
                    episodes: episodes, alpha: alpha, gamma: gamma, epsilon: epsilon,
                    reached_goal: finalPath && isGoal(...finalPath[finalPath.length - 1]),
                    path_length: finalPath ? finalPath.length : 0
                },
                maze: MAZE,
                optimal_path: finalPath || []
            };
            applyPathData(liveData, true);
            document.getElementById('trainBtn').disabled = false;
        }
    }

    requestAnimationFrame(trainingStep);
}

// ─── LOAD PATH (uses window.PATH_DATA first, fetch as fallback) ──────────────
function loadPathData() {
    setStatus('Loading path from Python training...', 'info');
    document.getElementById('progressBar').style.width = '40%';

    if (window.PATH_DATA) {
        applyPathData(window.PATH_DATA);
        return;
    }

    fetch('path.json?t=' + Date.now()).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
    }).then(function (data) {
        applyPathData(data);
    }).catch(function (e) {
        document.getElementById('progressBar').style.width = '0%';
        setStatus('ERROR: Run python train.py first, or use Live Training.', 'error');
        console.error('Load error:', e);
    });
}

// ─── DOM READY ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
    initScene();

    // Slider Listeners
    ['episodes', 'alpha', 'gamma', 'epsilon'].forEach(id => {
        const input = document.getElementById('input-' + id);
        const display = document.getElementById('val-' + id);
        input.addEventListener('input', () => { display.textContent = input.value; });
    });

    if (window.PATH_DATA) {
        setTimeout(function () { applyPathData(window.PATH_DATA); }, 300);
    } else {
        setStatus('Ready. Use controls to Train Live or Load Python.', 'info');
    }

    document.getElementById('trainBtn').addEventListener('click', startLiveTraining);
    document.getElementById('loadBtn').addEventListener('click', loadPathData);

    document.getElementById('simulateBtn').addEventListener('click', function () {
        if (!pathData || isSimulating) return;
        clearTrail();
        spawnRobot(pathData.meta.rows, pathData.meta.cols, pathData.meta.start);
        document.getElementById('pathBadge').style.display = 'none';
        document.getElementById('simulateBtn').disabled = true;
        setStatus('Simulating ' + pathData.optimal_path.length + ' steps...', 'info');
        animateRobotAlongPath(pathData.optimal_path, pathData.meta.rows, pathData.meta.cols);
    });

    document.getElementById('resetBtn').addEventListener('click', function () {
        if (isSimulating) return;
        if (pathData) {
            spawnRobot(pathData.meta.rows, pathData.meta.cols, pathData.meta.start);
        } else {
            buildMazeFromArray(MAZE, ROWS, COLS, START);
        }
        clearTrail();
        document.getElementById('pathBadge').style.display = 'none';
        document.getElementById('trailInfo').style.display = 'none';
        setStatus('Reset. Ready for new training.', 'info');
    });
});

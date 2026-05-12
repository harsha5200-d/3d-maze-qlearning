# 🤖 Robot Maze Q-Learning

[![Python](https://img.shields.io/badge/Python-3.8%2B-blue?logo=python&logoColor=white)](https://www.python.org/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B-yellow?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Three.js](https://img.shields.io/badge/Three.js-r128-black?logo=three.js&logoColor=white)](https://threejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

![Project Banner](images/banner.png)

A high-performance Reinforcement Learning project that trains an AI agent to navigate a complex 2D maze using **Q-Learning**. The project features a dual-stack architecture: a **Python** backend for intensive mathematical training and a **Three.js** frontend for stunning 3D path visualization.

## 🌟 Key Features

- **Brain (Dual-Stack):** Custom Q-Learning implementation in both **Python** (for CLI training) and **JavaScript** (for live browser training).
- **Live Training:** Train the AI directly in your browser! Adjust hyperparameters in real-time and watch the learning path converge.
- **Eyes (Frontend):** Interactive 3D visualization using WebGL/Three.js with smooth animations and dynamic lighting.
- **Smart Exploration:** Implements $\epsilon$-greedy strategy with decay to balance exploration and exploitation.
- **Robust Training:** Capable of finding the mathematically shortest path in complex 10x10 grids within seconds.

---

## 📸 Project Showcase

![UI Showcase](images/ui_showcase.png)

---

## 🧠 How It Works

This project uses **Reinforcement Learning**, specifically the **Q-Learning** algorithm. Unlike traditional pathfinding (like A*), the agent starts with zero knowledge of the maze and learns through trial and error.

### The Bellman Equation
The core of the learning process is the Bellman Equation, which updates the agent's "cheat sheet" (Q-Table):

$$Q(s,a) \leftarrow Q(s,a) + \alpha [R + \gamma \max Q(s',a') - Q(s,a)]$$

### Reward System
To guide the agent, we use a tailored reward system:
- 🏁 **Reach Goal:** $+100$
- 🧱 **Hit Wall:** $-100$
- 🚶 **Step Cost:** $-1$ (forces the agent to find the *shortest* path)

---

## 🚀 Getting Started

### Prerequisites
- Python 3.8+
- Modern Web Browser

### 1. Installation
Clone the repository and install the required dependencies:
```bash
pip install -r requirements.txt
```

### 2. Training & Visualization

#### Option A: Live In-Browser (Easiest)
Simply open `index.html` in your browser.
1. Adjust the **Training Controls** (Episodes, Alpha, etc.) in the sidebar.
2. Click **"⚡ Start Live Training"**.
3. Watch the path line update in real-time as the AI learns.
4. Click **"▶ Simulate"** to see the robot navigate!

#### Option B: Python Backend (Advanced)
Run the Python script for high-speed training and data export:
```bash
python train.py --episodes 1500 --alpha 0.3 --gamma 0.9
```
*The script will export results to `path_data.js`. Then, open `index.html` and click **"📂 Load Python"**.*

---

## 🛠 Tech Stack

- **Backend:** Python, NumPy (Matrix Math)
- **Frontend:** HTML5, Vanilla CSS, Three.js (3D Rendering)
- **Data Exchange:** JSON / JavaScript Globals

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<p align="center">
  Developed with ❤️ by the AI Enthusiast Community
</p>

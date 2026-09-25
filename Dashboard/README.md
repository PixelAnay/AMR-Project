# AMRs · Edge-AI Fleet Coordination

A high-fidelity 3D digital twin and real-time coordination dashboard for Autonomous Mobile Robots (AMRs) operating in automated warehouse environments.

## Features

- **3D Digital Twin**: Interactive Three.js-powered warehouse floor simulation with customizable camera modes (Orbit, Top-down, Follow AMR).
- **Decentralized Coordination**: Simulated edge-AI mesh consensus protocol for collision avoidance and intersection arbitration.
- **Dynamic Path Planning**: Real-time waypoint navigation, obstacle detection, and rerouting.
- **Fleet Telemetry & KPIs**: Real-time monitoring of active units, battery levels, throughput per hour, and conflict status.
- **Interactive Controls**: Manual order dispatch, fleet recall to charging docks, E-stop triggers, and simulation speed adjustment.

## Getting Started

No build step required. Simply open `index.html` in any modern web browser or serve it with any local static server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve .
```

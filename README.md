# AMR Project

> A concept, simulation, and ROS 2 prototype for **decentralized autonomous mobile robot (AMR) coordination** in warehouse environments.

[![Static site](https://img.shields.io/badge/website-static-087b78?style=flat-square)](#1-project-website)
[![Browser demo](https://img.shields.io/badge/dashboard-browser%20simulation-4fd8eb?style=flat-square)](#2-fleet-operations-dashboard)
[![ROS 2](https://img.shields.io/badge/ROS%202-Humble-22314e?style=flat-square)](#3-ros-2--gazebo-prototype)

## Overview

This repository contains three complementary parts of the AMR Project:

| Component | Purpose | Entry point |
| --- | --- | --- |
| **Project website** | Explains the decentralized fleet-coordination proposal and includes an interactive 3D AMR hero scene. | [`index.html`](./index.html) |
| **Fleet operations dashboard** | A standalone browser-based digital-twin simulation for dispatching, paths, conflicts, charging, and fleet controls. | [`Dashboard/index.html`](./Dashboard/index.html) |
| **ROS 2 & Gazebo prototype** | A Docker-based three-robot warehouse simulation with namespaced ROS 2 coordination nodes. | [`AMR-ROS2-with-jetson-and-Rasp-main/AMR-ROS2-with-jetson-and-Rasp-main`](./AMR-ROS2-with-jetson-and-Rasp-main/AMR-ROS2-with-jetson-and-Rasp-main) |

> **Important:** These components are currently independent. The website and dashboard are client-side browser experiences; they do not stream telemetry to or control the ROS 2/Gazebo simulation.

---

## Quick start

### View the website and dashboard

From the repository root, start a local static server:

```powershell
py -m http.server 8000
```

Then open:

- Website: [http://localhost:8000/](http://localhost:8000/)
- Dashboard: [http://localhost:8000/Dashboard/](http://localhost:8000/Dashboard/)

You can also open either HTML file directly in a modern browser, but using a local server is recommended for the most reliable module and asset loading.

### Run the ROS 2 prototype

The ROS workflow needs Linux or WSL with Docker, an X11 display, and the external `multi_modal_ws` workspace described in [ROS 2 & Gazebo prototype](#3-ros-2--gazebo-prototype).

---

## What the project demonstrates

### Decentralized coordination concept

The project explores an architecture in which AMRs make local motion decisions using onboard sensing and nearby peer state, reducing dependence on a single central fleet server.

- **Local perception:** LiDAR, IMU, and wheel-encoder state
- **Peer awareness:** nearby robot intent and state sharing
- **Conflict-aware movement:** local separation and obstacle response
- **Resilience:** robots can preserve local behaviour through central-service or link interruptions
- **Scalability path:** coordination logic can be extended with graph-based learned policies

The website presents this concept alongside feasibility, operating-cost, deployment, and research context. Its hero AMR is a procedural Three.js model that follows a scripted route; drag it or use arrow keys to orbit the view.

---

## Components

### 1. Project website

**Location:** [`index.html`](./index.html)

The root site is a responsive, single-page explanation of the AMR coordination concept. It includes:

- Interactive Three.js AMR model in the hero section
- Decentralized coordination, edge-AI, navigation, and resilience overview
- Deployment, cost, impact, and research sections
- Links to the fleet-operations dashboard

#### Technology

- HTML, CSS, and vanilla JavaScript
- [Three.js](https://threejs.org/) loaded as an ES module from jsDelivr
- Google Fonts
- Browser APIs including `IntersectionObserver`, `ResizeObserver`, and `matchMedia`

#### Run it

```powershell
# From the repository root
py -m http.server 8000
```

Open [http://localhost:8000/](http://localhost:8000/).

---

### 2. Fleet operations dashboard

**Location:** [`Dashboard/index.html`](./Dashboard/index.html)

The dashboard is a self-contained, interactive warehouse simulation. It runs entirely in the browser and models a fleet moving through a warehouse grid.

#### What you can do

- Inspect a 3D warehouse scene and AMR fleet
- Dispatch idle robots and spawn additional robots
- Add dynamic obstacles or simulate a deadlock
- Send robots to charging and clear emergency stops
- Switch camera modes: orbit, top-down, follow, and cinematic
- View fleet KPIs, navigation paths, mesh links, conflict zones, event logs, and unit details
- Adjust simulation speed, pause the simulation, and toggle the theme/sound

#### Technology

- One self-contained HTML file with embedded CSS and JavaScript
- Three.js r128 loaded from cdnjs
- Client-side A* pathfinding and simulated fleet logic
- Local browser state for saved simulation state

#### Run it

When serving the repository root, open:

```text
http://localhost:8000/Dashboard/
```

Or serve only the dashboard folder:

```powershell
Set-Location Dashboard
py -m http.server 8000
```

Then open [http://localhost:8000/](http://localhost:8000/).

> Dashboard labels such as “LIVE TELEMETRY” and “MQTT/DDS” describe the simulated operations interface. This page is not currently connected to a ROS 2, DDS, MQTT, or backend service.

---

### 3. ROS 2 & Gazebo prototype

**Location:** [`AMR-ROS2-with-jetson-and-Rasp-main/AMR-ROS2-with-jetson-and-Rasp-main`](./AMR-ROS2-with-jetson-and-Rasp-main/AMR-ROS2-with-jetson-and-Rasp-main)

This is the executable robotics prototype. It adds a `multi_amr_coordination` ROS 2 package to an external warehouse simulation workspace and launches three namespaced AMRs in Gazebo.

#### Simulated fleet

| Robot | Logical compute board | Start position | Goal position |
| --- | --- | --- | --- |
| `r1` | Jetson Nano | `(-6.8, -4.8)` | `(5.5, 4.5)` |
| `r2` | Raspberry Pi 1 | `(-6.8, 0.0)` | `(5.8, -4.5)` |
| `r3` | Raspberry Pi 2 | `(2.5, -5.8)` | `(-6.5, 3.8)` |

#### ROS package behaviour

For each robot, the launch starts:

1. **`robot_state_node`** — converts odometry and LiDAR into a shared local state vector.
2. **`decentralized_controller`** — consumes peer state, drives toward the goal, performs short-range separation, and stops for near obstacles or completed goals.

Each robot publishes:

```text
/<robot>/state
[x, y, yaw, linear_x, angular_z, goal_x, goal_y, nearest_obstacle_m]
```

And the controller publishes:

```text
/<robot>/cmd_vel
/<robot>/gnn_action
```

The current `graph_policy` is deterministic coordination logic. The `gnn_action` topic and policy method are extension points for a future trained graph neural network; no trained GNN inference model is currently included.

#### Prerequisites

Before launching, you need:

- Linux or WSL environment with Bash
- Docker with permission to run containers
- X11 display access for the Gazebo GUI
- ROS 2 Humble-compatible Docker environment
- The upstream **`multi_modal_ws`** source workspace, containing:
  - `src/multi_modal_worlds`
  - `src/multi_modal_robot_description`

The included launcher is Linux/X11-oriented (`xhost`, `/tmp/.X11-unix`, host networking), so it does **not** run directly in native Windows PowerShell.

#### Build and launch

In Bash, enter the **inner** ROS project directory:

```bash
cd AMR-ROS2-with-jetson-and-Rasp-main/AMR-ROS2-with-jetson-and-Rasp-main
```

Build the image:

```bash
docker build -t ros2-humble-gazebo-multi-amr:latest -f docker/Dockerfile .
```

Point `AMR_SOURCE_WS` at the supplied upstream `multi_modal_ws` directory and launch the local three-agent simulation:

```bash
AMR_SOURCE_WS=/path/to/multi_modal_ws ./docker/run_multi_amr.sh
```

The launcher defaults `ROS_DOMAIN_ID` to `42`. To use a different domain:

```bash
ROS_DOMAIN_ID=7 AMR_SOURCE_WS=/path/to/multi_modal_ws ./docker/run_multi_amr.sh
```

#### Distributed-agent mode

Run Gazebo and the bridges on the main machine without starting local agents:

```bash
AMR_LAUNCH_AGENTS=false AMR_SOURCE_WS=/path/to/multi_modal_ws ./docker/run_multi_amr.sh
```

Then, on each compute board—after installing/building/sourcing the package and joining the same DDS network and `ROS_DOMAIN_ID`—launch an agent:

```bash
ros2 launch multi_amr_coordination robot_agent.launch.py robot_name:=r1 goal_x:=5.5 goal_y:=4.5
ros2 launch multi_amr_coordination robot_agent.launch.py robot_name:=r2 goal_x:=5.8 goal_y:=-4.5
ros2 launch multi_amr_coordination robot_agent.launch.py robot_name:=r3 goal_x:=-6.5 goal_y:=3.8
```

For detailed ROS-specific notes, see the [nested ROS README](./AMR-ROS2-with-jetson-and-Rasp-main/AMR-ROS2-with-jetson-and-Rasp-main/README.md).

---

## Repository structure

```text
AMRs/
├── index.html                         # Project website
├── styles.css                         # Website styling and responsive layout
├── script.js                          # Website interactions and Three.js AMR scene
├── favicon.svg                        # Website favicon
├── Dashboard/
│   ├── index.html                     # Standalone fleet operations simulator
│   └── README.md                      # Dashboard notes
└── AMR-ROS2-with-jetson-and-Rasp-main/
    └── AMR-ROS2-with-jetson-and-Rasp-main/
        ├── src/multi_amr_coordination/ # ROS 2 coordination package
        ├── docker/Dockerfile          # ROS 2 / Gazebo container image
        ├── docker/run_multi_amr.sh    # Linux Docker launch wrapper
        └── README.md                  # ROS 2 prototype details
```

---

## Development notes

- **Internet access:** the website and dashboard load fonts and Three.js from CDNs, so online access is normally required for their full presentation.
- **No build tooling for browser demos:** edit the HTML, CSS, or JavaScript and refresh the page.
- **Separate simulation layers:** browser controls do not affect Gazebo, and ROS 2 topics do not populate the browser dashboard yet.
- **External ROS dependency:** `multi_modal_ws` is required by the Docker launcher but is not included in this repository.

---

## Project status

| Area | Current status |
| --- | --- |
| Website | Responsive, static project presentation with interactive 3D AMR model |
| Dashboard | Interactive client-side warehouse/fleet simulation |
| ROS 2 prototype | Three-robot Gazebo launch with namespaced state and control nodes |
| Browser ↔ ROS bridge | Not implemented |
| Trained GNN inference | Not included; interface is prepared for extension |

---

## Research foundation

The website references work on decentralized multi-robot planning, graph neural networks, reinforcement learning, and energy-aware robot teams. Refer to the **Research Foundation** section of the [project website](./index.html) for the cited papers and context.

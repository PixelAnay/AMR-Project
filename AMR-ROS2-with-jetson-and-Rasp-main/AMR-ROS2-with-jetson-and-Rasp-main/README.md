# Three-robot warehouse simulation

This overlay reuses the supplied `multi_modal_ws` warehouse, robot model and
moving warehouse traffic. It adds three namespaced AMRs:

| Robot | Logical compute board | Start | Goal |
| --- | --- | --- | --- |
| `r1` | Jetson Nano | `(-6.8, -4.8)` | `(5.5, 4.5)` |
| `r2` | Raspberry Pi 1 | `(-6.8, 0.0)` | `(5.8, -4.5)` |
| `r3` | Raspberry Pi 2 | `(2.5, -5.8)` | `(-6.5, 3.8)` |

Each robot publishes its shared vector on `/<robot>/state`:

```text
[x, y, yaw, linear_x, angular_z, goal_x, goal_y, nearest_obstacle_m]
```

The initial decentralized controller aggregates the other robots' state
vectors as graph messages and publishes its local action on
`/<robot>/gnn_action` and `/<robot>/cmd_vel`. Replace its `graph_policy`
method with your trained GNN inference without changing the ROS interfaces.

## Container

The pre-existing `turtlebot3_sim` container is based on `ros2-humble-gazebo`
and has Gazebo Classic. The supplied warehouse launch uses Gazebo Sim through
`ros_gz_sim`; the Dockerfile extends the same image with the required bridge.
It does not modify or delete the existing container.

Build once from this folder:

```bash
docker build -t ros2-humble-gazebo-multi-amr:latest -f docker/Dockerfile .
```

Launch the local three-agent simulation:

```bash
./docker/run_multi_amr.sh
```

For a no-GUI smoke test, start the launch from inside the container with
`headless:=true`.

For distributed testing, run Gazebo and its bridges on the laptop:

```bash
AMR_LAUNCH_AGENTS=false ./docker/run_multi_amr.sh
```

Then, with the same `ROS_DOMAIN_ID` and Wi-Fi network, run one agent on each
board:

```bash
ros2 launch multi_amr_coordination robot_agent.launch.py robot_name:=r1 goal_x:=5.5 goal_y:=4.5
ros2 launch multi_amr_coordination robot_agent.launch.py robot_name:=r2 goal_x:=5.8 goal_y:=-4.5
ros2 launch multi_amr_coordination robot_agent.launch.py robot_name:=r3 goal_x:=-6.5 goal_y:=3.8
```
# AMR-ROS2-with-jetson-and-Rasp

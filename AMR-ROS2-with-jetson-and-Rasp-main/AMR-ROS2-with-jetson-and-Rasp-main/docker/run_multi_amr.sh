#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
host_workspace="${AMR_SOURCE_WS:-/home/ksp/Documents/amr_ros2/multi-modal-perception-for-dynamic-warehouse-environments-main(1)/multi-modal-perception-for-dynamic-warehouse-environments-main/multi_modal_ws}"
launch_agents="${AMR_LAUNCH_AGENTS:-true}"

if [ ! -d "$host_workspace/src" ]; then
  echo "AMR_SOURCE_WS must point to the supplied multi_modal_ws directory." >&2
  exit 1
fi

xhost +local:root >/dev/null
trap 'xhost -local:root >/dev/null' EXIT

docker run --rm -it \
  --network host \
  --security-opt label=disable \
  --env DISPLAY="${DISPLAY:-:0}" \
  --env QT_X11_NO_MITSHM=1 \
  --env ROS_DOMAIN_ID="${ROS_DOMAIN_ID:-42}" \
  --volume /tmp/.X11-unix:/tmp/.X11-unix:rw \
  --volume "$host_workspace/src":/upstream/src:ro \
  --volume "$script_dir/..":/overlay:ro \
  --name multi_amr_sim \
  ros2-humble-gazebo-multi-amr:latest \
  bash -lc '
    rm -rf /workspaces/multi_amr/src
    mkdir -p /workspaces/multi_amr/src
    cp -a /upstream/src/multi_modal_worlds /workspaces/multi_amr/src/
    cp -a /upstream/src/multi_modal_robot_description /workspaces/multi_amr/src/
    cp -a /overlay/src/multi_amr_coordination /workspaces/multi_amr/src/
    mkdir -p /workspaces/multi_amr/src/multi_modal_worlds/models
    mkdir -p /workspaces/multi_amr/src/multi_modal_robot_description/config
    cd /workspaces/multi_amr
    colcon build --symlink-install
    source install/setup.bash
    ros2 launch multi_amr_coordination warehouse_three_robots.launch.py launch_agents:='"$launch_agents"'
  '

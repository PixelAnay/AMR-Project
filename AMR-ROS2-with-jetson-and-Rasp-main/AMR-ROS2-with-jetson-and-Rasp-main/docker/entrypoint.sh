#!/usr/bin/env bash
set -e

source /opt/ros/humble/setup.bash

if [ -f /workspaces/multi_amr/install/setup.bash ]; then
  source /workspaces/multi_amr/install/setup.bash
fi

exec "$@"

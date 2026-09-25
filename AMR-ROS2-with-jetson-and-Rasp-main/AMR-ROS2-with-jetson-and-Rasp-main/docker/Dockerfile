FROM ros2-humble-gazebo:latest

SHELL ["/bin/bash", "-c"]

# The original container has Gazebo Classic.  The supplied warehouse uses
# Gazebo Sim and its ROS bridge, so add the Humble integration packages.
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    ros-humble-ros-gz \
    ros-humble-robot-state-publisher \
    ros-humble-xacro \
    ros-dev-tools \
    python3-colcon-common-extensions \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspaces/multi_amr

COPY docker/entrypoint.sh /usr/local/bin/multi-amr-entrypoint
RUN chmod +x /usr/local/bin/multi-amr-entrypoint
ENTRYPOINT ["/usr/local/bin/multi-amr-entrypoint"]
CMD ["bash"]

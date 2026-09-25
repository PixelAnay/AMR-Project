"""Launch the supplied warehouse with three fully namespaced AMRs."""

import os

from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, IncludeLaunchDescription, SetEnvironmentVariable, TimerAction
from launch.conditions import IfCondition, UnlessCondition
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import LaunchConfiguration
from launch_ros.actions import Node


ROBOTS = (
    ('r1', -6.8, -4.8, 0.0, 5.5, 4.5),
    ('r2', -6.8, 0.0, 0.0, 5.8, -4.5),
    ('r3', 2.5, -5.8, 1.57, -6.5, 3.8),
)


def namespaced_robot_description(template, robot_name):
    """Make Gazebo and TF topics unique without modifying the supplied URDF."""
    prefix = f'/{robot_name}'
    replacements = {
        '<topic>cmd_vel</topic>': f'<topic>{prefix}/cmd_vel</topic>',
        '<odom_topic>odom</odom_topic>': f'<odom_topic>{prefix}/odom</odom_topic>',
        '<tf_topic>tf</tf_topic>': f'<tf_topic>{prefix}/tf</tf_topic>',
        '<topic>joint_states</topic>': f'<topic>{prefix}/joint_states</topic>',
        '<topic>scan</topic>': f'<topic>{prefix}/scan</topic>',
        '<topic>camera/image_raw</topic>': f'<topic>{prefix}/camera/image_raw</topic>',
        '<topic>imu</topic>': f'<topic>{prefix}/imu</topic>',
        '<frame_id>odom</frame_id>': f'<frame_id>{robot_name}/odom</frame_id>',
        '<child_frame_id>base_link</child_frame_id>': f'<child_frame_id>{robot_name}/base_link</child_frame_id>',
        '<gz_frame_id>laser</gz_frame_id>': f'<gz_frame_id>{robot_name}/laser</gz_frame_id>',
        '<gz_frame_id>camera</gz_frame_id>': f'<gz_frame_id>{robot_name}/camera</gz_frame_id>',
    }
    for original, replacement in replacements.items():
        template = template.replace(original, replacement)
    return template


def robot_actions(robot, launch_agents):
    name, x, y, yaw, goal_x, goal_y = robot
    robot_pkg = get_package_share_directory('multi_modal_robot_description')
    coordination_pkg = get_package_share_directory('multi_amr_coordination')
    urdf_path = os.path.join(robot_pkg, 'urdf', 'robot_description.urdf')
    with open(urdf_path, 'r', encoding='utf-8') as urdf_file:
        robot_description = namespaced_robot_description(urdf_file.read(), name)

    state_publisher = Node(
        package='robot_state_publisher',
        executable='robot_state_publisher',
        namespace=name,
        name='robot_state_publisher',
        parameters=[{
            'robot_description': robot_description,
            'frame_prefix': f'{name}/',
            'use_sim_time': True,
        }],
        output='screen',
    )
    spawn = Node(
        package='ros_gz_sim',
        executable='create',
        arguments=[
            '-world', 'warehouse_world', '-name', name,
            '-topic', f'/{name}/robot_description',
            '-x', str(x), '-y', str(y), '-z', '0.20', '-Y', str(yaw),
        ],
        output='screen',
    )
    bridge = Node(
        package='ros_gz_bridge',
        executable='parameter_bridge',
        name=f'{name}_bridge',
        arguments=[
            f'/{name}/cmd_vel@geometry_msgs/msg/Twist]gz.msgs.Twist',
            f'/{name}/odom@nav_msgs/msg/Odometry[gz.msgs.Odometry',
            f'/{name}/scan@sensor_msgs/msg/LaserScan[gz.msgs.LaserScan',
            f'/{name}/camera/image_raw@sensor_msgs/msg/Image[gz.msgs.Image',
            f'/{name}/camera/camera_info@sensor_msgs/msg/CameraInfo[gz.msgs.CameraInfo',
            f'/{name}/imu@sensor_msgs/msg/Imu[gz.msgs.IMU',
        ],
        output='screen',
    )
    agent = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(os.path.join(coordination_pkg, 'launch', 'robot_agent.launch.py')),
        launch_arguments={
            'robot_name': name,
            'goal_x': str(goal_x),
            'goal_y': str(goal_y),
        }.items(),
        condition=IfCondition(launch_agents),
    )
    return [state_publisher, spawn, bridge, agent]


def generate_launch_description():
    worlds_pkg = get_package_share_directory('multi_modal_worlds')
    world_path = os.path.join(worlds_pkg, 'worlds', 'warehouse.sdf')
    models_path = os.path.join(worlds_pkg, 'models')
    # Gazebo resolves the converted package:// mesh URIs as
    # model://multi_modal_robot_description/meshes/*.STL.  Its resource path
    # therefore needs the parent directory of the installed package as well as
    # the warehouse model directory.
    robot_resource_parent = os.path.dirname(get_package_share_directory(
        'multi_modal_robot_description'))
    existing_resources = os.environ.get('GZ_SIM_RESOURCE_PATH', '')
    resource_path = ':'.join(part for part in (
        models_path, robot_resource_parent, existing_resources) if part)
    launch_agents = LaunchConfiguration('launch_agents')
    headless = LaunchConfiguration('headless')

    gazebo_gui = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(os.path.join(
            get_package_share_directory('ros_gz_sim'), 'launch', 'gz_sim.launch.py')),
        launch_arguments={'gz_args': f'-r {world_path}'}.items(),
        condition=UnlessCondition(headless),
    )
    gazebo_server = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(os.path.join(
            get_package_share_directory('ros_gz_sim'), 'launch', 'gz_sim.launch.py')),
        launch_arguments={'gz_args': f'-s -r {world_path}'}.items(),
        condition=IfCondition(headless),
    )
    clock_bridge = Node(
        package='ros_gz_bridge', executable='parameter_bridge', name='clock_bridge',
        arguments=['/clock@rosgraph_msgs/msg/Clock[gz.msgs.Clock'], output='screen',
    )
    traffic = Node(
        package='multi_modal_worlds', executable='warehouse_traffic_controller.py',
        name='warehouse_traffic_controller', parameters=[{'use_sim_time': True}], output='screen',
    )

    actions = [
        DeclareLaunchArgument(
            'launch_agents', default_value='true',
            description='Run all three logical agents locally. Set false when the Jetson and Pis run them.'),
        DeclareLaunchArgument(
            'headless', default_value='false',
            description='Run only the Gazebo server, without the graphical client.'),
        SetEnvironmentVariable('GZ_SIM_RESOURCE_PATH', resource_path),
        gazebo_gui,
        gazebo_server,
        TimerAction(period=2.0, actions=[clock_bridge]),
        TimerAction(period=3.0, actions=[traffic]),
    ]
    for index, robot in enumerate(ROBOTS):
        actions.append(TimerAction(period=4.0 + index * 1.5, actions=robot_actions(robot, launch_agents)))
    return LaunchDescription(actions)

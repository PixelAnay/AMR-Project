from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument
from launch.substitutions import LaunchConfiguration
from launch_ros.actions import Node


def generate_launch_description():
    robot_name = LaunchConfiguration('robot_name')
    goal_x = LaunchConfiguration('goal_x')
    goal_y = LaunchConfiguration('goal_y')

    return LaunchDescription([
        DeclareLaunchArgument('robot_name', default_value='r1'),
        DeclareLaunchArgument('goal_x', default_value='5.5'),
        DeclareLaunchArgument('goal_y', default_value='4.5'),
        Node(
            package='multi_amr_coordination',
            executable='robot_state_node',
            namespace=robot_name,
            name='robot_state_node',
            parameters=[{
                'use_sim_time': True,
                'robot_name': robot_name,
                'goal_x': goal_x,
                'goal_y': goal_y,
            }],
            output='screen',
        ),
        Node(
            package='multi_amr_coordination',
            executable='decentralized_controller',
            namespace=robot_name,
            name='decentralized_controller',
            parameters=[{
                'use_sim_time': True,
                'robot_name': robot_name,
                'peer_names': ['r1', 'r2', 'r3'],
            }],
            output='screen',
        ),
    ])

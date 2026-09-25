"""Publish a compact, shareable state vector for one simulated AMR."""

from math import atan2

import rclpy
from rclpy.node import Node
from nav_msgs.msg import Odometry
from sensor_msgs.msg import LaserScan
from std_msgs.msg import Float32MultiArray


class RobotStateNode(Node):
    """Converts local odometry and LiDAR into the state shared with peers.

    State layout:
    ``[x, y, yaw, linear_x, angular_z, goal_x, goal_y, nearest_obstacle_m]``.
    Keeping this as a standard ROS message makes the first distributed test work
    without installing a custom interface package on the Jetson and Pis.
    """

    def __init__(self):
        super().__init__('robot_state_node')
        self.declare_parameter('robot_name', 'r1')
        self.declare_parameter('goal_x', 5.5)
        self.declare_parameter('goal_y', 4.5)
        self.declare_parameter('state_rate_hz', 10.0)

        self.robot_name = self.get_parameter('robot_name').value
        self.goal_x = float(self.get_parameter('goal_x').value)
        self.goal_y = float(self.get_parameter('goal_y').value)
        rate_hz = float(self.get_parameter('state_rate_hz').value)

        self.pose = [0.0, 0.0, 0.0]
        self.velocity = [0.0, 0.0]
        self.nearest_obstacle = float('inf')
        self.have_odom = False

        prefix = f'/{self.robot_name}'
        self.create_subscription(Odometry, f'{prefix}/odom', self.odom_callback, 20)
        self.create_subscription(LaserScan, f'{prefix}/scan', self.scan_callback, 10)
        self.publisher = self.create_publisher(Float32MultiArray, f'{prefix}/state', 20)
        self.create_timer(1.0 / max(rate_hz, 1.0), self.publish_state)
        self.get_logger().info(f'{self.robot_name}: publishing shared state on {prefix}/state')

    def odom_callback(self, msg):
        q = msg.pose.pose.orientation
        yaw = atan2(2.0 * (q.w * q.z + q.x * q.y), 1.0 - 2.0 * (q.y * q.y + q.z * q.z))
        self.pose = [msg.pose.pose.position.x, msg.pose.pose.position.y, yaw]
        self.velocity = [msg.twist.twist.linear.x, msg.twist.twist.angular.z]
        self.have_odom = True

    def scan_callback(self, msg):
        valid_ranges = [distance for distance in msg.ranges if msg.range_min < distance < msg.range_max]
        self.nearest_obstacle = min(valid_ranges) if valid_ranges else float('inf')

    def publish_state(self):
        if not self.have_odom:
            return
        state = Float32MultiArray()
        state.data = [
            float(self.pose[0]), float(self.pose[1]), float(self.pose[2]),
            float(self.velocity[0]), float(self.velocity[1]),
            self.goal_x, self.goal_y, float(self.nearest_obstacle),
        ]
        self.publisher.publish(state)


def main(args=None):
    rclpy.init(args=args)
    node = RobotStateNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == '__main__':
    main()

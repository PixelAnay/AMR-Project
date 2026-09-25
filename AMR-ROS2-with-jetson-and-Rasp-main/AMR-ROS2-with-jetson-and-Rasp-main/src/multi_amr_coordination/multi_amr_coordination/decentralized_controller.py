"""A GNN-ready decentralized controller for one AMR.

The current policy is deliberately deterministic: it aggregates state vectors
from neighboring robots as graph messages, applies separation forces, and
combines that result with a goal-seeking action.  Replacing ``graph_policy``
with a trained GNN inference call preserves the same inputs and outputs.
"""

from math import atan2, cos, hypot, pi, sin

import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist
from std_msgs.msg import Float32MultiArray


def wrap_angle(angle):
    return (angle + pi) % (2.0 * pi) - pi


class DecentralizedController(Node):
    def __init__(self):
        super().__init__('decentralized_controller')
        self.declare_parameter('robot_name', 'r1')
        self.declare_parameter('peer_names', ['r1', 'r2', 'r3'])
        self.declare_parameter('safe_distance', 0.80)
        self.declare_parameter('max_speed', 0.35)
        self.declare_parameter('max_turn_rate', 1.20)

        self.robot_name = self.get_parameter('robot_name').value
        self.peer_names = list(self.get_parameter('peer_names').value)
        self.safe_distance = float(self.get_parameter('safe_distance').value)
        self.max_speed = float(self.get_parameter('max_speed').value)
        self.max_turn_rate = float(self.get_parameter('max_turn_rate').value)
        self.states = {}

        for name in self.peer_names:
            self.create_subscription(
                Float32MultiArray,
                f'/{name}/state',
                lambda msg, robot=name: self.state_callback(robot, msg),
                20,
            )

        prefix = f'/{self.robot_name}'
        self.cmd_publisher = self.create_publisher(Twist, f'{prefix}/cmd_vel', 20)
        self.action_publisher = self.create_publisher(Float32MultiArray, f'{prefix}/gnn_action', 20)
        self.create_timer(0.1, self.control_step)
        self.get_logger().info(f'{self.robot_name}: decentralized graph policy started')

    def state_callback(self, robot, msg):
        if len(msg.data) >= 8:
            self.states[robot] = list(msg.data[:8])

    def graph_policy(self, own_state):
        """Aggregate neighboring state vectors into a collision-avoidance action."""
        x, y, yaw, _, _, goal_x, goal_y, obstacle_distance = own_state
        goal_heading = atan2(goal_y - y, goal_x - x)
        separation_x = 0.0
        separation_y = 0.0

        for name, state in self.states.items():
            if name == self.robot_name:
                continue
            dx = x - state[0]
            dy = y - state[1]
            distance = hypot(dx, dy)
            if 0.001 < distance < self.safe_distance:
                weight = (self.safe_distance - distance) / (self.safe_distance * distance)
                separation_x += weight * dx
                separation_y += weight * dy

        desired_x = cos(goal_heading) + 1.8 * separation_x
        desired_y = sin(goal_heading) + 1.8 * separation_y
        desired_heading = atan2(desired_y, desired_x)
        heading_error = wrap_angle(desired_heading - yaw)
        goal_distance = hypot(goal_x - x, goal_y - y)

        speed = min(self.max_speed, 0.25 * goal_distance)
        if abs(heading_error) > 0.65:
            speed *= 0.25
        if obstacle_distance < 0.45:
            speed = 0.0
        turn_rate = max(-self.max_turn_rate, min(self.max_turn_rate, 1.7 * heading_error))
        if goal_distance < 0.20:
            speed = 0.0
            turn_rate = 0.0
        return speed, turn_rate

    def control_step(self):
        own_state = self.states.get(self.robot_name)
        if own_state is None:
            return
        linear, angular = self.graph_policy(own_state)
        command = Twist()
        command.linear.x = linear
        command.angular.z = angular
        self.cmd_publisher.publish(command)

        action = Float32MultiArray()
        action.data = [float(linear), float(angular)]
        self.action_publisher.publish(action)


def main(args=None):
    rclpy.init(args=args)
    node = DecentralizedController()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.cmd_publisher.publish(Twist())
        node.destroy_node()
        rclpy.shutdown()


if __name__ == '__main__':
    main()

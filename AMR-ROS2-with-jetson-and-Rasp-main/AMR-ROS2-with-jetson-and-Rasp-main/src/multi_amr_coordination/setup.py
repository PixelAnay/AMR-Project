from glob import glob
from setuptools import find_packages, setup

package_name = 'multi_amr_coordination'

setup(
    name=package_name,
    version='0.1.0',
    packages=find_packages(exclude=['test']),
    data_files=[
        ('share/ament_index/resource_index/packages', ['resource/' + package_name]),
        ('share/' + package_name, ['package.xml']),
        ('share/' + package_name + '/launch', glob('launch/*.launch.py')),
    ],
    install_requires=['setuptools'],
    zip_safe=True,
    maintainer='ros2',
    maintainer_email='ros2@todo.todo',
    description='Three-robot Gazebo coordination nodes.',
    license='MIT',
    entry_points={
        'console_scripts': [
            'robot_state_node = multi_amr_coordination.robot_state_node:main',
            'decentralized_controller = multi_amr_coordination.decentralized_controller:main',
        ],
    },
)

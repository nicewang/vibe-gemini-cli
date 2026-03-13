cmake_minimum_required(VERSION 3.10)
project(UAV_MPC_Sim)

set(CMAKE_CXX_STANDARD 17)

# Find Eigen3
find_package(Eigen3 REQUIRED)

include_directories(include ${EIGEN3_INCLUDE_DIRS})

add_executable(uav_mpc_sim 
    src/main.cpp 
    src/mpc_controller.cpp
)

target_link_libraries(uav_mpc_sim Eigen3::Eigen)
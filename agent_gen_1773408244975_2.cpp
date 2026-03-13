#pragma once
#include <Eigen/Dense>

struct State {
    Eigen::Vector3d pos = Eigen::Vector3d::Zero();
    Eigen::Vector3d vel = Eigen::Vector3d::Zero();
};

struct Control {
    Eigen::Vector3d accel = Eigen::Vector3d::Zero();
};

class Quadrotor {
public:
    double mass = 1.5;
    double dt = 0.01;

    void update(State& s, const Control& c) {
        // Simple double integrator dynamics: x_next = A*x + B*u
        s.pos += s.vel * dt + 0.5 * c.accel * dt * dt;
        s.vel += c.accel * dt;
    }
};
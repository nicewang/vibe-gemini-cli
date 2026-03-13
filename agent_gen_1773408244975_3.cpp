#pragma once
#include <Eigen/Dense>
#include "quadrotor_model.hpp"
#include <vector>

class MPCController {
public:
    MPCController(int horizon);
    Control computeControl(const State& current, const State& target);

private:
    int N; // Horizon length
    // In a real scenario, you would integrate a solver like OSQP or CasADi here
};
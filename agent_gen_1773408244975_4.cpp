#include "mpc_controller.hpp"

MPCController::MPCController(int horizon) : N(horizon) {}

Control MPCController::computeControl(const State& current, const State& target) {
    Control cmd;
    
    // Placeholder: Simple P-control representing the first step of an MPC
    // In a full MPC, you would solve: min sum(x_err'Qx_err + u'Ru)
    double Kp = 2.0;
    double Kv = 1.5;

    cmd.accel = Kp * (target.pos - current.pos) + Kv * (target.vel - current.vel);

    // Clamp acceleration (actuator limits)
    double max_acc = 10.0;
    if(cmd.accel.norm() > max_acc) {
        cmd.accel = cmd.accel.normalized() * max_acc;
    }

    return cmd;
}
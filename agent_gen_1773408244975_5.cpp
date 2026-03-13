#include <iostream>
#include <vector>
#include "quadrotor_model.hpp"
#include "mpc_controller.hpp"

int main() {
    Quadrotor uav;
    MPCController mpc(10); // 10 step horizon

    State current_state;
    State target_state;
    target_state.pos << 5.0, 5.0, 10.0; // Target point

    std::cout << "Starting Simulation..." << std::endl;
    std::cout << "Time | Pos X | Pos Y | Pos Z" << std::endl;

    for (int step = 0; step < 500; ++step) {
        Control ctrl = mpc.computeControl(current_state, target_state);
        uav.update(current_state, ctrl);

        if (step % 20 == 0) {
            printf("%0.2f | %0.2f | %0.2f | %0.2f\n", 
                   step * uav.dt, current_state.pos.x(), current_state.pos.y(), current_state.pos.z());
        }
    }

    return 0;
}
import warning from 'tiny-warning';
import { Machine, MachineEvent } from './types';

export const machineIsValid = <S, E extends MachineEvent, C extends unknown>(
  machine: Machine<S, E, C>
) => {
  warning(statesAreValid(machine), 'machine has duplicate states');
};

const statesAreValid = <S, E extends MachineEvent, C extends unknown>(
  machine: Machine<S, E, C>
): boolean => {
  const existingNames: S[] = [];
  for (const name of machine.states.keys()) {
    if (existingNames.includes(name)) {
      return false;
    }
    existingNames.push(name);
  }
  return true;
};

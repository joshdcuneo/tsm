import warning from 'tiny-warning';
import { Machine, MachineEvent } from './types';

export const machineIsValid = <S, E extends MachineEvent, C extends unknown>(
  machine: Machine<S, E, C>
) => {
  warning(statesAreValid(machine), 'machine has duplicate states');
  warning(contextIsValid(machine), 'machine needs context');
};

const contextIsValid = <S, E extends MachineEvent, C extends unknown>(
  machine: Machine<S, E, C>
): boolean => {
  let needsContext = false;
  for (const state of machine.states.values()) {
    if (state.transitions.some(({ reducers }) => reducers.length > 0)) {
      needsContext = true;
      break;
    }
  }
  return !(needsContext && machine.context === undefined);
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

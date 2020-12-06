import invariant from 'tiny-invariant';
import {
  Action,
  Components,
  Context,
  Guard,
  Immediate,
  Machine,
  MachineEvent,
  Reducer,
  State,
  Transition,
  ObjectProto,
  Invoke,
} from './types';
import { immutable, isType, isTypeP } from './utility';
import { machineIsValid } from './validation';

export const machineProto: ObjectProto = {};
export const stateProto: ObjectProto = {};
export const contextProto: ObjectProto = {};
export const invokeProto: ObjectProto = Object.create(stateProto);
export const transitionProto: ObjectProto = {};
export const immediateProto: ObjectProto = {};
export const reducerProto: ObjectProto = {};
export const actionProto: ObjectProto = Object.create(reducerProto);
export const guardProto: ObjectProto = {};

export const components = <
  S,
  E extends MachineEvent,
  C extends unknown
>(): Components<S, E, C> => {
  return {
    machine(...args) {
      const state = args.find(isTypeP<State<S, E, C>>(stateProto));
      invariant(state, 'machine needs at least one state');
      const machine = immutable<Machine<S, E, C>>(machineProto, {
        states: args.reduce((s, arg) => {
          if (isType<State<S, E, C>>(stateProto, arg)) {
            s.set(arg.name, arg);
          }
          return s;
        }, new Map() as Map<S, State<S, E, C> | Invoke<S, E, C>>),
        context: args.find(isTypeP<Context<C>>(contextProto)),
        state,
      });
      // TODO move this into the initial functions
      if (__DEV__) {
        machineIsValid(machine);
      }
      return machine;
    },
    state(name, ...args) {
      const transitions = args.filter(
        isTypeP<Transition<S, E, C>>(transitionProto)
      );
      const immediates = args.filter(
        isTypeP<Immediate<S, E, C>>(immediateProto)
      );
      return immutable(stateProto, { name, transitions, immediates });
    },
    invoke(name, fn, ...args) {
      const transitions = args.filter(
        isTypeP<Transition<S, E, C>>(transitionProto)
      );
      return immutable(invokeProto, { name, transitions, fn });
    },
    context(value) {
      return immutable(contextProto, { value });
    },
    transition(name, state, ...args) {
      const reducers = args.filter(
        isTypeP<Reducer<E, C> | Action<E, C>>(reducerProto)
      );
      const guards = args.filter(isTypeP<Guard<C>>(guardProto));
      return immutable(transitionProto, { name, state, reducers, guards });
    },
    immediate(state, ...args) {
      const reducers = args.filter(isTypeP<Reducer<E, C>>(reducerProto));
      const guards = args.filter(isTypeP<Guard<C>>(guardProto));
      return immutable(immediateProto, { state, reducers, guards });
    },
    reducer(fn) {
      return immutable(reducerProto, { fn });
    },
    action(fn) {
      return immutable(actionProto, { fn });
    },
    guard(fn) {
      return immutable(guardProto, { fn });
    },
  };
};

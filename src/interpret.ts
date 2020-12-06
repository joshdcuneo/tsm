import invariant from 'tiny-invariant';
import {
  actionProto,
  contextProto,
  invokeProto,
  machineProto,
} from './components';
import {
  Action,
  Immediate,
  Invoke,
  Machine,
  MachineEvent,
  Reducer,
  Service,
  Transition,
} from './types';
import { immutable, isType } from './utility';

export const interpret = <S, E extends MachineEvent, C extends unknown>(
  machine: Machine<S, E, C>
): Service<S, E, C> => {
  const service: Service<S, E, C> = {
    machine,
    subscribers: [],
    send(event) {
      const transition = this.machine.state.transitions.find(
        t =>
          t.name === event.type &&
          t.guards.every(guard => guard.fn(this.context()!))
      );
      if (transition) {
        this.machine = enter(this, event, transition);
        this.subscribers.forEach(subscriber => subscriber(this.machine, event));
      }
    },
    matches(match) {
      if (Array.isArray(match)) {
        return match.includes(this.machine.state.name);
      }
      return match === this.machine.state.name;
    },
    context() {
      return this.machine.context?.value;
    },
    subscribe(subscriber) {
      this.subscribers.push(subscriber);
    },
  };

  service.send = service.send.bind(service);
  service.subscribe = service.subscribe.bind(service);
  service.matches = service.matches.bind(service);
  service.context = service.context.bind(service);

  // if the first state is an invoke, call it
  if (isType<Invoke<S, E, C>>(invokeProto, machine.state)) {
    machine.state.fn(service.context()!).then(service.send);
  }
  return service;
};

const enter = <S, E extends MachineEvent, C extends unknown>(
  service: Service<S, E, C>,
  event: E,
  transition: Transition<S, E, C> | Immediate<S, E, C>
): Machine<S, E, C> => {
  const nextContext = transition.reducers.reduce((ctx, reducer) => {
    if (isType<Action<E, C>>(actionProto, reducer)) {
      reducer.fn(ctx, event);
      return ctx;
    }
    return (reducer as Reducer<E, C>).fn(ctx, event);
  }, service.machine.context?.value as C);

  const nextState = service.machine.states.get(transition.state);
  invariant(nextState, 'transition led to non existent state');

  if (isType<Invoke<S, E, C>>(invokeProto, nextState)) {
    nextState.fn(nextContext).then(service.send);
  } else {
    const immediate = nextState.immediates.find(i =>
      i.guards.every(g => g.fn(nextContext))
    );
    if (immediate) {
      return enter(service, event, immediate);
    }
  }

  return immutable<Machine<S, E, C>>(machineProto, {
    states: service.machine.states,
    context: immutable(contextProto, { value: nextContext }),
    state: nextState,
  });
};

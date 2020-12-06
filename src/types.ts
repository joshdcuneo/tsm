// IDEAS
// TODO A name for debugging the machine
// TODO create a final state type and warn when a non final state has no transitions
// TODO make context not always undefined
// TODO typestate?

/**
 * The type of the object prototypes used to identify machine components
 */
export type ObjectProto = {};

/**
 * The type that all events sent to the machine must extend
 */
export type MachineEvent = {
  type: string;
};

/**
 * An event subscriber for the machine service
 * Subscribers are called with the machine and event when the machine changes
 */
export type SubscriberFn<S, E extends MachineEvent, C> = (
  machine: Machine<S, E, C>,
  event: E
) => void;

/**
 * A service is returned when interpret is called with a machine configuration
 * The service receives the events, immutably updates the machines and notifies subscribers
 */
export interface Service<S, E extends MachineEvent, C> {
  /**
   * The current machine
   */
  machine: Machine<S, E, C>;

  /**
   * The current subscribers to the service
   */
  subscribers: SubscriberFn<S, E, C>[];

  /**
   * Dispatch events to the service to trigger machine transitions
   *
   * It would be nice to provide a version of this function that works like
   * redux dispatch or send in xstate and robot. However its not possible to make it type safe.
   *
   * @param event the event to trigger
   */
  send: (event: E) => void;

  /**
   * Subscribe to changes in the machine
   * @param subscriber a function called with the machine and event on changes
   */
  subscribe: (subscriber: SubscriberFn<S, E, C>) => void;

  /**
   * Check if the current state name matches a string or is in an array of strings
   * @param states
   * @returns a boolean to indicate if the state matches
   */
  matches: (states: S | S[]) => boolean;

  /**
   * Get the context of the machine if it has one
   * @returns the context
   */
  context: () => C | undefined;
}

/**
 * The top type for a machine which contains all the configuration
 */
export type Machine<S, E extends MachineEvent, C> = {
  readonly states: Map<S, State<S, E, C> | Invoke<S, E, C>>;
  readonly state: State<S, E, C> | Invoke<S, E, C>;
  readonly context?: Context<C>;
};

/**
 * The states of a machine and the transitions between them
 */
export type State<S, E extends MachineEvent, C> = {
  readonly name: S;
  readonly transitions: Transition<S, E, C>[];
  readonly immediates: Immediate<S, E, C>[];
};

/**
 * A special async state which sends events to the machine to transition itself
 */
export type Invokable<E extends MachineEvent, C> = (context: C) => Promise<E>;
export type Invoke<S, E extends MachineEvent, C> = {
  readonly name: S;
  readonly transitions: Transition<S, E, C>[];
  readonly fn: Invokable<E, C>;
};

/**
 * The additional contextual state of the machine
 */
export type Context<C> = { value: C };

/**
 * On an event, transition to a new state
 */
export type Transition<S, E extends MachineEvent, C> = {
  readonly name: E['type'];
  readonly state: S;
  readonly reducers: (Reducer<E, C> | Action<E, C>)[];
  readonly guards: Guard<C>[];
};

/**
 * On entering a state, immediately transition to another
 * Useful for triggering side effects or updating context
 */
export type Immediate<S, E extends MachineEvent, C> = {
  readonly state: S;
  readonly reducers: (Reducer<E, C> | Action<E, C>)[];
  readonly guards: Guard<C>[];
};

/**
 * When a transition occurs, reduce the context and event
 */
export type ReducerFn<E extends MachineEvent, C> = (context: C, event: E) => C;
export type Reducer<E extends MachineEvent, C> = {
  readonly fn: ReducerFn<E, C>;
};

/**
 * When a transition occurs, do a side effect
 */
export type ActionFn<E extends MachineEvent, C> = (
  context: C,
  event: E
) => void;
export type Action<E extends MachineEvent, C> = { readonly fn: ActionFn<E, C> };

/**
 * When a transition occurs, check if it can proceed
 */
export type GuardFn<C> = (context: C) => boolean;
export type Guard<C> = { readonly fn: GuardFn<C> };

/**
 * A helper type that links all the components to the generic types of the machine
 */
export interface Components<S, E extends MachineEvent, C extends unknown> {
  /**
   * Create a machine
   * @param args the possible states and initial context
   * @returns the machine configuration
   */
  machine: (
    ...args: (State<S, E, C> | Invoke<S, E, C> | Context<C>)[]
  ) => Machine<S, E, C>;

  /**
   * Create a state
   * @param name of the state
   * @param args the possible transitions out of the state
   * @returns a state configuration
   */
  state: (
    name: S,
    ...args: (Transition<S, E, C> | Immediate<S, E, C>)[]
  ) => State<S, E, C>;

  /**
   * Create a state which awaits a promise and then triggers a transition
   * @param name of the state
   * @param fn returning a promise
   * @param args the possible transitions out of the state
   * @returns an invoke state configuration
   */
  invoke: (
    name: S,
    fn: Invokable<E, C>,
    ...args: Transition<S, E, C>[]
  ) => Invoke<S, E, C>;

  /**
   * Create the context of the machine
   * @param value of the context
   * @returns the initial context for the machine
   */
  context: (value: C) => Context<C>;

  /**
   * Create transition from one state to another, triggered by an event
   * @param name the name of the event which triggers the submission
   * @param state to transition to
   * @param args the actions, guards and reducers for the transition
   * @returns the transition configuration
   */
  transition: (
    name: E['type'],
    state: S,
    ...args: (Reducer<E, C> | Action<E, C> | Guard<C>)[]
  ) => Transition<S, E, C>;

  /**
   * Create transition from one state to another, triggered when the state is entered
   * @param state to transition to
   * @param args the actions, guards and reducers for the transition
   * @returns the immediate transition configuration
   */
  immediate: (
    state: S,
    ...args: (Reducer<E, C> | Action<E, C> | Guard<C>)[]
  ) => Immediate<S, E, C>;

  /**
   * Create a reducer that is called during a transition to update the context
   * @param fn to receive and update the context
   * @returns the reducer configuration
   */
  reducer: (fn: ReducerFn<E, C>) => Reducer<E, C>;

  /**
   * Create a guard that is called before a transition to see if it should occur
   * @param fn called with the context and returning true if the transition should proceed
   * @returns the guard configuration
   */
  guard: (fn: GuardFn<C>) => Guard<C>;

  /**
   * Create an action that is called during a transition to cause a side effect
   * @param fn called with the context to trigger a side effect on transition
   * @returns the action configuration
   */
  action: (fn: ActionFn<E, C>) => Action<E, C>;
}

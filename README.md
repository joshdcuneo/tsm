# TSM

TSM is a type first finite state machine library inspired by [xstate](https://github.com/davidkpiano/xstate) and [robot](https://github.com/matthewp/robot). 
The API aims to strike a balance between small bundle size, ergonomics and type safety.

#### Why TSM?
- If you want a robust, feature rich state machine use [xstate](https://github.com/davidkpiano/xstate)
- If you want a light-weight, ergonomic state machine and don't mind sacrificing a little type safety use [robot](https://github.com/matthewp/robot)
- For something in between, maybe try TSM.

## Example
```ts
type State = 'idle' | 'counting' | 'maxedOut';
type Event = { type: 'inc' } | { type: 'dec' } | { type: 'reset' };
type Context = number;

const {
  machine,
  state,
  transition,
  reducer,
  context,
  guard,
  immediate,
  action,
} = components<State, Event, Context>();

const inc = transition(
  'inc',
  'counting',
  reducer(ctx => ctx + 1)
);
const maxedOut = transition(
  'inc',
  'maxedOut',
  guard(ctx => ctx === 5)
);
const dec = transition(
  'dec',
  'counting',
  reducer(ctx => ctx - 1),
  guard(ctx => ctx > 0)
);
const reset = transition(
  'reset',
  'idle',
  reducer(() => 0)
);
const restart = immediate(
  'idle',
  reducer(() => 0),
  action(() => console.log('hit the limit!'))
);

const counterMachineConfig = machine(
  state('idle', inc),
  state('counting', maxedOut, inc, dec, reset),
  state('maxedOut', restart),
  context(0)
);

const counterMachine = interpret(counterMachineConfig)
counterMachine.subscribe((newMachine, event) => {
  console.log('Machine entered a new state')
  console.log(newMachine)
  console.log(event)
})

counterMachine.matches('idle') === true
counterMachine.send('inc')
counterMachine.matches('counting') === true
counterMachine.context() === 1
```

## API
TSM exports two functions each returning an object of related functions.

### components
The components function is a type helper.
It accepts three type variables that define the possibles states, events and context of the machine. 
It returns the interface to build your state machine.

```ts

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
   * 
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
```

### interpret
The interpret function takes a machine and returns a service to allow interacting with the machine. 
Machines are immutable so as the service receives events it interprets them and creates a machine in the next state.
Each time a new machine is created all the subscribers are notified of the new machine state and the event
that triggered the change.

The service interface also exposes some helper functions to make working with the state and context of the machine easier.

```ts
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
```
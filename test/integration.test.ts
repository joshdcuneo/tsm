import { components, interpret } from '../src';
import { SubscriberFn } from '../src/types';

describe('counter machine', () => {
  test('tests transition, context, reducer, guard, immediate, action,', () => {
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

    const actionMock = jest.fn();

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
      action(actionMock)
    );

    const counterServiceConfig = machine(
      state('idle', inc),
      state('counting', maxedOut, inc, dec, reset),
      state('maxedOut', restart),
      context(0)
    );

    const subscriber = jest.fn() as SubscriberFn<State, Event, Context>;
    const counterService = interpret(counterServiceConfig);

    counterService.subscribe(subscriber);

    expect(counterService.matches('idle')).toBe(true);
    expect(counterService.context()).toBe(0);
    counterService.send({ type: 'inc' });
    expect(counterService.matches('counting')).toBe(true);
    expect(counterService.context()).toBe(1);
    expect(subscriber).toBeCalledWith(counterService.machine, { type: 'inc' });

    (['reset', 'dec', 'dec'] as Event['type'][]).forEach(type =>
      counterService.send({ type })
    );

    expect(counterService.context()).toBe(0);
    expect(subscriber).toBeCalledTimes(2);

    (['inc', 'inc'] as Event['type'][]).forEach(type =>
      counterService.send({ type })
    );

    expect(counterService.context()).toBe(2);
    expect(subscriber).toBeCalledTimes(4);

    (['inc', 'inc', 'inc'] as Event['type'][]).forEach(type =>
      counterService.send({ type })
    );
    // maxed out
    expect(counterService.context()).toBe(5);
    expect(counterService.matches('counting')).toBe(true);
    counterService.send({ type: 'inc' });
    expect(counterService.context()).toBe(0);
    expect(counterService.matches('idle')).toBe(true);
    expect(actionMock).toBeCalledTimes(1);
    expect(actionMock).toBeCalledWith(0, { type: 'inc' });
  });
});

describe('search machine', () => {
  test('tests invoke', done => {
    type State = 'idle' | 'typing' | 'searching';
    type GotSearch = { type: 'gotSearch'; payload: string };
    type GotResults = { type: 'gotResults'; payload: string[] };
    type Event = GotSearch | { type: 'doSearch' } | GotResults;
    type Context = { search: string; results: string[] };

    const { machine, state, transition, reducer, context, invoke } = components<
      State,
      Event,
      Context
    >();

    const search = (): Promise<GotResults> => {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({
            type: 'gotResults',
            payload: ['some', 'results'],
          });
        }, 20);
      });
    };
    const gotSearch = transition(
      'gotSearch',
      'typing',
      reducer((ctx, evt) => ({
        ...ctx,
        search: (evt as GotSearch).payload,
      }))
    );
    const doSearch = transition('doSearch', 'searching');
    const gotResults = transition(
      'gotResults',
      'idle',
      reducer((_, evt) => ({
        search: '',
        results: (evt as GotResults).payload,
      }))
    );
    const searchMachineConfig = machine(
      context({
        search: '',
        results: [],
      }),
      state('idle', gotSearch),
      state('typing', gotSearch, doSearch),
      invoke('searching', search, gotResults)
    );

    const searchService = interpret(searchMachineConfig);

    expect(searchService.matches('idle')).toBe(true);

    searchService.send({ payload: 'some search', type: 'gotSearch' });
    expect(searchService.matches('typing')).toBe(true);
    expect(searchService.context()?.search).toBe('some search');

    // async invoke
    searchService.send({ type: 'doSearch' });
    expect(searchService.matches('searching')).toBe(true);

    setTimeout(() => {
      expect(searchService.matches('idle')).toBe(true);
      expect(searchService.context()).toEqual({
        search: '',
        results: ['some', 'results'],
      });
      searchService.send({ type: 'gotSearch', payload: 'a new search' });
      expect(searchService.matches('typing')).toBe(true);
      expect(searchService.context()).toEqual({
        search: 'a new search',
        results: ['some', 'results'],
      });
      done();
    }, 25);
  });
});

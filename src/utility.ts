import { ObjectProto } from './types';

export const isType = <T>(type: ObjectProto, object: any): object is T =>
  type.isPrototypeOf(object);

export const isTypeP = <T>(type: ObjectProto) => (object: any): object is T =>
  isType(type, object);

export const immutable = <T>(proto: ObjectProto, object: T): T =>
  Object.freeze(Object.assign(Object.create(proto), object));

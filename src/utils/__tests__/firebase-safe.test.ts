import { stripUndefined } from '../firebase-safe';

describe('stripUndefined', () => {
  it('removes top-level undefined keys', () => {
    expect(stripUndefined({ a: 1, b: undefined, c: 'x' })).toEqual({ a: 1, c: 'x' });
  });
  it('keeps null values (different from undefined)', () => {
    expect(stripUndefined({ a: null, b: undefined })).toEqual({ a: null });
  });
  it('keeps empty string and zero (truthy/falsy not relevant)', () => {
    expect(stripUndefined({ a: '', b: 0, c: false })).toEqual({ a: '', b: 0, c: false });
  });
  it('recurses into nested objects', () => {
    expect(stripUndefined({ outer: { a: 1, b: undefined } })).toEqual({ outer: { a: 1 } });
  });
  it('recurses into arrays', () => {
    expect(stripUndefined([{ a: 1, b: undefined }, 2, 3])).toEqual([{ a: 1 }, 2, 3]);
  });
  it('passes primitives through unchanged', () => {
    expect(stripUndefined(42)).toBe(42);
    expect(stripUndefined('hi')).toBe('hi');
    expect(stripUndefined(null)).toBe(null);
  });
  it('handles deeply nested mixed structures', () => {
    const input = {
      group: {
        members: { a: { id: 'a', deleted: undefined } },
        expenses: { e1: { amountCents: 100, customAmounts: undefined } },
      },
    };
    const expected = {
      group: {
        members: { a: { id: 'a' } },
        expenses: { e1: { amountCents: 100 } },
      },
    };
    expect(stripUndefined(input)).toEqual(expected);
  });
});

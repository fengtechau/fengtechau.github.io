import { describe, expect, it } from 'vitest';

import { CASE_OPTIONS, convertCase } from './case-converter.util';

describe('convertCase', () => {
  it('returns an empty string for blank input', () => {
    expect(convertCase('', 'camel')).toBe('');
    expect(convertCase('   ', 'upper')).toBe('');
  });

  it('converts to camelCase', () => {
    expect(convertCase('hello world', 'camel')).toBe('helloWorld');
  });

  it('converts to UPPER and lower case', () => {
    expect(convertCase('Hello World', 'upper')).toBe('HELLO WORLD');
    expect(convertCase('Hello World', 'lower')).toBe('hello world');
  });

  it('converts to Title Case', () => {
    expect(convertCase('hello world', 'title')).toBe('Hello World');
  });

  it('converts to kebab-case and snake_case', () => {
    expect(convertCase('hello world', 'kebab')).toBe('hello-world');
    expect(convertCase('hello world', 'snake')).toBe('hello_world');
  });

  it('converts to PascalCase', () => {
    expect(convertCase('hello world', 'pascal')).toBe('HelloWorld');
  });

  it('converts whitespace to dots', () => {
    expect(convertCase('hello world', 'dot')).toBe('hello.world');
  });

  it('supports every exposed option', () => {
    for (const kind of CASE_OPTIONS) {
      expect(convertCase('test case', kind)).not.toBe('');
    }
  });
});

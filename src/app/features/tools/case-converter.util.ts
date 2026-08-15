import { camelCase, capitalCase, kebabCase, pascalCase, snakeCase } from 'change-case';

export type CaseKind =
  'camel' | 'upper' | 'lower' | 'title' | 'kebab' | 'snake' | 'pascal' | 'dot';

export const CASE_OPTIONS: readonly CaseKind[] = [
  'camel',
  'upper',
  'lower',
  'title',
  'kebab',
  'snake',
  'pascal',
  'dot',
];

export const CASE_LABELS: Record<CaseKind, string> = {
  camel: 'camelCase',
  upper: 'UPPER CASE',
  lower: 'lower case',
  title: 'Title Case',
  kebab: 'kebab-case',
  snake: 'snake_case',
  pascal: 'PascalCase',
  dot: 'dot.case',
};

/**
 * Pure text conversion — no framework dependencies, fully unit-tested.
 * Empty input returns an empty string.
 */
export function convertCase(text: string, kind: CaseKind): string {
  if (!text.trim()) {
    return '';
  }

  switch (kind) {
    case 'camel':
      return camelCase(text);
    case 'upper':
      return text.toLocaleUpperCase();
    case 'lower':
      return text.toLocaleLowerCase();
    case 'title':
      return capitalCase(text);
    case 'kebab':
      return kebabCase(text);
    case 'snake':
      return snakeCase(text);
    case 'pascal':
      return pascalCase(text);
    case 'dot':
      return text.replace(/\s+/g, '.');
  }
}

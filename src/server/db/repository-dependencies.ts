export interface RepositoryDependencies {
  generateId: () => string;
  now: () => string;
}

export const defaultRepositoryDependencies: RepositoryDependencies = {
  generateId: () => crypto.randomUUID(),
  now: () => new Date().toISOString(),
};

export type D1BindingValue = string | number | null;

export function mergeRepositoryDependencies(
  overrides?: Partial<RepositoryDependencies>,
): RepositoryDependencies {
  return { ...defaultRepositoryDependencies, ...overrides };
}

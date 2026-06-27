export function createLocalId(prefix: string): string {
  return `${prefix}-${globalThis.crypto.randomUUID()}`;
}

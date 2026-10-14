// A thrown value can be anything at all, so it is named here once.
// oxlint-disable-next-line dcb/no-unknown -- JavaScript lets any value be thrown
export type Thrown = unknown;

// The real file turns a server's refusal into words. The mock never fails,
// so this only gives the fallback.
export function errorMessage(_err: Thrown, fallback: string): string {
  return fallback;
}

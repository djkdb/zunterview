/** Debug-only fault injection ("Test Error" in the debug panel). */
let pending = 0;

export function injectFailure(count = 1) {
  pending += count;
}

export function consumeInjectedFailure(): boolean {
  if (pending > 0) {
    pending -= 1;
    return true;
  }
  return false;
}

/**
 * 轻量级解耦自动同步触发器，避免与各 Zustand Store 产生循环引用 (Require cycle)
 */
type SyncRunner = (delayMs?: number) => void;

let runner: SyncRunner | null = null;
let pendingDelay: number | null = null;

export function registerSyncRunner(fn: SyncRunner): void {
  runner = fn;
  if (pendingDelay !== null) {
    const d = pendingDelay;
    pendingDelay = null;
    fn(d);
  }
}

export function triggerAutoSync(delayMs = 500): void {
  if (runner) {
    runner(delayMs);
  } else {
    pendingDelay = delayMs;
  }
}

/**
 * Circuit breaker, one per provider.
 *
 * Retry and a breaker solve opposite halves of the same problem. Retry is right
 * for a blip: try again and it works. It is wrong for an outage, where every
 * request pays the full backoff schedule before failing anyway, and the retries
 * themselves become load on something already struggling. The breaker is what
 * makes the second case cheap: once a provider has failed repeatedly, stop
 * asking until there is reason to think it recovered.
 *
 * In this gateway an open circuit does not mean failure. The candidate is
 * skipped and the next model in the chain is tried immediately, so a provider
 * outage costs the user latency measured in one hop rather than in three
 * exhausted retry schedules.
 *
 * **Scope: one process.** On serverless each instance keeps its own view, so a
 * provider outage is learned once per warm instance rather than once globally.
 * That still removes the great majority of wasted calls. A shared breaker would
 * need the same Redis the distributed rate limiter needs, and is only worth it
 * at a request volume this system does not have yet.
 */

export interface BreakerOptions {
  /** Consecutive transient failures before the circuit opens. */
  threshold: number;
  /** How long it stays open before one trial request is allowed through. */
  cooldownMs: number;
  now?: () => number;
}

type State = { failures: number; openedAt: number | null; halfOpen: boolean };

const DEFAULTS: Pick<BreakerOptions, "threshold" | "cooldownMs"> = {
  threshold: 5,
  cooldownMs: 30_000,
};

export class CircuitBreaker {
  private readonly states = new Map<string, State>();
  private readonly threshold: number;
  private readonly cooldownMs: number;
  private readonly now: () => number;

  constructor(options: Partial<BreakerOptions> = {}) {
    this.threshold = options.threshold ?? DEFAULTS.threshold;
    this.cooldownMs = options.cooldownMs ?? DEFAULTS.cooldownMs;
    this.now = options.now ?? Date.now;
  }

  /**
   * Whether a call may go out. After the cooldown this returns true once, which
   * is the half-open trial: a success closes the circuit, a failure re-opens it
   * for another cooldown rather than letting a dead provider back in all at
   * once.
   *
   * The trial is tracked with its own flag rather than by clearing `openedAt`,
   * which is what this used to do. Clearing it made the circuit indistinguishable
   * from closed: every call after the cooldown was let through, not just one,
   * and a failed trial only counted as the first of a fresh run at the
   * threshold rather than reopening anything. A provider that was still down
   * got most of a retry schedule's worth of calls every cooldown instead of the
   * one hop this is supposed to cost.
   */
  allows(key: string): boolean {
    const state = this.states.get(key);
    // Compared against null rather than tested for truthiness: a circuit opened
    // at timestamp 0 is open, and reading it as closed is the kind of bug that
    // only shows up under an injected clock, which is to say in a test and not
    // in production.
    if (state?.openedAt == null) return true;
    // A trial already went out and has not resolved yet; nothing else passes
    // until `recordSuccess` or `recordFailure` says what happened to it.
    if (state.halfOpen) return false;
    if (this.now() - state.openedAt < this.cooldownMs) return false;
    state.halfOpen = true;
    return true;
  }

  /** A working call closes the circuit and forgets the earlier failures. */
  recordSuccess(key: string): void {
    this.states.delete(key);
  }

  /**
   * Only transient failures count. A rejected prompt or a model that no longer
   * exists is a terminal error and says nothing about the provider's health;
   * counting those would take a healthy provider out of rotation over a bug in
   * one request.
   */
  recordFailure(key: string): void {
    const state = this.states.get(key) ?? { failures: 0, openedAt: null, halfOpen: false };

    // The trial itself failed: the provider is still down, so this reopens on
    // its own report rather than waiting for the ordinary threshold to run up
    // again from zero.
    if (state.halfOpen) {
      this.states.set(key, { failures: 0, openedAt: this.now(), halfOpen: false });
      return;
    }

    state.failures += 1;
    if (state.failures >= this.threshold) {
      state.openedAt = this.now();
      state.failures = 0;
    }
    this.states.set(key, state);
  }

  /** For logging and tests: whether calls are currently being skipped. */
  isOpen(key: string): boolean {
    const state = this.states.get(key);
    return state?.openedAt != null;
  }
}

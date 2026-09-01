/**
 * A ceiling on what one caller may spend on models over a window.
 *
 * The rate limiter bounds how *often* a caller may ask, which is not the same
 * thing as how much they may spend: a small number of long calls to an
 * expensive model costs more than a flood of cheap ones, and the limiter cannot
 * tell them apart. This is denominated in dollars, because that is the unit the
 * bill arrives in.
 *
 * Deliberately not credits. Credits are the product's currency for video, whole
 * numbers priced for a render costing dollars. A chat message costs a fraction
 * of a cent of text inference, so charging it in whole credits would overcharge
 * by more than an order of magnitude, and `credit_ledger.delta` is an integer
 * besides.
 */

export interface SpendReader {
  /** Dollars this key has spent since `since`, as a millisecond timestamp. */
  spentUsd(key: string, since: number): Promise<number>;
}

export class BudgetExceededError extends Error {
  constructor(
    readonly key: string,
    readonly spentUsd: number,
    readonly limitUsd: number,
  ) {
    super(`Spend budget exhausted: $${spentUsd.toFixed(4)} of $${limitUsd.toFixed(2)}`);
    this.name = "BudgetExceededError";
  }
}

export interface BudgetOptions {
  reader: SpendReader;
  /** Dollars a single key may spend within the window. */
  limitUsd: number;
  windowMs: number;
  /**
   * How long a reading may be reused before asking the store again.
   *
   * Checking the database on every call would add a round trip to every
   * completion to answer a question whose answer moves by fractions of a cent
   * at a time. Spend accrued since the last reading is tracked locally and
   * added on, so the window between refreshes is not a window of free spending.
   */
  refreshMs?: number;
  now?: () => number;
  /**
   * Called when the spend store cannot be read.
   *
   * The check then falls back to the last known reading plus local accrual, and
   * allows the call if there has never been one. Failing closed here would mean
   * a database blip stops all AI in the product, and this codebase has already
   * been bitten by exactly that: a service-role key from the wrong project made
   * the rate limiter fail closed and the sign-in page reported rate limits for
   * a limiter that had never counted anything.
   */
  onReadError?: (key: string, error: unknown) => void;
}

interface Reading {
  /** Dollars reported by the store. */
  storedUsd: number;
  /** Dollars recorded here since that reading, not yet visible to the store. */
  localUsd: number;
  readAt: number;
}

const DEFAULT_REFRESH_MS = 30_000;

export class SpendBudget {
  private readonly readings = new Map<string, Reading>();
  private readonly now: () => number;
  private readonly refreshMs: number;

  constructor(private readonly options: BudgetOptions) {
    this.now = options.now ?? Date.now;
    this.refreshMs = options.refreshMs ?? DEFAULT_REFRESH_MS;
  }

  /** Throws `BudgetExceededError` when this key is already over its ceiling. */
  async check(key: string): Promise<void> {
    const spent = await this.spent(key);
    if (spent >= this.options.limitUsd) {
      throw new BudgetExceededError(key, spent, this.options.limitUsd);
    }
  }

  /**
   * Records spend that has just happened.
   *
   * Usage reaches the store asynchronously and is not readable the instant a
   * call returns, so without this a loop could run many calls inside one
   * refresh window against a reading that says nothing has been spent.
   */
  record(key: string, costUsd: number): void {
    if (costUsd <= 0) return;
    const reading = this.readings.get(key);
    if (reading) reading.localUsd += costUsd;
  }

  private async spent(key: string): Promise<number> {
    const now = this.now();
    const cached = this.readings.get(key);
    if (cached && now - cached.readAt < this.refreshMs) {
      return cached.storedUsd + cached.localUsd;
    }

    try {
      const storedUsd = await this.options.reader.spentUsd(key, now - this.options.windowMs);
      this.readings.set(key, { storedUsd, localUsd: 0, readAt: now });
      return storedUsd;
    } catch (error) {
      this.options.onReadError?.(key, error);
      // Keep the stale reading rather than resetting it: a store that cannot be
      // read is not evidence that nothing has been spent.
      if (cached) return cached.storedUsd + cached.localUsd;
      return 0;
    }
  }
}

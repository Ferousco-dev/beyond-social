/**
 * Behaviour checks for the costlier-model confirmation. No key, no network.
 *
 *   tsx --tsconfig scripts/tsconfig.json scripts/model-confirm-smoke.ts
 *
 * This decides whether somebody is asked before sixty credits are spent, and
 * what runs once they answer. Both directions are worth pinning: never asking
 * is the bug this replaced, and asking twice is a turn that cannot be sent.
 */
import { modelToRun, shouldAskAboutModel, upgradeFrom } from "../src/lib/generation/confirm-model";
import { type ModelChoice } from "../src/lib/generation/select-model";

const results: string[] = [];
let failures = 0;

function check(name: string, passed: boolean, detail = ""): void {
  results.push(`${passed ? "PASS" : "FAIL"}  ${name}${detail ? ` (${detail})` : ""}`);
  if (!passed) failures += 1;
}

const WORKHORSE = { modelId: "kling-3.0/video", creditCost: 30 };

const costly: ModelChoice = {
  modelId: "kling-3.0/motion-control",
  creditCost: 60,
  reason: "You asked to carry the movement across from your footage.",
  worthConfirming: true,
  alternative: WORKHORSE,
};

const ordinary: ModelChoice = {
  modelId: "kling-3.0/video",
  creditCost: 30,
  reason: "The everyday generator for your plan.",
  worthConfirming: false,
  alternative: WORKHORSE,
};

const ask = (
  choice: ModelChoice | null,
  extra: Partial<Parameters<typeof shouldAskAboutModel>[0]> = {},
) =>
  shouldAskAboutModel({
    choice,
    hasPreference: false,
    wantsVideo: true,
    answered: false,
    ...extra,
  });

{
  check("a costlier model is asked about", ask(costly) === true, String(ask(costly)));
}

{
  check("the everyday model is never asked about", ask(ordinary) === false, String(ask(ordinary)));
}

{
  // The whole reason the flag exists: a turn that comes back with an answer is
  // sent, not asked again. Without this the card would reappear forever.
  check(
    "an answered turn is not asked a second time",
    ask(costly, { answered: true }) === false,
    String(ask(costly, { answered: true })),
  );
}

{
  check(
    "a stored preference settles it, so nothing is asked",
    ask(costly, { hasPreference: true }) === false,
    String(ask(costly, { hasPreference: true })),
  );
}

{
  // A question costs nothing to answer, so there is no difference to weigh.
  check(
    "a turn that is not making a video is not asked about models",
    ask(costly, { wantsVideo: false }) === false,
    String(ask(costly, { wantsVideo: false })),
  );
}

{
  check("nothing chosen is nothing to ask about", ask(null) === false, String(ask(null)));
}

{
  const run = modelToRun(costly, { modelId: costly.modelId, accepted: true });
  check("accepting runs the costlier model", run === costly.modelId, run ?? "none");
}

{
  const run = modelToRun(costly, { modelId: costly.modelId, accepted: false });
  check(
    "declining runs the everyday model whose price was quoted",
    run === WORKHORSE.modelId,
    run ?? "none",
  );
}

{
  /*
   * The answer is echoed back by the client, so it names what it approves. An
   * answer collected for a thirty credit model must not approve a sixty credit
   * one, whatever it says.
   */
  const run = modelToRun(costly, { modelId: "kling-3.0/video", accepted: true });
  check(
    "an answer about a different model does not approve this one",
    run === WORKHORSE.modelId,
    run ?? "none",
  );
}

{
  // The turn still has to resolve to something when the answer never arrives,
  // and the safe something is the cheaper model.
  const run = modelToRun(costly, undefined);
  check("no answer at all runs the everyday model", run === WORKHORSE.modelId, run ?? "none");
}

{
  const run = modelToRun(ordinary, undefined);
  check(
    "a model that was never in question runs without an answer",
    run === ordinary.modelId,
    run ?? "none",
  );
}

{
  const upgrade = upgradeFrom(costly, 120);
  check(
    "the offer carries both prices and the balance",
    upgrade?.creditCost === 60 && upgrade.alternativeCost === 30 && upgrade.balance === 120,
    `${upgrade?.creditCost}cr vs ${upgrade?.alternativeCost}cr, ${upgrade?.balance} left`,
  );
}

{
  // With nothing to compare against there is no honest question to ask, so the
  // turn runs the ordinary way rather than quoting a price out of nowhere.
  const upgrade = upgradeFrom({ ...costly, alternative: null }, 120);
  check("no alternative means no offer", upgrade === null, String(upgrade));
}

process.stdout.write(
  `${results.join("\n")}\n\n${results.length - failures}/${results.length} passed\n`,
);
if (failures > 0) process.exit(1);

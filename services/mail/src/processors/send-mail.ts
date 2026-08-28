import { UnrecoverableError, Worker, type Job } from "bullmq";

import { createProvider, PermanentSendError, SendBlockedError } from "../lib/providers";
import { createRedis } from "../lib/redis";
import { createServiceClient } from "../lib/supabase";
import { logger } from "../lib/logger";
import { parsePayload, renderTemplate } from "../lib/template";
import { MAIL_QUEUE, type MailJobData } from "../queues/mail";

/**
 * Sends one delivery.
 *
 * The property that matters: running this twice must send one email. BullMQ
 * retries five times, and a socket that dies after the provider accepted the
 * message is indistinguishable from one that died before it. Without a guard, a
 * transient network error becomes a second password reset or a second receipt
 * in someone's inbox, which cannot be taken back.
 *
 * The guard is a claim in the database rather than a check in this process. The
 * row is transitioned and read in one statement, so two instances racing for the
 * same delivery cannot both proceed, and a row already carrying a provider
 * message id is never claimed at all.
 */

/** Providers rate limit well below this; the ceiling is here to bound memory. */
const CONCURRENCY = 10;

interface DeliveryClaim {
  id: string;
  to_email: string;
  template_key: string;
  payload: unknown;
  attempts: number;
}

export function startMailWorker(): Worker<MailJobData> {
  const supabase = createServiceClient();
  const provider = createProvider();

  const worker = new Worker<MailJobData>(
    MAIL_QUEUE,
    async (job: Job<MailJobData>) => {
      const { deliveryId } = job.data;

      const { data: claimed, error: claimError } = await supabase.rpc("claim_delivery_for_send", {
        p_delivery: deliveryId,
      });
      if (claimError) throw new Error(claimError.message);

      const delivery = (claimed as DeliveryClaim[] | null)?.[0];
      if (!delivery) {
        // The row already has a provider message id, so a previous attempt
        // reached the provider. Doing nothing is the entire point.
        logger.info("send skipped, already handled", { deliveryId, jobId: job.id });
        return;
      }

      let providerMessageId: string;
      try {
        const payload = parsePayload(delivery.payload);
        const rendered = await renderTemplate(delivery.template_key, payload);
        ({ providerMessageId } = await provider.send({
          to: delivery.to_email,
          subject: rendered.subject,
          text: rendered.text,
        }));
      } catch (error) {
        // Not configured to send at all. The delivery is parked rather than
        // retried, because five exponential retries will not conjure an API key,
        // and it is not marked failed because nothing about it is wrong.
        if (error instanceof SendBlockedError) {
          const { error: blockError } = await supabase.rpc("block_delivery", {
            p_delivery: deliveryId,
            p_error: error.message,
          });
          if (blockError) {
            // The row is left at `sending` rather than `blocked`, but this still
            // ends the job below: retrying would not help, and a wrongly-`sending`
            // row is at least visible here instead of silently disappearing.
            logger.error("could not park a blocked delivery", {
              deliveryId,
              error: blockError.message,
            });
          }
          logger.error("delivery blocked, no mail provider configured", {
            deliveryId,
            templateKey: delivery.template_key,
            reason: error.message,
          });
          throw new UnrecoverableError(error.message);
        }
        // A rejected address or a bad payload will not succeed on the fifth
        // attempt either, so these end the job immediately.
        if (error instanceof PermanentSendError) {
          throw new UnrecoverableError(error.message);
        }
        throw error;
      }

      const { error: settleError } = await supabase
        .from("mail_deliveries")
        .update({
          status: "sent",
          provider_message_id: providerMessageId,
          sent_at: new Date().toISOString(),
          error: null,
        })
        .eq("id", deliveryId);

      /*
       * The provider has already accepted the message at this point, so this is
       * not a failure to retry: throwing here would let BullMQ run the job
       * again, and a second `provider.send` call would send a real second email.
       * Logged loudly instead, since a row stuck without its `provider_message_id`
       * recorded is exactly what `claim_delivery_for_send`'s duplicate guard
       * relies on never happening.
       */
      if (settleError) {
        logger.error("could not record a successful send", {
          deliveryId,
          templateKey: delivery.template_key,
          providerMessageId,
          error: settleError.message,
        });
        return;
      }

      logger.info("sent", {
        deliveryId,
        templateKey: delivery.template_key,
        provider: provider.name,
        attempt: delivery.attempts,
      });
    },
    { connection: createRedis(), concurrency: CONCURRENCY },
  );

  worker.on("failed", (job, error) => {
    logger.warn("mail job failed", {
      jobId: job?.id,
      attempts: job?.attemptsMade,
      error: error.message,
    });
    // Exhausted, or permanent and therefore never retried. Either way this
    // delivery is over, and leaving it in "sending" would hide that.
    const exhausted = job !== undefined && job.attemptsMade >= (job.opts.attempts ?? 1);
    if (job && (exhausted || error instanceof UnrecoverableError)) {
      void supabase
        .from("mail_deliveries")
        .update({ status: "failed", error: error.message })
        .eq("id", job.data.deliveryId)
        // A blocked delivery already has its terminal status and must keep it,
        // otherwise a backlog waiting on credentials reads as a pile of failures.
        .neq("status", "blocked")
        .then(({ error: updateError }) => {
          if (updateError) {
            logger.error("could not record a terminally failed delivery", {
              deliveryId: job.data.deliveryId,
              error: updateError.message,
            });
          }
        });
    }
  });

  return worker;
}

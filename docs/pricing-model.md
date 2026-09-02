# What a credit costs, what it should sell for

Worked out 2 September 2026 from the catalogue, the credit rebase, and HeyGen's
published rates. Numbers here are arithmetic on facts, not estimates, except
where marked as a recommendation.

## The unit

Migration `0051_credit_rebase` fixed one credit at **five cents of provider
cost**. So `model_catalog.credit_cost` is a **cost**, not a price. Nothing in
the ledger carries margin. Margin has to come from what a plan charges for the
credits it grants.

| Model                      | Credits | Provider cost |
| -------------------------- | ------- | ------------- |
| `veo3_lite`                | 3       | $0.15         |
| `veo3_fast`                | 6       | $0.30         |
| `veo3`                     | 12      | $0.60         |
| `kling/ai-avatar-standard` | 12      | $0.60         |
| `kling/ai-avatar-pro`      | 24      | $1.20         |
| `kling-3.0/video`          | 30      | $1.50         |
| `wan` restyle              | 30      | $1.50         |
| `kling-3.0/motion-control` | 60      | $3.00         |

## The bug that has to be fixed before any pricing means anything

The allowances in `lib/billing/plans.ts` are 15, 100 and 400. They were written
on 26 July, when one credit meant one `veo3_fast` render, so "15 videos a
month" was literally true.

The rebase landed on 2 August. It multiplied the ledger and the model costs by
six and **did not touch the plan allowances**. Nothing has since.

So every plan has been at one sixth of its intended size for a month:

| Plan    | Credits | Advertised | Actually delivers |
| ------- | ------- | ---------- | ----------------- |
| Free    | 15      | 15 videos  | **2**             |
| Creator | 100     | 100 videos | **3**             |
| Studio  | 400     | 400 videos | **13**            |

Creator delivers three because its everyday model is `kling-3.0/video` at 30
credits. That is the second half of the problem, below.

## What we are competing against

HeyGen sells to consumers far below what it charges through its API.

|                                                                     | Per 30s video |
| ------------------------------------------------------------------- | ------------- |
| HeyGen consumer, Avatar IV (Creator, $29 for 600 credits at 20/min) | **$0.48**     |
| HeyGen consumer, Avatar III (3 credits/min)                         | **$0.07**     |
| HeyGen **API**, Avatar IV ($4/min)                                  | **$2.00**     |
| HeyGen **API**, standard ($1/min)                                   | **$0.50**     |

We would be buying at the API column and competing with the consumer column.
**Reselling Avatar IV is four times underwater before any margin.** That is a
strategy question, not a rounding error.

## Recommendation

The paid tiers run a premium model. That is a positioning decision, not an
economic one: quality is what is being sold, and a paying account should never
be served the model the free tier gets.

It has one consequence that has to be accepted rather than worked around. At
$1.50 a render, **a hundred premium videos costs $150 in provider fees alone**,
so at sixty per cent margin that plan would have to sell for $375 a month. The
lever is therefore the number of videos, not the model. Paid plans get fewer,
better videos.

The advertised "100 videos a month" cannot survive this and should be rewritten.

### 1. A quality ladder, one model per tier

| Tier    | Model             | Cost per video |
| ------- | ----------------- | -------------- |
| Free    | `veo3_lite`       | $0.15          |
| Creator | `veo3`            | $0.60          |
| Studio  | `kling-3.0/video` | $1.50          |

Free gets the cheap model. Creator gets Veo 3, which is a name customers
recognise. Studio gets the flagship. Nobody paying is ever served the free
tier's model, and each step up is a real difference rather than a bigger
number.

Motion control at $3.00 and the twin stay above all of this, reached through
the confirmation card, which is what that card is for.

### 2. Allowances and prices

| Plan    | Videos | Credits | Provider cost | Price    | Gross margin |
| ------- | ------ | ------- | ------------- | -------- | ------------ |
| Free    | 15     | 45      | $2.25         | $0       | acquisition  |
| Creator | 30     | 360     | $18.00        | **$49**  | 63%          |
| Studio  | 40     | 1200    | $60.00        | **$169** | 64%          |

Both paid tiers can be stretched at the same margin if the counts should be
higher: fifty Creator videos supports $79, fifty Studio videos supports $199.
The margin holds; what changes is how the product is positioned against
HeyGen's $29 entry plan, which buys avatars only and not generation,
scheduling and publishing.

### 3. Price the twin off HeyGen's standard rate, not Avatar IV

At $1 per minute, a thirty second twin video costs $0.50, which is **ten
credits**. That is the number to put in `HEYGEN_CREDIT_COST`.

Avatar IV would be forty credits, and we would be charging for something
HeyGen's own customers get for a quarter of what we paid. Use standard until
somebody decides the twin is a premium tier worth being expensive.

Ten credits is right for thirty seconds. If twin videos are ever allowed to run
longer, the cost has to scale with duration rather than stay flat, or a three
minute render costs us $3.00 and earns ten credits.

## What this does not decide

Whether the free tier should exist at $2.25 of provider cost per user per
month. That is a customer acquisition question, and it is the owner's.

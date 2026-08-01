# Memory

"RAG" gets used for all of this, but these are four different systems solving
four different problems. Conflating them is how you end up with one vector table
holding documents, preferences, and transcript fragments, none of which retrieve
well because they are not the same kind of thing.

| Layer                        | What it holds                           | Where it lives               | Status            |
| ---------------------------- | --------------------------------------- | ---------------------------- | ----------------- |
| Conversation context         | This thread, verbatim                   | `messages`, `project_thread` | Was already built |
| Long-term memory             | Durable facts about one person          | `user_memories`              | Built here        |
| Conversation summary         | The middle of a long thread, compressed | `conversation_summaries`     | Built here        |
| Knowledge base               | Craft knowledge, the same for everyone  | `prompt_chunks`              | Was already built |
| Semantic conversation search | Past threads, findable by meaning       | `message_embeddings`         | Built here        |

## What a turn does now

```
message
  │
  ├─ recall memories        (embed, nearest neighbours, this user only)
  ├─ load recent turns      (verbatim)
  ├─ load summary           (if the thread is long)
  └─ retrieve craft chunks  (the knowledge base)
        │
        ▼
   build the prompt
        │
        ▼
      answer
        │
        ├─ extract durable facts   (usually none)
        └─ update the summary      (only past a threshold)
```

The three reads run together with the ones already there, so recall does not add
a stage to the request. Both writes happen after the answer is returned: they
improve the _next_ turn, and making this turn wait for them would charge the user
for someone else's benefit.

## The part that matters: not remembering everything

The failure mode of a memory system is not forgetting. It is remembering
everything, at which point retrieval returns five irrelevant rows and the model
is worse off than with no memory at all.

So extraction is deliberately conservative, and the prompt says that returning
nothing is the normal outcome. What qualifies is a claim that would still be true
next month and would change how the next video is made: a standing preference, a
constraint, who the audience is. Not the subject of today's brief. Wanting a
video about coffee today says nothing about tomorrow.

Facts are deduplicated on a hash of the normalised text, because the extractor
will re-derive the same claim from a later turn, and without that the same fact
accumulates and drowns out everything else.

## Why memories are not in `prompt_chunks`

They have opposite access rules. Craft knowledge is the same for everyone and
readable by all. A memory is readable by exactly one person, and is the most
personal row in the schema.

That is enforced by RLS, not by a `where user_id = ...` in application code that
a later edit could drop. Verified behaviourally against the local stack: a second
user cannot read another's memories even when querying their id directly, and an
attempt to write a memory onto someone else's account fails with `42501`.

## Retrieval

By meaning, not keyword, which is the whole reason embeddings are involved:
"make it taller" should recall a preference stored as "prefers vertical 9:16
framing" though they share no words.

Ranking is similarity first, importance as the tie-break, so a strongly held
preference outranks a passing remark that happens to match the wording. Usage is
recorded on every recall, which is what makes pruning possible later: a memory
that is never recalled is a memory that was not worth keeping.

## Summaries

A long thread cannot keep being sent in full, or cost and latency grow with the
length of the conversation while the useful signal does not.

The summary replaces the _middle_ of a thread, never the end. Recent turns are
still sent verbatim, because "make it slower" refers to something specific that a
summary would have flattened into "discussed pacing". It only regenerates once
the thread has moved on meaningfully, so a long conversation does not pay for a
model call per turn to restate what is already stored.

## Injection safety

Memories and summaries are derived from the user's own messages and then placed
in a prompt, which is a path from user input to instruction. Both are fenced and
labelled as things the model is told _about_ rather than told to do, and the
extractor is given the transcript inside tags as content to evaluate.

Fencing is not a guarantee on its own. The reason it is safe enough here is that
a memory can only ever influence that same user's own generations: there is no
path by which one person's stored text reaches another person's prompt.

## Searching past conversations

The layer that answers "continue the project we discussed last month". The thread
cannot: that question is about a conversation the current thread has never seen.
Long-term memory cannot either: it holds distilled claims about a person, not
what they were working on in June.

Only the user's own messages are indexed. Assistant replies are derivative, and
embedding them would double the cost to make searches match text the assistant
wrote rather than what the person asked for. Messages shorter than 25 characters
are skipped: "make it slower" matches everything and means nothing.

Results are grouped by project, one row each, scored by the project's best
matching message. Ungrouped, a long conversation about one subject floods the
results with ten near-identical rows and buries the four other projects that were
also relevant. The current thread is excluded, since it is the closest match to
itself by definition.

The similarity floor is deliberately high. A weak match dragged into the prompt
is worse than no match, because it invites the model to discuss unrelated work as
though it were the subject.

## What testing against a real model changed

The extraction prompt worked first time. The code around it did not, and the
failure was silent, which is the kind worth writing down.

The model returned two good memories, one labelled `kind: "audience"`. That is a
reasonable label and was not in our list. Zod's `.default()` only fills a value
that is _missing_, not one that is invalid, so the item failed validation, which
failed the array, which discarded the other memory alongside it. Extraction
returned nothing and looked, from the outside, exactly like a conservative
extractor doing its job.

Two changes came out of it. Fields that classify now use `.catch()` rather than
`.default()`, so an unanticipated label costs us the label and not the memory.
And items are validated individually, so one malformed entry cannot take the rest
of the batch with it. The catch that swallowed this also logs now: an extractor
that answers but produces nothing usable is worth knowing about.

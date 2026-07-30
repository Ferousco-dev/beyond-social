# Memory

"RAG" gets used for all of this, but these are four different systems solving
four different problems. Conflating them is how you end up with one vector table
holding documents, preferences, and transcript fragments, none of which retrieve
well because they are not the same kind of thing.

| Layer | What it holds | Where it lives | Status |
| --- | --- | --- | --- |
| Conversation context | This thread, verbatim | `messages`, `project_thread` | Was already built |
| Long-term memory | Durable facts about one person | `user_memories` | Built here |
| Conversation summary | The middle of a long thread, compressed | `conversation_summaries` | Built here |
| Knowledge base | Craft knowledge, the same for everyone | `prompt_chunks` | Was already built |

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
improve the *next* turn, and making this turn wait for them would charge the user
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

The summary replaces the *middle* of a thread, never the end. Recent turns are
still sent verbatim, because "make it slower" refers to something specific that a
summary would have flattened into "discussed pacing". It only regenerates once
the thread has moved on meaningfully, so a long conversation does not pay for a
model call per turn to restate what is already stored.

## Injection safety

Memories and summaries are derived from the user's own messages and then placed
in a prompt, which is a path from user input to instruction. Both are fenced and
labelled as things the model is told *about* rather than told to do, and the
extractor is given the transcript inside tags as content to evaluate.

Fencing is not a guarantee on its own. The reason it is safe enough here is that
a memory can only ever influence that same user's own generations: there is no
path by which one person's stored text reaches another person's prompt.

## Not built yet

**Semantic conversation memory**, searching old conversations by meaning so
"continue the project we discussed last month" finds the right thread. The
infrastructure is all present, since it is the same embedding and the same vector
store; what is missing is embedding the messages themselves and a search over
them. It is the natural next piece.

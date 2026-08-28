# Telegram-triggered task journal

A running log of substantive changes made through the Telegram engineering
bot (see `services/telegram-agent/`). Every task runs in a fresh Claude
Code session with no memory of any earlier one — this file is the only
thing that carries context forward between separate tasks, the same role
`docs/loop-engineering/BACKLOG.md` plays for the scheduled loop-engineering
sessions.

Claude appends one entry here as part of the same commit whenever a task
actually changes the repository. A task that doesn't (a question, a status
check) doesn't get an entry — that exchange already lives in the Telegram
chat history, so logging it here would just be noise.

Newest entries at the bottom. Keep each entry to a couple of lines: what
was asked, what changed, and why if it's not obvious from the diff.

## Log

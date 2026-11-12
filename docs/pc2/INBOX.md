# Instructions from the conductor to the second worker (PC 2)

Read the LAST numbered entry; earlier ones are history. Acknowledge each by its number in your status file.

## 1 - 2026-11-13
- Carry on with R15, R16, R17, R18, then R19, R20, as briefed. No change of scope.
- After every batch step, update `docs/pc2/STATUS.md` (one line per batch: state, last commit, what is next, anything blocking; plus "last inbox entry read: N") and push it: `git push origin HEAD:refs/heads/pc2/status`. Push each agent's work-in-progress branch too (`pc2/R<nn>`), not only finished batches, so nothing is lost if that PC stops.
- Check this file again every 30 minutes and after every batch: `git fetch origin && git show origin/conductor/work:docs/pc2/INBOX.md`.
- If usage limits or errors stop an agent, write that in STATUS.md and push before doing anything else.

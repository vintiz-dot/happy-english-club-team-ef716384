# No Lovable
- The owner does not use Lovable anymore. A change here is live only once it is pushed to main (Cloudflare builds the site); see the top of the root `AGENTS.md`.

# Class display boards
- The fixed-canvas boards (Star Board, High Scores, Night League) page the students below the podium through `useRestPaging` rather than letting the one-row strip clip them, and each board derives its page size from the pixels its own strip draws with (`restPaging.ts`); a new board passes its real card/row metrics in instead of trusting a constant.

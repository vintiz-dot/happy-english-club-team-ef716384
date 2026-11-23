# Hand-off: moving the Reach Higher class videos into R2

Status on 23 Nov 2026: **the code is live, the videos are not in R2 yet.** Until
they are, every unit video plays from the Google Drive copy, so nothing is
broken. Nothing in this hand-off needs the original laptop or its downloads:
the script fetches the videos from the Drive backup and proves each one is the
publisher's original before uploading it. That download was tested on 23 Nov
2026: all eight Drive copies came down byte-identical to the originals
(SHA-256).

## What is already done (on `main`)

- **Bucket and rule** (migration `supabase/migrations/20261122190000_course_media_bucket.sql`,
  not yet pasted): a private bucket `course-media`. Admins and teachers may
  play the files, only admins may change them, and families and children get
  nothing. `scripts/pgtest/course-media.test.mjs` checks every role.
- **Player** (`src/components/lessonDecks/MediaBar.tsx`):
  - Each unit's "Video case" slide asks the hec-files Worker for a 5-minute
    link, as the signed-in teacher, and plays the R2 copy.
  - It renews an expired link once mid-play.
  - On any failure it falls back to Drive's player. "Use the Drive copy" does
    the same by hand.
- **The list** (`src/content/lessonDecks/rh-l3/media.ts`, `VIDEOS`): each
  unit's Drive id, R2 key, publisher file name, SHA-256 and size.
- **Upload script** (`scripts/upload-course-media.mjs`):
  - It reads that list and gets each video from local folders or from the
    Drive backup (`--from-drive`).
  - It refuses any copy that is not byte-identical to the original.
  - It uploads with wrangler, because the files are 137-179 MB and the
    Worker's upload limit is 100 MB.
  - It reads each upload back and compares it again.
  - It skips files R2 already holds, so it is safe to run again.
- **Worker config** (`hec-files/worker/wrangler.toml`): `course-media` is
  added to `R2_BUCKETS`, but **not deployed yet**.

The eight videos (1.2 GB):

| Unit | Video | R2 key |
|---|---|---|
| 1 | Saving Stranded Whales | `course-media/reach-higher/3a/unit-1-video.mp4` |
| 2 | The Great Barrier Reef | `…/3a/unit-2-video.mp4` |
| 3 | Rainforests Around the World | `…/3a/unit-3-video.mp4` |
| 4 | Clean Up the Coasts | `…/3a/unit-4-video.mp4` |
| 5 | Matter Is Everywhere! | `…/3b/unit-5-video.mp4` |
| 6 | Traditions of Japan | `…/3b/unit-6-video.mp4` |
| 7 | Amazing Volcanoes | `…/3b/unit-7-video.mp4` |
| 8 | Never Give Up on Your Goals! | `…/3b/unit-8-video.mp4` |

## On the new laptop

You need Git, Node.js 22 or newer, about 2 GB free disk space, and a browser
where you can sign in to Cloudflare. The owner's PC ran Node 26.

### 1. Get the code

```powershell
git clone https://github.com/vintiz-dot/happy-english-club-team-ef716384.git
```
```powershell
cd happy-english-club-team-ef716384; npm ci; cd hec-files/worker; npm ci
```

### 2. Paste the migration (owner, in the Supabase SQL editor)

Paste and run `supabase/migrations/20261122190000_course_media_bucket.sql`. It
stops with an error, changing nothing, if another storage policy already names
the bucket. No agent applies migrations; the owner pastes them.

### 3. Sign in to Cloudflare (owner, once)

In `hec-files/worker`:

```powershell
node node_modules/wrangler/bin/wrangler.js login
```

A Cloudflare page opens in the browser. Sign in to the account that owns the
`hec-files` Worker and R2 bucket, then click **Allow**. Check it worked:

```powershell
node node_modules/wrangler/bin/wrangler.js whoami
```

### 4. Deploy the Worker, so it serves `course-media`

Still in `hec-files/worker`:

```powershell
npm run deploy
```

The Worker's secrets (`LINK_SECRET`, `SERVER_KEY`) are already set in
Cloudflare and survive a deploy. Do not set them again: a new `LINK_SECRET`
would only cut every open file link short. To check, open
`https://hec-files.vintizfjes.workers.dev/healthz`; it should answer
`{"ok":true}`.

### 5. Upload the videos from the Drive backup

From the repository root, dry run first:

```powershell
node scripts/upload-course-media.mjs --from-drive
```
```powershell
node scripts/upload-course-media.mjs --from-drive --apply
```

What `--apply` does for each video:
- skips it if R2 already holds the original;
- otherwise downloads it from Drive and checks its size and SHA-256 against
  the original's;
- uploads it, reads it back and checks again;
- deletes the download.

A message saying the copy "is not the original" means the Drive file was
changed or replaced. Stop and find the original. Do not edit the recorded
SHA-256 to make it pass.

If Drive refuses ("sent a page, not the file"), the folder is no longer shared
"Anyone with the link", or Drive's daily download limit was hit. Fix the
sharing, or wait a few hours, then run the command again; it carries on where
it stopped.

If the downloads are already on disk, use the folders instead of
`--from-drive`, for example:
`node scripts/upload-course-media.mjs D:/Videos/3A D:/Videos/3B --apply`.

### 6. Check a video plays from R2

1. Sign in to the app as a teacher of Jupiter, or as an admin.
2. Open Flipbooks > Lesson Decks > Reach Higher.
3. Go to any unit's "Video case" slide and press **watch**.
4. Under the player it should say **"From the school's file store"**. "From
   the Google Drive backup" means the R2 copy could not be read: re-check
   steps 2 and 4.

Check one 3A unit and one 3B unit, and seek forward past five minutes once
(that renews the link mid-play).

### 7. Afterwards

- Keep the Drive folders exactly as they are: shared "Anyone with the link",
  nothing deleted. They are the backup the player falls back to.
- Delete `docs/COURSE_MEDIA_R2_HANDOFF.md`, or mark it done, in the same
  commit that records the move.

## Do not

- Put the videos in GitHub. They are over GitHub's 100 MB file limit and they
  are the publisher's copyrighted material.
- Upload them through the app or the Worker. Over 100 MB, the Worker refuses
  them.
- Change who may read `course-media` anywhere but a migration. The Worker and
  the app hold no rules of their own.

## Prompt for a new Claude session on the new laptop

> Read `docs/COURSE_MEDIA_R2_HANDOFF.md` and `AGENTS.md`. The migration
> `20261122190000_course_media_bucket.sql` has [has not] been pasted. I am at
> the laptop to approve the Cloudflare sign-in. Do steps 3 to 6: sign in,
> deploy the hec-files Worker, upload the videos with `--from-drive` (dry run
> first), then confirm one 3A and one 3B unit video play from the school's file
> store. Report what each step printed.

## Other open items from the Jupiter decks (not part of this move)

- **Owner, in the SQL editor:**
  - paste `20261122130000_reach_higher_3a_lessons.sql`, then
    `20261122160000_reach_higher_3b_lessons.sql`, if not done yet;
  - in Class Settings, set Jupiter's course book to "Reach Higher, Level 3".
- **Teachers, before those lessons:** some reading pages have no recording in
  the publisher's audio, so the teacher reads them aloud:
  - Unit 3: page 177, the haiku "Pineapples";
  - Unit 4: page 249;
  - Unit 6: song and biography pages 84-101, and page 116;
  - Unit 8: the Part 1 maths key words.
- **The class audio** (408 tracks) still plays from Drive only. It can move
  the same way:
  - add `r2` / `file` / `sha256` / `bytes` to its entries;
  - give the script an audio list;
  - upload.

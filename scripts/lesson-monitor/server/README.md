# The lesson monitor on a server (Oracle Cloud Always Free, 27 Nov 2026)

After a lesson the only human step is the teacher approving the report. Everything else runs here:

```
in-app recorder ──► Cloudflare R2 (hec-files, class-recorder-audio)
                         │  5-minute read links, asked AS THE JOB ACCOUNT (file_access_can)
                         ▼
Oracle VM (hec-lesson-monitor.service, nightly.py --watch --remote)
   1. lesson_monitor_begin            consent + class switch + the pilot's teacher, as on the laptop
   2. download chunks to a tmpfs      audio is only ever in RAM on the VM
   3. Groq whisper-large-v3  ┐        each ~10-minute piece, consent asked before EVERY upload
      Cloudflare large-v3-turbo ┘
   4. reconcile                       agree = stands; disagree = beam-5 re-check here; still unclear = unsure
   5. six voice models                (embedders.py) who said each line, voiceprints sealed on disk
   6. lesson_monitor_save_report      only after the database says "ok" (15-minute grace on a Wi-Fi blip)
   7. audio copy deleted, proven (0 files)
   8. class report                    lesson-report-draft (from_monitor), once the class work's OCR is done;
                                      rebuilt while unapproved when more class work arrives (classwork.py)
                         ▼
teacher's bell: "Lesson report ready to review" ──► /teacher/lesson-report/:sessionId ──► Approve
                         ▼
recorder-retention (hourly): R2 + Supabase copies deleted 3 h after the report
```

## Who receives the audio

Families consented (owner, 27 Nov 2026) to the lesson audio being processed outside the school. These receive it:

| Vendor | What | Retention / training |
| --- | --- | --- |
| Cloudflare R2 (`hec-files`) | the recorder's chunks (private bucket) | deleted by `recorder-retention` 3 h after the report |
| Groq (`whisper-large-v3`) | 10-minute pieces, 16-bit FLAC, over HTTPS | turn ON Zero Data Retention: console.groq.com > Settings > Data Controls. Groq does not train on API data |
| Cloudflare Workers AI (`@cf/openai/whisper-large-v3-turbo`) | the same pieces | Cloudflare states Workers AI does not store or train on customer inputs/outputs |
| Oracle Cloud (the VM) | everything above, in RAM (tmpfs) while one lesson is worked on | wiped after each lesson and at every start |

Nobody else. Transcripts go only to the school's database (the teacher of the lesson reads them).

## What only the owner does (once)

1. **Oracle account and VM.** cloud.oracle.com, sign up (Always Free; a card is asked for identity, nothing is charged for
   Always Free shapes). Home region: **Singapore (ap-singapore-1)** or **Tokyo** (closest to Hanoi; it cannot be changed later).
   Compute > Instances > Create: image **Ubuntu 24.04 (aarch64)**, shape **VM.Standard.A1.Flex, 4 OCPU, 24 GB**, boot volume 100 GB,
   "Generate a key pair" OFF, paste YOUR public key (make one on the PC: `ssh-keygen -t ed25519 -f $HOME\.ssh\hec-oracle`).
   Keep the VCN's default security list (only TCP 22 in). Note the public IP.
   If Oracle says "out of capacity" for A1, try again later or another availability domain.
2. **Groq key.** console.groq.com > API Keys > Create. Settings > Data Controls: Zero Data Retention ON.
3. **Cloudflare Workers AI token.** dash.cloudflare.com > My Profile > API Tokens > Create Token > Custom: permission
   *Account / Workers AI / Read*, the HEC account only. Note the account id (dash right column).
4. **The job account.** Admin > Users: create a separate login for the server (e.g. `lesson-monitor@...`) with the admin
   role, a long password from your password manager. It is used only by the VM (separate login = every action it
   takes is attributed to it in the audit logs). Signing it out everywhere in the app ends the VM's access at once.
5. **Paste the migrations** in the Supabase SQL editor, in this order: `20261127090000_recorder_audio_in_r2.sql`,
   `20261127100000_lesson_report_ready_notice.sql`.

## Install (about 20 minutes)

On the PC, from the repo:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\lesson-monitor\server\push_to_vm.ps1 -Vm ubuntu@<VM IP> -Key $HOME\.ssh\hec-oracle
```

Then on the VM (`ssh -i $HOME\.ssh\hec-oracle ubuntu@<VM IP>`), `S=/opt/hec-monitor/code/scripts/lesson-monitor/server/setup_oracle_vm.sh`:

```
sudo bash $S seal-key
sudo bash $S set-groq          # paste the Groq key (hidden)
sudo bash $S set-cloudflare    # account id, then the token (hidden)
sudo bash $S signin            # the job account's email and password (hidden; only a sealed refresh token is kept)
sudo bash $S selftest
sudo bash $S enable
```

Every day after that: nothing. `sudo bash $S status` / `logs` shows what it did (ids, counts, timings, codes).

## Stop, kill switch, delete everything

- `sudo bash $S stop` / `start`: the service.
- `sudo bash $S kill-switch on`: nothing downloads; a running lesson stops and its audio copy is deleted. `off` lifts it.
  The app's own switches (class monitor off, a consent withdrawn) reach the VM at its next check (every 15 s while working).
- `sudo bash $S delete-everything`: service, user, sign-in, voiceprints, keys, models, code. Then sign the job account
  out in the app, revoke the Groq key and Cloudflare token, and terminate the VM in the Oracle console.

## Settings

- Free-tier limits (checked 27 Nov 2026): `providers/quota.py`. Override in `/etc/hec-monitor/limits.json`, e.g.
  `{"groq": {"ash": 7200, "asd": 28800}, "cloudflare": {"neurons_per_day": 10000}}`.
- `HEC_PROVIDERS=groq` (in `/etc/hec-monitor/env`) uses Groq only; `none` makes every piece local (beam 5).
- Fallback when a provider is out of allowance or down: Groq + Cloudflare -> Groq only -> Cloudflare only -> local beam 5,
  per piece. The report's `settings` says which providers and models made it and how much was re-checked.

## Where things are on the VM

`/opt/hec-monitor/code` (the job, root-owned), `/opt/hec-monitor/venv`, `/var/lib/hec-monitor` (user `hecmon`, 0700):
`session.bin` (sealed refresh token), `pilot/voiceprints` (sealed), `pilot/state` (quota books, follow-up list:
ids and numbers), `pilot/audio` (tmpfs, empty between lessons), `models/`. Secrets: `/etc/credstore.encrypted/{seal-key,
groq-key,cloudflare-ai}`, sealed with the machine's key by `systemd-creds`; the service sees them decrypted only in
its private credential folder while it runs.

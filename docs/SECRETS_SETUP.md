# Secrets & Credentials Setup

This project calls Google Cloud Vision (OCR), Google Custom Search (vocab
images) and OpenAI from **Supabase Edge Functions only**. No Google or
OpenAI credential is ever readable by the browser.

## Hard rules

1. **Never** commit `GOOGLE_CREDENTIALS.json`, `customimage.json`, or any
   service-account/token file. `.gitignore` blocks the known names — if you
   create a new key file, add it there first.
2. **Never** expose a secret with a `VITE_` prefix. Vite inlines every
   `VITE_*` variable into the public JS bundle.
3. The committed `.env` contains **only publishable client values**
   (Supabase URL + anon key, Azure speech region). Server secrets live in
   Supabase Edge Function secrets.

## Required Edge Function secrets

| Secret | Content | Used by |
|---|---|---|
| `GOOGLE_CREDENTIALS` | Raw JSON string of the Cloud Vision service account (`lms-ocr@…`) | `ocr-student-work`, `ocr-vocab-scan` |
| `CUSTOMIMAGE` (or lowercase `customimage` — both are accepted; the deployed secret uses lowercase) | Raw JSON of the Custom Search credentials (service-account JSON, or `{"api_key":"…","cx":"…"}`) | `ocr-vocab-scan`, `image-search` |
| `GOOGLE_CSE_ID` | Custom Search Engine ID (`cx`) — required when `CUSTOMIMAGE` is a service-account JSON (already set) | `ocr-vocab-scan`, `image-search` |
| `OPENAI_API_KEY` | OpenAI key (already set — reused by transcript analysis & report generation) | `analyze-transcript`, `generate-student-report`, existing dictionary functions |

## Setting the secrets

### Option A — Supabase CLI

```bash
supabase secrets set GOOGLE_CREDENTIALS="$(cat GOOGLE_CREDENTIALS.json)"
supabase secrets set CUSTOMIMAGE="$(cat customimage.json)"
supabase secrets set GOOGLE_CSE_ID="your-cse-cx-id"
```

(PowerShell: `supabase secrets set GOOGLE_CREDENTIALS="$(Get-Content GOOGLE_CREDENTIALS.json -Raw)"`)

### Option B — Dashboard

Supabase Dashboard → **Project Settings → Edge Functions → Secrets** →
add each name/value pair. Paste the *entire* JSON file content as the value.

## After the secrets are set

Delete the local key files or move them outside the repository:

```powershell
Move-Item GOOGLE_CREDENTIALS.json, customimage.json "$HOME\.keys\"
```

They are gitignored either way, but a repo folder that gets zipped/shared
is still an exposure risk.

## Key rotation

If a key was ever pasted into a chat, log, or commit — rotate it:
Google Cloud Console → IAM → Service Accounts → Keys → delete + re-create,
then update the Supabase secret. Nothing else needs redeploying; edge
functions read secrets at invocation time.

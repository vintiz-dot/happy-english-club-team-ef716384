# B0 - Vendor, platform and pricing research

Researcher: B0-R. Research date: 2026-11-11 (every "read" date below is 2026-11-11).
NOT legal advice. Vendor claims come from official pages read on the stated date. Anything marked UNCONFIRMED could not be verified from an official page (or only from a summarised/truncated fetch). Terms change: re-read each vendor's terms and record the date again immediately before first use (owner rule).
"doc date" = the page's own `ms.date` / "last updated" if shown, else "none shown".
Caveat on method: pages were read through a fetch tool that summarises with a small model and truncates long pages; numbers should be re-checked against the page when a vendor is actually used.

## Summary table

"Usable?" applies the owner's rule (logging off, zero/minimal retention, no training on our data) to what the OFFICIAL pages say. YES = rule met on documents read, with the stated settings; UNCONFIRMED = depends on something we could not verify or on an account setting the owner must check; NO = vendor cannot meet it. No vendor below is approved to receive audio until the owner writes `AUDIT_EVAL_PROXY_GO` (MASTER_PLAN Q1) and the terms are re-read on that day.

| Vendor / product | STT | Diarization | Speaker ID with enrolment | vi/en | Max file | Price/min | Retention default | Zero-retention option | Trains on our data by default? | Most-private settings | Usable? | Source + doc date |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Azure Speech fast transcription | yes | yes, mono, maxSpeakers up to 35 | NO - Speaker Recognition retired 2025-09-30 | vi-VN yes; en+vi mixed UNCONFIRMED (multilingual model list lacks vi) | under 5 h and 500 MB (conflicting 2 h/300 MB note) | UNCONFIRMED (about $0.017/min from memory) | none stored (fast/real-time) | n/a, nothing stored | not stated on pages read (UNCONFIRMED contractually) | fast endpoint, no batch storage; if batch: timeToLiveHours 6 + own destinationContainerUrl | YES for retention; training clause UNCONFIRMED | learn.microsoft.com fast-transcription-create (2026-10-02); data-privacy-security (2026-03-31) |
| Azure Speech batch | yes | yes, 240 min/file with diarization | NO | vi-VN yes | 240 min w/ diarization | UNCONFIRMED | results in MS container until TTL (6 h-31 d) | own container + TTL 6 h + delete job | same | as above | YES with settings | batch-transcription-create (2026-03-30) |
| OpenAI gpt-transcribe | yes | NOT in gpt-transcribe; old `gpt-4o-transcribe-diarize` (shuts down 2027-02-26) | known-speaker clips (max 4) only in the deprecated diarize model | vi UNCONFIRMED; code-switch hints (`languages`) yes | 25 MB/request | $0.0045 | abuse-monitoring logs up to 30 days | ZDR on `/v1/audio/transcriptions` by prior approval (sales) | NO (not trained unless opt-in) | no Files/Batch API; ZDR enabled at org/project level | UNCONFIRMED (YES only if ZDR approved) | developers.openai.com guides/speech-to-text, your-data, models/gpt-transcribe (no date shown; deprecation notice 2026-08-26) |
| Google Gemini API audio | yes (LLM) | prompt-based labels, no accuracy claim | NO | likely both, no claim | 9.5 h/prompt; 20 MB inline | tokens (32/s) | paid: logged "limited period" (days not stated); unpaid: used for training + human review | none documented | unpaid YES; paid NO | n/a | NO (no zero-retention; also terms bar API clients aimed at under-18s) | aistudio.google.com/docs/audio (no date); /docs/terms (effective 2026-03-23) |
| Google Cloud STT v2 Chirp 3 | yes | yes en-US; vi-VN NOT in diarization list | NO | vi-VN transcription yes | 1 h batch typical (20 min w/ word timestamps) | UNCONFIRMED | logging off by default (v1-era page) | n/a | NO unless opted in | do not opt in to data logging; regions us/eu only | UNCONFIRMED (v2 logging text not read) | docs.cloud.google.com speech-to-text chirp-3, data-logging (no date) |
| Anthropic Claude | no audio input found | - | - | - | - | - | - | - | - | text-only judge | n/a (not a transcriber) | platform.claude.com audio page 404 (UNCONFIRMED) |
| Deepgram Nova-3 | yes | yes, included free | none found | multilingual model; vi UNCONFIRMED | UNCONFIRMED | $0.0052 (PAYG multilingual) | opted-out requests retained only to process | `mip_opt_out=true` | participation voluntary; opt out per request | `?mip_opt_out=true&diarize=true` | UNCONFIRMED (no key; retention wording thin) | developers.deepgram.com model-improvement-partnership-program; deepgram.com/pricing (no date) |
| AssemblyAI | yes | yes (+$0.02/h); Vietnamese diarization per changelog | "Speaker Identification" add-on +$0.02/h (nature - voice vs name inference - UNCONFIRMED) | vi: pages conflict | UNCONFIRMED | $0.0035 (Universal-3.5 Pro $0.21/h) | async: audio deleted 24-48 h, final transcript 30 d unless deleted | ZDR only for streaming/sync, NOT async | NO if opted out / BAA / EU servers | opt out of training, EU region, delete transcript via API at once | UNCONFIRMED/NO for strict zero (async audio kept 24 h min) | assemblyai.com/docs/data-retention-and-model-training (no date) |
| Speechmatics batch | yes | yes | YES: enrolled identifiers via `get_speakers` then `speaker_diarization_config.speakers` | 55+ languages; vi and code-switching UNCONFIRMED | UNCONFIRMED | $0.004 (Melia 1 $0.24/h) | 7 days, delete earlier by API | delete job via API (soonest) | NO (opt-in, off by default; 33% discount if opted in) | do not opt in; EU region; `DELETE /jobs/{id}` after fetch | UNCONFIRMED (needs key + delete discipline; 7-day max) | docs.speechmatics.com (no date); speechmatics.com/pricing; security-and-compliance |
| ElevenLabs Scribe v2/v3 | yes | up to 32 speakers | none found | Vietnamese yes (WER tier "Excellent") | 5 GB, 15 h | UNCONFIRMED | UNCONFIRMED | "zero retention mode" is an enterprise feature (launch post, unverified) | UNCONFIRMED | - | UNCONFIRMED | elevenlabs.io/docs/overview/capabilities/speech-to-text (no date) |
| Rev.ai | yes | yes | none found | UNCONFIRMED | UNCONFIRMED | UNCONFIRMED (third-party sites conflict) | UNCONFIRMED | UNCONFIRMED | UNCONFIRMED | - | UNCONFIRMED | no official page read |
| Soniox | yes | yes, included | none found | 60+ languages incl vi (vendor claim) | UNCONFIRMED | about $0.0017 ($0.10/h async, vendor search snippets) | "none unless you store via Files API" (docs index, older model names) | n/a | UNCONFIRMED | - | UNCONFIRMED | soniox.com (not opened); search results only |
| pyannote.audio community-1 (self-host) | no | yes, DER AMI-IHM 17.0 | embeddings only (we build matching) | language-agnostic | n/a | free | nothing leaves PC | n/a | n/a | local | YES (needs HF token + terms acceptance once) | huggingface.co/pyannote/speaker-diarization-community-1 (benchmark 2025-09) |
| pyannoteAI hosted (community-1 / Precision-2) | no | yes (Precision-2 DER 12.9) | voiceprints, Precision-2 only | - | UNCONFIRMED | UNCONFIRMED | UNCONFIRMED | UNCONFIRMED | UNCONFIRMED | - | UNCONFIRMED (not researched deeply; no key) | pyannote.ai (search results only) |

Reading the table: with the keys the project already holds, only Azure fast transcription clearly meets the owner's rule today. OpenAI meets it only if ZDR is approved on the OpenAI account (owner must check Settings > Data controls > Data Retention). Gemini fails. Google Chirp 3 is viable for English-only tests. The rest need an owner decision and a new key.

---

## 1. Azure AI Speech

### 1.1 Capabilities

| Item | Finding | Source / doc date |
|---|---|---|
| Real-time STT | Yes; audio processed in server memory only. | https://learn.microsoft.com/en-us/azure/foundry/responsible-ai/speech-service/speech-to-text/data-privacy-security (ms.date 2026-03-31) |
| Fast transcription (file, synchronous) | `POST https://<resource>.cognitiveservices.azure.com/speechtotext/transcriptions:transcribe?api-version=2025-10-15`. Limit: audio under 5 h and under 500 MB. Public/SAS `audioUrl` recommended for long files. HTTP 429 on throttle. | https://learn.microsoft.com/en-us/azure/ai-services/speech-service/fast-transcription-create (ms.date 2026-10-02) |
| Fast diarization | `"diarization": {"enabled": true, "maxSpeakers": N}`; SDK docs `max_speakers` hint 2-35. Mono only. | same |
| Batch | Async. `properties.diarization` (`maxSpeakers` < 36); per-file audio must not exceed 240 min when diarization is on; `api-version=2024-11-15`. The batch page says fast transcription is for files "less than 2 hours and 300 MB" - this conflicts with 5 h / 500 MB on the fast page: UNCONFIRMED which limit really applies; test with a real 140-min file. | https://learn.microsoft.com/en-us/azure/ai-services/speech-service/batch-transcription-create (ms.date 2026-03-30) |
| Language handling | Fast: several `locales` turn on language identification (one main locale per file). OMITTING `locales` uses the latest multilingual model that transcribes continuously across languages. The multilingual locale list read (de, en-AU/CA/GB/IN/US, es, fr, it, ja, ko, pt-BR, zh-CN) does NOT include vi-VN. | fast page above |
| vi-VN | Supported for real-time, fast, Azure LLM Speech (enhanced mode), batch. Whether diarization / pronunciation assessment / en+vi code-switching work for vi-VN: not stated on the page (only first 100k of 171k chars read) - UNCONFIRMED. | https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt (ms.date 2026-10-28) |
| Language identification | Batch needs 2-10 candidate locales, base models only. Whether en-US+vi-VN is a valid continuous-LID pair: UNCONFIRMED (test it). | https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-identification (ms.date 2026-11-04) |
| Newer models | Azure LLM Speech (enhanced mode on the fast endpoint, supports prompts), MAI-Transcribe, MAI-Transcribe 2 (+ Streaming). Their vi support, diarization and privacy terms NOT read: UNCONFIRMED. | https://learn.microsoft.com/en-us/azure/ai-services/speech-service/overview (ms.date 2026-10-02) |
| Whisper | Offered in batch via `model` property in a subset of regions; display-form only. | batch page |
| Pronunciation assessment | Exists, billed as standard STT, uses reference text. vi-VN support: UNCONFIRMED (page only partly read). | https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-pronunciation-assessment (ms.date 2025-11-21) |

### 1.2 Speaker recognition (identification / verification with enrolled voices)

- **RETIRED on 2025-09-30.** "Beginning on September 30, 2025, Azure AI Speaker Recognition will be retired, and your applications will no longer be able to access its APIs." Announced 2024-09-26, message last updated 2025-07-11. Microsoft names no replacement ("migrate to other solutions available in the market"). Source (mirror of Microsoft Message Center, a third-party site, read 2026-11-11): https://mc.merill.net/message/AZ-azure-ai-speaker-recognition-retirement. A web search summary also cites the Speech SDK 1.46 release notes removing it (official release-notes page not opened: partly UNCONFIRMED).
- The official Learn URL `.../speaker-recognition-overview` now returns the generic Speech overview page, consistent with removal.
- It was a Limited Access feature (registration form); registrations were paused before retirement. **A new account cannot use it.** No Microsoft alternative.
- Diarization is not identification: Microsoft says diarization "does not support speaker identity recognition enrollment or the ability to track unique speakers across multiple audio files"; its voice signals are temporarily kept only to label speakers, then discarded (data-privacy page, ms.date 2026-03-31).

### 1.3 Data handling

- Real-time, fast transcription, pronunciation assessment, speech translation: "Microsoft does not retain or store the data provided by customers" (data-privacy page, ms.date 2026-03-31).
- Batch: audio read from customer storage (SAS URL). Results go to a Microsoft-managed container unless `properties.destinationContainerUrl` is set (it must be INSIDE `properties`; at root it is silently ignored). `timeToLiveHours` is required: min 6 h, max 31 days. Delete the job after download.
- Diarization is off by default; its voice signals are discarded after the job.
- Training on customer data: not stated on the pages read. Product Terms / DPA not opened: UNCONFIRMED as a contractual statement. With no storage on fast/real-time there is nothing retained to train on.
- Logging toggle: none found for fast/real-time; UNCONFIRMED that no diagnostic logging exists.
- Biometric: customer is responsible for notice, consent and deletion (same page).
- Regions: not opened (UNCONFIRMED). Check https://learn.microsoft.com/en-us/azure/ai-services/speech-service/regions (e.g. southeastasia).
- Children: no child-specific clause in pages read.

### 1.4 Pricing

Official page https://azure.microsoft.com/en-us/pricing/details/cognitive-services/speech-services/ (no date shown) returned every price as a "$-" placeholder: **UNCONFIRMED**. From memory only (not verified): real-time about USD 1/h, batch about USD 0.36/h. Layout: standard transcription per hour (real-time, fast, batch, MAI), diarization and continuous LID are "enhanced add-on features" priced per hour per feature. Check the Azure pricing calculator.

### 1.5 Private settings

- Fast transcription (nothing stored): `Ocp-Apim-Subscription-Key` header (existing secret, never printed), body `definition={"diarization":{"enabled":true,"maxSpeakers":6},"locales":[...]}` as multipart with the audio part (or SAS `audioUrl`).
- Compare `locales` omitted (multilingual) vs `["en-US","vi-VN"]`.
- If batch: `properties.timeToLiveHours: 6`, `properties.destinationContainerUrl` = our own container, delete job afterwards.

---

## 2. OpenAI

Read 2026-11-11 from developers.openai.com (platform.openai.com now 301-redirects there). None of these pages showed a date.

| Item | Finding | Source |
|---|---|---|
| Current model | `gpt-transcribe` is "recommended" for recorded speech; prompt (context), `keywords`, `languages` (multiple hints for multilingual/code-switching audio; do not send with singular `language`). Streaming supported. Does the page say it diarizes or gives timestamps? Model page: not mentioned; the guide says word/segment timestamps (`timestamp_granularities[]`) are `whisper-1` only. | https://developers.openai.com/api/docs/guides/speech-to-text ; https://developers.openai.com/api/docs/models/gpt-transcribe |
| Deprecated | `gpt-4o-transcribe`, `gpt-4o-mini-transcribe`, `gpt-4o-transcribe-diarize`, `whisper-1` are deprecated and **shut down 2027-02-26** (deprecation notice dated 2026-08-26 per the guide). Usable now. | guide above |
| Diarization | Only the deprecated `gpt-4o-transcribe-diarize`: `response_format="diarized_json"` (segments have speaker/start/end), no prompt support, `chunking_strategy` "auto" or VAD config required for audio over 30 s. | guide |
| Known-speaker references | `known_speaker_names[]` + `known_speaker_references[]`: up to 4 speakers, each reference clip 2-10 s (diarize model only). These are voiceprint-like clips of children: treat as biometric (B2 rule). | guide |
| File limit | 25 MB per request; mp3, mp4, mpeg, mpga, m4a, wav, webm. No max duration stated; longer recordings must be split into pieces of 25 MB or less. A 140 min mono file at 32 kbps mp3 is about 33 MB, so at least 2 pieces; at 16 kbps about 17 MB. Speaker labels do NOT carry across pieces (each request labels independently) - a consequence of the API, UNCONFIRMED in docs. | guide |
| Vietnamese | Guide says `whisper-1` supports 98 languages "accuracy varies"; Vietnamese is not named on either page read: UNCONFIRMED for gpt-transcribe. Whisper is known to support Vietnamese (memory, not verified here). | guide |
| Price | `gpt-transcribe` USD 0.0045 per minute (model page). The pricing page (https://developers.openai.com/api/docs/pricing) says transcription is billed per minute "from $0.0045 for gpt-transcribe". Per-minute prices for the deprecated models were not shown: UNCONFIRMED. | model page; pricing page |
| Training | "Data sent to the OpenAI API is not used to train or improve OpenAI models unless you explicitly opt in." | https://developers.openai.com/api/docs/guides/your-data |
| Retention default | Abuse-monitoring logs kept up to 30 days by default; may include prompts, responses, derived metadata; longer if required by law. | same |
| Zero Data Retention | `/v1/audio/transcriptions` is listed as ZDR-eligible (abuse monitoring retention: none, application state: none). ZDR requires PRIOR APPROVAL from OpenAI sales ("Contact the sales team to check eligibility"); once approved, Settings > Organization > Data controls > Data Retention, set org-wide, per-project override. Not eligible: `/v1/files`, `/v1/batches`, etc. (do not use Files/Batch for audio). | same |

Private-settings enforcement: there is NO per-request header for ZDR; it is an organisation/project setting after approval. **Without approved ZDR, the default is 30-day abuse-monitoring retention, which fails the owner's "zero/minimal retention" rule strictly -> OpenAI is UNCONFIRMED/NO until the owner confirms that the organisation (or a dedicated project) has ZDR or Modified Abuse Monitoring enabled** (check the Data Retention tab; a person must look - we cannot check from here). Use `/v1/audio/transcriptions` only, no Files API.

---

## 3. Google

### 3.1 Gemini API audio understanding (read 2026-11-11)

| Item | Finding | Source / doc date |
|---|---|---|
| Limits | 9.5 hours of audio per prompt; 32 tokens/s (about 1,920 tokens/min); inline requests under 20 MB, else Files API; formats WAV, MP3, AIFF, AAC, OGG, FLAC, M4A, Opus, WebM...; audio downsampled to 16 kbps; multichannel mixed to mono. | https://aistudio.google.com/docs/audio (ai.google.dev redirects here; no date shown; examples use API revision 2026-05-20) |
| Diarization | Listed as a use case; example prompt asks the model to label speakers and give MM:SS timestamps. NO accuracy figures on the page. It is prompt-based, not a native speaker-ID API; speaker identity across files impossible. Models in examples: `gemini-3.8-flash`. | same |
| Free vs paid data use | Unpaid services: Google may use content to "provide, improve, and develop Google products and services and machine learning technologies"; human reviewers may read it. Paid services: Google "doesn't use your prompts... or responses to improve our products". | https://aistudio.google.com/docs/terms (effective 2026-03-23) |
| Retention (paid) | Prompts/responses are logged "for a limited period of time" for abuse detection and legal; NO number of days stated. No zero-retention option mentioned. Files API storage duration not stated on that page (memory says 48 h; UNCONFIRMED here). | same |
| Minors | **Terms say you may not use the Services in an API Client "directed toward, or likely to be accessed by" people under 18.** Our client is an admin-only tool processing children's recordings, not a child-facing client, but this clause plus no ZDR option means: UNCONFIRMED / treat as NO until the owner decides. | same |

Conclusion: Gemini can only be used on the PAID tier (billing-enabled project) and still has an unspecified retention period with no zero-retention option -> **does not satisfy "zero/minimal retention" -> NO** unless the owner accepts "limited period" logging. Recommend skipping.

### 3.2 Google Cloud Speech-to-Text v2 / Chirp 3

| Item | Finding | Source |
|---|---|---|
| Chirp 3 diarization | GA, single-channel; en-US supports transcription + diarization. **vi-VN is GA for transcription but is NOT in the diarization list.** Page inconsistent on which methods support diarization (table: BatchRecognize; text also Recognize). | https://docs.cloud.google.com/speech-to-text/docs/models/chirp-3 (no date shown) |
| Limits | Recognize under 1 min; BatchRecognize "1 minute to 1 hour in general"; up to 20 min with word-level timestamps. Regions `us` and `eu` only (GA) - NOT Asia. A 140 min file would have to be split. | same |
| Data logging | Default OFF: "does not log customer audio data or transcripts" unless the project opts in (opt-in gives a discount; Google owns models trained from it). Page describes the v1-era program; v2 behaviour not described: UNCONFIRMED for v2. | https://docs.cloud.google.com/speech-to-text/docs/data-logging (no date shown) |
| Pricing | Official page (https://cloud.google.com/speech-to-text/pricing) fetched but figures not extracted: UNCONFIRMED. | - |

Chirp 3 passes the privacy rule on paper (logging off by default) but has no vi diarization; usable for English-only diarization tests with chunks of at most 1 hour (and storing audio in a Cloud Storage bucket - a new copy of the audio at Google: delete after). Mark UNCONFIRMED for v2 retention.

### 3.3 Anthropic (Claude)
The audio page (platform.claude.com/docs/en/build-with-claude/audio) returned 404 on 2026-11-11; no evidence found that the Claude API accepts audio: UNCONFIRMED. Claude is therefore only a text-side judge (transcripts), not a transcriber.

---

## 6. Supabase Edge Functions and Storage (limits read 2026-11-11)

Source: https://supabase.com/docs/guides/functions/limits (no date shown).

| Limit | Value |
|---|---|
| Memory | 256 MB |
| Wall clock per worker | Free 150 s; Paid 400 s (a worker may serve several requests / background tasks in this window) |
| CPU time | 2 s of actual CPU per request (async I/O waiting does not count) |
| Idle timeout | 150 s without a response -> 504 |
| Bundle size | 20 MB (CLI bundled) / 5 MB (server-side bundled) |
| Nested/recursive calls | 30 requests per trace in 60 s |
| Request body size | NOT stated on the page: UNCONFIRMED |
| Background tasks | `EdgeRuntime.waitUntil` has no separate limit: "capped by the wall-clock, CPU, and memory limits"; `beforeunload` event fires before shutdown with `ev.detail.reason` (https://supabase.com/docs/guides/functions/background-tasks, no date) |
| Outbound | Ports 25 and 587 blocked; no other outbound limit stated |
| Secrets | 100 per project; value up to 48 KiB |

Implications for a 140-minute file (our reasoning, not a Supabase statement):
- 256 MB memory and 400 s wall clock (150 s free) mean the function must NOT download or buffer a whole recording. A 140 min file as 16 kHz 16-bit mono WAV is about 270 MB (exceeds memory); as 32 kbps mp3 about 33 MB.
- Do not decode/convert audio inside the function (2 s CPU). Pre-cut and compress on the PC (B0 audio prep), upload pieces, and let the function only forward bytes (stream) to the vendor, or hand the vendor a signed/SAS URL.
- Recommended piece length: **10-15 minutes** (mp3 32-48 kbps = 2.4-5.4 MB, well within OpenAI's 25 MB, Chirp's limits, and a 150-400 s call), one function invocation per piece, driven by the local harness (or a queue); store each result in the audit bucket. Longer calls risk the 150 s idle/wall limit because vendors take roughly real-time/10 or more for long audio. Azure fast transcription is quick enough to do 30-60 min per call but only if the call finishes within the wall clock: test.
- Speaker labels will not be consistent across pieces for any vendor that diarizes per call; overlap pieces by 10-30 s and stitch with speaker embeddings locally (B2).

Storage (https://supabase.com/docs/guides/storage/uploads/file-limits, no date shown): global max object size Free 50 MB (cannot be raised), Pro/Team 500 GB; per-bucket limit can be lower. Resumable (TUS) uploads: chunk size must be 6 MB, upload URL valid up to 24 h (https://supabase.com/docs/guides/storage/uploads/resumable-uploads, no date). Signed URL expiry: the downloads page gives no maximum (example uses 3600); individual signed URLs cannot be revoked except by deleting/moving/renaming the object. Signed-upload-URL expiry (memory: 2 h): UNCONFIRMED. Which plan the project is on: unknown to this researcher (must not query the live project).

---

## 4. Other commercial providers (we hold NO keys for any of these)

Details beyond the table (all read 2026-11-11; none of these pages showed a date unless stated):

- **Speechmatics** (https://docs.speechmatics.com/speech-to-text/batch/speaker-identification): batch diarization; speaker identification by enrolment: run a diarized job on audio of one person with `get_speakers: true` to receive `speaker_identifiers`, then pass them in `speaker_diarization_config.speakers` with a label in a later job; unmatched voices stay "S1" etc.; `speaker_sensitivity` tunes the match. Limits (number of speakers, audio length) and language list for this feature NOT stated on the page. Retention: batch audio, transcripts and config stored 7 days then deleted, deletable earlier via API (docs.speechmatics.com security-and-compliance page, found via search; snippet only). Training: "No data logging for model training by default"; opt-in gives 33% discount (pricing page). Regions EU / US / AUS selectable; Trust Center for compliance reports. Price batch: Melia 1 $0.24/h, Oak 1 $0.30/h, Standard $0.45/h, Enhanced $0.75/h. Vietnamese: not named on the visible pages (55+ languages; Melia 1 56 languages with code-switching described on the REALTIME page): UNCONFIRMED.
- **Deepgram**: Nova-3 multilingual pre-recorded $0.0052/min pay-as-you-go ($0.0043 Growth), diarization at no extra cost (deepgram.com/pricing). Opt-out of model-improvement program: add `mip_opt_out=true` as a query parameter; opted-out data "retained only for the duration necessary to process the request"; page gives no zero-retention statement and no default-training statement (it implies requests are included unless opted out) (developers.deepgram.com/docs/the-deepgram-model-improvement-partnership-program). EU endpoint `api.eu.deepgram.com`, AU `api.au.deepgram.com`. DPA: an AU DPA is mentioned; general DPA UNCONFIRMED. Vietnamese and max duration: UNCONFIRMED. Speaker enrolment: none found.
- **AssemblyAI**: Universal-3.5 Pro $0.21/h, Universal-2 $0.15/h; diarization +$0.02/h (experimental +$0.065/h); "Speaker Identification" +$0.02/h (assemblyai.com/pricing). Retention (async, no TTL/BAA): audio deletion starts at 24 h (at most 48 h), intermediate artifacts 48-72 h, final transcript at 30 days; delete earlier via API. Not trained on if you have opted out, use EU servers, or have a BAA. Zero retention is NOT offered for async (only streaming/sync/dictation/TTS when opted out) (https://www.assemblyai.com/docs/data-retention-and-model-training). DPA at assemblyai.com/legal/data-processing-addendum. A changelog snippet says diarization was extended to Vietnamese; a competitor page disputes it: UNCONFIRMED. A "Biometric notice and consent FAQ" exists (diarization embeddings): read it before use.
- **ElevenLabs Scribe**: Vietnamese supported (WER at or below 5% tier "Excellent" for Scribe v2), diarization up to 32 speakers, max 5 GB and 15 h (elevenlabs.io/docs/overview/capabilities/speech-to-text). Price, retention, training and zero-retention: not on the page; launch post (search result) lists zero-retention mode as an enterprise feature: UNCONFIRMED.
- **Rev.ai**: only third-party pages found (prices conflict, about $0.02/min async per aggregator sites); no official retention/Vietnamese information: UNCONFIRMED. Not recommended for testing.
- **Soniox**: vendor pages (via search) claim async diarization included at about $0.10/h ($0.0017/min), 60+ languages incl. Vietnamese, per-account isolation, deletion via Console/API, regions US/EU/Japan; retention "none unless the Files API is used" from a docs index that lists older model names; compliance docs on request from support. Not opened directly: UNCONFIRMED.
- **pyannoteAI hosted**: Precision-2 is paid/hosted, offers speaker identification via voiceprints (Precision-2 only, per search summary); no terms read: UNCONFIRMED.

### Recommendation: the strongest OTHER commercial provider = **Speechmatics**
Reasons: (a) the only one of the six with a DOCUMENTED enrolment-based speaker-identification workflow across files, which is exactly what B2 needs to evaluate; (b) model training is off by default and opt-in only; (c) documented 7-day retention with an API delete (so "minimal retention" is achievable by deleting each job right after download); (d) EU/US/AUS region choice and a Trust Center/DPA path; (e) batch price about $0.004/min. Caveats: Vietnamese and en/vi code-switching in BATCH unconfirmed, speaker-enrolment limits unconfirmed, children's voices unproven, and a new key plus owner decision is needed. Cheaper fallback if the owner wants only transcription + diarization quality: Deepgram (cheapest documented opt-out) or Soniox (cheapest, least verified). None is reachable with existing keys.

---

## 5. Self-hostable stacks (no audio leaves the PC)

Evidence in this section comes from search-result summaries, not full official pages, unless noted. Treat licences as UNCONFIRMED until the LICENSE file of each model is read before use.

| Stack | Facts found | Gated token? | Commercial use / licence | Python 3.13 + Windows / CPU |
|---|---|---|---|---|
| pyannote.audio 4.0 + `pyannote/speaker-diarization-community-1` | Official model card (read 2026-11-11, benchmark updated 2025-09): CC-BY-4.0; DER (no collar, overlap counted) AMI-IHM 17.0, AMI-SDM 19.9, DIHARD3 20.2, VoxConverse 11.2, MSDWild 22.8, legacy 3.1 AMI-IHM 18.8. About 31 s per hour of audio on the vendor's GPU benchmark (PyPI page, summary). Pipelines run on CPU by default (no timing given). | YES: accept conditions on Hugging Face + access token | CC-BY-4.0 (attribution) | Python version and Windows: not stated on the card: UNCONFIRMED; install `pip install pyannote.audio` |
| pyannote Precision-2 | Paid, hosted only; DER AMI-IHM 12.9; speaker identification/voiceprints are Precision-2 only | API key | commercial service | - |
| pyannote segmentation 3.0 ONNX via sherpa-onnx | MIT per search summary; mirror under sherpa-onnx releases | upstream HF gated, mirror not | MIT | runs on onnxruntime CPU |
| sherpa-onnx | Apache-2.0 (search summary); has speaker diarization (segmentation + embedding) and ASR with prebuilt Windows wheels (not verified) | no | Apache-2.0 | CPU ONNX; Python 3.13 UNCONFIRMED |
| WeSpeaker | toolkit Apache-2.0; VoxCeleb ResNet34/CAM++ weights reported CC-BY-4.0 (sources conflict) | no | check weights licence | CPU feasible (ONNX via sherpa-onnx) |
| SpeechBrain ECAPA-TDNN (`spkrec-ecapa-voxceleb`) | licence and EER NOT found in this research: UNCONFIRMED (memory: Apache-2.0 code, VoxCeleb-trained) | no | UNCONFIRMED | PyTorch; Windows OK in general |
| NVIDIA Streaming Sortformer `diar_streaming_sortformer_4spk-v2.1` | max 4 speakers; official card lists "nvidia-open-model-license" (one third party says CC-BY-4.0: conflict). Newer "Nemotron 3 Diarization" 8 speakers, OpenMDW 1.1 (one source), preview under an evaluation-only licence | HF page open (NOT checked) | commercial use under NVIDIA Open Model License - UNCONFIRMED | NeMo needs PyTorch; Windows support weak (memory) UNCONFIRMED. TitaNet, Parakeet and Canary: NOT researched (search returned nothing) - UNCONFIRMED |
| Whisper family: faster-whisper, WhisperX, whisper.cpp | WhisperX licence: sources conflict (BSD-2 vs BSD-4); it needs a Hugging Face token + terms acceptance for its pyannote diarization step (pyannote 4.0/community-1 now default). faster-whisper (MIT), large-v3 / large-v3-turbo / distil variants (MIT, memory), whisper.cpp (MIT, memory): NOT verified here | WhisperX: yes via pyannote | UNCONFIRMED | CPU int8 feasible (memory); not verified |
| Moonshine | Vietnamese tiny model exists (`moonshine-ai/moonshine-tiny-vi`); English models MIT; non-English models under the "Moonshine Community License" (non-commercial or small-business limits per a README mirror; paper says permissive): UNCONFIRMED | no | likely restricted - read LICENSE | edge/CPU |
| Children's speech | Kid-Whisper (AIES 2024, https://ojs.aaai.org/index.php/AIES/article/view/31618 and arXiv 2309.07927): fine-tuning Whisper Small/Medium on MyST cut WER 13.93 -> 9.11 (Small), 13.23 -> 8.61 (Medium); CSLU Kids spontaneous 32.00 -> 27.16 (Small). The fine-tuned weights' licence and availability were not checked. Large-v3 fine-tuned numbers not found. Vietnamese children's speech data: none found. | - | UNCONFIRMED | - |

Model sizes (memory, not verified here): large-v3 about 3 GB fp16 (1.5 GB int8); large-v3-turbo about 1.6 GB; pyannote segmentation+embedding about 30-100 MB; ECAPA about 80 MB.

Flag: usable WITHOUT a gated token = sherpa-onnx + mirrored segmentation ONNX + WeSpeaker/3D-Speaker embeddings, faster-whisper/whisper.cpp weights, SpeechBrain, Sortformer (HF page open, unverified). Needs a Hugging Face gated token = pyannote community-1 (and therefore WhisperX diarization). The token is a secret: the owner stores it locally; never print it.

---

## 7. Hosting price inputs for B2b (read 2026-11-11)

| Option | Price (excl. tax) | Source / date |
|---|---|---|
| Hetzner CPX32 (4 vCPU, 8 GB) | EUR 30.49/mo Helsinki, 35.99 Falkenstein/Nuremberg, 49.49 Singapore | https://www.hetzner.com/cloud/regular-performance (only footer (c) 2026; Hetzner raised prices in 2026) |
| Hetzner CPX42 (8 vCPU, 16 GB) | EUR 59.49 Helsinki, 69.99 Nuremberg, 93.99 Singapore | same |
| Hetzner CX43 (8 vCPU shared) | EUR 15.99/mo after the June 2026 increase per Northflank, reproduced from Hetzner's table; CX line reported as sometimes unavailable | https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/ returned 404 on 2026-11-11: UNCONFIRMED (third-party: northflank.com/blog/hetzner-cloud-server-price-increases) |
| Hetzner CAX31 (8 vCPU Arm) | EUR 20.99 after increase (third-party): UNCONFIRMED | same |
| Modal (per second) | CPU $0.0000131/physical core (2 vCPU), memory $0.00000222/GiB, T4 $0.000164, L4 $0.000222, A10 $0.000306, L40S $0.000542; free credit $30/mo Starter | https://modal.com/pricing (no page date; 2026 footer) |
| RunPod serverless | L4/A5000/3090 24 GB $0.75/h, A4000-class 16 GB $0.58/h; T4 not listed; pods L4 $0.59/h secure, $0.44 community | https://www.runpod.io/pricing (page updated 2026-11-09) |
| Fly.io Machines | shared-cpu-1x 256 MB $2.19/mo, 2 GB shared-cpu-2x $13.39, performance-1x 2 GB $33, performance-2x 4 GB $66; extra RAM $6/GB/mo; billed per second while running; stopped machine $0.15/GB/mo rootfs; larger presets and GPUs not shown | https://docs.fly.io/about/pricing (no date) |
| Google Cloud Run | page returned only a title: UNCONFIRMED (memory: about $0.000018/vCPU-s, $0.000002/GiB-s, 60-min request timeout) | https://cloud.google.com/run/pricing |
| Replicate | not researched: UNCONFIRMED | - |
| School mini PC | N100, 16 GB, 512 GB new: about USD 160-340 (Beelink EQ12 MSRP $279; used $190); DRAM price rises in 2026. Ryzen 7 mini PC and Vietnam (Shopee/TGDD) prices: NOT found: UNCONFIRMED | search results 2026-11-11 |

Sample arithmetic for later (our calculation): Modal L4 at $0.000222/s = $0.80/h; a 140-min file transcribed at 10x real-time on L4 takes about 14 min = $0.19 per file. A CPX32 at EUR 35.99/mo is about EUR 0.05/h if left on 24x7.

---

## 8. Legal pointers (NOT legal advice; a Vietnamese data-protection adviser must confirm everything here)

Sources: Vietnamese legal portals and law-firm notes read via search on 2026-11-11 (no official gazette text opened): https://hethongphapluat.com/nghi-dinh-13-2023-nd-cp-ve-bao-ve-du-lieu-ca-nhan/dieu-20 ; Tilleke & Gibbins "Vietnam's new Personal Data Protection Law: a closer look" (2025-08-27) https://www.tilleke.com/insights/vietnams-new-personal-data-protection-law-a-closer-look/2/ ; PwC Vietnam summary https://legal.pwc.de/en/news/articles/pwc-vietnam-new-personal-data-protection-law ; Rouse note on Decree 356/2025/ND-CP https://rouse.com/insights/news/2026/vietnam-key-developments-in-personal-data-protection-under-decree-no-356-2025-nd-cp-and-issues-businesses-need-to-review

- **Decree 13/2023/ND-CP** (in force 2023-07-01): Article 20 - processing a child's personal data needs the consent of the child from age 7 AND of the parent/guardian (unless an Article 17 exception); parents may withdraw consent; controllers must verify the child's age. Sensitive/biometric data and the cross-border transfer impact assessment (TIA dossier filed with the Ministry of Public Security's A05 department): NOT confirmed in my reading of Decree 13 itself - only via the 2025 law commentaries below.
- **Personal Data Protection Law No. 91/2025/QH15** passed 2025-06-26, effective 2026-01-01, replaces Decree 13 as the main regime (relationship to Decree 13 not spelled out in the text per one source). Implementing **Decree 356/2025/ND-CP** (issued 2025-12-31, effective 2026-01-01). Reported changes: parental consent is the general rule for children's data; consent of BOTH child (7+) and parent is required only in narrower cases such as data about the child's private life/secrets (Tilleke) - this is LOOSER than Decree 13 in some readings; specific safeguards for biometric and location data; biometric incidents must be notified to the affected persons; the government lists sensitive data types in the implementing decree (Decree 356 has a wider non-exhaustive list); the cross-border TIA carries over, to be updated every 6 months if things change; DPIA to the authority within 60 days of starting processing; TIA/DPIA accepted before 2026-01-01 stay valid, but updates must follow the new law; fines for cross-border breaches up to 5% of prior-year revenue; Decree 330/2026/ND-CP (effective 2026-08-19) reportedly sets sanctions (not verified).
- **What this means for the project (for the adviser to confirm):** sending children's voice to foreign vendors is a cross-border transfer needing a TIA dossier; voiceprints are biometric/sensitive; consent for audio capture and for voiceprints should be separate, parent-signed (and child-informed from age 7); keep the consent text, deletion script and processor list. This research did NOT verify whether a school's internal evaluation of its own recordings triggers the filing; ask the adviser.

---

## Unconfirmed / could not verify (consolidated)

1. Azure: current prices ($- placeholders); whether the 5 h/500 MB (fast page) or 2 h/300 MB (batch page tip) limit is true; en+vi code-switching in the multilingual/LID models (vi-VN not in the multilingual list); vi diarization; pronunciation assessment for vi-VN; MAI-Transcribe / LLM Speech vi, diarization, privacy; contractual no-training statement (Product Terms/DPA not opened); Speech regions list; whether any diagnostic logging exists; official release-notes confirmation of speaker recognition removal (only the Message Center mirror and an unreachable legal page).
2. OpenAI: whether `gpt-transcribe` supports Vietnamese, diarization, timestamps; per-minute price of deprecated models; account ZDR status (owner must check the dashboard).
3. Google: Gemini Files API retention and abuse-log days (not stated); Chirp/v2 data-logging terms and prices; Chirp 3 diarization method support.
4. Claude audio input (page 404).
5. Deepgram vi + max duration + zero retention + DPA; AssemblyAI vi diarization and what "Speaker Identification" does; Speechmatics vi/batch code-switching and enrolment limits; ElevenLabs price/retention/training; Rev.ai everything official; Soniox everything official; pyannoteAI terms.
6. Self-host: licences of faster-whisper, whisper.cpp, SpeechBrain, TitaNet, Parakeet, Canary, Moonshine-vi, Sortformer; Python 3.13 and Windows status; CPU speed figures; model sizes (memory only); no published results on Vietnamese or Vietnamese-English children's speech.
7. Supabase: request body size limit; signed upload URL expiry; which plan the project is on; TUS max object size (only per-plan global limit shown).
8. Hosting: Cloud Run, Replicate, Fly large presets/GPU, official Hetzner tier table for CX/CAX; Ryzen 7 and Vietnam mini-PC prices.
9. Legal: official text of Decree 13 (sensitive/biometric, TIA articles) and PDPL (children's and biometric articles) not opened.

---

## Recommendation: what to test in B1/B2 and with which settings

Gate: nothing below touches a vendor until the owner writes `AUDIT_EVAL_PROXY_GO`; re-read the vendor's terms that day and note the date. Send codes (S01...) only; pieces of 10-15 min; delete vendor-side artefacts after each run.

B1 (transcripts):
1. Local first: faster-whisper large-v3 and large-v3-turbo (int8, CPU) with `language` unset or `vi`/`en` per segment; Moonshine only if its Vietnamese licence allows. No gated token needed.
2. Azure fast transcription: `diarization.enabled=true, maxSpeakers=6`; run twice - `locales` omitted vs `["en-US","vi-VN"]`. Nothing stored by Microsoft. Record the Product Terms training clause on the test day.
3. OpenAI `gpt-transcribe` (`/v1/audio/transcriptions` only; pieces under 25 MB; `languages` hints en+vi; prompt with keywords) - ONLY IF the owner confirms ZDR/Modified Abuse Monitoring is on for the key's project. Otherwise skip and say "default 30-day logging".
4. Skip Gemini (no zero-retention option; minors clause). Optional English-only Google Chirp 3 only if the owner accepts a copy of audio in a GCS bucket (us/eu) - lower priority.
5. Optional with a new key and owner decision: Speechmatics (best fit for B2).

B2 (speaker identification):
1. Local: pyannote community-1 (HF token + terms accepted by the owner) for diarization; embeddings from WeSpeaker/3D-Speaker via sherpa-onnx (no token) and SpeechBrain ECAPA; match against a few enrolled clips per child, output suggestion + confidence only, low confidence = unknown. Enrolment artefacts stay in `C:\Users\Dell\hec-audio-eval\` with the deletion script.
2. Cloud: no Azure option exists (retired). OpenAI known-speaker references exist only in the deprecated `gpt-4o-transcribe-diarize` (shuts down 2027-02-26; max 4 speakers; do not build on it). Speechmatics enrolment is the only documented cloud enrolment found, pending a key.

B2b: a CPX32/CPX42-class VPS or the school's N100 mini PC for CPU-only runs; serverless GPU (Modal L4 about $0.80/h) only if CPU is too slow.

Edge-function design implication (from section 6): one invocation per 10-15 min piece; never buffer a whole recording; 2 s CPU and 256 MB memory rule out decoding audio in the function.



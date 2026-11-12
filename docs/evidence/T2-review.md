VERDICT: INCOMPLETE

# T2 review - class-recordings storage scope

Where I am / next step: main probe run (matrix, odd names, renames, helper, constraint, app flow, paste twice, rollback, both orders with the recorder) - all sound except R1 below. Next: validate the R1 fix text, run 8 mutants, write up.

## Findings so far
- R1 (MAJOR, confirmed by probe): `class_transcripts_audio_path_in_class` checks only the FIRST segment. `A/../B/x.mp3` and `A/%2e%2e/B/x.mp3` are accepted for a class-A row; storage-js 2.75.0 `download()` builds `${url}/object/${bucket}/${path}` unencoded and fetch() removes dot segments, so the service-role function would fetch `<B>/x.mp3`. Needs the file name of B's object (random uuid) - known to anyone who listed the bucket while it was open.

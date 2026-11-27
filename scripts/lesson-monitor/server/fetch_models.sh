#!/usr/bin/env bash
# Puts the models in <incoming>/models without pushing 2 GB over the owner's link (27 Nov 2026: the 1.5 GB scp was
# reset five times). push_to_vm.ps1 sends two small lists made on the PC from its own copies:
#   models.sha256   "<sha256>  <path>"  every model file, as on the PC (the PC's copy is the reference)
#   models.urls     "<path>\t<url>"     public, pinned-revision downloads (Hugging Face) for some of them
# For each file: already here with the PC's hash -> kept; else downloaded from its url and kept only if the hash
# matches; else listed in models.missing, which push_to_vm.ps1 then copies from the PC. Runs as the SSH user.
#   bash fetch_models.sh /opt/hec-monitor/incoming
set -euo pipefail
IN=${1:?usage: fetch_models.sh <incoming folder>}
M=$IN/models
mkdir -p "$M"
: > "$IN/models.missing"
declare -A URL=()
if [ -f "$IN/models.urls" ]; then
  while IFS=$'\t' read -r p u; do [ -n "$p" ] && URL[$p]=$u; done < <(tr -d '\r' < "$IN/models.urls")
fi
hash_of() { sha256sum "$1" | cut -d' ' -f1; }
kept=0 fetched=0
while read -r sum path; do
  [ -n "$sum" ] || continue
  f=$M/$path
  if [ -f "$f" ] && [ "$(hash_of "$f")" = "$sum" ]; then kept=$((kept + 1)); continue; fi
  u=${URL[$path]:-}
  if [ -n "$u" ]; then
    mkdir -p "$(dirname "$f")"
    if curl -fsSL --retry 5 --retry-delay 5 -o "$f.part" "$u" && [ "$(hash_of "$f.part")" = "$sum" ]; then
      mv -f "$f.part" "$f"; fetched=$((fetched + 1)); echo "fetched: $path"; continue
    fi
    rm -f "$f.part"; echo "download failed or differs from the PC's copy: $path"
  fi
  rm -f "$f"
  echo "$path" >> "$IN/models.missing"
done < <(tr -d '\r' < "$IN/models.sha256")
echo "models: $kept already here, $fetched downloaded, $(wc -l < "$IN/models.missing") to copy from the PC"

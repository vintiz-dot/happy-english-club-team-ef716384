# sync-to-lovable.ps1
# ====================
# Mirrors this repo's application code into the nested Lovable working copy
# (new/happy-english-club-team-ef716384) so the two deploy targets --
# Cloudflare (this repo) and Lovable (nested repo) -- always ship the same app.
#
# Excluded on purpose:
#   .git          each repo keeps its own history/remote
#   node_modules  installed per-repo
#   dist          build output
#   new           the nested repo itself (never recurse into it)
#   .claude       local AI tooling state
#   secrets       GOOGLE_CREDENTIALS.json / customimage.json never leave root
#
# Usage:  powershell -File scripts/sync-to-lovable.ps1
# Then commit+push inside new/happy-english-club-team-ef716384 to deploy on Lovable.
#
# NOTE: keep this file pure ASCII. PowerShell 5.1 reads BOM-less files as
# CP1252, and unicode punctuation can decode into stray quote characters
# that break parsing.

$ErrorActionPreference = "Stop"

$src = Split-Path -Parent $PSScriptRoot   # repo root (scripts/..)
$dst = Join-Path $src "new\happy-english-club-team-ef716384"

if (-not (Test-Path (Join-Path $dst ".git"))) {
  Write-Error "Nested Lovable repo not found at $dst - aborting."
}

Write-Host "Syncing app code -> $dst" -ForegroundColor Cyan

robocopy $src $dst /E `
  /XD .git node_modules dist new .claude `
  /XF GOOGLE_CREDENTIALS.json customimage.json `
  /NFL /NDL /NJH | Out-Null

# robocopy exit codes 0-7 mean success (1 = files copied)
if ($LASTEXITCODE -ge 8) {
  Write-Error "robocopy failed with exit code $LASTEXITCODE"
}

Write-Host "Sync complete (robocopy code $LASTEXITCODE)." -ForegroundColor Green
Write-Host "Review changes:  git -C $dst status" -ForegroundColor Yellow
exit 0

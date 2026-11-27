# Copies the lesson monitor to the Oracle VM and runs its install there. Run on the owner's PC, from the repo:
#
#   powershell -ExecutionPolicy Bypass -File scripts\lesson-monitor\server\push_to_vm.ps1 -Vm ubuntu@<VM public IP> -Key $HOME\.ssh\hec-oracle
#
# What goes over (SSH, to /opt/hec-monitor/incoming on the VM):
#   code.tar   scripts/lesson-monitor and scripts/lesson-eval/common.py from the COMMITTED code (git archive HEAD)
#   models/    faster-whisper large-v3-turbo and the six voice models, from the evaluation folder (model files only)
#   step0.json step 0's scores (numbers only)
#   env        the two PUBLIC Supabase values the website already ships
# NOT copied: audio, transcripts, voiceprints, key.txt, consent.txt, lessons, or anything else with children's data.
# Re-run it to update the code (-SkipModels skips the 2 GB of models once they are there).
param(
  [Parameter(Mandatory = $true)][string]$Vm,
  [Parameter(Mandatory = $true)][string]$Key,
  [string]$Models = "C:\Users\Dell\hec-audio-eval\models",
  [string]$Step0 = "C:\Users\Dell\hec-audio-eval\pilot\step0\result.json",
  [string]$SupabaseUrl = "",
  [string]$SupabaseKey = "",
  [switch]$SkipModels
)
$ErrorActionPreference = "Stop"
function Step($m) { Write-Host "`n== $m" -ForegroundColor Cyan }
$repo = (& git -C $PSScriptRoot rev-parse --show-toplevel).Trim()
$ssh = @("-i", $Key, "-o", "StrictHostKeyChecking=accept-new")

Step "Public settings"
if (-not $SupabaseUrl -or -not $SupabaseKey) {
  $envFile = @((Join-Path $repo ".env"), (Join-Path (Split-Path (& git -C $repo rev-parse --git-common-dir).Trim() -Parent) ".env")) |
    Where-Object { Test-Path $_ } | Select-Object -First 1
  if (-not $envFile) { throw "No .env found: pass -SupabaseUrl and -SupabaseKey (the VITE_ public values)." }
  $lines = Get-Content $envFile
  $get = { param($n) (($lines | Where-Object { $_ -match "^$n\s*=" } | Select-Object -First 1) -replace "^$n\s*=\s*", "").Trim().Trim('"') }
  if (-not $SupabaseUrl) { $SupabaseUrl = & $get "VITE_SUPABASE_URL" }
  if (-not $SupabaseKey) { $SupabaseKey = & $get "VITE_SUPABASE_PUBLISHABLE_KEY" }
}
$tmp = Join-Path $env:TEMP ("hec-push-" + [guid]::NewGuid().ToString("N").Substring(0, 8))
New-Item -ItemType Directory $tmp | Out-Null
try {
  Set-Content -Path "$tmp\env" -Value "HEC_SUPABASE_URL=$SupabaseUrl`nHEC_SUPABASE_PUBLISHABLE_KEY=$SupabaseKey" -NoNewline -Encoding ascii
  Step "Code (committed HEAD)"
  & git -C $repo archive --format=tar -o "$tmp\code.tar" HEAD scripts/lesson-monitor scripts/lesson-eval/common.py
  if ($LASTEXITCODE) { throw "git archive failed" }
  & ssh @ssh $Vm "sudo install -d -o `$(id -un) /opt/hec-monitor/incoming"
  & scp @ssh "$tmp\code.tar" "$tmp\env" "${Vm}:/opt/hec-monitor/incoming/"
  & scp @ssh (Join-Path $repo "scripts\lesson-monitor\server\setup_oracle_vm.sh") "${Vm}:/opt/hec-monitor/incoming/setup_oracle_vm.sh"
  if (Test-Path $Step0) { & scp @ssh $Step0 "${Vm}:/opt/hec-monitor/incoming/step0.json" } else { Write-Warning "No step 0 result at $Step0" }
  if (-not $SkipModels) {
    Step "Models (about 2 GB)"
    & ssh @ssh $Vm "mkdir -p /opt/hec-monitor/incoming/models/faster-whisper /opt/hec-monitor/incoming/models/speechbrain /opt/hec-monitor/incoming/models/sherpa"
    & scp @ssh -r (Join-Path $Models "faster-whisper\models--mobiuslabsgmbh--faster-whisper-large-v3-turbo") "${Vm}:/opt/hec-monitor/incoming/models/faster-whisper/"
    & scp @ssh -r (Join-Path $Models "speechbrain\spkrec-ecapa-voxceleb") "${Vm}:/opt/hec-monitor/incoming/models/speechbrain/"
    Get-ChildItem (Join-Path $Models "sherpa") -Filter *.onnx | ForEach-Object { & scp @ssh $_.FullName "${Vm}:/opt/hec-monitor/incoming/models/sherpa/" }
  }
  Step "Install on the VM"
  & ssh @ssh -t $Vm "sudo bash /opt/hec-monitor/incoming/setup_oracle_vm.sh install"
} finally {
  Remove-Item -Recurse -Force $tmp
}
Write-Host "`nNext, on the VM (ssh -i $Key $Vm): sudo bash /opt/hec-monitor/code/scripts/lesson-monitor/server/setup_oracle_vm.sh seal-key  (then set-groq, set-cloudflare, signin, selftest, enable)"

# Copies the lesson monitor to the Oracle VM and runs its install there. Run on the owner's PC, from the repo:
#
#   powershell -ExecutionPolicy Bypass -File scripts\lesson-monitor\server\push_to_vm.ps1 -Vm ubuntu@<VM public IP> -Key $HOME\.ssh\hec-oracle
#
# What goes over (SSH, to /opt/hec-monitor/incoming on the VM):
#   code.tar   scripts/lesson-monitor and scripts/lesson-eval/common.py from the COMMITTED code (git archive HEAD)
#   models/    faster-whisper large-v3-turbo and the six voice models. Only two lists go first (each file's sha256 from
#              the evaluation folder, and pinned Hugging Face links); the VM downloads what it can (fetch_models.sh)
#              and keeps a file only when its hash is the PC's. The PC then copies just the files still missing.
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
function Run($what) {  # run a native command given as a script block and stop with a clear message if it fails
  & $what
  if ($LASTEXITCODE -ne 0) { throw "Failed (exit $LASTEXITCODE): $($what.ToString().Trim())" }
}
$repo = (& git -C $PSScriptRoot rev-parse --show-toplevel).Trim()
if ($LASTEXITCODE -ne 0 -or -not $repo) { throw "Not inside a git repository" }
# -n: ssh must not read stdin, or it never exits when run from a terminal panel (27 Nov 2026, the first install hung).
$scp = @("-i", $Key, "-o", "StrictHostKeyChecking=accept-new", "-o", "BatchMode=yes")
$ssh = @("-n") + $scp
$in = "/opt/hec-monitor/incoming"
function CopyWithRetry($src, $dst) {  # scp cannot resume: try a few times on a reset link
  for ($i = 1; $i -le 5; $i++) {
    & scp @scp $src $dst
    if ($LASTEXITCODE -eq 0) { return }
    Write-Warning "copy failed (try $i of 5): $src"
    Start-Sleep -Seconds (10 * $i)
  }
  throw "Could not copy $src"
}

Step "Public settings"
if (-not $SupabaseUrl -or -not $SupabaseKey) {
  $candidates = @(Join-Path $repo ".env")
  $common = (& git -C $repo rev-parse --path-format=absolute --git-common-dir)
  if ($LASTEXITCODE -eq 0 -and $common) {
    $mainRoot = Split-Path ($common.Trim()) -Parent
    if ($mainRoot) { $candidates += (Join-Path $mainRoot ".env") }
  }
  $envFile = $candidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
  if (-not $envFile) { throw "No .env found: pass -SupabaseUrl and -SupabaseKey (the VITE_ public values)." }
  $lines = Get-Content $envFile
  $get = { param($n) (($lines | Where-Object { $_ -match "^$n\s*=" } | Select-Object -First 1) -replace "^$n\s*=\s*", "").Trim().Trim('"') }
  if (-not $SupabaseUrl) { $SupabaseUrl = & $get "VITE_SUPABASE_URL" }
  if (-not $SupabaseKey) { $SupabaseKey = & $get "VITE_SUPABASE_PUBLISHABLE_KEY" }
}
if (-not $SupabaseUrl -or -not $SupabaseKey) { throw "The Supabase URL or key is empty: pass -SupabaseUrl and -SupabaseKey." }
$dirty = & git -C $repo status --porcelain -- scripts/lesson-monitor scripts/lesson-eval/common.py
if ($LASTEXITCODE -ne 0) { throw "git status failed" }
if ($dirty) { throw "Uncommitted changes in scripts/lesson-monitor or scripts/lesson-eval/common.py (git archive sends HEAD only). Commit first:`n$($dirty -join "`n")" }
$tmp = Join-Path $env:TEMP ("hec-push-" + [guid]::NewGuid().ToString("N").Substring(0, 8))
New-Item -ItemType Directory $tmp | Out-Null
try {
  Set-Content -Path "$tmp\env" -Value "HEC_SUPABASE_URL=$SupabaseUrl`nHEC_SUPABASE_PUBLISHABLE_KEY=$SupabaseKey" -NoNewline -Encoding ascii
  Step "Code (committed HEAD)"
  Run { git -C $repo archive --format=tar -o "$tmp\code.tar" HEAD scripts/lesson-monitor scripts/lesson-eval/common.py }
  Run { ssh @ssh $Vm "sudo install -d -o `$(id -un) $in" }
  Run { scp @scp "$tmp\code.tar" "$tmp\env" "${Vm}:$in/" }
  # The setup and fetch scripts come out of code.tar (committed, LF by .gitattributes), never from the working
  # tree, whose Windows copy has CRLF; tr strips a CR anyway.
  Run { ssh @ssh $Vm "cd $in && for f in setup_oracle_vm.sh fetch_models.sh; do tar -xOf code.tar scripts/lesson-monitor/server/`$f | tr -d '\r' > `$f; done" }
  if (Test-Path $Step0) { Run { scp @scp $Step0 "${Vm}:$in/step0.json" } } else { Write-Warning "No step 0 result at $Step0" }
  if (-not $SkipModels) {
    Step "Models: hashes and public links"
    $hfTurbo = "https://huggingface.co/mobiuslabsgmbh/faster-whisper-large-v3-turbo/resolve"
    $hfEcapa = "https://huggingface.co/speechbrain/spkrec-ecapa-voxceleb/resolve/0f99f2d0ebe89ac095bcc5903c4dd8f72b367286"
    $sources = @(
      (Join-Path $Models "faster-whisper\models--mobiuslabsgmbh--faster-whisper-large-v3-turbo"),
      (Join-Path $Models "speechbrain\spkrec-ecapa-voxceleb")
    )
    $files = @($sources | ForEach-Object { Get-ChildItem $_ -Recurse -File }) + @(Get-ChildItem (Join-Path $Models "sherpa") -Filter *.onnx -File)
    $sums = New-Object System.Collections.Generic.List[string]
    $urls = New-Object System.Collections.Generic.List[string]
    $local = @{}
    foreach ($f in $files) {
      $rel = $f.FullName.Substring($Models.TrimEnd('\').Length + 1).Replace('\', '/')
      $local[$rel] = $f.FullName
      $sums.Add("$((Get-FileHash -Algorithm SHA256 $f.FullName).Hash.ToLower())  $rel")
      if ($rel -match '^faster-whisper/models--mobiuslabsgmbh--faster-whisper-large-v3-turbo/snapshots/([0-9a-f]{40})/(.+)$') {
        $urls.Add("$rel`t$hfTurbo/$($Matches[1])/$($Matches[2])")
      } elseif ($rel -match '^speechbrain/spkrec-ecapa-voxceleb/(.+)$') {
        $name = if ($Matches[1] -eq "label_encoder.ckpt") { "label_encoder.txt" } else { $Matches[1] }
        $urls.Add("$rel`t$hfEcapa/$name")
      }
      # sherpa: the k2-fsa release files differ from the PC's (27 Nov 2026), so they are always copied.
    }
    [IO.File]::WriteAllText("$tmp\models.sha256", ($sums -join "`n") + "`n")
    [IO.File]::WriteAllText("$tmp\models.urls", ($urls -join "`n") + "`n")
    Run { scp @scp "$tmp\models.sha256" "$tmp\models.urls" "${Vm}:$in/" }
    Step "Models: the VM downloads what it can"
    Run { ssh @ssh $Vm "bash $in/fetch_models.sh $in" }
    $missing = @(& ssh @ssh $Vm "cat $in/models.missing" | Where-Object { $_.Trim() })
    if ($LASTEXITCODE -ne 0) { throw "Could not read the missing-models list" }
    if ($missing.Count -gt 0) {
      Step "Models: copying $($missing.Count) file(s) from this PC"
      $dirs = ($missing | ForEach-Object { "'$in/models/" + ($_.Substring(0, $_.LastIndexOf('/'))) + "'" } | Sort-Object -Unique) -join " "
      Run { ssh @ssh $Vm "mkdir -p $dirs" }
      foreach ($rel in $missing) { CopyWithRetry $local[$rel] "${Vm}:$in/models/$rel" }  # no quotes: scp (SFTP) passes the path as is
    }
    Step "Models: every file matches the PC's hash"
    Run { ssh @ssh $Vm "cd $in/models && sha256sum -c --quiet ../models.sha256 && echo 'all models match'" }
  }
  Step "Install on the VM"
  Run { ssh @ssh $Vm "sudo bash $in/setup_oracle_vm.sh install" }
} finally {
  Remove-Item -Recurse -Force $tmp
}
Write-Host "`nNext, on the VM (ssh -i $Key $Vm): sudo bash /opt/hec-monitor/code/scripts/lesson-monitor/server/setup_oracle_vm.sh seal-key  (then set-groq, set-cloudflare, signin, selftest, enable)"

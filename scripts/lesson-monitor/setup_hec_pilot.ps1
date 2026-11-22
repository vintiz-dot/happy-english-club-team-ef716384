# One-shot setup of the lesson monitor's own home: C:\hec-pilot, for the separate Windows account hec-pilot.
#
# Run ONCE, in PowerShell AS ADMINISTRATOR, from the repo checkout (it finds the repo from its own location):
#   powershell -ExecutionPolicy Bypass -File scripts\lesson-monitor\setup_hec_pilot.ps1
#
# It does, in order (runbook section 1, condition 4):
#   1. makes C:\hec-pilot and copies in ONLY what the job needs: scripts\lesson-monitor, scripts\lesson-eval\common.py,
#      the large-v3-turbo model, and step 0's result.json (numbers only). NOT copied: key.txt, consent.txt, lessons,
#      voiceprints, audio or anything else from the evaluation folder (it holds children's data).
#   2. installs Python 3.13 for all users (winget) if none is found, builds C:\hec-pilot\.venv and installs the packages.
#   3. writes C:\hec-pilot\run-pilot.ps1, a launcher that sets the three settings and runs a pilot script
#      (the two Supabase values are the PUBLIC ones the website already ships; they are not secrets).
#   4. locks C:\hec-pilot to hec-pilot, SYSTEM and Administrators (everyone else removed).
#   5. runs the job's offline tests, and registers the scheduled task that opens the watch job at hec-pilot's sign-in.
# It stores no password. Nothing here touches the app's database.
param(
  [string]$User = "hec-pilot",
  [string]$Root = "C:\hec-pilot",
  [string]$ModelSource = "C:\Users\Dell\hec-audio-eval\models\faster-whisper\models--mobiuslabsgmbh--faster-whisper-large-v3-turbo",
  [string]$Step0Source = "C:\Users\Dell\hec-audio-eval\pilot\step0\result.json",
  [string]$SupabaseUrl = "",
  [string]$SupabaseKey = ""
)
$ErrorActionPreference = "Stop"
function Step($m) { Write-Host "`n== $m" -ForegroundColor Cyan }

if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw "Run this in PowerShell as administrator (right-click > Run as administrator)."
}
if (-not (Get-LocalUser -Name $User -ErrorAction SilentlyContinue)) { throw "There is no Windows user '$User'. Create it first (a Standard user)." }

$repo = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
if (-not (Test-Path (Join-Path $repo "scripts\lesson-monitor\nightly.py"))) { throw "Run this from the repo's scripts\lesson-monitor folder (found $repo)." }

Step "Settings"
if (-not $SupabaseUrl -or -not $SupabaseKey) {
  $envFile = Join-Path $repo ".env"
  if (-not (Test-Path $envFile)) { throw "No .env in $repo. Pass -SupabaseUrl and -SupabaseKey (the VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY values)." }
  $lines = Get-Content $envFile
  $get = { param($n) (($lines | Where-Object { $_ -match "^$n\s*=" } | Select-Object -First 1) -replace "^$n\s*=\s*", "").Trim().Trim('"') }
  if (-not $SupabaseUrl) { $SupabaseUrl = & $get "VITE_SUPABASE_URL" }
  if (-not $SupabaseKey) { $SupabaseKey = & $get "VITE_SUPABASE_PUBLISHABLE_KEY" }
}
if (-not $SupabaseUrl -or -not $SupabaseKey) { throw "Could not read the two public Supabase values." }
if (-not (Test-Path $ModelSource)) { throw "Model folder not found: $ModelSource" }
Write-Host "repo: $repo`nroot: $Root"

if (Test-Path $Root) {
  Step "Unlocking an earlier $Root (a re-run)"
  takeown /f $Root /r /d y | Out-Null
  icacls $Root /reset /T /C | Out-Null
}
Step "Copying the job's files"
$code = Join-Path $Root "code"
New-Item -ItemType Directory -Force "$code\scripts\lesson-monitor", "$code\scripts\lesson-eval", "$Root\models\faster-whisper", "$Root\pilot\step0" | Out-Null
robocopy (Join-Path $repo "scripts\lesson-monitor") "$code\scripts\lesson-monitor" /E /XD __pycache__ .pytest_cache /XF *.pyc /NFL /NDL /NJH /NJS | Out-Null
if ($LASTEXITCODE -ge 8) { throw "copying scripts\lesson-monitor failed (robocopy $LASTEXITCODE)" }
Copy-Item (Join-Path $repo "scripts\lesson-eval\common.py") "$code\scripts\lesson-eval\common.py" -Force
$modelDest = Join-Path "$Root\models\faster-whisper" (Split-Path $ModelSource -Leaf)
if (-not (Test-Path $modelDest)) {
  robocopy $ModelSource $modelDest /E /NFL /NDL /NJH /NJS | Out-Null
  if ($LASTEXITCODE -ge 8) { throw "copying the model failed (robocopy $LASTEXITCODE)" }
}
if (Test-Path $Step0Source) { Copy-Item $Step0Source "$Root\pilot\step0\result.json" -Force } else { Write-Warning "No step 0 result at ${Step0Source}: the job will refuse to start until step0.py score has been run." }

Step "Python"
$py = $null
foreach ($c in @("C:\Program Files\Python313\python.exe", "C:\Program Files\Python312\python.exe")) { if (Test-Path $c) { $py = $c; break } }
if (-not $py) {
  Write-Host "No all-users Python found; installing Python 3.13 for all users with winget."
  winget install --id Python.Python.3.13 --scope machine --silent --accept-package-agreements --accept-source-agreements
  foreach ($c in @("C:\Program Files\Python313\python.exe")) { if (Test-Path $c) { $py = $c; break } }
}
if (-not $py) { throw "No Python found. Install Python 3.13 for ALL USERS from python.org (tick 'Install for all users'), then run this again." }
Write-Host "using $py"
if (-not (Test-Path "$Root\.venv\Scripts\python.exe")) { & $py -m venv "$Root\.venv"; if ($LASTEXITCODE) { throw "venv failed" } }
$vpy = "$Root\.venv\Scripts\python.exe"
& $vpy -m pip install --quiet --disable-pip-version-check faster-whisper==1.2.1 soundfile scipy numpy pytest
if ($LASTEXITCODE) { throw "pip install failed" }

Step "Launcher"
@"
# Runs a pilot script with the pilot's settings:  .\run-pilot.ps1 nightly.py --watch   |   .\run-pilot.ps1 pilot_admin.py status
param([Parameter(Mandatory=`$true, Position=0)][string]`$Script, [Parameter(ValueFromRemainingArguments=`$true)][string[]]`$Rest)
`$env:HEC_EVAL_ROOT = '$Root'
`$env:HEC_SUPABASE_URL = '$SupabaseUrl'
`$env:HEC_SUPABASE_PUBLISHABLE_KEY = '$SupabaseKey'
Set-Location '$code'
& '$vpy' ("scripts\lesson-monitor\" + `$Script) @Rest
"@ | Set-Content -Encoding UTF8 "$Root\run-pilot.ps1"

Step "Offline tests (made-up data only)"
$env:HEC_EVAL_ROOT = $Root
Push-Location $code
try {
  & $vpy -m pytest "scripts\lesson-monitor\tests\test_plan.py" "scripts\lesson-monitor\tests\test_nightly_fake.py" -q
  if ($LASTEXITCODE) { Write-Warning "Some offline tests failed (see above). Fix before relying on the job." }
} catch { Write-Warning "Could not run the offline tests here: $($_.Exception.Message). Setup continues." }
Pop-Location

Step "Locking C:\hec-pilot to $User, SYSTEM and Administrators"
icacls $Root /inheritance:r /grant:r "${User}:(OI)(CI)F" "SYSTEM:(OI)(CI)F" "Administrators:(OI)(CI)F" /T /C | Out-Null
if ($LASTEXITCODE) { throw "icacls failed" }

Step "Scheduled task"
& (Join-Path $PSScriptRoot "install_watch_task.ps1") -Root $Root -User $User

Write-Host "`nDone. Remaining by hand: BitLocker on (manage-bde -status C:), power: never sleep when plugged in (as $User)," -ForegroundColor Green
Write-Host "the consent lines for the class, and 'switch-on' (runbook sections 1-3). Sign in as $User; the watch window opens by itself and asks for your app password." -ForegroundColor Green
Write-Host "Manual run: powershell -File $Root\run-pilot.ps1 nightly.py --watch"

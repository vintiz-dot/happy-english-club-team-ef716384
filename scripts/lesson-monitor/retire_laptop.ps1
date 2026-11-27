# Retires the laptop pilot (owner, 27 Nov 2026: the Oracle server replaces it, no laptop fallback).
#
# Run ONCE, in PowerShell AS ADMINISTRATOR, from the repo, only AFTER the server has saved its first real report
# (server/README.md; `setup_oracle_vm.sh logs` shows "report saved"):
#   powershell -ExecutionPolicy Bypass -File scripts\lesson-monitor\retire_laptop.ps1 -ServerHasSavedAReport
#   ... -RemoveUser     also removes the Windows account hec-pilot
#   ... -DryRun         shows what would go, deletes nothing
#
# What it does, in order (this laptop only; the app's reports, class switches and consents are NOT touched,
# so it never runs delete_pilot.py without --local-only):
#   1. refuses while any nightly.py is running (a rerun in progress keeps its folder);
#   2. removes the scheduled task "HEC lesson monitor watch";
#   3. delete_pilot.py --local-only --yes in C:\hec-pilot: audio copies, drafts, voiceprints, logs (counted, listed again);
#   4. deletes hec-pilot's remembered sign-in (C:\Users\hec-pilot\.hec-pilot\session.bin);
#   5. deletes C:\hec-pilot (code copy, venv, model copy) and lists what is left;
#   6. with -RemoveUser, the Windows account hec-pilot and its profile.
# Kept: C:\Users\Dell\hec-audio-eval (the evaluation folder; push_to_vm.ps1 copies the models from it).
param(
  [switch]$ServerHasSavedAReport,
  [switch]$RemoveUser,
  [switch]$DryRun,
  [string]$Root = "C:\hec-pilot",
  [string]$User = "hec-pilot",
  [string]$TaskName = "HEC lesson monitor watch"
)
$ErrorActionPreference = "Stop"
function Step($m) { Write-Host "`n== $m" -ForegroundColor Cyan }

if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw "Run this in PowerShell as administrator."
}
if (-not $ServerHasSavedAReport -and -not $DryRun) {
  throw "Only after the Oracle server has saved its first real lesson report: then run again with -ServerHasSavedAReport."
}

Step "Is the laptop job still running?"
$running = @(Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like "*nightly.py*" })
if ($running.Count -gt 0) {
  throw "$($running.Count) nightly.py process(es) are running (a rerun?). Let them finish, then run this again."
}
Write-Host "none"

$session = "C:\Users\$User\.hec-pilot\session.bin"
$files = if (Test-Path $Root) { @(Get-ChildItem $Root -Recurse -File -Force -ErrorAction SilentlyContinue).Count } else { 0 }
Write-Host "To remove: task '$TaskName', $files files under $Root, remembered sign-in $(if (Test-Path $session) { 'present' } else { 'absent' })$(if ($RemoveUser) { ", Windows user $User" })"
if ($DryRun) { Write-Host "Dry run: nothing deleted."; return }

Step "Scheduled task"
if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
  Write-Host "removed"
} else { Write-Host "not there" }

Step "The pilot's data (laptop only)"
$launcher = Join-Path $Root "run-pilot.ps1"
if (Test-Path $launcher) {
  & powershell -NoProfile -ExecutionPolicy Bypass -File $launcher delete_pilot.py --local-only --yes
  if ($LASTEXITCODE -ne 0) { throw "delete_pilot.py --local-only reported files left (exit $LASTEXITCODE): look before going on" }
} else { Write-Host "no launcher at $launcher (already removed?)" }

Step "Remembered sign-in"
if (Test-Path $session) { Remove-Item -Force $session; Write-Host "deleted" } else { Write-Host "not there" }

Step "The pilot folder"
if (Test-Path $Root) {
  takeown /f $Root /r /d y | Out-Null
  icacls $Root /reset /T /C | Out-Null
  Remove-Item -Recurse -Force $Root
}
$left = if (Test-Path $Root) { @(Get-ChildItem $Root -Recurse -File -Force -ErrorAction SilentlyContinue).Count } else { 0 }
Write-Host "files left under ${Root}: $left"

if ($RemoveUser) {
  Step "Windows user $User"
  if (Get-LocalUser -Name $User -ErrorAction SilentlyContinue) {
    Get-CimInstance Win32_UserProfile | Where-Object { $_.LocalPath -like "*\$User" } | Remove-CimInstance
    Remove-LocalUser -Name $User
    Write-Host "removed"
  } else { Write-Host "not there" }
}
Write-Host "`nThe laptop pilot is retired. The server (scripts\lesson-monitor\server) is the only lesson monitor now."
if ($left -ne 0) { exit 2 }

# Registers a Windows scheduled task that opens the lesson monitor's watch job whenever the hec-pilot
# account signs in, and again every morning at 07:30 if the window was closed.
#
# Run ONCE, in PowerShell as the hec-pilot user (not as administrator):
#   powershell -ExecutionPolicy Bypass -File C:\hec-pilot\code\scripts\lesson-monitor\install_watch_task.ps1
#
# What it does NOT do, on purpose: it stores no password. The job signs in as an admin of the app and
# asks for that password in the window it opens; the person who sits down types it. A task that held the
# admin password would let anyone with access to this account read it. The window stays open (-NoExit),
# so the job's log lines are visible. Remove the task with:
#   Unregister-ScheduledTask -TaskName "HEC lesson monitor watch" -Confirm:$false
param(
  [string]$Root = "C:\hec-pilot",
  [string]$TaskName = "HEC lesson monitor watch"
)
$ErrorActionPreference = "Stop"
$py = Join-Path $Root ".venv\Scripts\python.exe"
$code = Join-Path $Root "code"
foreach ($p in @($py, (Join-Path $code "scripts\lesson-monitor\nightly.py"))) {
  if (-not (Test-Path $p)) { throw "Not found: $p. Finish the pilot setup first (runbook section 1, condition 4)." }
}
$cmd = "Set-Location '$code'; `$env:HEC_EVAL_ROOT='$Root'; & '$py' scripts\lesson-monitor\nightly.py --watch"
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoExit -NoProfile -Command `"$cmd`""
$triggers = @(
  (New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME),
  (New-ScheduledTaskTrigger -Daily -At 07:30)
)
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -DontStopIfGoingOnBatteries -AllowStartIfOnBatteries:$false
# Interactive, only while this user is signed in: the window needs a person to type the password.
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $triggers -Settings $settings -Principal $principal -Force | Out-Null
Write-Host "Task '$TaskName' registered for $env:USERNAME: it opens at sign-in and at 07:30 daily if not already running."
Write-Host "Also set Settings > System > Power > sleep when plugged in = Never, for this account."

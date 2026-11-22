# Registers a Windows scheduled task that opens the lesson monitor's watch job whenever the hec-pilot
# account signs in, and again every morning at 07:30 if the window was closed.
# setup_hec_pilot.ps1 calls this; to run it alone, in PowerShell as administrator (or as hec-pilot itself):
#   powershell -ExecutionPolicy Bypass -File scripts\lesson-monitor\install_watch_task.ps1
#
# What it does NOT do, on purpose: it stores no password. The job signs in as an admin of the app and
# asks for that password in the window it opens; the person who sits down types it. A task that held the
# admin password would let anyone with access to this account read it. The window stays open (-NoExit),
# so the job's log lines are visible. Remove the task with:
#   Unregister-ScheduledTask -TaskName "HEC lesson monitor watch" -Confirm:$false
param(
  [string]$Root = "C:\hec-pilot",
  [string]$User = "hec-pilot",
  [string]$TaskName = "HEC lesson monitor watch"
)
$ErrorActionPreference = "Stop"
$launcher = Join-Path $Root "run-pilot.ps1"
if (-not (Test-Path $launcher)) { throw "Not found: $launcher. Run setup_hec_pilot.ps1 first." }
$cmd = "& '$launcher' nightly.py --watch"
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoExit -NoProfile -ExecutionPolicy Bypass -Command `"$cmd`""
$triggers = @(
  (New-ScheduledTaskTrigger -AtLogOn -User $User),
  (New-ScheduledTaskTrigger -Daily -At 07:30)
)
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -DontStopIfGoingOnBatteries
# Interactive, only while this user is signed in: the window needs a person to type the password.
$principal = New-ScheduledTaskPrincipal -UserId $User -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $triggers -Settings $settings -Principal $principal -Force | Out-Null
Write-Host "Task '$TaskName' registered for ${User}: it opens at sign-in and at 07:30 daily if not already running."

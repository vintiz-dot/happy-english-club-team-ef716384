# Tonight's watch for ONE class and ONE day: wait for that lesson's recording to finish, transcribe it
# carefully on this laptop, save the lesson monitor report, and ask for the class report, which grades each
# child's speaking near the end of the lesson (only children whose last 20 minutes were recorded whole and
# whose lines the teacher tapped as theirs; the grade is staff only and the teacher approves the report).
#
#   powershell -ExecutionPolicy Bypass -File scripts\lesson-monitor\watch_jupiter_tonight.ps1
#   ... -Class Venus -Date 2026-11-25 -StopAt 06:30      # another class or day
#
# It signs in as an admin and asks for the password in this window, like the normal watch task; nothing is
# stored. It looks every 5 minutes, handles the first matching recording, then stops (or stops at -StopAt).
param(
  [string]$Class = "Jupiter",
  [string]$Date = "today",
  [string]$StopAt = "07:00",
  [string]$Root = "C:\hec-pilot"
)
$ErrorActionPreference = "Stop"
$launcher = Join-Path $Root "run-pilot.ps1"
if (-not (Test-Path $launcher)) { throw "Not found: $launcher. Run setup_hec_pilot.ps1 first." }
& $launcher nightly.py --watch --class $Class --date $Date --careful --stop-after-done --stop-at $StopAt

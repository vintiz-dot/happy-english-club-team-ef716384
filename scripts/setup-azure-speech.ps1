<#
  setup-azure-speech.ps1 - create the Azure Speech resource the video
  homework uses, test its key, and store it as the Supabase secret
  `azure_key` (read by supabase/functions/get-speech-token).

  Run from the repo root in your own terminal:
    powershell -ExecutionPolicy Bypass -File scripts\setup-azure-speech.ps1

  What it does, asking before anything that costs money or changes things:
    1. Installs the Azure CLI with winget if it is missing.
    2. Signs you in to Azure (a browser window opens).
    3. Creates resource group + Speech service (Standard S0, about $1 per
       audio hour) in Southeast Asia. Re-running reuses what exists.
    4. Tests KEY 1 the same way get-speech-token does.
    5. Stores it in Supabase via `npx supabase secrets set`, or, if you
       prefer, copies it to the clipboard for you to paste.

  The key is never printed. Safe to run again.
#>
param(
  [string]$ResourceGroup = "hec-speech-rg",
  [string]$Name = "hec-speech",
  [string]$Region = "southeastasia",
  [ValidateSet("S0", "F0")][string]$Sku = "S0",
  [string]$SupabaseProject = "aswgmbefikhsnhogtryv"
)

# Not "Stop": Windows PowerShell 5.1 turns any az warning on stderr into a
# terminating error. Every az call is checked by its exit code instead.
$ErrorActionPreference = "Continue"

function Step($text) { Write-Host ""; Write-Host "== $text" -ForegroundColor Cyan }
function Ok($text) { Write-Host "   OK  $text" -ForegroundColor Green }
function Fail($text) { Write-Host "   !!  $text" -ForegroundColor Red; exit 1 }
function Ask($question) {
  $a = Read-Host "$question [y/N]"
  return ($a -match '^(y|yes)$')
}
function AzRun {
  # Runs az, returns its output, stops the script if it failed.
  $out = & az @args 2>&1
  if ($LASTEXITCODE -ne 0) { Fail ("az " + ($args -join " ") + " failed:`n" + ($out | Out-String)) }
  return $out
}

# 1. Azure CLI ---------------------------------------------------------------
Step "Azure CLI"
function Find-Az {
  # A window opened before the install does not have az on its PATH yet;
  # read the PATH Windows has now, and try the installer's own folder.
  $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
  foreach ($dir in @("$env:ProgramFiles\Microsoft SDKs\Azure\CLI2\wbin", "${env:ProgramFiles(x86)}\Microsoft SDKs\Azure\CLI2\wbin")) {
    if ((Test-Path "$dir\az.cmd") -and ($env:Path -notlike "*$dir*")) { $env:Path = "$dir;$env:Path" }
  }
  return [bool](Get-Command az -ErrorAction SilentlyContinue)
}
if (-not (Find-Az)) {
  if (-not (Ask "The Azure CLI is not installed. Install it now with winget?")) { Fail "Install it from https://aka.ms/installazurecliwindows and run this again." }
  winget install --exact --id Microsoft.AzureCLI --accept-source-agreements
  # winget exits non-zero for "already installed", so judge by whether az is there.
  if (-not (Find-Az)) { Fail "The Azure CLI is still not found. Close PowerShell, open a new window and run this again." }
}
Ok "found"

# 2. Sign in -----------------------------------------------------------------
Step "Azure sign-in"
& az account show --only-show-errors 1>$null 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host "   Sign in with the Microsoft account that HAS the Azure subscription"
  Write-Host "   (a school or work account often has none). A code and a link will"
  Write-Host "   appear: open the link in any browser, enter the code, pick the account."
  # Device code instead of the Windows sign-in, which silently picks the
  # account Windows is signed in with.
  & az login --use-device-code --only-show-errors 1>$null
  if ($LASTEXITCODE -ne 0) {
    & az logout --only-show-errors 1>$null 2>$null
    Fail ("That account has no Azure subscription. Run this again and choose the account you use for Azure. " +
      "If you have none yet, create one at https://azure.microsoft.com/pricing/purchase-options/pay-as-you-go (pay-as-you-go) and run this again.")
  }
}
$sub = AzRun account show --query "{name:name, id:id}" -o json | Out-String | ConvertFrom-Json
Write-Host "   Subscription: $($sub.name)"
if (-not (Ask "Use this subscription?")) {
  AzRun account list --query "[].{name:name, id:id}" -o table | Out-Host
  $pick = Read-Host "Paste the id of the subscription to use"
  AzRun account set --subscription $pick | Out-Null
  $sub = AzRun account show --query "{name:name, id:id}" -o json | Out-String | ConvertFrom-Json
}
Ok "using $($sub.name)"

# 3. Resource ----------------------------------------------------------------
Step "Speech service '$Name' ($Sku, $Region)"
AzRun provider register --namespace Microsoft.CognitiveServices --wait | Out-Null

$exists = & az cognitiveservices account show -n $Name -g $ResourceGroup --query "{kind:kind, sku:sku.name, location:location}" -o json 2>$null
if ($LASTEXITCODE -eq 0 -and $exists) {
  $info = ($exists | Out-String | ConvertFrom-Json)
  Ok "already exists ($($info.kind), $($info.sku), $($info.location)) - reusing it"
  if ($info.kind -ne "SpeechServices") { Fail "'$Name' is not a Speech service. Run again with -Name some-other-name." }
  $Region = $info.location
} else {
  $cost = "about US`$1 per audio hour, roughly `$5 a month for 20 students"
  if ($Sku -eq "F0") { $cost = "free, but it stops for the rest of the month after 5 audio hours" }
  if (-not (Ask "Create Speech service '$Name' on tier $Sku ($cost)?")) { Fail "Nothing was created." }
  AzRun group create -n $ResourceGroup -l $Region --only-show-errors | Out-Null
  AzRun cognitiveservices account create -n $Name -g $ResourceGroup --kind SpeechServices --sku $Sku -l $Region --yes --only-show-errors | Out-Null
  Ok "created"
}

# 4. Test the key ------------------------------------------------------------
Step "Testing the key"
$key = (AzRun cognitiveservices account keys list -n $Name -g $ResourceGroup --query key1 -o tsv | Out-String).Trim()
if (-not $key) { Fail "Azure returned no key." }
$tested = $false
for ($i = 0; $i -lt 6 -and -not $tested; $i++) {
  try {
    $r = Invoke-WebRequest -UseBasicParsing -Method Post -Uri "https://$Region.api.cognitive.microsoft.com/sts/v1.0/issueToken" `
      -Headers @{ "Ocp-Apim-Subscription-Key" = $key } -ContentType "application/x-www-form-urlencoded" -Body ""
    if ($r.StatusCode -eq 200) { $tested = $true }
  } catch {
    # A brand-new resource can take a minute before its key works.
    Write-Host "   not ready yet, retrying in 15 s..."
    Start-Sleep -Seconds 15
  }
}
if (-not $tested) { Fail "Azure still refuses the key after 90 s. Wait a few minutes and run this again (it will reuse the resource)." }
Ok "Azure issued a speech token with this key"

# 5. Store it ----------------------------------------------------------------
Step "Storing it as the Supabase secret 'azure_key'"
$stored = $false
if (Ask "Set it in Supabase now with the Supabase CLI? (you may be asked to sign in to Supabase)") {
  & npx --yes supabase@latest login
  $envFile = Join-Path $env:TEMP ("hec-speech-" + [guid]::NewGuid().ToString() + ".env")
  try {
    # Written to a temp file, not the command line, so it does not show in the process list.
    [IO.File]::WriteAllText($envFile, "azure_key=$key`nAZURE_SPEECH_REGION=$Region`n")
    & npx --yes supabase@latest secrets set --env-file $envFile --project-ref $SupabaseProject
    if ($LASTEXITCODE -eq 0) { $stored = $true; Ok "saved azure_key and AZURE_SPEECH_REGION=$Region" }
    else { Write-Host "   The Supabase CLI could not save it (no access to project $SupabaseProject?)." -ForegroundColor Yellow }
  } finally {
    Remove-Item $envFile -Force -ErrorAction SilentlyContinue
  }
}
if (-not $stored) {
  Set-Clipboard -Value $key
  Write-Host ""
  Write-Host "   The key is on your clipboard. In Supabase (or Lovable) open the" -ForegroundColor Yellow
  Write-Host "   Edge Function secrets, set   azure_key   to it (paste), and set" -ForegroundColor Yellow
  Write-Host "   AZURE_SPEECH_REGION   to   $Region" -ForegroundColor Yellow
  Read-Host "   Press Enter once it is saved, and the clipboard will be cleared"
  Set-Clipboard -Value " "
}
$key = $null

Write-Host ""
Write-Host "Done. Tell Claude to re-check get-speech-token." -ForegroundColor Green

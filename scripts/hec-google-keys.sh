#!/usr/bin/env bash
# Run this in Google Cloud Shell (upload the file, then: bash hec-google-keys.sh).
# Creates the Google keys the HEC app needs and saves them to ONE file,
# ~/hec-google-secrets.env. Nothing secret is printed on screen.
set -u

PROJECT="$(gcloud config get-value project 2>/dev/null)"
if [ -z "$PROJECT" ]; then
  echo "No project is set. Run: gcloud config set project YOUR_PROJECT_ID"
  exit 1
fi
SA_NAME="hec-ocr"
SA_EMAIL="${SA_NAME}@${PROJECT}.iam.gserviceaccount.com"
OUT="$HOME/hec-google-secrets.env"
TMP="$(mktemp)"
trap 'shred -u "$TMP" 2>/dev/null || rm -f "$TMP"' EXIT
echo "Project: $PROJECT"

echo "1/4 Enabling the Vision, Custom Search and API-keys services..."
if ! gcloud services enable vision.googleapis.com customsearch.googleapis.com apikeys.googleapis.com; then
  echo "Could not enable the services. Is billing switched on for this project?"
  exit 1
fi

echo "2/4 Service account for reading handwriting..."
if ! gcloud iam service-accounts describe "$SA_EMAIL" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$SA_NAME" --display-name="HEC OCR" || exit 1
fi
if ! gcloud iam service-accounts keys create "$TMP" --iam-account="$SA_EMAIL"; then
  echo "Key creation was refused (an organisation policy may block it)."
  exit 1
fi
CRED="$(jq -c . "$TMP")"

echo "3/4 API key for picture search (limited to Custom Search only)..."
KEYNAME="$(gcloud services api-keys list --filter='displayName=hec-custom-search' --format='value(name)' 2>/dev/null | head -n1)"
if [ -z "$KEYNAME" ]; then
  if ! gcloud services api-keys create --display-name="hec-custom-search" --api-target=service=customsearch.googleapis.com >/dev/null; then
    echo "Could not create the API key."
    exit 1
  fi
  KEYNAME="$(gcloud services api-keys list --filter='displayName=hec-custom-search' --format='value(name)' | head -n1)"
fi
CSE_KEY="$(gcloud services api-keys get-key-string "$KEYNAME" --format='value(keyString)')"

echo "4/4 Search engine ID (cx). This one cannot be created by a script."
echo "    Open https://programmablesearchengine.google.com/  ->  Add."
echo "    Choose to search the whole web, switch Image search ON, create it,"
echo "    then copy the 'Search engine ID'."
read -r -p "Paste the Search engine ID, or press Enter to skip for now: " CX

umask 077
{
  echo "GOOGLE_CREDENTIALS=$CRED"
  echo "GOOGLE_CSE_API_KEY=$CSE_KEY"
  echo "GOOGLE_CSE_ID=$CX"
} > "$OUT"

echo ""
echo "Saved to: $OUT   (no keys were printed)"
echo "Now download it:  cloudshell download $OUT"

#!/bin/sh
# Makes the Xcode project for HEC Phone Mic. Run ONCE, on a Mac with Xcode
# and Node 20+, from the ios-phone-mic folder:   sh scripts/setup-ios.sh
# It is safe to run again: every step checks before it changes anything.
set -eu

cd "$(dirname "$0")/.."
APP=ios/App/App

echo "1/6 Node packages (Capacitor 8.6.0, as pinned in package-lock.json)"
npm ci

if [ ! -d ios ]; then
  echo "2/6 Creating the iOS project (npx cap add ios)"
  npx cap add ios
else
  echo "2/6 ios/ already exists: kept"
fi

echo "3/6 Copying the microphone plugin into the app"
cp ios-src/HecPhoneMicPlugin.swift ios-src/HecBatchStore.swift ios-src/MainViewController.swift "$APP/"

echo "4/6 Info.plist: microphone wording and the background audio mode"
PLIST="$APP/Info.plist"
PB=/usr/libexec/PlistBuddy
$PB -c "Print :NSMicrophoneUsageDescription" "$PLIST" >/dev/null 2>&1 \
  || $PB -c "Add :NSMicrophoneUsageDescription string 'HEC Phone Mic records your voice as the teacher microphone of the class recording, also while the phone is locked.'" "$PLIST"
$PB -c "Print :UIBackgroundModes" "$PLIST" >/dev/null 2>&1 || $PB -c "Add :UIBackgroundModes array" "$PLIST"
$PB -c "Print :UIBackgroundModes" "$PLIST" | grep -q "audio" || $PB -c "Add :UIBackgroundModes:0 string audio" "$PLIST"

echo "5/6 Main.storyboard: the view controller that registers the plugin"
SB="$APP/Base.lproj/Main.storyboard"
if grep -q 'customClass="MainViewController"' "$SB"; then
  echo "    already set"
else
  sed -i '' 's/customClass="CAPBridgeViewController" customModule="Capacitor"/customClass="MainViewController" customModule="App" customModuleProvider="target"/' "$SB"
  grep -q 'customClass="MainViewController"' "$SB" || { echo "    could not set it: in Xcode, open Main.storyboard, select the Bridge View Controller, Identity inspector, Class = MainViewController, Module = App"; }
fi

echo "6/6 Sync"
npx cap sync ios

echo
echo "Done. Now, in Xcode (npx cap open ios):"
echo "  a. If HecPhoneMicPlugin.swift, HecBatchStore.swift and MainViewController.swift are not listed under App > App"
echo "     in the project navigator: File > Add Files to \"App\"..., pick the three files in ios/App/App, tick target App."
echo "  b. App target > Signing & Capabilities: choose the school's Team; Bundle Identifier com.happyenglishclub.phonemic."
echo "  c. Product > Run on the iPhone (USB cable, Developer Mode on the phone)."

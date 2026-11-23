# HEC Phone Mic (iPhone app)

The teacher's iPhone as the class recorder's teacher microphone, still recording while the phone is **locked** or in a pocket. The owner approved it on 23 Nov 2026.

## What it is

- A small Capacitor 8.6.0 app. It opens the school site's phone page, `https://user.hanoienglish.com/teacher/recorder/phone`, inside the app. The page is the same one Safari shows, so a change to the page ships with every push to main and needs no new app build.
- The app adds ONE thing the web cannot do: a native microphone, `HecPhoneMic` (`ios-src/HecPhoneMicPlugin.swift`). iOS's own audio engine (AVAudioEngine, audio session `playAndRecord`, `UIBackgroundModes: audio`) keeps recording behind a locked screen once Record was tapped with the app in front.
- It is only a microphone. The page reads its audio (`src/lib/recorder/nativeMic.ts`) and feeds the one recorder there is, `PhoneTeacherTrack`. That is where the laptop's timeline, FLAC, register / upload / read back / confirm and the phone link all live. Nothing about a recording is decided in Swift, and Swift makes no server call.
- Audio the page has not read yet waits on the phone (`HecBatchStore.swift`: memory, then files; about 5.8 MB a minute). Each batch carries the time its last sample was heard, so it lands on the timeline where it was heard, however late the page reads it.
- Sign-in is the teacher's own. They sign in inside the app once, as on the website. The app holds no key: the site carries the same publishable key it always does, and every call runs under RLS as that teacher.

## Status (23 Nov 2026)

Written on a Windows machine with no Xcode. **The Swift code has never been compiled or run.** What is tested: the page's side, in `scripts/recorder/unit.test.mjs` ("the iPhone app's microphone"). A fake plugin with the same contract feeds the real `PhoneTeacherTrack` against the contract-enforcing fake server. It covers a 4-minute lock read late but placed where it was heard, a call, a batch read twice, the finish, and a 13-minute lock arriving late.

The one open question that only an iPhone can answer: **does the page's JavaScript keep running while the phone is locked?**
- If it does (a WebKit report says WKWebView microphone capture keeps going with the `audio` mode on iOS 17.5), the chunks go up live and there is nothing more to do.
- If it is paused, the audio is kept and sent when the phone is unlocked. But the server counts a chunk that arrives more than 10 minutes (`late_after`) after it was heard as **late: stored, never evidence**. A lesson in a locked pocket would then be late audio. The fix is step 11 below.

## The steps, in order (who does each)

1. **Owner: Apple Developer Program**, 99 USD a year, at developer.apple.com/programs. As an Organization it needs the school's D-U-N-S number and takes days to weeks. As an Individual (the owner's name shows as the seller) it takes about a day. Add the person with the Mac as a team member (App Manager or Developer role).
2. **Mac person: a Mac** with Xcode 16 or later (from the App Store), Node 20 or later, and git. No CocoaPods: Capacitor 8 uses Swift Package Manager.
3. **Mac:** clone the repo, then from `ios-phone-mic/` run:
   ```sh
   sh scripts/setup-ios.sh
   ```
   It installs Capacitor 8.6.0 from `package-lock.json`, creates `ios/`, copies the three Swift files into the app, adds `NSMicrophoneUsageDescription` and `UIBackgroundModes: audio` to `Info.plist`, points `Main.storyboard` at `MainViewController` (which registers the plugin), and syncs.
4. **Xcode** (`npx cap open ios`): if `HecPhoneMicPlugin.swift`, `HecBatchStore.swift` and `MainViewController.swift` are not listed under App > App, use File > Add Files to "App"..., choose the three files in `ios/App/App` and tick target **App**.
5. **Xcode**, App target > Signing & Capabilities: Team = the school's team, Bundle Identifier `com.happyenglishclub.phonemic`. Confirm that **Background Modes > Audio, AirPlay, and Picture in Picture** is ticked (the script added it to Info.plist).
6. **Build once** (Product > Build). If the compiler complains, fix it here: the Swift was written without a compiler. The likely places are the `CAPBridgedPlugin` conformance, if Capacitor 8 renamed anything, and `requestRecordPermission`, which is deprecated in iOS 17 but still works.
7. **On the owner's iPhone:** turn on Settings > Privacy & Security > Developer Mode, connect by cable, then Product > Run. Sign in as a teacher in the app.
8. **The real-iPhone checks** (the list in `docs/RECORDER_RUNBOOK.md`, "The iPhone app: still to prove"). The most important one: lock the phone for 15 minutes during a test recording, then check in Supabase that the teacher chunks of those minutes arrived while it was locked and not all at once at the unlock. Only chunks registered at the unlock and marked `late` mean the JavaScript was paused.
9. **TestFlight:**
   - Create the app in App Store Connect (My Apps > + > New App, bundle id as above).
   - In Xcode, Product > Archive, then Distribute App > App Store Connect > Upload.
   - In App Store Connect > TestFlight, add the teachers as **internal testers** (people on the team; no Apple review for internal builds), or as external testers (one Beta App Review).
   - Teachers install the **TestFlight** app and accept the invite.
   - A TestFlight build lasts 90 days: upload a new one every 2-3 months.
10. **Only if it should go beyond TestFlight:** the App Store as an **unlisted** app, or a custom app through Apple Business Manager. That means App Review, which needs a privacy policy URL, the privacy answers (audio recorded, linked to the teacher, used for app functionality), a demo teacher login for the reviewer, and a sentence on why background audio is needed ("records the teacher's voice for the class recording while the phone is in their pocket"). Apple can refuse an app that is "a website in a wrapper" (guideline 4.2). The native microphone is the answer to that, but it is a risk.
11. **Only if step 8 shows the page's JavaScript paused while locked:** run the same recorder TypeScript (`PhoneTeacherTrack` and the backend, bundled) inside the app in JavaScriptCore, outside the web view, so the chunks go up while locked. Swift gets an HTTP bridge and SHA-256. One thing must be settled first: who refreshes the teacher's session while the page is paused. About 3-4 days, and another app build. Not started; it needs the owner's yes once step 8 has answered.

## Changing the app later

- A change to the page or the recorder: push to main as usual. The app loads the site, so nothing to rebuild.
- A change to `ios-src/*.swift`: copy the file into `ios/App/App/` (run the setup script again), then build and upload a new TestFlight build.
- A different site address: change `server.url` and `allowNavigation` in `capacitor.config.json`, then `npx cap sync ios` and a new build.

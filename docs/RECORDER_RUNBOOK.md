# Class recorder - a teacher's one-page guide

The recorder makes a sound recording of your lesson with two microphones (the clip-on one on you, and the round speaker-microphone on the table) and sends it to the school's server. It only records. Nothing is analysed on this page.

## Before the lesson

1. Use the school laptop, in **Google Chrome or Microsoft Edge** (not a private window). Plug the laptop into power.
2. Plug in both microphones. Turn the clip-on microphone on.
3. Open **Class recorder** in the menu on the left.
4. **First time on this laptop only:** press **Microphones** and follow the check (about five minutes).
5. Press **Ready for today**. You do this once a day. After that, every one of your lessons today is recorded by itself, starting 5 minutes before the lesson.
6. You can now use any other page of the app (attendance, flipbooks, the class screen). **Keep this browser tab open.** A dark bar at the bottom of the screen tells you what the recorder is doing.

## During the lesson

- The bar says **Recording** with a red dot: all is well. Teach as usual.
- You do not need to press anything. The recording stops by itself 10 minutes after the lesson ends (or when your next lesson starts).
- To stop early, press **Stop** in the bar, then **Yes, stop recording**.
- In full screen (flipbooks, the class screen) the bar still shows at the bottom, with Stop.
- Do not close the laptop lid and do not let it go to sleep.

## After the lesson

- The bar says **Saving the recording - keep this tab open** while the last pieces go to the server. Wait until it goes away, or until the recorder page says **Saved**.
- You can then close the tab. If you close it too early, nothing is lost: the rest is sent the next time you open the app on this laptop.

## What the messages mean

| You see | What it means | What to do |
|---|---|---|
| **Ready for today - (class) records from HH:MM** | You pressed Ready; the lesson is not ready yet. | Nothing. Keep the tab open. |
| **Armed - recording starts at HH:MM** | The lesson is ready; recording starts by itself. | Nothing. |
| **Recording** (red dot) | It is recording. | Nothing. |
| **Saving on this laptop - waiting for the school server** | It IS recording, on this laptop; the school server has not answered yet (often the Wi-Fi). | Teach as usual. It is sent when the network is back. If it lasts more than 10 minutes, tell the office. |
| **NOT RECORDING - the audio stopped** | The sound stopped coming in (a microphone pulled out, the laptop slept). | Check both plugs. It usually comes back by itself within seconds. If not, use the backup recorder. |
| **Not plugged in** / **Unplugged - plug it back in** | A microphone is missing. | Plug it back in (any USB port). The recorder finds it again by itself. |
| **NOT armed: a microphone is not plugged in** | Your next lesson will not record. | Plug the microphone in. Open the recorder to check. |
| **Not armed yet - retrying** | The school server has not confirmed the lesson yet (often the Wi-Fi). It keeps trying by itself. | Check the Wi-Fi. If it still says this when the lesson starts, use the backup recorder. |
| **This lesson will NOT be recorded: (reason). Use the backup recorder.** | The school's server refused this lesson (switched off, permission missing, not your class). It is final for today. | Use the backup recorder. Tell the office the reason shown. |
| **Allow sound** button | The page was reloaded and the browser wants one click before it may use sound. | Click **Allow sound**. Without it the next lesson is not recorded. |
| **Too loud - clipping** | Your microphone is too loud. | Turn the gain down on the clip-on receiver. |
| **... is silent** | A microphone sends nothing (muted or off). | Turn it on / unmute it. |
| **Recording is off for this class** | The school has not switched recording on for this class. | Teach as usual. Nothing is recorded. |
| **This lesson is not being recorded** | The school's server refused this recording (switched off, permission missing, lesson cancelled). | Use the backup recorder if you need a recording. The reason is printed under the title. |
| **This recording CANNOT be sent** | The server refused it for good. | Use the backup recorder for this lesson. The audio stays on this laptop for 14 days; tell the office. |
| **The page was reloaded during the lesson** | The page restarted mid-lesson. What was recorded is saved; the rest of the lesson records again by itself. | Nothing. Check the bar says Recording again. |
| **Audio from (date) has not reached the school server** | An earlier recording is still on this laptop. | Open the recorder on this laptop with the Wi-Fi on. Do not discard it without asking an admin. |
| **Another teacher has unsent audio on this laptop** | Someone else's recording is waiting. | That teacher must sign in on this laptop to send it. |
| **This browser cannot keep recordings safely** | Private window, or a browser that cannot store recordings. | Open the app in normal Chrome or Edge. |

## When to use the backup recorder

Start the backup (the quick recorder the school already uses) as well as this one when:
- the bar shows **NOT RECORDING**, **This lesson is not being recorded** or **CANNOT be sent** and does not change back within a minute;
- you are not sure the bar says **Recording** when the lesson starts;
- during the first weeks of using the recorder, for every lesson (the school is still checking it).

## Good to know

- **Ready for today** is yours, for today, on this laptop. It stays if you move between pages or the page reloads. It goes when you sign out, and tomorrow you press it again.
- Do not sign out during a lesson: the app will refuse while recording.
- If a lesson is moved to another time after the bar says **Armed**, press **Stop**, then **Ready for today** again.
- Check the laptop's date and time are right before pressing Ready.
- Unsent audio that the server has given up is deleted from the laptop by itself 14 days later. This happens when the recorder is opened on that laptop (or the app is opened with Ready pressed); a laptop nobody opens keeps it longer.

## Teacher microphone on the phone (22 Nov 2026; linked 23 Nov)

For a lesson without the lapel: the laptop records the Anker S500 only, and the teacher's phone records the teacher's voice into the same recording.

1. Laptop, once: Class recorder, Microphones, tick **My microphone is my phone**, choose the S500, **Save**.
2. Each lesson: on the phone, signed in as the same teacher, open `/teacher/recorder/phone` and press **Record**. That is all: the phone gets the laptop ready (it presses Ready for today there if nobody did) and joins the moment the laptop records. Pressing Ready on the laptop instead works too: the phone joins when you press Record on it. Keep the phone page open and the screen on (see below). Plug the phone in for long lessons.
3. The phone sends nothing until the laptop has sent its first piece of room audio (the laptop states the recording's start first). It stops by itself when the laptop is stopped, sends the rest, and says **Done**. The laptop completes the recording only after that, and says it is waiting for the phone until then. A phone that never joined: the recording completes with the room track alone.

Rules: `src/lib/recorder/phoneTrack.ts`; the laptop side is `teacherOnPhone` in `devices.ts` / `controller.ts`. No database change: a recording's tracks and chunks were already the recording teacher's, from any device (20261112100000). Tested in `scripts/recorder/unit.test.mjs` ("the teacher's phone as the teacher microphone").

Known limit: a phone that dies between registering a chunk and confirming it leaves that chunk unconfirmed, and the laptop cannot complete until the phone page is opened again and joins (a rejoin carries on from the server's last chunk only while the recording is still running).

### Start and stop together (23 Nov 2026)

- **Record on the phone** gets both going: the laptop presses its own Ready for today if it was not pressed, then records the lesson at its time (or at once when the lesson's recording window is already open). The phone joins at that moment. The laptop never starts outside the lesson's window: the server refuses that, as before.
- **The laptop starts by itself** (Ready pressed there): a phone page with Record pressed joins at once. A phone page opened after the start says **The laptop is recording now. Tap Record to join**. iPhone needs that one tap before it lets a page use the microphone.
- **Stop on either device stops both.** Stop on the phone asks twice, then stops the laptop. The phone finishes when the laptop has stopped, trimmed at the laptop's Stop. If the laptop does not answer within 20 seconds (it is closed, or offline), the phone finishes its own track and says **The LAPTOP DID NOT STOP: stop it on the laptop**. Stop on the phone never gives up a lesson that is only armed.
- **Each shows the other.** The phone says **Laptop: connected / not connected** and what the laptop is doing (ready, armed for HH:MM, needs one click, recording). The laptop's recording screen says **Phone connected and recording (n pieces sent)**, or **Phone NOT connected** or **Phone PAUSED** in red.
- **Nothing depends on a message arriving.** The phone reads the recording's status from the server every 3 seconds as well: it joins when the recording runs and stops when it stops, even with the link down. A Record or Stop that was not acknowledged is sent again every 3 seconds.

How it works: both devices are signed in as the same teacher and join one private Supabase Realtime broadcast channel, `recorder-link:<user id>`. They do not need to reach each other over the Wi-Fi. Rules in `src/lib/recorder/deviceLink.ts`. The laptop's side runs next to the recorder session on any page (`src/components/recorder/phoneLinkLaptop.ts`, started by `RecorderBoot`), only on a device whose microphone setup says **My microphone is my phone**. The timeline rules have not changed (`phoneTrack.ts`): the phone measures the server's clock, sends nothing before the laptop's first room chunk, and never overlaps its own chunks.

Access: the channel is private. Migration `20261123170000_recorder_link_realtime.sql` lets only the teacher or admin whose id is in the topic listen to it or send on it. Another teacher, a family, a child and the signed-out get nothing. Before this migration no private Realtime channel was allowed at all. The channel carries only "start", "stop" and each device's state. The recording row and the chunk functions still decide everything, as the signed-in teacher. Tested by `scripts/pgtest/recorder-link-realtime.test.mjs` and the "phone link" cases in `scripts/recorder/unit.test.mjs`. **Until the owner pastes that migration,** the link cannot join: both devices say "not connected", and the phone still joins and stops through the server's status (the 22 Nov behaviour, with Record in place of Join). Stop on the phone then cannot stop the laptop.

### The phone and the locked screen

What iPhone does: Safari stops a web page's microphone when the screen locks, when you switch apps or go to the home screen, and when a call or Siri takes the audio. An app added to the home screen loses it the same way, and reports say even sooner. No web page can keep recording behind a locked screen. Some iOS versions let a Safari tab keep the microphone for a while in the background, but it is not reliable. Plan for it to stop.

What the page does about it:
1. **It keeps the screen on.** It holds a Screen Wake Lock (Safari 16.4 or later) and asks for it again every time the page is visible, so the phone does not lock on its own while you teach. If the browser refuses, the page says so: set Settings > Display & Brightness > Auto-Lock to **Never** for the lesson.
2. **Dim the screen (keep it open):** a black screen showing only a small "Recording" line. It uses little battery on an iPhone OLED screen. Tap it to bring the controls back. Do not press the side button: that locks the phone.
3. **It recovers, loudly.** When the microphone stops, the phone goes red (**YOUR MICROPHONE STOPPED**) and the laptop shows **Phone PAUSED** or **Phone NOT connected**. The moment the page is visible again the phone restarts the microphone by itself. If iPhone wants a tap first, the red screen has the button. The restarted audio goes onto the timeline where the clock says, after a fresh clock reading. The time in between is a gap in the teacher track (never shifted, never overlapped). The phone lists each gap ("10:42: 35 s missing from your track").
4. Use it in **Safari**, not as a home-screen app.

### Recording with the screen locked: the options (23 Nov; the owner chose A)

Only a native app can keep the microphone on behind a locked screen. Options, with their costs:

| Option | What it is | Effort | Costs and risks |
|---|---|---|---|
| **A. Capacitor wrapper of the phone page** (recommended if a locked screen must work) | The same `/teacher/recorder/phone` page inside a small iOS app. A native audio plugin records with the `audio` background mode (`UIBackgroundModes`, AVAudioSession play-and-record) and passes the audio to the existing `PhoneTeacherTrack`, or writes 30-second files that the page uploads. | About 3-5 days for a first TestFlight build, plus Apple review. | Needs an Apple Developer account (99 USD a year), a Mac with Xcode, TestFlight or App Store distribution, and an update whenever iOS changes. Recording must START while the app is in front (iOS refuses to start it in the background). Apple may ask why a school app records in the background. |
| **B. Record in a native app, upload afterwards** | Voice Memos or a recorder app records the whole lesson. Afterwards the file is uploaded and lined up with the room track. | 2-3 days for an upload and alignment screen (the clock must be matched by a clap or by correlating against the room audio). | The audio only arrives after the lesson. Lining it up is not exact without a shared start mark. One more manual step for the teacher. The upload is about 100-300 MB a lesson. |
| **C. Keep the screen on (built now)** | The wake lock and the dimmed view above. | Done. | Works only while nobody locks the phone and the page stays in front. Battery use is about a lit black screen for 90 minutes. Plug the phone in. |

Recommendation was C now and A if teachers need to pocket a locked phone. **The owner said yes to A on 23 Nov 2026: see the next section.**

### The iPhone app: HEC Phone Mic (built 23 Nov 2026, not yet on a phone)

`ios-phone-mic/` is a small Capacitor app. It opens this same phone page from the school site and gives it the iPhone's own microphone, which keeps recording with the screen locked. For the teacher, it is the same page with the same Record and Stop. The only difference is one line: **"HEC app: you may lock the phone and put it in your pocket. It keeps recording."**

- The page finds the app's microphone by itself (`src/lib/recorder/nativeMic.ts`) and uses it in place of the browser's. In Safari nothing changes.
- There is still one recorder: the audio goes into `PhoneTeacherTrack`, with the same timeline, chunks and upload. The Swift plugin only records, and keeps what the page has not read yet on the phone with the time it was heard.
- The laptop shows a locked phone in the app as **"Phone locked: the HEC app keeps recording the teacher microphone"**, not as missing.
- A call or Siri pauses it. The app restarts the microphone after, and the gap goes on the timeline like any other.
- Building it needs a Mac, Xcode and the Apple Developer account (99 USD a year). The steps, in order, are in `ios-phone-mic/README.md`. Page changes reach the app with every push to main. Only a change to the Swift needs a new build.

### The iPhone app: still to prove

- It builds: the Swift was written without a compiler (README step 6).
- **The key one:** lock the phone for 15 minutes during a test recording. Then check that the teacher chunks of those minutes reached the server WHILE it was locked (`class_recording_chunks.registered_at` close to each chunk's time, `late` false). If they all arrive at the unlock, the web view's JavaScript was paused, and a lock of more than 10 minutes gives late audio, which is never evidence. The fix (README step 11) then needs another yes.
- The microphone keeps recording after a lock and unlock, after a call (the restart after an interruption), and when a Bluetooth headset connects or disconnects.
- The chunks line up with the room track: the app stamps the audio with the phone's clock, and the page measures that clock against the server's.
- Sign-in inside the app works and stays signed in across lessons, and the phone link (Realtime) joins from the app.
- Battery and storage over a 90-minute lesson, locked.

### Still to prove on a real iPhone

- The wake lock holds for a 90-minute lesson on the owner's iPhone in Safari (and whether Low Power Mode refuses it).
- What exactly happens on lock and unlock: whether the track ends or only mutes, and whether the restart works without a tap or needs the red button.
- The gap after a restart is the real locked time, and the clock reading after the restart is right (the phone's clock may stand still while it sleeps).
- The Realtime channel joins on both devices once the migration is pasted (the phone shows **Laptop: connected**), and Record and Stop cross in about a second over the school Wi-Fi.
- Record on the phone at a lesson's start presses Ready on the laptop, and the laptop records. If the laptop's browser wants a click for sound, the phone shows "The laptop needs ONE CLICK".

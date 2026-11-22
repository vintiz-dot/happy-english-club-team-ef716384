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

## Teacher microphone on the phone (22 Nov 2026)

For a lesson without the lapel: the laptop records the Anker S500 only, and the teacher's phone records the teacher's voice into the same recording.

1. Laptop, once: Class recorder, Microphones, tick **My microphone is my phone**, choose the S500, **Save**.
2. Each lesson: start the recording on the laptop as usual. On the phone, signed in as the same teacher, open `/teacher/recorder/phone` and press **Join as my microphone**. Keep that page open and the screen on (the browser stops the microphone when the page is hidden or the phone locks). Plug the phone in for long lessons.
3. The phone sends nothing until the laptop has sent its first piece of room audio (the laptop states the recording's start first). It stops by itself when the laptop is stopped, sends the rest, and says **Done**. The laptop completes the recording only after that, and says it is waiting for the phone until then. A phone that never joined: the recording completes with the room track alone.

Rules: `src/lib/recorder/phoneTrack.ts`; the laptop side is `teacherOnPhone` in `devices.ts` / `controller.ts`. No database change: a recording's tracks and chunks were already the recording teacher's, from any device (20261112100000). Tested in `scripts/recorder/unit.test.mjs` ("the teacher's phone as the teacher microphone").

Known limit: a phone that dies between registering a chunk and confirming it leaves that chunk unconfirmed, and the laptop cannot complete until the phone page is opened again and joins (a rejoin carries on from the server's last chunk only while the recording is still running).

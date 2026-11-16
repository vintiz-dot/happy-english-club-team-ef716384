# C5 - the owner's hardware checklist for the class recorder

The checks of C2 review 3 (items 1-16) and review 4 (item 3 at 35 minutes, item 8 rewritten, items 17-18), merged, with round 5's changes (arming in the session, the bar in full screen). Run after the migrations are pasted and the app is published.

Setup for every item: the school laptop, the real Anker S500 and the lapel receiver, Chrome or Edge (not private), a TEST lesson with no children (a class whose recording switch is on), the quick recorder running alongside as the backup. Synthetic speech only (the tester talking); no child's voice.

| # | Check | Expected result | Done |
|---|---|---|---|
| 1 | First render: open Class recorder from the sidebar, run the microphone setup, press **Ready for today**, stay on the page through a short lesson. | The sidebar shows "Class recorder" (teacher and admin only). The lesson arms 20 min before, starts 5 min before ("Recording", red dot) and ends at "Saved". | [ ] |
| 2 | Read-back on the real pair (setup screen / admin panel). | Echo cancellation, noise suppression and auto gain OFF for both; native sample rates; both labels written down. | [ ] |
| 3 | Wi-Fi off from before the window opens, for 10 minutes, then on. Repeat with 35 minutes off. | "Saving on this laptop - waiting for the school server" (no red dot), then "Recording". The admin panel shows the whole lesson including the offline minutes (all 35 in the second run). | [ ] |
| 4 | Close the lid for 1 minute; separately let Windows sleep 12 minutes, mid-recording. | "NOT RECORDING" on return, recovery by itself, a gap of about the right length, later chunks not marked late. | [ ] |
| 5 | Pull the S500's USB plug for 10 s, then 2 minutes, then re-plug into a DIFFERENT port. Same for the lapel receiver. | "... unplugged" at once; the other microphone keeps recording; the unplugged one comes back by itself. | [ ] |
| 6 | Pull BOTH (or the hub). | "NOT RECORDING" with Stop still there; both come back by themselves. | [ ] |
| 7 | Record a full 90 minutes with the recorder tab hidden behind the lesson material (USB selective suspend off in the power plan). | No stall; both tracks whole; the S500 survives past 54:51. | [ ] |
| 8 | During a recording, click another menu item (Attendance, Flipbooks). | The recording continues; the bar with Stop follows on every page; "Open the recorder" returns to it. | [ ] |
| 9 | Speak loudly into the lapel; then mute it. | "Too loud - clipping" on the meter (set the gain so normal speech does not); "... is silent" within seconds, cleared when unmuted. | [ ] |
| 10 | Press Stop with the Wi-Fi off, then turn it on. | "Not stopped on the server yet", then "Saved". | [ ] |
| 11 | Clap at minute 1 and near the end. | The two tracks stay aligned (offset under 20 ms, growth under 10 ms). | [ ] |
| 12 | Two back-to-back lessons on one Ready, the teacher on ANOTHER page throughout. A microphone dead in the first. | The first stops at the second's start; the second arms and records by itself; the dead microphone is reported again in the second. | [ ] |
| 13 | A second teacher signs in on the same browser profile. | They see "another teacher has unsent audio" if any, cannot touch it; the first teacher's Ready is gone (nothing arms for the second teacher until they press Ready); sign-out during a recording is refused. | [ ] |
| 14 | After a complete lesson: DevTools > Application > IndexedDB `hec-recorder`. | Nothing of that lesson remains. | [ ] |
| 15 | After the migrations are pasted: one admin POST to `recorder-retention`; `select jobname from cron.job where jobname like 'recorder-%'`. | Two jobs; next morning the nightly call answered 200. | [ ] |
| 16 | Disk: BitLocker on; fill the disk to under 2 GB free. | The recorder refuses to arm and says why (the bar: "NOT armed ..."). | [ ] |
| 17 | Press Ready at least 25 minutes before a lesson, then leave the recorder page BEFORE it arms (go to Attendance). Also: reload the page (F5) on Attendance between two lessons. | The bar shows "Ready for today - (class) records from HH:MM", then "Armed - recording starts at HH:MM", then "Recording", without opening the recorder. After the reload: one "Allow sound" click if the bar asks; the next lesson still arms and records; the lesson already recorded is not recorded again. | [ ] |
| 18 | While recording, put the lesson material in full screen (a flipbook's full screen; the class screen). | The bar (state and Stop) is visible at the bottom of the full-screen view; Stop asks "Yes, stop recording" inside the bar and works without leaving full screen. | [ ] |
| 19 | Reload the page (F5) in the MIDDLE of a recording, on any page. | "The page was reloaded during the lesson" while the part already recorded is saved; then "Recording" again for the rest of the lesson; the admin panel shows two recordings for that lesson, together covering it with only the reload gap. | [ ] |
| 20 | Sign out at the end of the day, sign in again. | Ready is gone (the recorder asks for "Ready for today" again). | [ ] |
| 21 | Switch a test class OFF (or leave one child without consent), press Ready, open another page. | At arming the bar says "This lesson will NOT be recorded: <reason>. Use the backup recorder." on every page and after a reload, until the lesson is over; the recorder page says the same. | [ ] |
| 22 | Before Ready: the laptop's date, time and time zone. | Correct (Asia/Ho_Chi_Minh); a wrong date arms nothing. | [ ] |

Tester: ____________  Date: ____________  Laptop / browser: ____________

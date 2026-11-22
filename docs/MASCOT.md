# Pip - the Happy English Club mascot

Designed 22 Nov 2026. See him: `public/mascot/sheet.html` (on the site at `/mascot/sheet.html`).

## 1. Who Pip is

Pip is a chào mào, the red-whiskered bulbul: the small crested songbird that every Vietnamese child has seen in a garden or in a bamboo cage outside a house.

Why this bird and not a lion, a bear or an owl:

- **Its name starts with hello.** "Chào" is the first word a child says to a teacher. Pip is the bird who learned to say it in English. That one sentence is the whole brand story, and a six-year-old can repeat it.
- **It is a songbird.** HEC teaches children to use English out loud ("Use it, don't just memorise it"). A bird known for its voice stands for speaking, not for exams.
- **It is ours.** International chains use lions, bears and owls. No English school in Hanoi owns the chào mào. It is Vietnamese without being a cliché, and its scientific name, *Pycnonotus jocosus*, means the merry one.
- **It has a silhouette.** The tall crest and the red cheek are recognisable at 32 pixels, in one colour, on a sticker, on a T-shirt.
- **Not an owl.** An owl is a learning cliché abroad and a bad omen in Vietnam.

The name: **Pip**. One syllable, said the same way in both languages, the first sound a chick makes, and in English a pip is also a seed. It is the owner's to change; two alternatives that fit the same story are "Chào" and "Alô".

## 2. Character

| | |
|---|---|
| Age | about seven: old enough to help, young enough to be a friend, never a teacher |
| Wants | to say one new thing in English every day |
| Is | curious, brave about mistakes, pleased to see you |
| Is never | sad, disappointed, lonely, sarcastic, in a hurry |
| Says | short true things: "You finished your reading." "Nice to see you." |
| Never says | "I missed you", "Don't break your streak", "Ask your parents..." |
| Signature | the crest, the red cheek, the green club scarf with a brass star pin |

Pip makes mistakes in English too, and says so. A mascot who is brave about being wrong gives a shy child permission to speak. That is the one trait to protect.

The rules that keep Pip on the child's side are in `docs/EXPERIENCE_DESIGN_BRIEF.md` Part I2 and I4. They are not optional: a mascot that guilt-trips children is how a school loses the parents.

## 3. Drawing

One generator, `scripts/mascot/build-pip.mjs`, holds every shape. Run `node scripts/mascot/build-pip.mjs` after changing it; never edit an output by hand.

| File | Mood | Use |
|---|---|---|
| `public/mascot/pip.svg` | Hello (waving, beak open) | greetings, first visit of the day, empty states that welcome |
| `public/mascot/pip-happy.svg` | Happy (at rest) | the default beside a task |
| `public/mascot/pip-encouraging.svg` | Encouraging (wink, star) | homework is waiting |
| `public/mascot/pip-excited.svg` | Excited (both wings up) | a new badge, good news |
| `public/mascot/pip-celebrating.svg` | Celebrating (confetti) | all done, a level reached |
| `public/mascot/pip-loving.svg` | Loving (heart) | thank you, good night, a birthday |
| `public/mascot/pip-badge.svg` | Head and shoulders in a brass-rimmed disc | avatars, small sizes under 64 px, favicons |
| `public/reception-tv/assets/pip.svg`, `pip-badge.svg` | Hello and the badge, animated (blink, wave, breathing) | the reception TV only |

These six moods are the six expressions `src/components/student/MascotCompanion.tsx` already has (`happy`, `excited`, `celebrating`, `encouraging`, `loving`, plus hello).

Construction rules, if a pose is added:

- Big head (a circle), small body, the head tilted 5 degrees. The tilt is most of the charm; keep it.
- A 7-unit ink outline on a 512 grid, round joins. Flat fills, one shade shape at most per part. No gradients, no filters, no text inside the SVG.
- Every pose carries a cream "sticker edge" behind the outline. It is invisible on ivory and keeps the dark crest readable on navy and in dark mode. One file therefore serves both themes.
- Eyes are tall ink ovals with two white highlights. Closed happy eyes are upward arcs. There is no sad, angry or crying eye, and none may be added.

Colours:

| Name | Hex | Where |
|---|---|---|
| Ink | `#131D35` | crest, cap, outline (the design system's ink) |
| Cream | `#FFFDF6` | face, belly, sticker edge |
| Chestnut | `#8A5A38` | wings and tail, as on the real bird |
| Coral | `#F0604F` | the red whisker. Pip's own colour: used nowhere else in the product |
| Brass | `#E9BC52` | beak, feet, star pin |
| Leaf | `#8BC63F` | the club scarf: the logo's green |

## 4. Using Pip

- Clear space: half a head-width on every side. Never crop the crest.
- Smallest full-body size: 64 px. Below that, use the badge.
- On navy or any dark surface, either let the sticker edge do the work or stand him in a cream disc (the reception TV does the second).
- Do not recolour, outline again, add a drop shadow, stretch, rotate, or put words on him.
- One Pip per screen. He is a character, not a pattern.
- Pip never appears on a tuition screen, a payment, an error about money, or a destructive confirmation.
- In the app he is shown as an `<img>` of a pose file. Motion comes from the wrapper (see the brief, Part G), and stops under reduced motion.

## 5. Where children meet him

A mascot earns affection by turning up in the same way in many places. In order of what it costs:

| Where | What | Status |
|---|---|---|
| Reception TV | Welcomes families; "Say it with Pip", one English phrase a day for a child to say out loud | built 22 Nov 2026 |
| Student app | The companion on the home screen, in the reward moments and on the finish screen | in the brief, Phase 6 |
| Parent app | The badge beside "Everything is in order", nothing more | in the brief, Phase 8 |
| The door | The day's phrase from the TV: a child says it to the receptionist or teacher on the way in | needs only staff to play along |
| Paper | A Pip stamp or sticker on finished homework; a Pip postcard signed by the teacher at a level-up or a birthday | needs printing |
| Reports and certificates | The badge in the corner of the progress report | a change to `hec-docs/` templates, separate work |
| The class Pip | One soft-toy Pip per class goes home with a different child each weekend; the child tells the class, in English, what Pip did (it fits the video homework recorder exactly) | needs a soft toy made |

The last row is the strongest thing on this page. A child who has had Pip to stay does not want to change schools, and a parent who filmed it has shown the school to the grandparents.

## 6. What a mascot will and will not do

Families leave an English school when they cannot see progress, when the child stops wanting to go, or when the timetable or the price stops working. Pip helps with the second and, through the weekend visit and the postcards, a little with the first. The parent side of the brief (evidence every week, "Everything is in order") is aimed at the first. Nothing here touches the third.

## 7. Open for the owner

- The name.
- Whether to have the soft toy, stickers and postcards made.
- The Vietnamese on the TV's phrase scene was drafted by the developer; a Vietnamese speaker should read the seven lines in `public/reception-tv/app.js` (`PIP_PHRASES`).

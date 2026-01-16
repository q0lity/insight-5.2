# Appendix G — Utterance Library (Voice Examples → Expected Output)

This is the test corpus for voice parsing prompts and QA. Each item describes expected *proposals* and *questions*.

## G1) Events
1. “I’m walking right now.”
   - Proposal: Entry facets `[event]`, title “Walking”, startAt now, no endAt, tags `health/steps` (suggested).

2. “I’m done walking.”
   - If active event “Walking”: endAt now, durationMinutes computed.
   - If none: clarification card (“Which event are you ending?”).

3. “Gym tomorrow 8 to 9.”
   - Proposal: scheduled event with startAt tomorrow 8:00, endAt 9:00.

## G2) Notes + tasks extraction
4. “Note to self: call the dentist.”
   - Proposal: task (high confidence).

5. “I was studying cardiology. Also pick up dry cleaning.”
   - Proposal: study event/note + task (“Pick up dry cleaning”).

6. “Maybe I should buy protein powder.”
   - Suggested task card (low confidence).

## G3) Trackers
7. “I’m really happy right now.”
   - Proposal: tracker log mood high; ask scale question if user hasn’t chosen scale.

8. “#mood(8) #energy(7) +gym”
   - Proposal: tracker logs + context set.

## G4) Workouts
9. “Bench press 4 sets of 12 at 85 pounds, RPE 8.”
   - Proposal: workout entry with strength template row.

10. “100 push-ups.”
   - Proposal: workout row push-ups reps 100.

## G5) Nutrition (POC)
11. “I had a large McFlurry.”
   - Proposal: nutrition log with estimated calories/macros, confidence, editable card.

## G6) Time + timers
12. “Brush teeth for 2 minutes.”
   - Proposal: timer + habit entry (optional); if configured, auto-start timer.

13. “Start pomodoro 25 minutes for deep work.”
   - Proposal: timer + event/task link.

## G7) Linking to goals/projects
14. “Workout 45 minutes, important for getting shredded.”
   - Proposal links to Goal “Get shredded” and applies goalMultiplier.

## G8) Ambiguity handling
15. “Meeting with Becky 2 to 3.”
   - If day missing: ask which day (Today? Tomorrow?).

16. “I’m going to the store later.”
   - Suggested event card (time unclear) or ask for time.

## G9) Ecosystem guardrails + categorization
17. “I went to Wawa and got 2 monsters and a Gatorade 0. Drank 1 monster.”
   - Proposal A: Personal/Errands/Wawa run (purchaseItems: Monster x2, Gatorade Zero x1)
   - Proposal B: Food/Drink/Monster (consumeItems: Monster x1)

18. “I’m coding Insight again.”
   - Proposal: Professional/Insight/Coding (event), reusing the last-known categoryPath.

19. “Episode 4, Episode 5.”
   - No tracker creation unless explicitly tagged; treat as note or ignore.

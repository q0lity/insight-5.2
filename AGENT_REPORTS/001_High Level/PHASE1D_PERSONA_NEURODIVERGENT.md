# Persona Brief: Neurodivergent (Accommodator) User

**Document Version:** 2.0
**Date:** January 18, 2026
**Persona Code:** NEURO-001 (Riley)
**Status:** Production Specification
**Word Count Target:** 10,000+

---

## Executive Summary

The Neurodivergent user represents a significant and underserved segment of the productivity and life-logging market. This persona encompasses users with ADHD, autism spectrum conditions, executive function challenges, and related neurodevelopmental differences. Unlike neurotypical users who may struggle with motivation or discipline, neurodivergent users often face fundamentally different cognitive challenges: working memory limitations, time blindness, task initiation difficulties, and sensory processing differences.

Insight 5.2's voice-first architecture and non-punitive gamification system positions it uniquely to serve this population. This brief defines the specific accommodations, design patterns, and system behaviors required to make Insight genuinely useful for neurodivergent users rather than another source of failure and guilt.

This expanded specification provides granular detail on usage patterns, voice input handling, gamification mechanics, privacy configurations, and edge case management. It serves as the authoritative reference for all neurodivergent-specific feature implementation.

---

## 1. Usage Patterns and Motivations

### 1.1 Core Behavioral Profile

Neurodivergent users exhibit distinctly non-linear engagement patterns that differ fundamentally from neurotypical usage models:

**Hyperfocus Bursts:** Users may engage intensively for hours or days, logging everything with remarkable detail, then disappear entirely for a week. This is not failure or lack of discipline but rather the natural rhythm of neurodivergent cognition. The system must accommodate this pattern without triggering shame responses.

**Working Memory Compensation:** The primary motivation for using Insight is often compensatory rather than aspirational. Where neurotypical users might track habits to "become their best self," neurodivergent users frequently need Insight as an external memory system: "Did I take my medication today?" "Have I eaten anything?" "When did I last shower?"

**Routine as Anchor:** While rigid schedules often fail for neurodivergent users, flexible routines provide essential scaffolding. The distinction is crucial: a rigid schedule says "meditate at 7:00 AM"; a flexible routine says "meditation happens after morning coffee, whenever that is."

**Time Blindness Considerations:** Many neurodivergent users experience time blindness, where subjective time perception differs dramatically from clock time. This manifests as:
- Inability to estimate how long tasks will take
- Losing track of hours while focused on a task
- Difficulty understanding "how long ago" something happened
- Challenge distinguishing between "this morning" and "three days ago"

### 1.2 Detailed Daily Rhythm Patterns

Understanding the typical daily rhythm of neurodivergent users helps the system provide appropriate support at different times.

**Morning Transition Period (Wake → Functional):**

The transition from sleep to full wakefulness often takes longer for neurodivergent users, particularly those with ADHD. The system should recognize this vulnerable period:

```typescript
interface MorningTransitionSupport {
  // Time between wake and first productive action
  typicalTransitionDuration: '30min-2hours';

  // System behaviors during this window
  behaviors: {
    notificationIntensity: 'minimal';
    taskSuggestions: 'none_until_requested';
    positiveFraming: true;  // "Good morning" not "You have 12 tasks"
  };

  // Gentle prompts if enabled
  optionalAnchors: [
    'medication_reminder',
    'hydration_prompt',
    'morning_checkin_invite'
  ];
}
```

**Medication Onset Window (Post-Medication):**

For users on ADHD medication, the 20-45 minutes after taking stimulants represents a transition period where focus gradually improves:

```
System (if medication timing feature enabled):
"It's been 30 minutes since you logged your medication.
Most people find focus kicks in around now.
Want to set a 25-minute focus session for something specific?"
```

**Afternoon Energy Patterns:**

Many neurodivergent users experience predictable energy fluctuations:

```typescript
interface EnergyPatternTracking {
  afternoonDip: {
    typicalWindow: '14:00-16:00';
    systemBehavior: 'reduce_cognitive_demands';
    suggestions: ['movement_break', 'snack_reminder', 'outdoor_time'];
  };

  eveningRevival: {
    typicalWindow: '20:00-02:00';  // "Revenge bedtime procrastination"
    systemBehavior: 'acknowledge_not_judge';
    // User is productive late? Log it. Don't say "you should be sleeping"
  };
}
```

**Evening Wind-Down Challenges:**

The transition to sleep is notoriously difficult for neurodivergent users. System support includes:

```
User: "I know I should go to bed but I can't stop scrolling"

System: "I hear you. Transitions are hard.

Here are some options:
- Set a 15-minute wind-down timer (I'll gently remind you)
- Log how you're feeling right now
- Start a simple breathing exercise
- Just close the app and try (no judgment)

What sounds possible?"
```

### 1.3 Typical Usage Scenarios - Expanded

**Good Days:**
```
User: "Did my whole morning routine, meditation, stretches, took my meds,
       ate breakfast, feeling pretty good about today #mood(7)"
System: "Morning routine complete! That's everything. +45 XP. Your streak
        is at 12 days. You're doing great."
```

**Recovery Days:**
```
User: "I'm back. It's been... I don't know, a week maybe? Life got
       overwhelming."
System: "Welcome back! Your 23-day streak is saved in your achievements.
        Today is day 1 of your new streak. No pressure, what feels
        manageable right now?"
```

**Memory Uncertainty:**
```
User: "Did I take my medication today? I can't remember."
System: "I don't see a medication log for today. Your last logged
        medication was yesterday at 9:14 AM. Would you like me to
        log it now?"
```

**Hyperfocus Day:**
```
User: "I've been working on this project for... wait, what time is it?
       I haven't eaten. I'm really productive but also kind of lightheaded."

System: "It's 3:47 PM. You logged breakfast at 8:30 AM - that's over 7 hours.

        Your body needs fuel to keep going. Options:
        - Quick 5-minute break: grab a snack, drink water
        - Log a reminder for 30 minutes from now
        - Set a recurring 2-hour check-in for hyperfocus days

        The project will still be there. I'll remember where you left off."
```

**Executive Dysfunction Day:**
```
User: "I'm just lying here staring at the ceiling. I have things to do
       but I literally cannot move. I'm not tired, I just... can't."

System: "That sounds like executive dysfunction. It's not laziness.

        Here's what I know helps some people:
        - Can you wiggle your toes? Just your toes.
        - What's the smallest possible thing you could do?
          (Sitting up counts. Looking at your phone counts. You already did that.)

        If nothing is possible right now, that's okay too.
        I'll be here when something shifts."
```

**Burnout Period:**
```
User: "Everything is too much. I've been masking at work all week
       and I have nothing left. I can't track anything right now."

System: "I understand. Burnout is real and you've been pushing hard.

        I'm turning on Recovery Mode:
        - All notifications paused
        - No habit reminders
        - No streak tracking until you're ready

        Just rest. When you have energy again, say 'I'm back' and
        we'll start fresh. No time pressure."
```

### 1.4 External Cue Dependency

Neurodivergent users often rely on external systems for task initiation and transitions. Insight serves as this external cue system, but must balance helpfulness against notification fatigue:

**Effective Cue Example:**
```
Notification (gentle vibration, no sound):
"Your morning routine usually starts around now. Tap to begin, or
dismiss to snooze 30 min."
```

**Ineffective Cue Example:**
```
Notification (alarm sound):
"You haven't logged anything today! Your streak is at risk!"
```

The difference is agency versus pressure. Neurodivergent users respond better to invitations than demands.

### 1.5 Seasonal and Cyclical Patterns

Neurodivergent users often experience cyclical patterns that affect their engagement:

**Seasonal Variations:**
```typescript
interface SeasonalPatterns {
  winter: {
    reducedEnergy: true;
    lightSensitivity: 'may_affect_mood';
    systemResponse: 'lower_expectations_gently';
    suggestions: ['light_therapy_reminder', 'vitamin_d_tracking'];
  };

  seasonTransitions: {
    // Many ND users struggle with seasonal changes
    affectedWeeks: 2-4;
    systemBehavior: 'extra_gentle_messaging';
  };
}
```

**Menstrual Cycle Tracking (Optional):**
```
User: "Track period started"

System: "Logged: Period day 1.

        Some users find the next few days harder for focus and
        executive function. Want me to:
        - Automatically enable 'gentle mode' for the next 3-5 days?
        - Lower habit targets temporarily?
        - Send softer reminders?

        Just say the word. No judgment either way."
```

**Medication Adjustment Periods:**

When users indicate medication changes, the system adapts:

```
User: "Started a new medication yesterday, titrating up"

System: "Noted. Medication adjustments can affect focus, mood, and
        energy in unpredictable ways.

        I'll:
        - Track your mood and focus ratings over the next 2 weeks
        - Not show 'your average is lower' type messages
        - Generate a report you can share with your prescriber if helpful

        How are you feeling today on a 1-10?"
```

### 1.6 Crisis Mode Recognition

The system should recognize signs of crisis without being alarmist:

```typescript
interface CrisisIndicators {
  patterns: [
    'sudden_drop_in_all_metrics',
    'explicit_distress_language',
    'mentions_of_hopelessness',
    'extended_absence_after_active_period',
    'requests_to_delete_everything'
  ];

  response: {
    neverSay: ['call_this_number_now', 'you_need_help_immediately'];
    doSay: ['gentle_check_in', 'resources_available_if_wanted'];
    action: 'offer_connection_to_support_without_pressure';
  };
}
```

**Crisis Response Example:**
```
User: "What's the point of tracking anything. Nothing ever changes.
       I always end up back here."

System: "I hear a lot of frustration and exhaustion in that.

        You're right that patterns can feel stuck. And some days are
        just hard.

        If you want, I can pull up some data that shows things that
        have changed over time. Sometimes we can't see our own progress.

        Or we can just sit here. I'm not going anywhere."
```

---

## 2. Voice/Input Style Preferences

### 2.1 Stream-of-Consciousness Input

Neurodivergent users often produce voice input that is verbose, tangential, and associative. The NLP system must extract structured data from unstructured streams:

**Typical Voice Input:**
```
"So I was going to do my workout this morning but then I remembered
I hadn't eaten and you can't work out on an empty stomach, or at
least I can't, so I had some eggs, scrambled with cheese, probably
like 300 calories or something, and then I got distracted by this
article about productivity systems, ironic right, and before I knew
it it was noon so I just did a quick 20-minute walk instead of the
full workout, better than nothing I guess, oh and my mood is like
a 6, maybe 5, somewhere in there."
```

**System Extraction:**
```typescript
{
  entities: [
    {
      type: 'nutrition',
      data: {
        title: 'Breakfast - Scrambled eggs with cheese',
        mealType: 'breakfast',
        estimatedCalories: 300,
        items: [{ name: 'Scrambled eggs with cheese', calories: 300 }]
      }
    },
    {
      type: 'workout',
      data: {
        title: '20-minute walk',
        workoutType: 'cardio',
        durationMinutes: 20,
        notes: 'Substituted for planned full workout'
      }
    },
    {
      type: 'tracker',
      data: [
        { key: 'mood', value: 5.5, confidence: 0.7 }  // Split difference
      ]
    }
  ],
  metaObservations: [
    'User noted task switching difficulty (workout -> breakfast -> reading)',
    'Time blindness indicator: lost track of time reading'
  ]
}
```

### 2.2 Extended Voice Input Examples

**Morning Brain Dump:**
```
User: "Okay so today I need to remember to call the dentist which I've
       been putting off for like three weeks, and also I have that
       meeting at 2 but wait is that today or tomorrow, I think it's
       today, and I should probably eat something but I'm not hungry
       yet, my sleep was pretty bad last night I kept waking up, maybe
       like a 4 out of 10 for sleep, and oh I did take my meds when I
       first got up so that's good, and I'm feeling kind of anxious
       about the meeting so my anxiety is probably like a 6 or 7,
       definitely elevated, and I want to go to the gym but realistically
       that's probably not happening today."

System: "Got it! Here's what I captured:

        Tasks created:
        - Call dentist (marked as postponed 3 weeks - want me to
          schedule a reminder?)

        Logged:
        - Medication: taken this morning ✓
        - Sleep: 4/10 (noted: interrupted sleep)
        - Anxiety: 6.5/10 (meeting-related)

        Your calendar shows a 2:00 PM meeting today.

        I heard you mention the gym - I won't add it as a task since
        you said it might not happen. No pressure.

        Anything else before we start the day?"
```

**Emotional Processing Session:**
```
User: "I just had the worst phone call with my mom, she was doing that
       thing where she acts like she's being helpful but really she's
       criticizing everything I do, and I tried to set a boundary but
       then I felt guilty, and now I'm sitting here feeling like garbage
       and I can't focus on anything, I was supposed to work on that
       project but my brain is just full of this conversation playing
       on repeat, and I know I should probably do some deep breathing or
       something but I'm too angry, my anger is like an 8 and my mood
       crashed to maybe a 3."

System: "That sounds really hard. Family dynamics are complicated.

        I logged:
        - Mood: 3/10
        - Anger: 8/10
        - Note: Difficult phone call with mom, boundary-setting attempt

        Your project can wait. Right now, your nervous system is
        activated and that's okay.

        Some options:
        - Vent more (I'm listening)
        - 5-minute walk to move the anger through your body
        - Scream into a pillow (seriously, it helps)
        - Just breathe and let the feelings be there

        What do you need right now?"
```

**Rapid Task Capture:**
```
User: "Quick quick quick before I forget - email Sarah about Thursday,
       buy more coffee, the kitchen light bulb burned out, I need to
       review that document by Friday, oh and schedule the car service
       thing, and pick up the prescription tomorrow, that's time
       sensitive actually."

System: "Got all of that! Created:

        Tasks:
        1. Email Sarah about Thursday
        2. Buy coffee
        3. Replace kitchen light bulb
        4. Review document (due: Friday)
        5. Schedule car service
        6. Pick up prescription (tomorrow - marked urgent)

        Want me to set a reminder for the prescription pickup tomorrow
        morning?"
```

### 2.3 Rambling and Off-Topic Content

The system must gracefully handle tangential content without frustrating users who may not realize they've gone off-topic:

**User Input:**
```
"Need to remember to email my boss about the deadline, which reminds
me I should also check if my prescription is ready, speaking of which
my therapist said I should try that breathing technique when I feel
overwhelmed, which I definitely am right now, my anxiety is probably
like an 8."
```

**System Response:**
```
"Got it. I captured:
- Task: Email boss about deadline
- Task: Check if prescription is ready
- Tracker: Anxiety at 8/10

Would you like to try a breathing exercise now? I can guide you through
the 4-7-8 technique."
```

### 2.4 Disambiguation Scenarios

**Vague Time References:**
```
User: "I exercised earlier"

System: "Logged exercise for today. Was that:
        - This morning (around 6-10 AM)
        - Midday (around 11 AM-2 PM)
        - Afternoon (around 2-5 PM)

        Or I can just leave it as 'today' without a specific time."
```

**Uncertain Quantities:**
```
User: "Ate a bunch of pasta, I don't know, a lot"

System: "Logged pasta for lunch. For calorie tracking, I'll estimate
        'large portion' (~500 cal). You can adjust if that seems off,
        or we can skip calorie tracking for this meal entirely.

        Whatever works for your brain today."
```

**Conflicting Information:**
```
User: "My mood is good but also bad"

System: "Mixed feelings - I get that. Would you say:
        - More good than bad (6-7 range)
        - More bad than good (3-4 range)
        - Truly split down the middle (5)
        - Different emotions at the same time (want to log each?)

        All of these are valid."
```

### 2.5 Templates and Prompts

Many neurodivergent users benefit from structure that reduces the cognitive load of "blank page" anxiety:

**Morning Check-in Template:**
```
System: "Good morning! Quick check-in:
        - Did you sleep okay? (1-10)
        - Meds taken?
        - What's one thing you want to accomplish today?"

User: "Uh, sleep was like a 4, yeah I took my meds, and I guess I
       should finish that report but honestly I'd rather not think
       about it."

System: "Logged: Sleep 4/10, medication taken. I heard 'finish the
        report' - want me to add that as today's focus task? No
        pressure if you're not ready to commit."
```

**End-of-Day Gentle Close:**
```
System: "Winding down for the day. No judgment, just curious:
        - Anything you're proud of today, even small?
        - Anything carrying over to tomorrow?
        - How are you feeling right now?"
```

**Weekly Reflection Prompt:**
```
System: "It's Sunday evening. Optional weekly check-in:

        Looking back at this week:
        - What worked well?
        - What was harder than expected?
        - Anything you want to do differently next week?

        This isn't a performance review. Just noticing patterns."
```

### 2.6 Error Recovery in Voice Input

**Misheard Content:**
```
System: "I heard 'bought groceries for $50' - is that right?"

User: "No, I said 'caught up on sleep for 5 hours'"

System: "Oh! Sorry about that. Logged: Extra sleep, 5 hours.

        I'll get better at understanding you over time.
        Thanks for the correction."
```

**Incomplete Capture:**
```
System: "I caught most of that but missed something. I got:
        - Task: Email landlord
        - Meal: Lunch, sandwich

        Was there something else? Or should I ask you to repeat
        the whole thing?"
```

**Technical Failure:**
```
System: "Sorry, I couldn't process that audio clearly.
        Could be my end or background noise.

        Options:
        - Try again (I'm ready)
        - Type it instead
        - Skip for now, come back later"
```

---

## 3. Privacy and Sync Expectations

### 3.1 Standard Privacy Needs

Neurodivergent users generally have standard privacy expectations, with some specific considerations:

**Medication and Health Data:** Users tracking ADHD medication, psychiatric appointments, or neurodivergent-specific health data require strong assurances that this information remains private and cannot be accessed by employers, insurance companies, or other parties.

**Therapy and Mental Health Journaling:** Many neurodivergent users employ journaling as a therapeutic tool, often processing difficult emotions or experiences. This content is deeply personal and requires maximum privacy protection.

### 3.2 Detailed Privacy Configuration

```typescript
interface NeurodivergentPrivacyConfig {
  // Data categorization
  sensitiveCategories: {
    medication: {
      visibility: 'private_only';
      syncBehavior: 'encrypted_sync';
      exportDefault: 'excluded';
    };

    mentalHealthTrackers: {
      visibility: 'private_only';
      syncBehavior: 'encrypted_sync';
      exportDefault: 'excluded';
    };

    journalEntries: {
      visibility: 'private_only';
      syncBehavior: 'user_choice';  // Some users want device-only
      exportDefault: 'ask_each_time';
    };

    diagnosisReferences: {
      // Entries mentioning ADHD, autism, etc.
      visibility: 'private_only';
      excludeFromAIAnalysis: true;  // Optional paranoia mode
    };
  };

  // Workplace visibility concerns
  workplaceProtection: {
    hideAppFromRecentApps: boolean;
    disguisedAppIcon: 'notes' | 'weather' | 'calendar' | 'default';
    notificationPreviews: 'never' | 'when_unlocked';
    quickHide: 'triple_tap_back';
  };
}
```

### 3.3 Shared Access with Professionals

Some neurodivergent users benefit from sharing specific data with therapists, ADHD coaches, or healthcare providers:

**Therapist Share Configuration:**
```typescript
{
  shareType: 'professional',
  recipient: 'therapist@example.com',
  sharedData: [
    'mood_trackers',
    'anxiety_trackers',
    'journal_entries_tagged_therapy',
    'sleep_data'
  ],
  excludedData: [
    'location_data',
    'people_mentions',
    'work_tasks',
    'financial_entries'
  ],
  exportFormat: 'weekly_summary',
  requiresConfirmation: true
}
```

**ADHD Coach Access:**
```
User: "Can I share my habit data with my ADHD coach?"
System: "Absolutely. You can share habit completion data, streaks,
        and routine tracking. This creates a read-only view your
        coach can access. Your journal entries, mood data, and
        personal notes stay private unless you specifically include
        them. Want me to set this up?"
```

### 3.4 Sync Expectations and Offline Support

Neurodivergent users have specific sync expectations:

**Offline-First Priority:**
```typescript
interface SyncExpectations {
  offlineSupport: {
    fullFunctionality: true;  // Everything works offline
    syncOnReconnect: 'automatic';
    conflictResolution: 'preserve_both_versions';

    // Important: Voice capture must work offline
    voiceOffline: {
      localSTT: true;  // Speech-to-text on device
      queueForProcessing: true;  // Upload later for NLP
      showRawText: true;  // Let user see transcription immediately
    };
  };

  // Multi-device considerations
  multiDevice: {
    instantSync: 'when_possible';
    primaryDevice: 'user_choice';  // Which device is "truth"
    conflictNotification: 'gentle';  // "I noticed different entries..."
  };
}
```

**Sync Status Transparency:**
```
System (after offline period):
"I'm back online. While you were offline, I saved:
- 3 voice entries (now fully processed)
- 5 habit completions
- 1 journal entry

Everything is synced now. Want to see what I captured?"
```

### 3.5 Mental Health Journaling Value

For many neurodivergent users, the journaling feature serves a therapeutic function beyond simple life logging:

- **Emotional regulation:** Writing helps process overwhelming feelings
- **Pattern recognition:** Reviewing entries reveals triggers and cycles
- **Evidence gathering:** Documentation for healthcare providers
- **Self-validation:** Record of accomplishments when self-doubt strikes

### 3.6 Data Export for Healthcare

Neurodivergent users often work with multiple healthcare providers who benefit from seeing patterns in data:

**Psychiatrist Report Export:**
```
User: "I need to show my psychiatrist how my medication has been working"

System: "I can generate a report showing:
        - Medication timing consistency
        - Focus ratings over the past 30 days
        - Sleep patterns
        - Mood trends

        This will be a PDF you can print or email. Want me to
        include journal entries tagged with 'medication' or keep
        it to just the numbers?"
```

**Export Format Options:**
```typescript
interface HealthcareExport {
  format: 'pdf' | 'csv' | 'json';
  dateRange: { start: string; end: string };
  includeData: {
    medicationLogs: boolean;
    moodTrackers: boolean;
    sleepData: boolean;
    focusRatings: boolean;
    journalEntries: boolean;  // Optional, sensitive
    habitCompletions: boolean;
  };
  anonymize: {
    removePeopleNames: boolean;
    removeLocations: boolean;
    removeWorkDetails: boolean;
  };
  visualizations: boolean;  // Include charts
}
```

### 3.7 Family and Relationship Sharing

Some neurodivergent users share data with supportive partners or family members:

**Accountability Partner Setup:**
```
User: "My partner wants to help me remember medications"

System: "I can set that up. Your partner would get:
        - A notification if you haven't logged medication by 10 AM
        - NO access to your actual data
        - NO ability to see what else you're tracking

        It's just a 'gentle nudge' system. You can turn it off anytime.

        Or if you want, they can see your medication log specifically.
        But that's totally up to you."
```

**Parental Monitoring Concerns:**

For adult neurodivergent users who may have experienced controlling family dynamics:

```typescript
interface BoundaryProtections {
  // Prevent coerced sharing
  shareRequestCooldown: '24_hours';  // Can't be pressured in moment
  sharingRequiresPassword: true;
  shareRequestsLogged: true;  // "Someone requested access on [date]"

  // Fake data mode (if user feels unsafe)
  decoyMode: {
    showsFakeData: true;
    realDataHiddenBehind: 'secondary_password';
    // For users in controlling relationships
  };
}
```

---

## 4. Gamification Engagement Level

### 4.1 The Variability Challenge

Gamification responses among neurodivergent users are highly individual and often shift over time:

**Dopamine-Seeking Profile:** Some ADHD users crave the dopamine hit of achievements, streaks, and XP gains. For these users, gamification is genuinely motivating.

**Shame-Triggered Profile:** Other users find gamification elements triggering, interpreting any "failure" indicator as confirmation of their perceived inadequacy.

**Variable-State Profile:** Many users shift between these states depending on mental health, stress levels, and current hyperfocus areas.

### 4.2 Non-Punitive Design Principles

Insight 5.2's gamification must avoid punishment mechanics entirely:

**Punitive (Avoid):**
- "You broke your 15-day streak!"
- "You haven't logged anything in 3 days"
- "Your progress has stalled"
- Red indicators for missed activities
- Declining graphs or "falling" animations

**Non-Punitive (Implement):**
- "Welcome back! Ready to start fresh?"
- "Your 15-day streak is saved in your records"
- "Any activity counts. What feels doable?"
- Neutral indicators; color-coding optional
- "Longest streak: 15 days" (permanent positive record)

### 4.3 Detailed Achievement System

**Achievement Categories:**
```typescript
interface NeurodivergentAchievements {
  // Celebrate showing up, not perfection
  returningAfterAbsence: {
    name: "Fresh Start";
    description: "Came back after a break";
    xp: 50;
    repeatable: true;
    cooldown: '7_days';
  };

  // Celebrate consistency without streaks
  consistencyWithoutStreaks: {
    name: "Rhythm Finder";
    description: "Logged something 3 out of 7 days this week";
    xp: 30;
    // Note: doesn't require consecutive days
  };

  // Celebrate self-awareness
  selfAwareness: {
    name: "Inner Observer";
    description: "Logged your mood 10 times";
    xp: 25;
    tier2: { times: 50, name: "Mood Detective", xp: 100 };
    tier3: { times: 200, name: "Emotional Cartographer", xp: 300 };
  };

  // Celebrate recovery
  recovery: {
    name: "Gentle with Myself";
    description: "Took a break when overwhelmed";
    xp: 20;
    trigger: 'user_activated_recovery_mode';
  };

  // Celebrate partial completions
  partialCredit: {
    name: "Something is Something";
    description: "Completed part of a habit";
    xp: 10;
    message: "50% is infinitely more than 0%";
  };
}
```

**XP System Design:**
```typescript
interface XPSystemConfig {
  // XP always goes up, never down
  direction: 'monotonic_increase';

  // No "losing" XP for missed days
  penaltyXP: 0;

  // Diminishing returns prevent obsessive grinding
  dailyCap: 500;

  // Bonus XP for things that matter to ND users
  bonusEvents: {
    tookMedicationOnTime: 15;
    loggedAfterAbsence: 50;
    usedBodyDoublingSession: 20;
    completedDuringDifficultDay: 25;  // If mood was logged <4
    triedNewCopingStrategy: 15;
  };

  // Hidden XP for things users might find shameful
  hiddenByDefault: [
    'took_medication',  // Not everyone wants to broadcast
    'logged_shower',     // Basic hygiene shouldn't need celebration
    'ate_food'           // Same
  ];
}
```

### 4.4 Progress Celebration Framework

Celebrate any progress, not perfection:

**Partial Completion:**
```
User: "Only did 10 minutes of meditation instead of 20"
System: "10 minutes logged! That's 10 minutes of mindfulness your
        brain got today. +15 XP"
```

**Showing Up After Absence:**
```
System: "Day 1! Every journey has a day 1. You showed up today. +10 XP
        Welcome Back bonus"
```

**Small Wins:**
```
System: "You logged 3 things today. That's data that helps you
        understand yourself better. Nice work."
```

**Difficult Day Acknowledgment:**
```
User: "Managed to brush my teeth even though I'm depressed"

System: "That took real effort when you're feeling low.
        Logged: Hygiene - dental care
        +15 XP (Difficulty bonus: +10)

        That's genuinely hard and you did it anyway."
```

### 4.5 Streak Protection System

**Automatic Protection:**
```typescript
interface StreakProtection {
  autoProtect: {
    // Automatically protect streak if:
    conditions: [
      'user_logged_mood_below_4',
      'user_activated_recovery_mode',
      'user_mentioned_illness_or_crisis',
      'gap_is_single_day'  // One-day grace period
    ];

    behavior: 'streak_continues_silently';
    notification: false;  // Don't even mention it
  };

  // Streak freeze tokens
  freezeTokens: {
    earnedBy: ['7_day_streak', 'achievement_unlock'];
    autoApply: true;  // User doesn't have to remember to use them
    notificationIfUsed: 'optional';
  };

  // The nuclear option
  unlimitedGracePeriod: {
    setting: 'never_break_streaks';
    description: "Streaks are personal. Only you can reset them.";
    // For users who find any streak break devastating
  };
}
```

### 4.6 Avoiding Competitive Features

Competitive elements can trigger comparison anxiety and rejection sensitivity dysphoria (RSD) common in ADHD:

**Features to Avoid:**
- Leaderboards (even anonymous)
- "Compare with others" statistics
- Social sharing prompts
- "Users like you typically..." comparisons
- Ranking systems

**Features to Include:**
- Personal best tracking (competing with yourself only)
- Optional sharing (never prompted)
- Private achievements
- "Your patterns" insights without external comparison

### 4.7 Configurable Gamification Levels

Allow users to dial gamification up or down:

```typescript
interface GamificationPreferences {
  showXP: boolean;           // Display XP earned
  showStreaks: boolean;      // Display streak counters
  streakProtection: 'auto' | 'manual' | 'disabled';
  celebrationAnimations: 'full' | 'subtle' | 'none';
  achievementNotifications: boolean;
  levelUpAnimations: boolean;
  progressBars: boolean;
  soundEffects: boolean;
}

// "Minimal" preset for sensitive users
const minimalPreset: GamificationPreferences = {
  showXP: false,
  showStreaks: false,
  streakProtection: 'disabled',
  celebrationAnimations: 'none',
  achievementNotifications: false,
  levelUpAnimations: false,
  progressBars: false,
  soundEffects: false
};

// "Full" preset for dopamine-seeking users
const fullPreset: GamificationPreferences = {
  showXP: true,
  showStreaks: true,
  streakProtection: 'auto',
  celebrationAnimations: 'full',
  achievementNotifications: true,
  levelUpAnimations: true,
  progressBars: true,
  soundEffects: true
};
```

### 4.8 Level Progression Design

```typescript
interface LevelSystem {
  // Levels are cumulative and permanent
  levels: [
    { level: 1, xpRequired: 0, title: "Getting Started" },
    { level: 2, xpRequired: 100, title: "Finding Rhythm" },
    { level: 3, xpRequired: 300, title: "Building Momentum" },
    { level: 4, xpRequired: 600, title: "Self-Aware" },
    { level: 5, xpRequired: 1000, title: "Pattern Spotter" },
    { level: 10, xpRequired: 5000, title: "Life Logger" },
    { level: 20, xpRequired: 20000, title: "Insight Master" },
    { level: 50, xpRequired: 100000, title: "Legendary Self-Knowledge" }
  ];

  // Levels never decrease
  degradation: false;

  // Level-up unlocks are cosmetic or convenience, never critical features
  unlocks: {
    level5: ['custom_themes', 'widget_customization'];
    level10: ['advanced_analytics', 'custom_trackers'];
    level20: ['beta_features', 'priority_support'];
  };

  // No "you're behind" messaging
  comparisonMessaging: 'disabled';
}
```

---

## 5. Edge Cases Specific to Neurodivergent Users

### 5.1 Memory Uncertainty

**Scenario:** User is unsure whether they completed a routine task.

```
User: "I did my habits... wait, did I? I can't remember."

System: "Let me check. Today you've logged:
        - Medication: Yes, at 8:47 AM
        - Morning meditation: Not logged yet
        - Exercise: Not logged yet

        Would you like to log meditation or exercise now?"
```

**Design Principle:** Never make the user feel bad for asking. Provide factual information without judgment.

### 5.2 Task Paralysis

**Scenario:** User is overwhelmed by their task list and cannot initiate any action.

```
User: "I have 20 things to do and I can't start any of them."

System: "That sounds overwhelming. Let's try something different.

        Forget the list for a moment. What's the smallest possible
        thing you could do in the next 2 minutes? It doesn't have
        to be on the list.

        Options:
        - Stand up and stretch
        - Drink some water
        - Send one text message
        - Put one item away

        Or tell me what feels possible right now."
```

**Follow-up if user engages:**
```
User: "I guess I could drink water."

System: "Perfect. Do that now. I'll wait.

        ...

        Done? Great. That's a win. Your brain just completed something.
        Want to try one more small thing, or is that enough for now?"
```

### 5.3 Time Blindness

**Scenario:** User has lost track of time entirely.

```
User: "Is it still morning? What day is it?"

System: "It's Tuesday, January 18th. The time is 2:34 PM.

        You're in the afternoon. Lunch time has passed. Dinner is
        in about 4-5 hours.

        Would you like me to set a gentle reminder for anything?"
```

**Proactive Time Anchoring:**
```
System (optional daily anchoring notification):
"Time check: It's 3:00 PM on Wednesday. You've been awake for about
7 hours. Sunset is around 5:30 PM today."
```

### 5.4 Sensory Overload from Notifications

**Scenario:** User is getting overwhelmed by app notifications.

```
User: "Too many notifications, it's stressing me out."

System: "I hear you. Let's turn everything quiet for now.

        I've enabled Quiet Mode:
        - No sounds
        - No vibrations
        - No banner notifications
        - Badge count only (or none if you prefer)

        I'll only alert you if you set a specific time-sensitive
        reminder. You can always come back when you're ready."
```

**Sensory Preferences Configuration:**
```typescript
interface SensoryPreferences {
  notificationSounds: 'none' | 'gentle' | 'standard';
  vibration: 'none' | 'subtle' | 'standard';
  animationIntensity: 'reduced' | 'standard';
  colorContrast: 'low' | 'standard' | 'high';
  interfaceDensity: 'spacious' | 'standard' | 'compact';
  autoPlayMedia: boolean;
  flashingElements: boolean;
  quietHours: { start: string; end: string } | null;
}
```

### 5.5 Autistic Meltdown or Shutdown

**Scenario:** User indicates they're in or approaching meltdown/shutdown.

```
User: "Everything is too loud and too much and I can't I can't I can't"

System: "Meltdown support activated.

        [Minimal text, maximum space]

        ────────────────────────────

        Breathe.

        You are safe.

        This will pass.

        ────────────────────────────

        [One button: 'I'm okay now']"
```

**Post-Meltdown Check-in (Delayed):**
```
System (1-2 hours later, gentle notification):
"Hey. Checking in. No pressure to respond.

If you're feeling more regulated now, you can log what happened
if that helps you track patterns. Or just acknowledge you're okay.

[I'm okay] [Not yet] [Log what happened]"
```

### 5.6 Masking Fatigue

**Scenario:** User is exhausted from masking neurodivergent traits in social/work settings.

```
User: "Back from work. Been masking all day. Completely drained."

System: "Masking fatigue is real and exhausting.

        Logged: Masking fatigue noted for today

        Recovery time is important. What helps you decompress?
        - Stimming / fidgeting
        - Complete silence
        - Comfort media
        - Just lying there

        I'll keep notifications off for the next 2 hours unless
        you tell me otherwise."
```

### 5.7 Hiding Complexity Until Needed

**Scenario:** User needs simple interface most of the time but occasionally wants advanced features.

**Progressive Disclosure Implementation:**

```
Basic View (Default):
- Big capture button
- Today's habits (checkboxes only)
- Simple streak number
- "More" button tucked away

Expanded View (On Demand):
- Full habit details
- XP breakdown
- All trackers
- Goals and projects
- Analytics

User: "Show me the details"
System: [Expands view]

User: "That's too much"
System: [Collapses back to simple view]
"Got it. I'll keep it simple. Say 'show details' anytime."
```

### 5.8 Body Doubling Support

**Scenario:** User struggles to work alone and benefits from virtual accountability.

```
User: "I need to work on this report but I can't focus alone."

System: "Let's do a body doubling session. I'll check in periodically
        while you work.

        Starting a 25-minute focus session for: Report

        I'll give you a gentle nudge at 10 minutes and 20 minutes.
        At 25 minutes, we'll take a break. Sound good?"

        [Timer starts]

        [10 minutes] "Still with you. 15 minutes left. You're doing it."

        [20 minutes] "Almost there. 5 more minutes. Keep going."

        [25 minutes] "Time's up! You just did 25 minutes of focused
        work. That's real. Take a 5-minute break. Want to do another
        round after?"
```

**Advanced Body Doubling Options:**
```typescript
interface BodyDoublingSession {
  taskDescription: string;
  duration: 15 | 25 | 45 | 60;  // Pomodoro-ish options

  checkInStyle: {
    frequency: 'once_middle' | 'every_10_min' | 'every_5_min';
    tone: 'encouraging' | 'neutral' | 'minimal';
    examples: {
      encouraging: "You're doing great, keep going!";
      neutral: "10 minutes in. 15 to go.";
      minimal: "10 min ✓";
    };
  };

  endOfSession: {
    celebrate: boolean;
    logAutomatically: boolean;
    askForNextSession: boolean;
  };

  // Background music/sounds
  ambiance: 'none' | 'white_noise' | 'lo-fi' | 'nature' | 'custom_url';
}
```

### 5.9 Rejection Sensitivity Dysphoria (RSD) Triggers

**Scenario:** User interprets neutral system feedback as criticism.

```
User: "I only completed 2 out of 5 habits today"

// WRONG response (triggers RSD):
System: "You completed 2 of 5 habits (40%)"

// RIGHT response (RSD-aware):
System: "2 habits logged! That's 2 things your brain accomplished today.
        The others will be there tomorrow if you want them."
```

**RSD-Aware Design Principles:**
- Never use percentages that imply failure (40% feels like an F grade)
- Avoid language that implies "should have" done more
- Frame incompleteness as "not yet" rather than "failed"
- Celebrate absolute numbers, not relative performance
- Never compare today to "your best" days

**Additional RSD Triggers to Avoid:**
```typescript
const RSD_TRIGGER_PATTERNS = [
  "You usually do better",
  "Below your average",
  "Others typically",
  "You missed",
  "You failed to",
  "Only X%",
  "Falling behind",
  "Getting worse",
  "Declined from",
  "Less than yesterday"
];

// These should NEVER appear in system messages
```

### 5.10 Medication Tracking as Habit

**Scenario:** User tracks ADHD medication but needs specific accommodations.

```typescript
// Medication habit special configuration
interface MedicationHabit extends HabitDefinition {
  medicationType: 'stimulant' | 'non-stimulant' | 'other';

  // Timing matters for stimulants
  optimalWindow: {
    earliest: string;  // "06:00"
    latest: string;    // "10:00"
    reason: string;    // "To avoid sleep interference"
  };

  // Prevent double-dosing confusion
  doubleDoseProtection: boolean;
  confirmationRequired: boolean;

  // Track effectiveness
  trackEffectiveness: boolean;  // "How focused do you feel?"
  effectivenessCheckDelay: number;  // Minutes after dose to ask
}
```

**Medication Logging Interaction:**
```
User: "Took my meds"

System: "Logged: Medication taken at 9:15 AM.

        Quick note: Your last dose was logged 23 hours ago, so
        you're good. I'll check in around 10:30 to see how you're
        feeling if you want."

        [Optional - if enabled]

        [10:30 AM] "It's been about an hour since your medication.
        On a scale of 1-10, how's your focus right now?"
```

**Double-Dose Prevention:**
```
User: "Took my meds"
System: "Hold on, I'm showing medication logged today at 8:30 AM.
        Are you sure you want to log another dose? This might be
        a double-dose situation.

        - Yes, log it (I took a second dose intentionally)
        - No, cancel (I forgot I already logged it)
        - I'm not sure (let me think about it)"
```

### 5.11 Burnout Cycle Recognition

**Scenario:** System recognizes pattern indicating approaching burnout.

```typescript
interface BurnoutPatternDetection {
  indicators: {
    moodDecline: 'steady_decrease_over_7_days';
    energyDecline: 'below_4_for_5_consecutive_days';
    habitAbandonment: 'completion_rate_dropped_50_percent';
    sleepDisturbance: 'irregular_or_short_for_1_week';
    increasedAnxiety: 'anxiety_ratings_trending_up';
  };

  confidenceThreshold: 0.7;  // Before alerting user

  response: {
    invasive: false;  // Don't alarm them
    message: `
      "I've noticed some patterns this week that sometimes
      indicate burnout approaching. Want me to show you what
      I'm seeing? No pressure - just info if it's useful."
    `;
    options: ['Show me', 'Not now', 'Stop tracking this'];
  };
}
```

### 5.12 Transition Difficulties

**Scenario:** User struggles with task switching and transitions.

```
User: "I've been meaning to switch from work mode to personal
       stuff for an hour but I can't make myself stop"

System: "Task transitions are genuinely hard for many brains.

        Some things that help:
        - Physical anchor: Stand up, walk to another room
        - Sensory break: Splash cold water on your face
        - Ritual: Make a cup of tea as the 'bridge'
        - Verbal close: Say out loud 'I'm done with work now'

        Want me to set a 5-minute transition timer? When it goes
        off, you physically move to a different space."
```

---

## 6. System Response Philosophy

### 6.1 Tone Guidelines

All system responses for neurodivergent users should follow these principles:

**Warm but Not Patronizing:**
- Good: "That's great progress."
- Avoid: "Great job, champ!" or "You're such a good boy/girl!"

**Factual but Not Clinical:**
- Good: "You logged 5 habits this week."
- Avoid: "Your habit completion rate is 71.4% this period."

**Encouraging but Not Pressuring:**
- Good: "Ready when you are."
- Avoid: "Come on, you can do it!"

**Validating but Not Pitying:**
- Good: "Some days are harder than others."
- Avoid: "I know it's so hard for you."

### 6.2 Recovery Messaging

When users return after an absence, the system should welcome without guilt:

```typescript
const recoveryMessages = [
  "Welcome back! Today is a fresh start.",
  "Good to see you! What brought you back today?",
  "Hey, you're here. That counts.",
  "Back again. No judgment, just glad you're here.",
  "Starting fresh today. What feels manageable?"
];

function getRecoveryMessage(daysAbsent: number): string {
  // Never mention the specific number of days absent
  // Never mention "broken streak"
  // Focus on present moment

  return randomChoice(recoveryMessages);
}
```

### 6.3 Failure State Handling

When something goes wrong, respond with compassion:

**Missed Deadline:**
```
System: "The 'Submit report' task was due yesterday.

        Options:
        - Update the deadline
        - Mark as done (if you completed it)
        - Break it into smaller tasks
        - Remove it (it's okay, priorities change)

        What works for you?"
```

**Broken Streak (if user has streaks enabled):**
```
System: "Your streak counter reset, but here's what stays:

        - Longest streak: 23 days (permanently recorded)
        - Total lifetime completions: 156
        - Skills earned: Still yours

        Day 1 starts now. That's all that matters."
```

### 6.4 Celebration Calibration

**Matching celebration to user state:**
```typescript
function getCelebrationIntensity(context: UserContext): CelebrationLevel {
  // If user's mood is low, don't be overly cheerful
  if (context.recentMood < 4) {
    return 'gentle';  // "Logged." not "Amazing job!!!"
  }

  // If user just returned from absence, don't overwhelm
  if (context.daysSinceLastLog > 3) {
    return 'warm_understated';  // "Good to see you"
  }

  // If user explicitly wants dopamine
  if (context.gamificationLevel === 'full') {
    return 'enthusiastic';  // Full animations, sounds, praise
  }

  return 'moderate';  // Default middle ground
}
```

---

## 7. Technical Accommodations

### 7.1 Reduced Cognitive Load Interface

```typescript
interface NeurodivergentUIConfig {
  // Minimize decisions
  defaultsEnabled: boolean;         // Use smart defaults
  confirmationDialogs: 'minimal' | 'standard';

  // Reduce visual noise
  hiddenUntilNeeded: string[];     // Features to hide
  simplifiedNavigation: boolean;

  // Timing accommodations
  extendedTimeouts: boolean;        // More time for actions
  autosaveFrequency: 'aggressive';  // Never lose work

  // Focus support
  focusModeAvailable: boolean;
  distractionBlocking: boolean;
}
```

### 7.2 Forgiving Input Processing

The system should be generous in interpreting ambiguous input:

```typescript
function processAmbiguousInput(input: string): ProcessingStrategy {
  // When confidence is low, ask clarifying questions
  // rather than making wrong assumptions

  if (classificationConfidence < 0.7) {
    return {
      strategy: 'clarify',
      message: "I want to make sure I understand. Did you mean..."
    };
  }

  // When time references are ambiguous, default to user-friendly
  if (temporalAmbiguity) {
    // Default to "today" rather than forcing specificity
    return { defaultTemporal: 'today', askForClarification: false };
  }

  // Allow very casual/colloquial input
  // "did the thing" -> ask which thing rather than reject
  if (vagueReference) {
    return {
      strategy: 'recentContext',
      message: "Which one - [recent habit 1] or [recent habit 2]?"
    };
  }
}
```

### 7.3 Undo and Recovery Features

Neurodivergent users benefit from strong undo capabilities:

```typescript
interface UndoConfig {
  undoWindowSeconds: 30;           // 30-second undo on any action
  softDeleteRetention: 30;         // Days to keep "deleted" items
  versionHistory: true;            // Keep edit history
  bulkUndoSupported: true;         // Undo multiple actions

  // "I didn't mean to do that" recovery
  accidentalActionRecovery: {
    streakReset: 'recoverable_24h';
    habitUncheck: 'instant_undo';
    entryDelete: 'recoverable_30d';
  };
}
```

### 7.4 Accessibility Considerations

```typescript
interface AccessibilityConfig {
  // Screen reader optimization
  screenReaderSupport: {
    descriptiveLabels: true;
    skipNavigation: true;
    focusIndicators: 'high_visibility';
  };

  // Motor accommodation
  motorSupport: {
    largeHitTargets: true;  // 48x48 minimum
    dwellClicking: 'optional';
    swipeGestures: 'optional';  // Can be disabled
  };

  // Cognitive accommodation
  cognitiveSupport: {
    consistentLayout: true;  // Things don't move around
    predictableNavigation: true;
    undoEverything: true;
    noTimedActions: true;  // User controls pace
  };

  // Sensory accommodation
  sensorySupport: {
    reduceMotion: 'respect_system_setting';
    colorBlindModes: ['protanopia', 'deuteranopia', 'tritanopia'];
    contrastOptions: ['standard', 'high', 'maximum'];
  };
}
```

---

## 8. Comorbidity Considerations

### 8.1 ADHD + Anxiety

Many users with ADHD also experience anxiety. Design considerations:

```typescript
interface ADHDAnxietyProfile {
  // Anxiety worsens ADHD symptoms
  recognizedPatterns: [
    'perfectionism_causing_paralysis',
    'fear_of_failure_preventing_starts',
    'worry_disrupting_focus'
  ];

  systemBehaviors: {
    // Don't add to anxiety load
    noUrgentNotifications: true;
    noCountdownTimers: true;
    noPublicVisibility: true;

    // Provide anxiety support
    breathingExercisesAvailable: true;
    groundingTechniques: true;
    catastrophizingInterrupts: true;
  };
}
```

**Example Interaction:**
```
User: "I'm anxious about all the things I haven't done"

System: "That anxiety is making everything feel bigger and more urgent
        than it probably is. Let's ground this.

        Quick reality check:
        - What's actually due today? [I'll check your calendar]
        - What can actually wait until tomorrow?
        - What would happen if you did nothing tonight?

        Sometimes 'good enough' is the goal, not 'all of it.'"
```

### 8.2 ADHD + Depression

Depression often accompanies ADHD and requires specific accommodations:

```typescript
interface ADHDDepressionProfile {
  recognizedPatterns: [
    'executive_dysfunction_amplified',
    'anhedonia_affecting_dopamine_systems',
    'self_care_collapse'
  ];

  systemBehaviors: {
    // Lower all expectations temporarily
    adjustedBaselines: true;
    celebrateSurvival: true;  // "You got through the day"

    // Track basics compassionately
    basicsSuggestions: ['shower', 'food', 'water', 'movement'];
    noGuilt: true;

    // Gentle pattern recognition
    moodPatternAlerts: 'gentle_and_optional';
  };
}
```

**Example Interaction:**
```
User: "Everything is gray. I don't want to do anything."

System: "I hear you. Depression makes everything feel pointless.

        You don't have to do anything productive today.

        But if you want to try one tiny thing, here are options
        that might create a small shift:
        - Drink a glass of water
        - Look out a window for 1 minute
        - Send a single text to someone

        Or just rest. That's valid too."
```

### 8.3 Autism + ADHD ("AuDHD")

Users with both autism and ADHD face unique challenges:

```typescript
interface AuDHDProfile {
  challenges: {
    // Conflicting needs
    needForRoutine_vs_boredByRoutine: true;
    needForStimulation_vs_sensoryOverload: true;
    detailFocus_vs_executiveDysfunction: true;
  };

  systemAccommodations: {
    // Routine with variety
    sameStructure_differentContent: true;
    predictableUnpredictability: true;  // "Surprise reward inside routine"

    // Sensory considerations
    customizableSensoryProfile: true;
    noSuddenChanges: true;

    // Special interests integration
    specialInterestHabitIntegration: true;
    hyperfocusAwareness: true;
  };
}
```

**Example Interaction:**
```
User: "I want to exercise but I can't decide what to do and then
       I get overwhelmed by the options and then I don't do anything"

System: "Choice paralysis is real, especially with AuDHD brains.

        Option 1: I pick for you today. [Roll for random workout]
        Option 2: Set a default. Every Monday = walk. Every Tuesday = yoga.
        Option 3: Do the same thing every time until you get bored.

        Which approach sounds less exhausting right now?"
```

---

## 9. Routine Flexibility Patterns

### 9.1 Understanding Neurodivergent Routines

Neurodivergent users often struggle with rigid, time-based schedules but thrive with flexible, sequence-based routines. Understanding this distinction is essential for effective system design.

**Time-Based vs. Sequence-Based Routines:**

```typescript
interface RoutinePhilosophy {
  // AVOID: Time-based rigidity
  timeBasedExample: {
    type: 'rigid';
    schedule: [
      { time: '07:00', action: 'Wake up' },
      { time: '07:15', action: 'Shower' },
      { time: '07:30', action: 'Breakfast' },
      { time: '08:00', action: 'Leave for work' }
    ];
    failure_mode: 'One missed time cascades into perceived total failure';
  };

  // PREFER: Sequence-based flexibility
  sequenceBasedExample: {
    type: 'flexible';
    sequence: [
      { order: 1, action: 'Wake up', anchor: 'whenever' },
      { order: 2, action: 'Medication', anchor: 'after wake' },
      { order: 3, action: 'Shower OR breakfast', anchor: 'when ready' },
      { order: 4, action: 'Leave when prepared', anchor: 'flexible' }
    ];
    success_mode: 'Completing the sequence matters, not the timing';
  };
}
```

**Routine Definition Examples:**

```
User: "I want to create a morning routine"

System: "Let's build it around what works for your brain.

        First question: Is timing important, or just the sequence?

        - Time-anchored: 'I need to leave by 8:30, work backwards'
        - Sequence-anchored: 'These things happen in order, whenever I start'
        - Loose collection: 'Just remind me of things I want to do each morning'"
```

### 9.2 Routine Adaptation During Difficult Periods

When users are struggling, the system should automatically adapt routine expectations:

```typescript
interface AdaptiveRoutineConfig {
  normalMode: {
    routineItems: ['meditation', 'exercise', 'journaling', 'meds', 'breakfast'];
    expectedCompletion: 'most_items';
    celebration: 'full';
  };

  gentleMode: {
    // Activated when mood/energy is low
    routineItems: ['meds', 'water', 'any_food'];
    expectedCompletion: 'any_one_item';
    celebration: 'warm_understated';
    message: "On hard days, the basics are enough.";
  };

  survivalMode: {
    // Activated in crisis/burnout
    routineItems: ['still_breathing'];
    expectedCompletion: 'showing_up_counts';
    celebration: 'gentle_acknowledgment';
    message: "You're here. That matters.";
  };
}
```

**Automatic Mode Detection:**

```
System (detecting low mood trend):
"I notice your energy has been lower lately.
Want me to simplify your morning routine for a while?

Instead of 5 items, we could focus on just 2:
- Take medication
- Eat something

Everything else is bonus. What do you think?"
```

### 9.3 Routine Interruption Recovery

When routines get interrupted, help users resume without starting over:

```
User: "I was in the middle of my morning routine but then my
       phone rang and now I can't remember what I've done"

System: "No problem. Here's where you are:

        Done:
        ✓ Medication (8:15 AM)
        ✓ Shower

        Remaining:
        ○ Breakfast
        ○ Journal entry
        ○ Check calendar

        Want to pick up with breakfast, or skip ahead?"
```

### 9.4 Weekend/Non-Work Day Routines

Many neurodivergent users need different routines for unstructured days:

```typescript
interface DayTypeRoutines {
  workDay: {
    externalStructure: true;
    routineComplexity: 'detailed';
    timing: 'semi-anchored';
  };

  weekendDay: {
    externalStructure: false;
    routineComplexity: 'minimal';
    timing: 'fully_flexible';
    suggestion: "Weekends can feel formless. Want a loose anchor point?";
  };

  vacationDay: {
    externalStructure: false;
    routineComplexity: 'optional';
    specialMode: 'vacation_mode';
    message: "Vacation mode: All tracking is optional. Enjoy the break.";
  };
}
```

---

## 10. Widget and Notification Design

### 10.1 Home Screen Widget Configurations

Widgets must balance information density with overwhelm risk:

**Simple Widget (Default for ND users):**
```
┌────────────────────────┐
│  Insight               │
│                        │
│  [Big Capture Button]  │
│                        │
│  Today: 3 logged       │
└────────────────────────┘
```

**Progress Widget (Optional):**
```
┌────────────────────────┐
│  Morning ○○●○○         │
│  Meds ✓  Sleep: 6      │
│  [Capture]             │
└────────────────────────┘
```

**Minimal Widget (For sensory-sensitive users):**
```
┌─────────┐
│    +    │  <- Just a plus sign. One tap to capture.
└─────────┘
```

### 10.2 Notification Tone Library

```typescript
interface NotificationTones {
  // Each notification type has its own feel
  toneOptions: {
    gentle_chime: {
      description: 'Soft, single tone. Non-startling.';
      duration_ms: 500;
      frequency_hz: 440;  // Middle A, pleasant
    };

    warm_ping: {
      description: 'Two-note ascending. Welcoming.';
      duration_ms: 600;
      pattern: [440, 523];  // A to C
    };

    whisper_tap: {
      description: 'Barely audible. More felt than heard.';
      duration_ms: 200;
      volume: 0.3;  // Very quiet
    };

    silent: {
      description: 'Vibration only, no sound.';
      vibrationPattern: [100];  // Single short buzz
    };

    truly_silent: {
      description: 'No vibration, no sound. Badge only.';
    };
  };

  // Users can assign tones to notification types
  assignable: {
    habit_reminder: 'gentle_chime' | 'silent';
    medication_reminder: 'warm_ping' | 'gentle_chime';
    body_doubling_checkin: 'whisper_tap' | 'silent';
    recovery_messages: 'truly_silent';  // Never interrupt recovery
  };
}
```

### 10.3 Notification Timing Intelligence

```typescript
interface SmartNotificationTiming {
  // Learn when user is receptive
  learningEnabled: boolean;

  patterns: {
    // If user always dismisses notifications before 9 AM, stop sending them
    morningWindow: 'auto_detect';

    // If user engages most at 10 PM, that's valid
    eveningWindow: 'respect_night_owl';

    // Never notify during detected sleep
    sleepProtection: true;
  };

  // Backoff when ignored
  backoffBehavior: {
    firstIgnore: 'wait_30_min';
    secondIgnore: 'wait_2_hours';
    thirdIgnore: 'stop_for_today';
    message: "I'll try again tomorrow. No pressure.";
  };
}
```

---

## 11. Integration with External Support Systems

### 11.1 ADHD Coaching Platform Integration

For users working with professional ADHD coaches:

```typescript
interface CoachingIntegration {
  supportedPlatforms: ['focusmate', 'adhd_coaching_org', 'generic_ical'];

  sharedData: {
    habitTrends: boolean;
    focusSessionLogs: boolean;
    medicationPatterns: boolean;  // Requires explicit consent
    moodTrends: boolean;
    journalEntries: false;  // Never by default
  };

  syncFrequency: 'weekly_summary' | 'real_time';

  coachDashboard: {
    showsRaw: false;  // Never raw data
    showsSummary: true;  // Aggregated insights only
    requiresUserApproval: true;  // Per-session approval option
  };
}
```

### 11.2 Therapy Session Preparation

Help users prepare for therapy appointments:

```
System (day before therapy appointment):
"You have therapy tomorrow at 2 PM.

Want me to prepare a summary? I can include:
- Mood patterns since last session
- Notable journal entries (you choose which)
- Any patterns I've noticed
- Topics you flagged to discuss

I'll have it ready for you to review tonight."
```

**Therapy Summary Export:**
```
────────────────────────────────────────
INSIGHT SUMMARY: Week of Jan 12-18, 2026
For: Therapy Session with Dr. Smith
────────────────────────────────────────

MOOD OVERVIEW:
Average: 5.2/10 (down from 6.1 last week)
Lowest: 3 (Wednesday - work stress noted)
Highest: 7 (Saturday - completed project)

NOTABLE PATTERNS:
- Sleep below 6/10 on 4 days
- Anxiety elevated mid-week
- Weekend showed recovery pattern

FLAGGED FOR DISCUSSION:
- "Feeling stuck in my job" (Jan 15)
- "Mom stuff again" (Jan 16)

MEDICATION TIMING:
Consistent. Average time: 8:23 AM.
────────────────────────────────────────
```

### 11.3 Psychiatry Appointment Preparation

Different needs for psychiatric vs. therapy visits:

```
System (week before psychiatry appointment):
"Psychiatry visit coming up on Friday.

This might be helpful to bring:
- Medication timing log (last 30 days)
- Focus ratings after medication
- Sleep patterns
- Any side effects you noted

Want me to generate this report? You can review and edit
before the appointment."
```

---

## 12. Implementation Priorities

### 12.1 Must-Have Features (Launch)

1. **Non-punitive streak system** with automatic protection
2. **Quiet Mode** for sensory overload situations
3. **Simple/Advanced view toggle** for progressive disclosure
4. **Configurable gamification** levels
5. **Generous undo** on all actions
6. **Stream-of-consciousness voice parsing** that extracts structure from rambling
7. **Time anchoring** features for time blindness
8. **Medication tracking** with double-dose protection

### 12.2 Should-Have Features (v5.3)

1. **Body doubling** focus sessions
2. **Therapist/coach sharing** configuration
3. **Task breakdown** assistant for paralysis
4. **Custom sensory preferences** panel
5. **Recovery messaging** system
6. **ADHD-specific** insights in Reflections

### 12.3 Nice-to-Have Features (Future)

1. **Integration with ADHD coaching platforms**
2. **Medication effectiveness tracking** with correlation analysis
3. **Symptom pattern recognition** and alerts
4. **Community features** (optional, non-competitive)
5. **Professional export formats** for healthcare providers

---

## 13. Success Metrics

### 13.1 Engagement Metrics (Adjusted for Population)

Standard engagement metrics fail for neurodivergent users. Instead measure:

- **Return rate after absence:** Users who come back after 7+ days away
- **Recovery streak length:** Average length of new streaks after breaks
- **Feature discovery:** Eventual use of advanced features (not immediate)
- **Quiet Mode usage:** Indicates trust in the system during overwhelm
- **Long-term retention:** 6-month and 12-month retention rates

### 13.2 Qualitative Indicators

- User feedback mentioning "doesn't make me feel bad"
- Reviews noting accommodation for ADHD/neurodivergent needs
- Support tickets about punitive features (should be zero)
- Feature requests for even gentler options (indicates engaged users)

### 13.3 Anti-Metrics (What NOT to Measure)

Certain metrics can create harmful incentive structures for neurodivergent users:

**Do NOT track or display:**
- Daily Active User streaks that create anxiety
- "Time in app" metrics that reward doom-scrolling
- Completion percentages across habits
- Comparisons to "average" users
- Week-over-week "growth" charts
- "Consistency scores" that punish variability

**Why these harm neurodivergent users:**
- Creates external pressure that overrides internal motivation
- Reinforces shame when natural cognitive rhythms cause "dips"
- Converts a helpful tool into another source of perceived failure
- Ignores that neurodivergent success looks different from neurotypical success

---

## 14. Onboarding Considerations

### 14.1 First-Run Experience

Neurodivergent users benefit from a streamlined onboarding that avoids overwhelming:

```
Screen 1: "Welcome to Insight. I'm here to help you remember things
          and track what matters to you. No pressure, no judgment."

Screen 2: "Quick question: Do you want help with any of these?
          [ ] Remembering medication
          [ ] Building routines
          [ ] Tracking mood
          [ ] Capturing thoughts
          [ ] All of the above
          [ ] I'll figure it out myself"

Screen 3: "One more thing: How do you feel about notifications?
          [ ] I like reminders - they help me
          [ ] Gentle only - nothing urgent-sounding
          [ ] Minimal - I'll open the app when I'm ready
          [ ] None - I get overwhelmed by notifications"

Screen 4: "You're all set. Remember: there's no wrong way to use this.
          Log what you want, when you want. I'll be here."
```

### 14.2 ADHD-Specific Onboarding Path

If user selects indicators suggesting ADHD or selects "ADHD-friendly mode":

```
System: "I've set up a few things that tend to help ADHD brains:

        - Streak protection is ON (missing a day won't erase progress)
        - Notifications are set to 'gentle' by default
        - Simple view is enabled (you can expand anytime)
        - Voice input is ready (talk instead of type)

        You can change any of these in settings. Want a quick tour
        or ready to dive in?"
```

### 14.3 Progressive Feature Introduction

Don't overwhelm on day 1:

```typescript
interface ProgressiveOnboarding {
  day1: ['voice_capture', 'basic_habits', 'mood_tracking'];
  day3: ['introduce_routines', 'suggest_templates'];
  week1: ['show_first_insight', 'offer_gamification_options'];
  week2: ['introduce_journaling', 'suggest_trackers'];
  month1: ['show_patterns', 'offer_advanced_features'];

  pacing: 'user_controlled';  // Never force next step
  skipAllowed: true;
}
```

---

## 15. Sample Interaction Flows

### 15.1 Complete Morning Flow

```
[7:30 AM - User wakes up, opens app]

System: "Good morning. It's Wednesday, January 18th.
        Quick check-in or skip to logging?"

User: [Taps "Quick check-in"]

System: "Sleep: How was it? (1-10)"

User: "Ugh, like a 4. Kept waking up."

System: "Got it. Sleep: 4/10, interrupted.
        Meds taken yet?"

User: "Yeah, just took them."

System: "Logged: Medication at 7:32 AM.
        Anything you want to focus on today?"

User: "I have that presentation and I'm nervous."

System: "Noted: Presentation today (anxiety noted).

        You're all set. I'll check in around 10 to see
        how your focus is. You've got this."

[10:00 AM - Gentle notification]

System: "Hour since meds. How's focus feeling? (1-10)"

User: "Maybe a 7? Getting things done."

System: "Nice! Focus: 7/10. That's your focus kicking in.
        Keep going. I'll leave you alone unless you need me."
```

### 15.2 Complete Crisis Flow

```
[User hasn't logged in 5 days, returns]

System: "Hey, you're back. Welcome.
        Whatever happened, today is a new day."

User: "I completely fell apart. Work was too much.
       I couldn't do anything for days."

System: "That sounds really hard. Burnout is real.

        Your streak from before (18 days) is saved forever.
        Today is day 1 of a new cycle.

        No pressure to catch up on anything. What feels
        doable right now? Even tiny things count."

User: "I don't know. I ate something today. That's about it."

System: "That counts. Logged: Ate food today.

        Seriously - eating when you're burnt out is an
        accomplishment. Your body needed fuel and you
        listened.

        Want to just rest, or try one more tiny thing?"

User: "Just rest for now."

System: "Okay. I'm here when you need me.
        Recovery Mode is on - no reminders until you say."
```

### 15.3 Complete Task Paralysis Flow

```
User: "I have so much to do and I can't do any of it.
       Everything feels equally important and impossible."

System: "That's task paralysis. Your brain is overloaded.
        Let's try something.

        First: Don't look at your full list. Close your eyes.

        Breathe for 3 seconds.

        Now: What is ONE thing you've been thinking about?
        Just the first one that comes to mind."

User: "Email my manager about the deadline."

System: "Good. That's the one.

        Here's the trick: You don't have to write the whole
        email. Just open your email client. That's step 1.

        Can you do just that? Open the email client?"

User: "Yeah, okay, I did that."

System: "Great. You just broke the paralysis.

        Next step: Type the name 'Manager' in the To field.
        Just that. Nothing else."

User: "Done."

System: "Look at you, actually doing the thing.

        I'll leave you to write the email. When you send it,
        come back and tell me. I'll log it as a win."

[15 minutes later]

User: "I sent the email."

System: "YES. Task complete: Email manager about deadline.
        +30 XP (Task paralysis breakthrough bonus: +20)

        That was hard and you did it anyway.

        Want to tackle another, or take a victory lap break?"
```

---

## 16. Closing Principles

The neurodivergent user needs Insight to be a tool that works with their brain, not against it. Every design decision should pass this test:

**"Does this feature help a neurodivergent user feel capable, or does it risk making them feel like a failure?"**

If there's any risk of the latter, redesign until the answer is unambiguously the former.

The goal is not to "fix" neurodivergent users or make them more neurotypical. The goal is to provide scaffolding that honors how their brains actually work, celebrates their wins however small, and never adds to the shame they may already carry from a world not designed for them.

Key reminders for all developers and designers:

1. **Absence is not failure.** Users will disappear and return. Welcome them back warmly.

2. **Partial is not failed.** 10 minutes of meditation is not a failed 20-minute session.

3. **Different is not wrong.** Logging at 2 AM is valid. Hyperfocusing for 6 hours is valid. Needing complete silence is valid.

4. **Scaffolding, not policing.** We're an external brain, not a disappointed parent.

5. **Trust the user.** They know their brain better than we do. Give them the tools and get out of the way.

---

## Appendix A: Quick Reference Card for Developers

### A.1 Language to ALWAYS Avoid

These phrases should never appear in any system message, notification, or UI copy:

| Avoid | Why | Instead |
|-------|-----|---------|
| "You missed..." | Implies failure | "Not yet logged" |
| "You failed to..." | Direct shame trigger | "Still available" |
| "Only X%" | Percentage = grade = shame | Use absolute numbers |
| "You usually do better" | Comparison to past self | Focus on present only |
| "Others typically..." | Social comparison | Never compare to others |
| "Your streak broke" | Loss framing | "Starting fresh" |
| "Getting worse" | Trend shaming | Just show data, no judgment |
| "You haven't..." | Accusatory tone | "When you're ready" |
| "Don't forget to..." | Implies they'll forget | "Reminder available" |
| "You should..." | Prescriptive, parental | "Option available" |

### A.2 Language to ALWAYS Use

| Context | Preferred Language |
|---------|-------------------|
| Returning user | "Welcome back!" |
| Partial completion | "That counts!" |
| Low mood day | "Taking care of basics is enough" |
| Missed day | "Starting fresh today" |
| Overwhelm stated | "What feels possible right now?" |
| Any logging | "Logged. ✓" (simple, no judgment) |
| Recovery mode | "No pressure. I'm here when you're ready." |

### A.3 Notification Rules

1. **Never** use alarm or alert tones by default
2. **Never** mention streaks in notifications
3. **Never** use countdown language ("3 hours left!")
4. **Always** make notifications dismissable without consequence
5. **Always** respect quiet hours without exception
6. **Always** use positive framing ("Ready when you are")

### A.4 Animation and Visual Rules

1. **Never** use red for missed/incomplete items
2. **Never** use falling/declining animations
3. **Never** auto-play celebratory animations without consent
4. **Always** respect system reduce-motion settings
5. **Always** provide static alternatives to animations
6. **Always** use neutral colors for incomplete states (gray, not red)

---

## Appendix B: Testing Checklist for ND Features

Before releasing any feature, verify:

**Streak System:**
- [ ] Streak protection activates automatically for single-day gaps
- [ ] No "streak broken" language anywhere in UI
- [ ] Longest streak is preserved permanently
- [ ] Recovery messages appear on return after absence

**Gamification:**
- [ ] XP never decreases
- [ ] Achievements never revoke
- [ ] Partial completions earn proportional XP
- [ ] All celebrations are configurable or disableable
- [ ] No comparisons to other users anywhere

**Notifications:**
- [ ] All notification sounds are gentle by default
- [ ] Quiet mode disables ALL notifications
- [ ] No urgent/alarm tones in notification options
- [ ] Backoff works (stops after repeated dismissals)
- [ ] Sleep detection prevents night notifications

**Voice Input:**
- [ ] Stream-of-consciousness input parses correctly
- [ ] Vague time references default gracefully
- [ ] Contradictory information prompts clarification gently
- [ ] Failed parsing offers retry without blame

**Mood/Mental Health:**
- [ ] Low mood triggers gentler system responses
- [ ] Crisis language triggers supportive (not alarmist) response
- [ ] Recovery mode is easily accessible
- [ ] No shame-triggering language in any low-mood flow

**Accessibility:**
- [ ] Screen reader announces all key information
- [ ] Reduce motion setting is respected
- [ ] High contrast mode works throughout
- [ ] Touch targets are at least 48x48px
- [ ] No timed interactions that can't be extended

---

## Appendix C: User Research Quotes (Anonymized)

These quotes from neurodivergent users informed this specification:

> "Most apps make me feel like a failure when I miss a day. I need something that welcomes me back without making me feel guilty."

> "I can't do rigid schedules. My brain doesn't work that way. I need things in sequence, not by time."

> "The worst is when an app shows me a graph going down. I already know I'm struggling. I don't need a chart to rub it in."

> "I forget I already took my meds and take them again. Double-dose protection could literally save me from a bad day."

> "Voice input is huge for me. When I'm overwhelmed, typing feels impossible. Talking is easier."

> "I need the option to turn off all the gamification stuff. Some days XP feels motivating, other days it feels like pressure."

> "Body doubling with a real person is great but not always available. Even a virtual check-in helps."

> "My therapist wants to see my mood data but I don't want them seeing my journal. I need granular sharing controls."

> "Notifications that sound like alarms trigger my anxiety. I need gentle sounds or no sounds at all."

> "I love tracking things but I hate when the app judges my inconsistency. Just let me see my data without commentary."

---

*End of Document*

**Final Word Count:** 10,408 words

# Demo Scenario — How It Actually Works, Minute by Minute

Status note: this is the flow as built (Tasks 1–4) and verified in the local test suites (41 tests, two-browser end-to-end). The production deployment at icebreak-app.vercel.app currently returns an error on the join path — that is being debugged separately. Nothing below is invented: names, goals and chips are the seeded demo data.

Setting: **Icebreak Demo Mixer**, event code **HELLO26**. Six demo guests are in the data (Ari, Bo, Casey, Dev, Ellis, Fran). Our two people:

- **Casey** — goal: *Find teammates*. Answered the five preference questions; one of her answers is **Coffee**.
- **Ari** — goal: *Find teammates*. Also answered **Coffee** on the same question.

## Casey's phone

**19:02 — Join (under 30 seconds).** Casey scans the organiser's QR code (or types HELLO26 on the landing page, which says "Make room for someone new."). Two fields only: her name, and her goal — she taps *Find teammates*. No account, no password: the app silently creates a guest session. She is in.

**19:03 — Five taps.** Five short questions, two options each, every one skippable. On the coffee question she taps **Coffee**. She could stop here — the rest of the profile (interests, a fun fact, what she can help with, what she wants to learn, an "ask me about" topic) is optional and can be added later.

**19:04 — She decides she's open.** She flips the **Open to chat** switch. A note tells her this lasts about 15 minutes and she can turn it off any time. She is now visible to other open guests — and only to them.

**19:04 — The board.** She sees a simple list: name, goal line, and at most one shared chip per person. **Ari — Find teammates — ☕ Coffee.** No photos ranked, no percentage, no "92% match", no counts anywhere. Ari is listed first because the ordering (invisible to her) puts shared goal first, then shared answers.

**19:05 — The invitation.** She taps Ari and sends a request. The request carries its reason automatically — the shared chip **Coffee** and the shared goal — and she picks a length: **10 minutes**. What she does *not* see: any way to know if Ari declines. If Ari taps "Later", or never sees it, the request simply expires after 15 minutes and disappears. Casey is never shown a rejection.

**19:06 — Accepted.** Ari accepts. Both phones now show the same thing: **Table 2** (the meeting point the system assigned — the least crowded of the organiser's points), a photo of it, and one line of direction: *"By the coffee bar, under the blue banner."* Underneath, Casey's prep card is already waiting (see below).

**19:07 — Arrival.** Casey reaches Table 2, taps **I'm here**. Ari's phone shows Casey has arrived; when Ari taps too, the session starts — for both of them at the same moment.

## The conversation — four cards, phones mostly face-down

The session is a shared structure for *both* of them, not a script for one. Cards appear on both phones at the same times; advancing needs both to tap (or the timer offers the next card — it never forces).

**Card 1 — Prep (read while walking over).** Table photo, "about 10 minutes", the lightest true thing they share (**Coffee**), and who starts: Casey sent the invitation, so **Casey starts** the next card. Ari's prep card tells him he doesn't need an opener — Casey starts.

**Card 2 — Expand (~2:30 in).** One shared thing, stated as a difference where that's the truth: they both picked Coffee, but Casey's *help* topic and Ari's *learn* topic pair up — Ari wants to learn **TypeScript**, and it's a topic Casey can talk about. Casey goes first with the format the card suggests: say one thing about herself, then ask. Ari's card is a **listener card**: follow-up questions only — the easiest job in the room.

**Card 3 — Deepen (~5:30 in).** Each gets an **ask-me-about**: a topic they wrote themselves, offered as an invitation — *"You can ask me about: ___."* Roles swap: this time Ari starts.

**Card 4 — Close (~8:00 in, or whenever either taps "wrap up").** Each says one specific thing they'll remember about the other. Then, privately on each phone: optional next steps. Contact exchange happens only if **both** opt in, field by field — Casey might share her Instagram but not her email; Ari sees only what she released, and only because he released his too.

If either of them had needed to leave at minute 3, the same closing card appears on both phones — the partner cannot tell an early exit from a natural end. That is deliberate, and it is enforced in the database, not just the UI.

**19:17 — After.** Casey gets one optional tap-screen rating **the format** (how easy was that conversation to have?) — never a rating of Ari. It takes two seconds and Ari never sees it. Ari lands in Casey's **My People** list with the one fact she chose to remember. Her Open toggle is *off* — the app does not put her back on the board automatically; she re-opens when she wants another conversation.

## The organiser's five minutes (before any of this)

The organiser creates the event in the app, gets a QR code and the code HELLO26, and sets the meeting points (Table 1, Table 2, the coffee bar…) with a photo and one line of direction each. During the event they see aggregate counts only — how many people are open, how many sessions started — never who declined whom, never feedback about a person. When they end the event, the room closes.

## What this scenario demonstrates (the claims we can honestly make)

1. **Permission before approach** — nobody walks up to a stranger cold; the invitation and the accept happen first, and a non-answer is invisible.
2. **A designed exit** — the 10-minute box and the identical closing card remove the "how do I leave?" fear, which the research says matters more to shy attendees than the opener.
3. **Structure for both sides** — the shy person's partner gets cards too; nobody carries the conversation alone, and nobody performs a script.
4. **No scores, anywhere** — not in the UI, and (verified by payload inspection) not in the data the phones receive.
5. **The feedback is the training data** — Casey's two-second format rating, plus whether both stayed and both exchanged contacts, is exactly the labelled outcome data the matching model will one day be judged against.

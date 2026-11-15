# MeetMates — Complete Feature Specification (Version 1)

*Owner's product spec, converted from Product.docx (uploaded 2026-11-14).
This is the binding product definition for the Task 5 redesign. Where this
spec and older evaluation documents disagree, the owner's latest decisions
govern (see Codex-Task5-Brief-v2.md for the reconciliation).*

**Core concept: Explore Broadly. Connect Deeply.**

MeetMates is a mobile-first networking platform for business conferences. It
uses AI to identify potentially valuable connections, helps participants meet
through short, structured introductions, and supports deeper relationships
after the networking session. The spec distinguishes **Core** (agreed) from
**Proposed** (design additions that still need validation).

## 1. Complete user journey

BEFORE THE EVENT: Homepage → Login → Choose Event → Create Profile
DURING THE EVENT: Event Home → Discover → Requests → Matched Profile →
3–5 Min Conversation
AFTER THE INTRODUCTION: Feedback → Save Contact → Arrange Follow-Up

## 2. Before the event: Preparation

### Screen 1 — Homepage
Core: introduce the platform and allow users to begin onboarding.
Proposed UI: logo and product name; tagline *Explore Broadly. Connect
Deeply.*; short value proposition (AI People Matching, brief introductions,
follow-up); primary **Get Started** button; secondary **How It Works**
section; mobile-friendly, minimal scrolling.

### Screen 2 — Login / Sign Up
Core: participants need an account so their networking profile can be
reused at future events.
Proposed: Continue with Google, Apple, or email; log in to an existing
account; secure session management; return users directly to their event
dashboard.
**Owner decision 2026-11-14: email one-time-code login (no passwords, no
social login in this build) — see the Task 5 v2 brief.**

### Screen 3 — Choose an Event
Core: users select the business conference they're attending.
Proposed: searchable event directory; event cards (name, dates, location,
organizer); access through an organizer-provided QR code or event
invitation; **Join Event** action; participation in multiple events.

### Screen 4 — Create a Networking Profile
Core: reusable profiles, predominantly selection-based inputs to minimize
onboarding effort.

| Section | Inputs |
|---|---|
| Basic information | Name, photograph, job title/role |
| Organization | Company, startup, university, or institution |
| Professional background | Industry, expertise, short introduction |
| Interests | Multi-select tags such as AI, finance, energy, sustainability, M&A |
| Networking goals | Find collaborators, meet investors, find customers, learn from experts, explore opportunities |
| Mutual value | What the participant can offer and what they are looking for |
| Review | Review and edit before completing registration |

Proposed: AI converts these inputs into a structured representation for
matching. Users can update interests or goals per event without rebuilding
their entire profile. The strongest matching signals should come from
**goals, needs, and complementary expertise**, not just shared keywords.

## 3. During the event: Discovery

### Screen 5 — Event Home
Core: central dashboard once the participant joins the event. Quick access
to: event name and networking-session information; AI-recommended
participants; full attendee directory; incoming and outgoing requests;
confirmed matches or upcoming introductions; saved connections.
Proposed: notifications for new requests, accepted introductions, and
scheduled meetings.

### Screen 6 — Discover People (the primary feature)
Tabs: **For You / All Attendees / Saved**.
Each recommended participant card shows: role · organization · expertise;
**"Why you might connect"** — an explanation of why the connection might be
mutually useful (e.g. "Your professional goals complement this
participant's expertise or needs"); interest tags; suggested topics; a
**Request a Short Introduction** action; save-for-later.
Core: AI-recommended participants appear prominently; the complete
attendee list is browsable; every profile explains role, goals, expertise;
users can request an introduction or save someone.
Proposed enhancements: search by name or organization; filters by industry,
interests, role, networking goals; sorting by relevance; exploring less
obvious but potentially valuable connections; showing availability for
short introductions.
**Important (spec's own note): match percentages such as "94%" in the
mockups are illustrative. Unless we can define and calibrate a meaningful
probability, explanations such as "complementary goals" are more
defensible than numerical compatibility scores.**

## 4. Requests and matching

### Screen 7 — Manage Requests
| Tab | Functions |
|---|---|
| Received | View incoming requests; accept or decline |
| Sent | See pending, accepted, or declined requests |
| My Matches | See mutually accepted introductions |
| Saved | Keep interesting participants for later |

A request contains: who the person is, why they want to connect, and what
potential value exists.
Proposed: withdraw a pending request; notifications when a request is
accepted.
**Matching logic:** A expresses interest in B → B can accept or decline →
if both agree, an introduction is confirmed → the system provides a time
and meeting location during a networking round → both participants can view
the matched profile and suggested conversation topics.
Open design decision in the spec: individual requests vs a synchronized
matching round; both participants' consent remains essential either way.

## 5. Matched profiles and conversation support

### Screen 8 — Matched Profile
Name, photograph, role, organization; background and professional
expertise; interests and networking goals; explanation of potential Mutual
Value; suggested conversation topics or questions; introduction time and
meeting location.

### Screen 9 — Conversation Questions
AI suggests relevant questions to help participants begin a meaningful
interaction. Categories: Icebreaker (make starting easier); Shared interest
(find common ground); Professional insight (exchange knowledge);
Complementary value (explore collaboration); Next step (determine whether
a follow-up would be useful). Tone modes by event type are optional future
enhancements, not MVP.

### Messaging
Proposed: a simple text chat for introductions, meeting coordination, and
follow-up messages. **The core networking interaction should remain
face-to-face at the conference.** Video calling is not necessary for the
current concept.

## 6. Short, structured networking sessions

Core mechanics:
- Initial conversation: approximately **3–5 minutes**.
- Participants can continue talking if both are interested.
- Maximum conversation with the same person or company during the
  dedicated networking session: approximately **15–20 minutes**.
- When the limit is reached, participants are encouraged to meet someone
  else; deeper conversations can be arranged after the session.
Proposed interface features: visible countdown timer; suggested discussion
prompts; reminder when an introduction is ending; a **Save and Follow Up**
option; a **Meet Someone New** option; clear venue or networking-zone
information. The purpose of the time cap is to encourage exploring diverse
connections, not merely to make conversations faster.

## 7. After each introduction

### Feedback
Proposed, but important for learning whether matching works: Was the
conversation worthwhile? Do you want to follow up with this person?
Optional private notes. Optional reason for interest (collaboration,
learning, investment, professional advice). Feedback from both participants
could help assess recommendation quality. **However, private feedback
should not become an undisclosed reputation score about another attendee.**
Use it carefully, with clear privacy expectations and appropriate consent.

### Follow-up
Core: save a connection; review profiles and private meeting notes; send a
follow-up message; arrange a longer conversation; view previously met
participants. Optional later: follow-up reminders; calendar integration;
contact export (vCard/CSV); connection history across events.

## 8. Organizer-side capabilities

| Feature | Purpose |
|---|---|
| Event creation | Set up the event and registration information |
| Participant management | Control event access and view registrations |
| Networking sessions | Define rounds, durations, and locations |
| Matching settings | Configure session capacity and participation rules |
| Announcements | Notify participants when rounds begin or end |
| Analytics | Measure requests, completed introductions, and follow-ups |

## 9. AI Matching: what the system should optimize

The distinguishing ambition is not matching similar backgrounds — it is
identifying **potential Mutual Value**, including complementary professional
needs and opportunities users might otherwise overlook. Inputs: professional
goals; expertise and interests; what they seek and what they can offer;
event context; availability and willingness to participate; opt-in feedback
from previous introductions. Considerations: relevance to both
participants; probability of an introduction taking place; discovery of
less obvious connections; avoiding excessive concentration of requests on
highly popular attendees. These are design objectives, not an already
validated AI algorithm.

## 10. Mobile navigation and visual design

Persistent bottom navigation: **Home / Discover / Requests / Matches /
Profile**. The design should prioritize readable attendee cards, clear
matching explanations, large touch targets, minimal typing, and fast access
to requests. Participants may use the website while standing or moving
around a conference; essential actions should require as few taps as
practical.

## 11. MVP priorities

| Priority | Features |
|---|---|
| Essential MVP | Login, event selection, profile form, AI People Matching, full attendee list, requests, mutual acceptance, matched profiles, AI conversation prompts, meeting confirmation |
| Strong additions | In-person timer, notes, saved connections, follow-up, basic organizer session controls |
| Future enhancements | Calendar synchronization, sophisticated recommendation learning, configurable tone modes, contact export, advanced analytics, cross-event networking |

The important metric is not the number of features shipped. It is whether
the experience actually helps participants find relevant people and turn
recommendations into real conversations.

### Success metrics
Primary metric: **mutually valuable connections per participant-hour**.
Supporting: request acceptance rate, completed introductions, number of
distinct people met, both-sided meeting satisfaction, mutually desired
follow-ups.

## Final product definition

**MeetMates — Explore Broadly. Connect Deeply.** An AI-powered,
mobile-first business conference networking platform that helps
participants discover overlooked, mutually valuable people, meet through
short and structured introductions, and build meaningful professional
relationships through follow-up.

The most important product boundary: **People Matching is the primary value
proposition; conversation topics and efficient introductions help users act
on those recommendations; interpersonal chemistry is something participants
discover through meeting.** That distinction should remain consistent
across the website, demo, product specification, and final pitch.

# Competitor Intake-Form Audit — What Event Matchmaking Platforms Ask Attendees Before Matching

Compiled 2026-11-14. Scope: the attendee intake / profile form of each platform — the fields and questions a person fills in before the platform will match them — and how each platform says those answers drive matching.

Method: official help centres, official product pages, and official event/delegate guides wherever possible; trade-press and event-organiser guides hosted on the platform's own domains where the vendor publishes little. Anything not confirmed by a consulted source is marked **UNVERIFIED** rather than inferred. Quotes are verbatim from the cited source.

---

## 1. Brella

**Fields/questions asked**

- **Interests, chosen from an organiser-defined taxonomy.** The organiser creates "categories" and "interests" (free naming, any language, no platform limit). Attendees tap the interests that apply.
- **A goal per interest, from 5 fixed platform intents.** The intents cannot be added, renamed or deleted. For each interest, the attendee picks a goal under the intents the organiser enabled for that interest:

| Intent | Goals attendees choose |
|---|---|
| Networking | "Network about this" |
| Trading | "Explore getting or buying", "Offer or sell this" |
| Investment | "Get investment in this", "Invest in this" |
| Recruitment | "Get a job in this", "Offer a job in this" |
| Mentoring | "Find a mentor", "Be a mentor" |

- **Free-text profile "Introduction"** and profile basics; one delegate guide also lists adding "any regions you may operate in."
- **A networking on/off toggle** and meeting-availability settings (an event guide lists "re-do your interests or networking availability" under profile editing).

**Format:** fixed checkbox taxonomy (organiser-authored) + a fixed two-sided goal choice per interest; small free-text fields on the profile. No attendee free-text "what I'm looking for" field in the sources consulted.

**When filled:** in-app, at first join/onboarding, before networking ("Start networking" flow: select interests and goals, complete profile). Organisers can force the step via "Networking-Oriented onboarding" and by disabling opt-out. Editable later via "Edit my interests."

**How the answers drive matching (per Brella):** "Matchmaking suggests people to meet based on the interests attendees select and the goal they set for each interest." Brella publishes its scoring logic: most of the score comes from interests both people selected, and **complementary goals count most** (e.g. a buyer and a seller). Notably, Brella **penalises over-selection**: "Brella lowers the match score of attendees who select more than 20% of the event's interests. At more than 80%, they rank near the bottom of every list" — and an attendee with no interests selected also ranks near the bottom. Matches appear as a "Your matches" list in People.

**Sources:**
- https://help-organizers.brella.io/en/articles/177659-how-matchmaking-works
- https://help-organizers.brella.io/en/articles/177853-checklist-for-matchmaking-categories-and-interests
- https://aqmen365.com/uploads/TCFD---Delegate-Manual-e62fdc08e92b6ea758cc250997c843bc.pdf (Brella delegate guide hosted by an organiser)

---

## 2. Grip

**Fields/questions asked**

- **Organiser-authored preference questions**, asked "through registration forms or onboarding questions" — e.g. "which types of products or services they're looking to find at the event." Grip's support documentation names three question types its system uses:
  1. **Supply and demand** (e.g. what products do I supply vs. what products am I interested in)
  2. **Self-matching facts** (e.g. topic of interest)
  3. **Facts about individual or business** (e.g. job role, industry or company size)
  Organiser-defined **Custom Profile Fields** feed the same system.
- **Free-text headline/summary and a one-liner**: the app listing describes "Add a one-liner to let people know what you are looking for," and Grip states its AI reads free text "such as headlines and summaries."
- **Interest communities**: attendees join topic communities (e.g. "Copenhagen Startups, Seed Investment, and UI/UX") and are shown people from those communities.

**Format:** mixed — organiser-defined structured questions + free text + **imported profile** ("Login with LinkedIn or Facebook to simply import your profile to Grip").

**When filled:** registration form or in-app onboarding, depending on the organiser; the profile/one-liner/communities are set in the app.

**How the answers drive matching (per Grip):** Grip distinguishes **explicit preferences** (what a participant "has *told* our AI about," via the questions above) from **implicit preferences** the AI must learn from "user actions." Its AI uses: text (descriptions), user searches, interactions (swipes — "Interested" / "Later"; mutual interest = a "handshake"), similar users, and exploration. "The best questions are those which reveal the reasons why your attendees want to meet others."

**Sources:**
- https://support.grip.events/artificial-intelligence-and-machine-learning-delivered-by-grip
- https://play.google.com/store/apps/details?id=com.networkr (official app listing)

---

## 3. Swapcard

**Fields/questions asked**

- **Standard profile fields**: photo, name, job title, company, and a free-text biography ("About me" — "Enter in a paragraph or two about who you are, what you do, and why you're attending this event"). An attendee guide also describes adding "a selection of 'skills'" to the profile.
- **Organiser-defined custom fields** on people profiles: "additional fields that allow you to enhance … people profiles with tailored fields for preferences, interests, or any other important information" (choice or text fields; can be shown or hidden; hidden fields can be used "to ask specific questions to your attendees").
- The product page summarises the intended profile content as "**goals**, focus areas, and interests beyond job titles" — but Swapcard publishes **no standard intake questionnaire**; its marketing explicitly contrasts itself with form-based intake (below).

**Format:** profile fields (largely inherited from registration data) + optional organiser custom fields. No platform-standard interest taxonomy or per-topic intent in the sources consulted.

**When filled:** profile data typically arrives with registration; attendees complete/edit profiles in the app before and during the event ("Encourage attendees to complete profiles at least two weeks before the event").

**How the answers drive matching (per Swapcard):** "What data is used for AI matchmaking? Swapcard uses visible profile fields, attendee interests, job roles, and in-app behavior (like booth visits or session views) to suggest matches." The headline claim is behavioural, not form-based: "Swapcard matches participants by activities, interests, and job roles **with no keyword surveys or tedious forms required**," and recommendations "refine in real-time as attendees engage and AI learns from their actions." Its recommendation engine (Cortex) treats every person/session/exhibitor as a node in a knowledge graph mapped by "interests, keywords, or industries."

**Sources:**
- https://help.swapcard.com/en/articles/8158988-how-to-create-and-manage-custom-fields-for-attendees
- https://www.swapcard.com/features/event-networking
- https://www.swapcard.com/platform/artificial-intelligence

---

## 4. Bizzabo

**Fields/questions asked**

- **Interests selected from organiser-defined categories**: "Attendees choose the topics and goals that matter to them, and Bizzabo suggests people with shared interests to meet"; "Organizers decide which interest categories to offer, so matches reflect the event's audience."
- **Registration data as intake**: because networking sits inside Bizzabo's event OS, the match inputs include the attendee's "unified data profile" — registration data, past events registered for, sessions attended, content interacted with — "combined with user-generated data (profile, interests)."
- **Enrichment**: "the attendee's basic profile is enriched with more information about their industry, location, and more."

**Format:** checkbox interest selection (organiser categories) layered on top of registration/imported and behavioural data. The exact attendee-facing field list (e.g. whether there is a free-text bio or a "looking for" field) is **UNVERIFIED** — Bizzabo's public pages describe inputs at the data-category level, not the form level.

**When filled:** interests chosen in the event app; the rest is inherited from registration and accumulates from behaviour before/during the event.

**How the answers drive matching (per Bizzabo):** "AI that draws on the full attendee journey — from registration data to content engagement and expressed interests" powers matchmaking; attendees "get suggested connections based on the interests they select" and can filter the directory by interest. A separate sponsor-facing product (ICP Matchmaking) matches sponsors to attendees fitting an ideal-customer-profile — organiser/sponsor criteria rather than attendee intake.

**Sources:**
- https://www.bizzabo.com/event-management-software/event-networking-platform
- https://www.bizbash.com/corporate-events/new-solution-aims-to-end-awkward-event-networking (launch coverage quoting Bizzabo's CMO on the engine's inputs)

---

## 5. Whova

**Fields/questions asked** (from Whova's official attendee guides)

- **Profile fields**: interests, biography, location, affiliation (company name and job title), educational history; "If you are looking for a job, upload your resume"; social media account links. At first sign-in the app asks: "Would you like to network with other attendees by listing yourself in the attendee list?"
- Profiles are seeded from registration information and edited in the app ("Edit your profile … Other attendees will use this to network with you").

**Format:** free-ish profile fields (interests entered on the profile; no organiser interest taxonomy or per-topic intent is documented in Whova's own guides). Third-party comparisons claim a "SmartMatch" feature where users specify what they're looking for (mentors, clients, job opportunities); **that goal-specification step is UNVERIFIED from Whova's own published guides** consulted here.

**When filled:** in-app profile completion, before/during/after the event; editable at any time.

**How the answers drive matching (per Whova):** the Attendees "Recommended" tab "automatically gathers attendees with similar interests based on the information you filled into your own personal profile," grouped by shared attributes: "attendees who come from the same city or have the same affiliations, educational background, or interests as you." Matching is similarity-based (same-to-same); no seek/offer directionality is documented.

**Sources:**
- https://whova.com/pages/attendee-networking-guide/
- https://whova.com/pages/attendee-guide/
- https://whova.com/resources/how-to-guide/user-tutorial/

---

## 6. b2match

**Fields/questions asked** — the deepest structured intake in this audit, completed **at registration** and gated:

- **Organisation + personal profile** (free text): "who you are, what you can offer, and who you would like to meet"; a pitch and biography. One event's rules: "A meaningful organisation profile in English must be provided."
- **Areas of Activity**: organiser-defined tags; one event instructs "Select a maximum of 4 different 'Areas of Activity' for which you are looking for cooperation partners or would like to offer your expertise."
- **Marketplace opportunities (mandatory)**: typed, structured free-text entries — types include **Partnership**, **Project Cooperation**, **Expertise**, and **Request**. Each entry has a title (one event caps it at 160 characters), a description of "the project/technology/expertise you are offering or looking for," your role, "the type of partner you are looking for," and a field **"Type of cooperation sought": partner or coordinator**.
- **Meeting-session attendance**: participants must select at least one bilateral meeting session; other attendees can "Filter by Matchmaking to see profiles that have the same attendance availability as you do."
- **Quality gate**: "The profile will only be activated if it contains a complete and high-quality description"; organisers validate each profile, and at least one marketplace opportunity is "a precondition for acceptance of your registration."

**Format:** free-text-heavy but structured — typed offer/need postings + tag taxonomy + availability selection. Login can be via LinkedIn or Google; profiles can transfer between events on the platform.

**When filled:** at registration, before the event; the profile stays visible on the event website "for a considerable period even after the event."

**How the answers drive matching (per b2match event pages):** attendees browse/filter Participants and Marketplace and "check 'My Matches' for suggestions generated from your profile" / "AI Profile recommendations." "Every detail of your profile, from your personal description to your highlighted areas of activity and marketplace opportunities, directly affects the connections you make." The primary mechanism remains human browsing of the published offer/need postings; the recommendation layer sits on top of the same profile data.

**Sources:**
- https://www.b2match.com/e/from-baltic-region-to-european/components/54024/HBE8bM6I45s7 (official b2match event page)
- https://gogsfe.get-invest-matchmaking.eu (b2match event site, GET.invest)
- https://www.ceeautomotive.eu/components/68553/how-it-works (b2match event site)

---

## 7. vFairs

**Fields/questions asked**

- **Organiser-defined form fields**, filled "within the registration form, or fill in their user profile within the event": "Upon registration, you'll be asked to fill in form fields outlining your interests, expertise, or any other information the host has determined in their matchmaking setup form."
- Example criteria fields named by vFairs: "interests, budget, product type, location, or other priorities." Matching is based on "skills, interests or areas of expertise."
- **Attendee-to-attendee and attendee-to-exhibitor field sets can differ** ("attendee to exhibitor form fields can be different").
- Profile basics (name, job title, interests) are used; the AI suite describes reading "attendee profiles, industries, declared goals, and intent signals."

**Format:** fully organiser-configured form fields (structured), with **organiser-assigned percentage weights per field**: "Assign percentage weight to each preference based on importance"; "Organizers can set up a criteria and assign weightage to all the fields of interest."

**When filled:** at registration, or in the in-event profile.

**How the answers drive matching (per vFairs):** the organiser's weighted rules produce suggested matches ("Recommended/Matched Profiles"); "AI Matchmaking surfaces who they should meet once they register." Matches are also pushed out by email ("AI Top Matches Emails"): attendees mark each match **Must Meet / Nice to Meet / Skip**, and "their Must Meet choices go straight to the AI Meeting Scheduler, which books meetings around them based on everyone's availability" — i.e. availability enters at the scheduling stage, not at intake.

**Sources:**
- https://www.vfairs.com/features/ai-event-matchmaking/
- https://www.vfairs.com/?p=15669 (vFairs product update, "Enhance Virtual Networking with Auto-match")
- https://www.vfairs.com/product-updates/vfairs-ai-suite-for-event-planners/

---

## 8. Braindate (by e180) — a materially different intake model

Included because there is **no interest-checkbox form at all**: the intake unit is a free-text posting written by the attendee.

**Fields/questions asked**

- **A profile**: what you hope to learn at the event, knowledge you are willing to share, hobbies, and tags (per trade-press description of the platform; event guides describe profile creation at login).
- **Topics posted to a "Topic Market"**: each attendee authors free-text conversation topics — something they can teach or want to learn — choosing a **1:1 or group** format. Prompts for topic-writing include: "What kind of useful information, insights and advice can you share? … What do people come to you for advice about?"
- **Availability**: when inviting someone on a 1:1 braindate you view/propose time slots; meetings happen in a staffed Braindate Lounge (or by video).

**Format:** free-text postings + tags; browse/search/filter the Topic Market; human "Learning Concierges" support the process.

**When filled:** after login, before/during the event; topics can be added at any time.

**How it drives matching:** primarily self-selection — "They posted the topic because they do [want to talk]. No cold approach, no connection request, no guessing whether they want to talk" (IBC's official event page). The platform also gives users "a list of other attendees that fit their profile" (BizBash). The topic itself is simultaneously the intake data, the match unit, and the conversation agenda.

**Sources:**
- https://events.educause.edu/annual-conference/experiences/braindate
- https://show.ibc.org/ibc-exchange
- https://www.bizbash.com/event-tools/4-tech-tools-to-facilitate-networking-at-conferences-and-events

---

## Comparison table

Field types: ✓ present · ✗ absent in sources consulted · ? UNVERIFIED / not stated in sources consulted · \* present with the caveat in the platform's section above.

| Field type | Brella | Grip | Swapcard | Bizzabo | Whova | b2match | vFairs | Braindate |
|---|---|---|---|---|---|---|---|---|
| Organiser-defined interest/topic taxonomy (checkbox) | ✓ | ✓* | ✓* (custom fields) | ✓ | ? | ✓ (Areas of Activity) | ✓ (any form field) | ✗ (tags only) |
| Per-topic seek/offer direction (intent) | ✓ (5 fixed intents, paired goals) | ✓ (supply/demand questions) | ✗ | ✓* ("topics and goals") | ✗ | ✓ (typed entries + cooperation type) | ✓* (intent fields, organiser-set) | ✓ (learn vs. share per topic) |
| Free-text bio / introduction | ✓ | ✓ (headline, summary) | ✓ | ? | ✓ | ✓ (mandatory) | ✓ | ✓ |
| Free-text offer/need postings (marketplace/topics) | ✗ | ✓* (one-liner "looking for") | ✗ | ✗ | ✗ | ✓ (mandatory ≥1) | ✗ | ✓ (Topics are the core unit) |
| Job title / company / industry | ? | ✓ | ✓ | ✓ | ✓ (affiliation) | ✓ (organisation profile) | ✓ | ? |
| Skills / expertise tags | ✗ | ? | ✓ ("skills" on profile) | ? | ? | ✓ (Expertise entries) | ✓ | ✓* (knowledge to share) |
| Location | ✓ (regions) | ? | ✓ | ✓ (enrichment) | ✓ (city) | ✓ (country) | ✓ | ✗ |
| Education / affiliation matching | ✗ | ✗ | ✗ | ✗ | ✓ (same school) | ✗ | ✗ | ✗ |
| Imported data (LinkedIn / registration sync) | ? | ✓ (LinkedIn, Facebook) | ✓ (registration) | ✓ (registration + past events) | ✓* (registration-seeded) | ✓ (LinkedIn/Google login) | ✓ (registration form) | ✗ |
| Behavioural signals used in matching (activity, searches, swipes) | ✗ | ✓ | ✓ (core pitch) | ✓ (engagement, attendance) | ? | ✗ | ✓* ("intent signals") | ✗ |
| Availability asked at intake | ✓* (meeting availability settings) | ✗ | ? | ? | ✗ | ✓ (meeting-session selection) | ✗ (scheduling stage only) | ✓ (time slots on invite) |
| Quality/anti-gaming gate on intake | ✓ (score penalty for selecting >20% of interests) | ✗ | ✗ | ✗ | ✗ | ✓ (profile + ≥1 posting required; organiser validation) | ✗ | ✗ |

---

## Common pattern — what everyone does, and what nobody does

**The shared pattern across the seven incumbents:**

1. **Intake is thin and organiser-authored.** The near-universal core is a short set of organiser-defined checkboxes — interest/topic categories (Brella, Bizzabo, b2match's Areas of Activity, vFairs' form fields, Grip's registration/onboarding questions, Swapcard's custom fields). Platforms supply the machinery; the organiser supplies the vocabulary. Brella's own guidance to organisers is to keep interests few and specific because attendees select from them in seconds.
2. **Filled once, early, and inherited where possible.** Answers are collected at registration or first app open, and platforms minimise new typing by inheriting registration data (Swapcard, Bizzabo, vFairs, Whova) or importing LinkedIn (Grip, b2match). Swapcard markets the extreme version: "no keyword surveys or tedious forms required."
3. **Depth is outsourced to behaviour or to postings, never to more form fields.** Swapcard and Grip learn from in-app activity (views, searches, swipes); b2match and Braindate get depth from free-text postings the attendee authors (marketplace entries, topics). Nobody's answer to weak matches is a longer questionnaire.
4. **Directionality (seek vs. offer) exists only where a marketplace logic exists.** Brella's five fixed intents with paired goals, b2match's typed entries with "type of cooperation sought," Grip's supply/demand question type, and Braindate's learn/share topics are the exceptions. The similarity platforms (Whova, Swapcard) match same-to-same: shared interest, same city, same school, same employer.
5. **Availability is a scheduling problem, not an intake question.** vFairs collects it only when the AI scheduler books; Brella and b2match are partial exceptions (meeting-availability settings; meeting-session selection). No platform asks "are you open to being approached right now."
6. **Job/company data is universal but shallow.** Every platform carries title/company/industry from registration; it is used for filtering and (Grip, Swapcard) as a matching fact, never as the primary signal.

**What no intake in this audit asks about:** anything concerning the conversation itself — preferred conversation length or format, whether the person is shy or confident about approaching strangers, whether they want to be approached at all in the moment, or what would make a first conversation easy to start or easy to leave. Intake across the entire category answers *who* and *about what*; the *how* of the first conversation is left entirely to the attendee. Quality control on intake itself is also rare: only Brella (over-selection score penalty) and b2match (mandatory complete profile + posting, human-validated) police answer quality at all.

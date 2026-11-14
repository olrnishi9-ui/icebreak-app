# Match Quality Evidence Brief — what actually improves people-matching at events, and what the intake form should ask

Researched 2026-11-14. Every claim carries a source and a reliability label:
**[peer-reviewed]** journal/conference paper · **[industry research]** deployed-system paper with real usage data · **[platform documentation]** the vendor's own help/product pages describing actual product behaviour · **[vendor claim]** marketing numbers, no independent verification · **[practitioner]** blogs/consultants, experience-based.

Bottom line up front: the strongest evidence says match quality is driven less by *how much* the form asks and more by (a) whether the system reduces search and social friction at all, (b) whether matching uses **intent and complementarity** (what each side seeks/offers) rather than symmetric interest overlap alone, (c) whether the system **learns from behaviour and outcomes** instead of trusting the form forever, and (d) whether the form is short enough, and timed late enough, that the data in it is real. Several popular beliefs — including "more profile data = better matches" and "people know who they want to meet" — are contradicted or unsupported by the evidence found.

---

## Findings

### 1. Complementarity vs similarity (seek/offer)

**1.1 Professional relevance is structurally complementary, not symmetric — similarity-based ranking demonstrably misranks professionals.**
LinkedIn's PAIR paper (people recommendation for Premium, deployed, with online A/B tests) states the problem directly: in professional networks "relevance is inherently complementary rather than symmetric" — a job seeker engages with recruiters, not with people whose profiles resemble their own. Their production similarity embedding scored MAR@100 of 0.288 on the retrieval task; an intent-preference retrieval model (0.6B params, MAR@100 0.45) replaced it and improved click-through and Premium retention in online A/B tests. Caveat: LinkedIn people-search, not conferences — but it is the clearest deployed evidence that *who someone wants to meet does not look like them*.
— arXiv: PAIR: Preference-Aligned Intent Retrieval for Premium People Recommendation at LinkedIn. **[industry research — preprint + deployed A/B, not journal peer-reviewed]**

**1.2 In live dyadic interaction, goal-complementarity predicted satisfaction; similarity did not add the same effect.**
Dryer & Horowitz (1997, *Journal of Personality and Social Psychology*): participants whose interaction goals were complemented by their partner's behaviour were more satisfied with the interaction than those whose goals were not; complementary style pairings (dominant/submissive) also beat similar pairings on satisfaction. Lab evidence, romantic/interpersonal domain — supports the mechanism (a meeting works when each side's goal is met by what the other does), not a conference result.
— Dryer & Horowitz 1997, JPSP 72(3), 592–603. **[peer-reviewed, lab]**

**1.3 The incumbent designed around seek/offer earliest (Brella) describes matches exactly as complementarity:** the attendee list shows "people who are offering what you are looking for, or seeking what you are offering." Brella's onboarding asks what you can *offer* and what you are *looking for*, alongside goals/interests. Eventtia (another B2B matchmaking platform) describes the same "I'm offering / I'm looking for" modes as what lets people "articulate their networking goals." This is design convergence across B2B platforms, not outcome evidence.
— Nordic Business Forum's Brella attendee guide (2017); Eventbrite industry roundup quoting Eventtia (2018). **[platform documentation / practitioner]**

**1.4 What similarity actually predicts is *perceived* similarity in the moment, not measured overlap on a form.**
Speed-dating research: perceived similarity predicted romantic liking; actual measured similarity did not (Tidwell, Eastwick & Finkel 2013). Meta-analytic work (Montoya, Horton & Kirchner 2008) likewise finds perceived similarity is the robust predictor of attraction. Implication for forms: checkbox overlap is at best a proxy for the thing that matters — whether, in the first minute, each person *feels* "this person is like me / gets it." A shared specific fact surfaced at the meeting can manufacture that perception; a high overlap score on generic interests may not.
— Tidwell, Eastwick & Finkel 2013; Montoya et al. 2008. **[peer-reviewed]**

**1.5 No head-to-head test exists.** No study found — in any venue — randomly assigns conference attendees to seek/offer matching vs shared-interest matching and compares meeting satisfaction. The seek/offer advantage is supported by mechanism evidence (1.1, 1.2) and platform convergence (1.3), **not** by a direct conference experiment. Anyone claiming a measured percentage advantage for complementarity at events is extrapolating. (See "Could not verify.")

### 2. Goal/intent-based vs interest-based matching

**2.1 Pre-formed, specific intentions predict who people actually talk to at networking events.**
Yang, Lee, Labianca & Borgatti studied 245 invited officials at a designed networking event: people were substantially more likely to have a real interaction with someone when they had formed a *specific intention beforehand to introduce themselves to that person*; shared third parties also helped. Intentions formed after initial interaction predicted follow-up. This is the academic backbone for intent capture: a stated, specific intention is behaviourally meaningful — unlike a generic interest tag.
— Yang et al., "Initiating and Following Up on Encounters at Networking Events: A Theory of Planned Behavior Perspective" (Sunbelt/academic paper). **[peer-reviewed lineage — journal version not verified in this pass]**

**2.2 The only conference RCT on recommendations shows the *delivery design* matters as much as the match content.**
Bapna & Funk (2021, *MIS Quarterly*), randomized field experiment at an IT conference: women (the underrepresented group) met 42% fewer new contacts than men at baseline. A "search" intervention — emailed recommendation lists, deliberately **nonreciprocal** (your list ≠ their list) — increased women's new contacts by 57%, talk time by 90%, LinkedIn connections by 29%, and job-change odds ×1.6. A reciprocal "introductions" intervention increased talk time 66%. **Neither intervention changed men's outcomes.** Two lessons: (a) recommendations work by cutting search/social friction, not by perfect compatibility scoring; (b) effects are concentrated in the group facing the friction — the same feature can be decisive for shy/minority attendees and invisible to confident networkers.
— Bapna & Funk 2021, MIS Quarterly 45(2), 593–636. **[peer-reviewed RCT — the strongest single source in this brief]**

**2.3 Every major incumbent now markets "intent," but operationally it is usually one goal question bolted onto an interest taxonomy.**
Bizzabo (from its own networking page): "Attendees choose the topics and goals that matter to them, and Bizzabo suggests people with shared interests" — organizers define the interest categories. Brella: goals + offer/looking-for + interests. Grip: registration/onboarding answers plus behaviour. Whova SmartMatch: profile fields (title, company, skills) plus what users say they're looking for (e.g. mentors, clients). None publishes how the goal field is weighted against interest overlap.
— Bizzabo event networking page; Bizzabo CMO interview, BizBash 2025; vendor pages for Grip/Whova. **[platform documentation / vendor claim]**

**2.4 Stated preferences are weak predictors of live choices — the form's ceiling.**
Eastwick & Finkel (2008, *JPSP*): preferences stated before a speed-dating event "failed to predict what inspired their actual desire at the event"; an earlier dataset put stated-preference/actual-choice correlations at .00–.17. Their 2014 *Psychological Bulletin* meta-analysis: ideal-preference matching has weak-to-no effect on romantic interest once people interact face-to-face. Domain is dating, but the mechanism — people have poor introspective access to what will make an interaction go well, and abstract self-descriptions encode cultural scripts — applies to "who do you want to meet?" forms directly. **Design consequence: the form should be treated as a weak prior, to be corrected by behaviour and outcomes (see §6), not as ground truth.**
— Eastwick & Finkel 2008, JPSP 94(2), 245–264; Eastwick et al. 2014, Psychological Bulletin 140(3), 623–665. **[peer-reviewed]**

### 3. Specificity: taxonomies vs free text, and what structuring changes

**3.1 Taxonomies give clean, matchable data at the cost of force-fitting; the failure mode is generic overlap.**
Organizer-defined categories (Bizzabo, Brella, Whova) make overlap computable but push everyone into the same broad buckets ("AI," "marketing," "startups"), where a "match" carries little information and gives the pair nothing specific to talk about. No study found quantifying taxonomy granularity vs meeting quality at events — this is a reasoned inference from 1.4/2.4 plus platform design observation, labelled as such.

**3.2 The deployed fix in industry is to embed free text and re-rank with rules — similarity for candidates, complementarity for ranking.**
Current practitioner descriptions of production matchmaking (e.g. Eventify/Teksmobile's architecture write-up): profile text (interests, role, goals) is embedded into vectors; nearest vectors become candidates — embeddings catch semantic equivalence a keyword taxonomy misses ("procurement lead for hospital group" ≈ "healthcare supply chain"); then a **rules layer re-ranks for complementary intent (buyers↔sellers, hirers↔candidates), role fit, availability, and exclusions**. Swapcard publicly describes a similar stack (knowledge graph + vector representations over profile and behaviour data; its engine historically a TF-IDF variant + random walk). Grip says it uses NLP over profile/social data to infer intent.
— Teksmobile/Eventify AI matchmaking page (2026); Gevme's comparison of Swapcard's stack (2026, third-party); Grip product pages. **[practitioner / vendor-described architecture — no outcome evaluation published]**

**3.3 Academic systems skipped the form almost entirely and inferred interests from behaviour/content.**
Confer (deployed at 17 academic conferences, 18,000+ attendees): attendees star papers they want to see; people- and paper-recommendations come from collaborative filtering over that behaviour with TF-IDF content fallback — i.e., structured interest data *derived from what people did*, not from a self-description form. Log analysis and surveys indicated attendees found relevant people/papers; no controlled meeting-quality evaluation.
— Bhardwaj et al., "Confer: A Conference Recommendation and Meetup Tool," CSCW '16 Companion. **[peer-reviewed systems paper + deployment logs]**

**3.4 What structuring free text with an LLM changes — claimed, not measured.**
LLM/NLP structuring plausibly fixes free text's two problems (unmatchable formats, vocabulary mismatch) while keeping its specificity (a real sentence about what you need beats a checkbox). But: **no study found measures meeting outcomes for LLM-structured free-text intake vs taxonomy intake at events.** The claim "AI-enriched profiles lift meeting acceptance 55%" (Swapcard) is a vendor number with no published method. Treat LLM structuring as an engineering bet with a good mechanism story, not an evidence-backed quality gain. (See "Could not verify.")

### 4. Negative / constraint signals

**4.1 They exist in production — as in-product feedback, not as form questions.**
- **Grip:** every recommendation can be swiped "Interested" or "Skip"; Grip states these choices train its ML in real time, and users can indicate they're "not interested" in connections, changing later recommendations.
- **b2match:** any recommended profile can be marked "**Not interested in this profile**" (3-dot menu); b2match's own help docs explicitly advise doing so "because AI Recommender learns from your activities and will recommend you more suitable profiles in the future."
- **Swapcard:** recommendations refine from behaviour (views, bookmarks, requests) — implicit negative signal via non-engagement; no explicit "do not match" control found.
— Grip product/blog pages; b2match support documentation ("AI Meeting Recommendations"). **[platform documentation]**

**4.2 Nobody asks negative questions on the intake form.** No incumbent found asks "who do you NOT want to meet / what should we avoid?" at registration or onboarding. The only constraint-type fields in production are structural: attendee-category booking rules set by organizers (b2match buyer/seller rules), visibility controls (hide profile from a segment/company — e.g. Eventify's "hide from exhibitors or specific companies"), and Bizzabo's sponsor-side ICP filters. A first-person "do not match me with…" preference field appears to be **unoccupied design space** — with an obvious caveat: its value is unproven, and dating-app research on hard filters suggests users' stated exclusions share the same weak predictive validity as their stated preferences (§2.4).
— Platform documentation as above. **[platform documentation; the "unoccupied" claim is absence-of-evidence from this search, stated as such]**

**4.3 Why negative signals plausibly matter more than positive ones here:** a skip/not-interested is a *revealed* preference about a concrete person, not an abstract self-description — it escapes the §2.4 problem. Grip's and b2match's decision to feed skips into the model is the industry acknowledging this. No published measurement isolates the effect. **[inference, labelled]**

### 5. Timing and completion: form length, registration vs just-in-time, progressive profiling

**5.1 In events, the binding constraint is that most people never complete the form at all.**
Practitioner aggregation of platform data: 30–40% of attendees never open the event app; profile completion "stalls at 15–20%"; the same ~5% of attendees do most of the connecting. A match engine fed by 15–20% of the room is matching a self-selected minority. Any design that requires a complete profile before producing value fails the median attendee by construction.
— C. Donaldson, "Networking app adoption is broken" (practitioner blog citing Bizzabo/Swapcard platform figures). **[practitioner, citing vendor platform data — treat numbers as indicative, not audited]**

**5.2 Form length → completion is one of the most replicated findings in applied web research (marketing domain).**
Across large landing-page datasets, conversion falls monotonically with field count (one analysis of 404 pages: 18.2% at 1 field → 4.2% at 9+ fields); the widely-cited Imagescape case cut 11 fields to 4 for a ~120% conversion gain; Baymard's checkout research: 26% abandon over-long/complex flows, and field *count* matters more than step count. Caveat: these are purchase/lead forms, where motivation is lower than a paid conference — direction is reliable, magnitudes won't transfer exactly.
— NP Digital landing-page analysis (2024); HubSpot/Imagescape case; Baymard Institute checkout studies. **[practitioner/industry research, marketing domain]**

**5.3 Progressive profiling: consistent positive claims, vendor-grade evidence.**
Eloqua documented +20–40% completion vs static forms; a Marketo implementation case reported +35% submissions and +50% "lead quality." No peer-reviewed or method-published evaluation found. The event platforms implement the same idea behaviourally rather than by asking later: Grip collects answers "at registration and/or onboarding" and then keeps learning from in-app behaviour; Swapcard explicitly markets "no keyword surveys or tedious forms required," backfilling the profile from behaviour and public data. **The industry's revealed answer to the timing problem is: ask almost nothing up front; infer and refine continuously.**
— Eloqua/Marketo via marketing literature; Grip and Swapcard product pages. **[vendor claim / platform documentation]**

**5.4 Registration-time data is stale and carelessly given; just-in-time data is fresher but scarcer.**
Registration happens weeks before the event, in a transactional mindset (buying a ticket), when goals are abstract — Brella's own model has attendees joining up to 3 weeks pre-event and booking most meetings before the start (vendor-reported 92% of meetings booked pre-event, 2018). Practitioner criticism of static profiles: goals set at registration pivot by event day, and "the algorithm keeps matching you to the old you." No controlled study found comparing registration-time vs day-of intake on match quality — the honest statement is that incumbents hedge by doing both (short form early + behavioural correction during the event).
— Eventbrite roundup (Brella, 2018); mybzz platform guide (2026). **[vendor claim / practitioner]**

### 6. Feedback loops: learning from meeting outcomes

**6.1 Behavioural feedback loops are standard in incumbents; outcome feedback loops are claimed but thin.**
- **Grip:** Interested/Skip trains recommendations in real time; Grip also states meetings "are then rated by attendees," and that this rating data improves future recommendations "for participants, and others like them" (collaborative learning across users). Mechanism and effect size unpublished.
- **b2match:** post-meeting star ratings + comments exist as a feature; its recommender documentation lists behaviour signals (profile visits, bookmarks, meeting requests, not-interested marks) — whether *ratings* feed the recommender is not stated in its docs.
- **Swapcard:** recommendations "get sharper" from connections, views, bookmarks — behaviour, not meeting-quality ratings.
- **Confer (academic):** collaborative filtering over starring behaviour — the loop is behavioural, and it demonstrably powered recommendations across 17 conferences.
— Grip product page; b2match product overview + support docs; Swapcard AI pages; Confer paper. **[platform documentation]**

**6.2 No platform publishes evidence that its loop improves match quality.** All quality deltas ("+55% acceptance," "90% more suitable matches," "16 algorithms / 70M data points") are unaudited vendor numbers; Swapcard's own pages cite different lead multipliers (2.5× vs 5×) in different places, per a third-party comparison that itself warns every vendor's figures are self-reported. The loop's *existence* is documented; its *effect* is not.
— Gevme comparison of Swapcard stack (2026); vendor pages. **[vendor claim, flagged inconsistent]**

**6.3 The research-side warning: without an outcome loop, you are optimizing for clicks, not conversations.**
The metrics platforms demonstrably optimize — requests sent, acceptance rate, meetings booked — are approach metrics. The only outcome-grade evidence in this brief (Bapna & Funk: talk time, LinkedIn adds, job changes; Boudreau: grant co-applications) comes from researchers measuring downstream outcomes themselves. A system that never asks "was that conversation worth it?" cannot distinguish a good match from a merely acceptable one — and per §2.4, pre-meeting signals alone are weak. **[synthesis of peer-reviewed sources]**

### 7. Other academic/industry studies on conference matching quality

**7.1 Search friction is first-order: randomly *forcing* encounters created collaborations.**
Boudreau et al. (2017, *Review of Economics and Statistics*), Harvard Medical School field experiment: randomly assigning researchers to 90-minute structured information-sharing sessions raised a pair's probability of grant co-application by 75% (0.16% → 0.28% baseline), with stronger effects for pairs in the same specialization (less distant). Even co-located experts with full information access under-match without engineered encounters — and note the interaction with §1: the effect was strongest where there was *some* topical proximity, i.e. random ≠ optimal, but structured exposure ≫ self-directed search.
— Boudreau et al. 2017, REStat 99(4), 565–576. **[peer-reviewed field experiment]**

**7.2 Conferences causally create collaborations (natural experiment).**
Campos, de Leon & McQuillin (*Economic Journal*, 2018): the Hurricane-Isaac cancellation of APSA 2012 reduced attendees' likelihood of co-authoring with another attendee by 16%, concentrated in cross-institution pairs. Establishes the value at stake in conference matching generally.
— Campos et al. 2018, Economic Journal 128(610). **[peer-reviewed, quasi-experimental]**

**7.3 Left unstructured, attendees do not do what the form says they want.**
Ingram & Morris (2007, *Administrative Science Quarterly*), electronic-badge study of a ~100-person business mixer: 95% said beforehand they wanted to meet new people, yet pre-existing friends accounted for about half of all encounters; average homophily in encounters was weak, but "associative homophily" appeared (people joined/stayed in groups containing at least one same-race member). Direct evidence that (a) self-directed networking under-delivers on stated goals, and (b) the binding problem is initiation/search, not taste for similarity.
— Ingram & Morris 2007, ASQ 52, 558–585. **[peer-reviewed, sensor data]**

**7.4 Recommendation lists work even when they are not "smart."**
Re-read §2.2 with this lens: Bapna & Funk's lists were simple email interventions, and the winning variant was the one that maximized *reach across the room* (nonreciprocal), not the one maximizing pairwise compatibility. Combined with 7.1/7.3, the evidence base supports a deflating conclusion for form design: **getting a shy attendee one concrete, plausible person + permission to approach beats a marginally better compatibility score.** Form quality matters most insofar as it produces that one plausible person and a true, specific reason to talk.

---

## What incumbent forms are missing

Derived strictly from the findings above. "Incumbent form" = the registration/onboarding intake of Brella, Grip, Swapcard, Bizzabo, Whova, b2match as documented in §1–§6.

1. **No outcome question, ever.** No incumbent form or flow asks, after a meeting, "was that worth it?" *as a matching input with a published role* — Grip mentions meeting ratings feeding recommendations, b2match collects ratings without documenting their use (§6.1). Forms are one-shot: what you typed weeks ago is your permanent representation (§5.4). Missing: a designed label pipeline (rate the conversation → retrain/re-rank), which §6.3 identifies as the only way to optimize for conversations rather than clicks.
2. **No first-person negative/constraint field.** Constraints exist only as organizer rules and visibility toggles; the attendee-level "do not match me with…" (a type of person, a topic, a sales pitch) is absent from every intake found (§4.2). Negative signal is only collectable later, by swiping (§4.1).
3. **Seek/offer is present but shallow where it exists.** Brella asks offer/looking-for; most others reduce intent to one goal picklist inside an organizer taxonomy (§2.3). Missing, relative to §1.1–1.2: *paired* specificity — "I want to learn X" matched against "I can teach X" at the same granularity, rather than both sides picking from one shared interest list, which structurally produces similarity matches wearing intent clothing.
4. **No specificity floor.** Taxonomy checkboxes accept "AI" as an answer (§3.1). Nothing in incumbent intake pushes for the specific, uncommon, story-bearing detail that §1.4 implies actually creates perceived similarity in the first minute (a named project, a concrete problem, an unusual fact). Free-text fields exist (bios, one-liners) but are unstructured and, per §3.2, only some platforms do anything semantic with them.
5. **No freshness mechanism.** The form is filled at registration/onboarding and never re-confirmed (§5.3–5.4); incumbents compensate with behavioural inference, which only works for the minority who use the app heavily (§5.1). Missing: a just-in-time re-ask ("still looking for X today?") — no incumbent documents one.
6. **No help for the people the RCT says need it most.** Bapna & Funk (§2.2) show benefits concentrate on attendees facing search/social friction, and Ingram & Morris (§7.3) show stated goals don't translate into behaviour without structure. Incumbent forms ask everyone the same questions and then hand everyone a browseable list — the design assumes the confident-user behaviour the evidence says is the exception. Missing at the form level: anything that distinguishes "I know exactly who I want" from "I don't know where to start," and routes the second group to recommendations/introductions rather than search.
7. **No explanation grounded in the pair's actual data at the moment of approach** — with one partial exception (Swapcard says every recommendation includes an explanation). A generic "you both like AI" reason wastes the one asset a good form could produce: a true, specific shared fact to open with (§1.4, §7.4).

## Could not verify

- Any head-to-head comparison (any design, any venue) of seek/offer matching vs shared-interest matching on meeting satisfaction at conferences. Does not appear to exist.
- Any independent or audited evaluation of Brella, Grip, Swapcard, Bizzabo, Whova or b2match match *quality* (as opposed to activity counts). All quality figures are vendor-reported; Swapcard's lead multiplier is internally inconsistent across its own pages (2.5× vs 5×).
- That LLM-structured free-text intake improves meeting outcomes vs taxonomy intake. Architectures are described; outcomes are not measured in anything found.
- Progressive-profiling effect sizes (+20–40% completion; +35% submissions / +50% lead quality). Vendor/case-study claims, no published methodology, marketing domain.
- Whether b2match's meeting star-ratings feed its recommender (docs list behavioural signals only), and the mechanism behind Grip's claim that meeting ratings improve recommendations.
- Exact current field list of Brella's onboarding (offer/looking-for confirmed from organizer documentation, 2017; current marketing confirms intent-based matching but the live field list was not fully verifiable in this pass).
- The "15–20% profile completion / 30–40% never open the app" figures: practitioner blog citing platform data; plausible and consistent with the known >50% unanswered-request rate on Swapcard, but not audited.
- A self-published "Scalable Recommendation Engine" paper (freederia.com) claiming Precision@5 0.75 on a *fictitious* conference dataset — excluded as non-credible.
- Journal publication details for Yang, Lee, Labianca & Borgatti (networking-events intentions study): findings verified from the academic paper text; the journal citation was not confirmed in this pass.

## Sources

Peer-reviewed / academic
- Bapna, S. & Funk, R. J. (2021). Interventions for Improving Professional Networking for Women: Experimental Evidence from the IT Sector. *MIS Quarterly* 45(2), 593–636. https://aisel.aisnet.org/misq/vol45/iss2/6/
- Boudreau, K. J. et al. (2017). A Field Experiment on Search Costs and the Formation of Scientific Collaborations. *Review of Economics and Statistics* 99(4), 565–576. https://www.hbs.edu/ris/Publication%20Files/REST_a_00676_3d859d22-11ac-4697-9e66-eeed1fdf4967.pdf
- Campos, R., de Leon, F. L. & McQuillin, B. (2018). Lost in the Storm: The Academic Collaborations That Went Missing in Hurricane Isaac. *Economic Journal* 128(610). https://academic.oup.com/ej/article/128/610/995/5069565
- Ingram, P. & Morris, M. W. (2007). Do People Mix at Mixers? Structure, Homophily, and the "Life of the Party." *Administrative Science Quarterly* 52, 558–585. https://business.columbia.edu/faculty/research/do-people-mix-mixers-structure-homophily-and-life-party
- Eastwick, P. W. & Finkel, E. J. (2008). Sex Differences in Mate Preferences Revisited. *Journal of Personality and Social Psychology* 94(2), 245–264; and Eastwick et al. (2014), *Psychological Bulletin* 140(3), 623–665 (as reviewed in secondary sources above).
- Dryer, D. C. & Horowitz, L. M. (1997). When Do Opposites Attract? Interpersonal Complementarity Versus Similarity. *JPSP* 72(3), 592–603. https://psycnet.apa.org/record/1997-07966-011
- Bhardwaj, A. et al. (2016). Confer: A Conference Recommendation and Meetup Tool. *CSCW '16 Companion*. https://people.csail.mit.edu/axz/papers/demo_confer.pdf
- Yang, S. W., Lee, J., Labianca, G. & Borgatti, S. P. Initiating and Following Up on Encounters at Networking Events: A Theory of Planned Behavior Perspective. http://www.pfeffer.at/sunbelt/talks/496.html

Industry research
- LinkedIn (2026). PAIR: Preference-Aligned Intent Retrieval for Premium People Recommendation at LinkedIn. arXiv. https://arxiv.org/html/2610.30941v1

Platform documentation / vendor
- Grip — AI Event Matchmaking & Networking Software (product page); AI Matchmaking Misconceptions (blog). https://www.grip.events/products/event-matchmaking · https://www.grip.events/blog/ai-matchmaking-misconceptions
- b2match — AI Meeting Recommendations (support docs); product overview (meeting ratings). https://support.b2match.com/ai-meeting-recommendations
- Swapcard — Artificial Intelligence for Events; Event Networking Software pages. https://www.swapcard.com/platform/artificial-intelligence · https://www.swapcard.com/features/event-networking
- Bizzabo — Event Networking Software Platform; CMO interview, BizBash (2025). https://www.bizzabo.com/event-management-software/event-networking-platform · https://www.bizbash.com/corporate-events/new-solution-aims-to-end-awkward-event-networking
- Nordic Business Forum (2017). Get ready to… Network Like a Pro! (Brella attendee guide). https://www.nbforum.com/newsroom/blog/get-ready-network-like-pro/
- Eventbrite (2018). Help Attendees Network Like a Boss (Brella/Eventtia vendor quotes). https://www.eventbrite.co.uk/blog/help-attendees-network-at-your-next-conference-ds00/
- Gevme (2026). Swapcard Alternatives: Comparing AI-Powered Event Networking Platforms (third-party stack comparison; flags vendor numbers as self-reported). https://web.gevme.com/blog/swapcard-alternatives-ai-matchmaking/

Practitioner
- Donaldson, C. Networking app adoption is broken (citing Bizzabo/Swapcard platform figures). https://www.cdonaldson-marketing.co.uk/post/networking-app-adoption-is-broken-how-to-design-connection-journeys-people-actually-follow
- Teksmobile/Eventify. AI Matchmaking for Events & Networking (embeddings + rules-layer architecture). https://mail.teksmobile.com/event-technology/ai-matchmaking/
- Progressive profiling / form-length literature: involve.me guides (citing HubSpot, Baymard, Eloqua); NP Digital landing-page analysis (2024); Crazy Egg form-statistics roundup (citing Zuko, FormAssembly). https://www.involve.me/blog/progressive-profiling-101-collect-more-data-without-friction · https://www.crazyegg.com/blog/form-statistics/

"use client";
import { demoPersonas } from "../../lib/demo-personas";
import { useState } from "react";
import type { Profile } from "../../lib/types";
import { ErrorMessage, Avatar } from "./shared";
const goals = [
  "Find collaborators",
  "Meet investors",
  "Find customers",
  "Learn from experts",
  "Explore opportunities",
];
const sections = [
  "Basic information",
  "Organization",
  "Professional background",
  "Interests",
  "Networking goals",
  "Mutual value",
  "Review",
];
export function ProfileEditor({
  profile,
  save,
  busy,
}: {
  profile: Profile;
  save: (body: Profile) => Promise<void>;
  busy: boolean;
}) {
  const [draft, setDraft] = useState(profile),
    [step, setStep] = useState(0),
    [error, setError] = useState("");
  function field(
    key: keyof Profile,
    label: string,
    max: number,
    multiline = false,
  ) {
    return (
      <label>
        {label}
        {multiline ? (
          <textarea
            maxLength={max}
            value={String(draft[key])}
            onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
          />
        ) : (
          <input
            required={key === "displayName"}
            maxLength={max}
            value={String(draft[key])}
            onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
          />
        )}
      </label>
    );
  }
  function topic(type: string, label: string) {
    return (
      <label>
        {label}
        <textarea
          maxLength={200}
          value={draft.topics.find((t) => t.type === type)?.topic ?? ""}
          onChange={(e) =>
            setDraft({
              ...draft,
              topics: [
                ...draft.topics.filter((t) => t.type !== type),
                ...(e.target.value
                  ? [{ type, topic: e.target.value, visible: true }]
                  : []),
              ],
            })
          }
        />
      </label>
    );
  }
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        if (step < 6) setStep(step + 1);
        else {
          try {
            await save(draft);
          } catch (e) {
            setError((e as Error).message);
          }
        }
      }}
    >
      <p className="eyebrow">
        Your profile · {step + 1} of {sections.length}
      </p>
      <div className="flex gap-1" aria-hidden="true">
        {sections.map((s, i) => (
          <span
            key={s}
            className={`h-1 flex-1 rounded-full ${i <= step ? "bg-[#0B7A55]" : "bg-[#DCEFE7]"}`}
          />
        ))}
      </div>
      <h2 className="mt-6">{sections[step]}</h2>
      {step === 0 && (
        <>
          {draft.event.demo && !draft.profileSaved && (
            <section className="rounded-2xl bg-mint p-4 mb-5">
              <p className="eyebrow">Judges demo · fictional examples</p>
              <p className="quiet">
                Try a persona below or enter your own details. Your email
                account stays yours; these are sample profile fields.
              </p>
              <div className="choices">
                {demoPersonas.map((person) => (
                  <button
                    type="button"
                    className="secondary"
                    key={person.name}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        displayName: person.name,
                        role: person.role,
                        organization: person.organization,
                        industry: person.industry,
                        field: person.expertise,
                        fieldVisible: true,
                        introduction: person.introduction,
                        networkingGoals: [...person.goals],
                        topics: [
                          ...person.interests
                            .filter((tag) => draft.interestTags.includes(tag))
                            .map((topic) => ({
                              type: "interest",
                              topic,
                              visible: true,
                            })),
                          { type: "help", topic: person.offer, visible: true },
                          {
                            type: "learn",
                            topic: person.lookingFor,
                            visible: true,
                          },
                        ],
                      })
                    }
                  >
                    Use {person.name}
                  </button>
                ))}
              </div>
            </section>
          )}

          <Avatar name={draft.displayName || "You"} photo={draft.photo} />
          {field("displayName", "Name", 80)}
          {field("role", "Job title / role · optional", 120)}
          <label>
            Photo · optional
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setError("");
                if (file.size > 130000) {
                  setError("Choose a photo smaller than 130 KB.");
                  return;
                }
                const reader = new FileReader();
                reader.onload = () =>
                  setDraft({ ...draft, photo: String(reader.result) });
                reader.readAsDataURL(file);
              }}
            />
          </label>
          {draft.photo && (
            <button
              type="button"
              className="link-button"
              onClick={() => setDraft({ ...draft, photo: "" })}
            >
              Use initials instead
            </button>
          )}
          <p className="quiet">
            Your initials are your avatar until you add a photo.
          </p>
        </>
      )}
      {step === 1 && (
        <>
          {field(
            "organization",
            "Company, startup, university or institution · optional",
            160,
          )}
          <p className="quiet">Where do you do your work?</p>
        </>
      )}
      {step === 2 && (
        <>
          {field("industry", "Industry · optional", 160)}
          {field("field", "Expertise · optional", 160)}
          {field("introduction", "Short introduction · optional", 500, true)}
          <label className="check">
            <input
              type="checkbox"
              checked={draft.fieldVisible}
              onChange={(e) =>
                setDraft({ ...draft, fieldVisible: e.target.checked })
              }
            />
            Share my expertise in conversation cards
          </label>
        </>
      )}
      {step === 3 && (
        <>
          <p>
            Choose what you’d like to explore at {draft.event.name}. All tags
            are optional.
          </p>
          <div className="choices">
            {draft.interestTags.map((tag) => (
              <button
                type="button"
                key={tag}
                className="option"
                aria-pressed={draft.topics.some(
                  (t) => t.type === "interest" && t.topic === tag,
                )}
                onClick={() =>
                  setDraft({
                    ...draft,
                    topics: draft.topics.some(
                      (t) => t.type === "interest" && t.topic === tag,
                    )
                      ? draft.topics.filter(
                          (t) => !(t.type === "interest" && t.topic === tag),
                        )
                      : [
                          ...draft.topics,
                          { type: "interest", topic: tag, visible: true },
                        ],
                  })
                }
              >
                {tag}
              </button>
            ))}
          </div>
        </>
      )}
      {step === 4 && (
        <>
          <p>What would make this event worthwhile?</p>
          <div className="choices">
            {goals.map((goal) => (
              <button
                type="button"
                key={goal}
                className="option"
                aria-pressed={draft.networkingGoals.includes(goal)}
                onClick={() =>
                  setDraft({
                    ...draft,
                    networkingGoals: draft.networkingGoals.includes(goal)
                      ? draft.networkingGoals.filter((g) => g !== goal)
                      : [...draft.networkingGoals, goal],
                  })
                }
              >
                {goal}
              </button>
            ))}
          </div>
          <label>
            Your event intention
            <select
              value={draft.goal}
              onChange={(e) => setDraft({ ...draft, goal: e.target.value })}
            >
              {draft.questions
                .find((q) => q.kind === "event_goal")
                ?.options.map((g) => (
                  <option key={g}>{g}</option>
                ))}
            </select>
          </label>
        </>
      )}
      {step === 5 && (
        <>
          {topic("help", "I can offer · optional")}
          {topic("learn", "I’m looking for · optional")}
          <p className="quiet">
            Chosen interests and mutual-value topics may appear verbatim in
            conversation cards. Leave anything you’d rather keep private blank.
          </p>
        </>
      )}
      {step === 6 && (
        <>
          <Avatar name={draft.displayName} photo={draft.photo} />
          <h3>{draft.displayName}</h3>
          <p>{[draft.role, draft.organization].filter(Boolean).join(" · ")}</p>
          <dl>
            {[
              ["Industry", draft.industry],
              ["Expertise", draft.field],
              ["Introduction", draft.introduction],
              [
                "Interests",
                draft.topics
                  .filter((t) => t.type === "interest")
                  .map((t) => t.topic)
                  .join(", "),
              ],
              ["Goals", draft.networkingGoals.join(", ")],
              ["Intention", draft.goal],
              [
                "I can offer",
                draft.topics.find((t) => t.type === "help")?.topic,
              ],
              [
                "I’m looking for",
                draft.topics.find((t) => t.type === "learn")?.topic,
              ],
            ].map(([label, value]) => (
              <div key={label} className="my-4">
                <dt className="quiet">{label}</dt>
                <dd className="m-0">{value || "Not added"}</dd>
              </div>
            ))}
          </dl>
          <button
            type="button"
            className="link-button"
            onClick={() => setStep(0)}
          >
            Edit profile details
          </button>
          <p className="quiet">
            Saving creates your personal QR. Show it to the organiser when you
            arrive to appear on the event board.
          </p>
        </>
      )}
      <ErrorMessage message={error} />
      <div className="actions mt-6">
        {step > 0 && (
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={() => setStep(step - 1)}
          >
            Back
          </button>
        )}
        <button disabled={busy}>
          {busy ? "Saving…" : step === 6 ? "Save my profile" : "Continue"}
        </button>
      </div>
    </form>
  );
}

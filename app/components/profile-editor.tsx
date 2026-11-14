"use client";
import { useState } from "react";
import type { Profile, Topic } from "../../lib/types";
const topicFields = [
  ["interest", "Interests"],
  ["discuss", "Topics to discuss"],
  ["help", "I can help with"],
  ["learn", "I’d like to learn"],
  ["ask_me_about", "Ask me about"],
] as const;
export function ProfileEditor({
  profile,
  save,
  busy,
}: {
  profile: Profile;
  save: (body: Profile) => Promise<void>;
  busy: boolean;
}) {
  const [draft, setDraft] = useState(profile);
  const [topicText, setTopicText] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      topicFields.map(([type]) => [
        type,
        profile.topics
          .filter((t) => t.type === type)
          .map((t) => t.topic)
          .join("\n"),
      ]),
    ),
  );
  function topics(type: string, value: string) {
    setTopicText((prev) => ({ ...prev, [type]: value }));
    const parts = value.split("\n").filter((x) => x.trim());
    const existing = draft.topics.filter((t) => t.type === type);
    setDraft({
      ...draft,
      topics: [
        ...draft.topics.filter((t) => t.type !== type),
        ...parts.map((topic, i) => ({
          type,
          topic,
          visible: existing[i]?.visible ?? false,
        })),
      ],
    });
  }
  const flags = (type: string) => draft.topics.filter((t) => t.type === type);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save(draft);
      }}
    >
      <label>
        Display name
        <input
          required
          maxLength={80}
          value={draft.displayName}
          onChange={(e) => setDraft({ ...draft, displayName: e.target.value })}
        />
      </label>
      <label>
        Event goal
        <select
          value={draft.goal}
          onChange={(e) => setDraft({ ...draft, goal: e.target.value })}
        >
          {draft.questions
            .find((q) => q.kind === "event_goal")
            ?.options.map((o) => (
              <option key={o}>{o}</option>
            ))}
        </select>
      </label>
      <p className="quiet">
        Everything below is optional. Sharing permissions are saved for later
        conversation features; these fields stay private on this board.
      </p>
      <label>
        Field or major
        <input
          maxLength={160}
          value={draft.field}
          onChange={(e) => setDraft({ ...draft, field: e.target.value })}
        />
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={draft.fieldVisible}
          onChange={(e) =>
            setDraft({ ...draft, fieldVisible: e.target.checked })
          }
        />
        Allow sharing my field later
      </label>
      <label>
        Fun fact
        <textarea
          aria-label="Fun fact"
          maxLength={500}
          value={draft.funFact}
          onChange={(e) => setDraft({ ...draft, funFact: e.target.value })}
        />
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={draft.funFactVisible}
          onChange={(e) =>
            setDraft({ ...draft, funFactVisible: e.target.checked })
          }
        />
        Allow sharing my fun fact later
      </label>
      {topicFields.map(([type, label]) => (
        <fieldset key={type}>
          <legend>
            {label} · optional{type === "ask_me_about" ? " · up to two" : ""}
          </legend>
          <label className="quiet">
            One topic per line, up to 200 characters each
            <textarea
              aria-label={label}
              value={topicText[type]}
              onChange={(e) => topics(type, e.target.value)}
            />
          </label>
          {flags(type).map((t, i) => (
            <label className="check" key={i}>
              <input
                type="checkbox"
                checked={t.visible}
                onChange={(e) => {
                  const ts: Topic[] = [...draft.topics];
                  const index = ts.indexOf(t);
                  ts[index] = { ...t, visible: e.target.checked };
                  setDraft({ ...draft, topics: ts });
                }}
              />
              Allow sharing “{t.topic}” later
            </label>
          ))}
        </fieldset>
      ))}
      <button disabled={busy}>Save profile</button>
    </form>
  );
}

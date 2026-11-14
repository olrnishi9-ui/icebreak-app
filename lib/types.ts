import type { Answer, Question } from "./open-now";
export type Topic = { type: string; topic: string; visible: boolean };
export type Profile = {
  event: { id: string; name: string; code: string };
  displayName: string;
  goal: string;
  field: string;
  funFact: string;
  fieldVisible: boolean;
  funFactVisible: boolean;
  topics: Topic[];
  answers: Answer[];
  questions: Question[];
  step: string;
  openUntil: string | null;
};
export type EventInvite = {
  event: { id: string; name: string; status: string };
  joinCode: string;
  joinUrl: string;
};

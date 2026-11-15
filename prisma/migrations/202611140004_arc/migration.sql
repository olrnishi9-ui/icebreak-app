BEGIN;
ALTER TABLE sessions ADD COLUMN arc_script jsonb,
 ADD COLUMN arc_position integer NOT NULL DEFAULT 0,
 ADD COLUMN arc_skipped integer[] NOT NULL DEFAULT '{}',
 ADD COLUMN resume_position integer NOT NULL DEFAULT 0,
 ADD COLUMN close_reason text CHECK(close_reason IN('timer','either'));
-- Reason is inaccessible even to the two session participants.
REVOKE SELECT ON sessions FROM authenticated;
GRANT SELECT(id,event_id,request_id,user_a_id,user_b_id,duration,shared_reason,meeting_point,created_at,arrived_a,arrived_b,late_a,late_b,started_at,closed_at,arc_script,arc_position,arc_skipped) ON sessions TO authenticated;
CREATE TABLE session_choices (
 session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 choice text CHECK(choice IN('exchange','again','nothing')), opted_in boolean NOT NULL DEFAULT false,
 done boolean NOT NULL DEFAULT false, PRIMARY KEY(session_id,user_id)
);
CREATE TABLE session_notes (
 session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 text varchar(500) NOT NULL, PRIMARY KEY(session_id,user_id)
);
ALTER TABLE session_choices ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_choices FORCE ROW LEVEL SECURITY;
ALTER TABLE session_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_notes FORCE ROW LEVEL SECURITY;
REVOKE ALL ON session_choices,session_notes FROM PUBLIC,anon,authenticated;
GRANT SELECT ON session_choices,session_notes TO authenticated;
CREATE POLICY own_choice ON session_choices FOR SELECT TO authenticated USING(user_id=app_private.current_user_id());
CREATE POLICY own_note ON session_notes FOR SELECT TO authenticated USING(user_id=app_private.current_user_id());
DROP POLICY feedback_read ON feedback;
-- Partial scales are skippable; absence is not an invented label.
ALTER TABLE feedback ALTER COLUMN conversation_ease DROP NOT NULL, ALTER COLUMN perceived_value DROP NOT NULL, ALTER COLUMN willingness_to_reconnect DROP NOT NULL;
COMMIT;

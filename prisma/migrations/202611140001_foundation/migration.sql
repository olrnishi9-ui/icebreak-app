BEGIN;
-- PostgreSQL foundation. Supabase provides auth.users, auth.uid(), anon and authenticated.
CREATE TYPE "EventStatus" AS ENUM ('draft', 'active', 'ended');
CREATE TYPE "AvailabilityStatus" AS ENUM ('unavailable', 'open', 'busy');
CREATE TYPE "QuestionKind" AS ENUM ('preference', 'event_goal');
CREATE TYPE "InterestType" AS ENUM ('interest', 'discuss', 'help', 'learn', 'ask_me_about');
CREATE TYPE "ContactField" AS ENUM ('email', 'phone', 'linkedin', 'website');
CREATE TYPE "ContactVisibility" AS ENUM ('private', 'mutual_connection');
CREATE TYPE "RequestStatus" AS ENUM ('pending', 'accepted');
CREATE TYPE "RequestDecision" AS ENUM ('accepted', 'declined');
CREATE TABLE "users" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "auth_id" uuid UNIQUE,
  "display_name" varchar(80) NOT NULL,
  "bio" text,
  "is_guest" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz(6) NOT NULL DEFAULT now()
);
CREATE TABLE "events" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "event_code" varchar(16) NOT NULL UNIQUE,
  "name" text NOT NULL,
  "status" "EventStatus" NOT NULL DEFAULT 'draft',
  "organizer_id" uuid NOT NULL,
  "ends_at" timestamptz(6),
  "created_at" timestamptz(6) NOT NULL DEFAULT now()
);
CREATE INDEX "events_idx_0" ON "events" (organizer_id);
CREATE TABLE "event_participants" (
  "event_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "availability_status" "AvailabilityStatus" NOT NULL DEFAULT 'unavailable',
  "available_until" timestamptz(6),
  "joined_at" timestamptz(6) NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);
CREATE INDEX "event_participants_idx_1" ON "event_participants" (user_id);
CREATE TABLE "questions" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "event_id" uuid NOT NULL,
  "kind" "QuestionKind" NOT NULL,
  "prompt" text NOT NULL,
  "options" text[] NOT NULL,
  "position" integer NOT NULL,
  UNIQUE (event_id, position),
  UNIQUE (event_id, id)
);
CREATE TABLE "answers" (
  "event_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "question_id" uuid NOT NULL,
  "option_index" integer,
  "skipped" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id, question_id)
);
CREATE INDEX "answers_idx_1" ON "answers" (event_id, question_id);
CREATE TABLE "user_interests" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "event_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "interest_type" "InterestType" NOT NULL,
  "topic" varchar(200) NOT NULL,
  "share_consent" boolean NOT NULL DEFAULT false,
  UNIQUE (event_id, user_id, interest_type, topic)
);
CREATE TABLE "user_contacts" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "user_id" uuid NOT NULL,
  "field" "ContactField" NOT NULL,
  "value" text NOT NULL,
  "visibility" "ContactVisibility" NOT NULL DEFAULT 'private',
  "share_consent" boolean NOT NULL DEFAULT false,
  "consented_at" timestamptz(6),
  UNIQUE (user_id, field)
);
CREATE TABLE "connection_requests" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "event_id" uuid NOT NULL,
  "sender_id" uuid NOT NULL,
  "recipient_id" uuid NOT NULL,
  "status" "RequestStatus" NOT NULL DEFAULT 'pending',
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  "expires_at" timestamptz(6) NOT NULL,
  UNIQUE (id, recipient_id)
);
CREATE INDEX "connection_requests_idx_1" ON "connection_requests" (event_id, sender_id);
CREATE INDEX "connection_requests_idx_2" ON "connection_requests" (event_id, recipient_id);
CREATE TABLE "connection_request_decisions" (
  "request_id" uuid NOT NULL PRIMARY KEY,
  "recipient_id" uuid NOT NULL,
  "decision" "RequestDecision" NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT now()
);
CREATE TABLE "recommendations" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "event_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "suggested_user_id" uuid NOT NULL,
  "score_internal" double precision NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id, suggested_user_id)
);
CREATE INDEX "recommendations_idx_1" ON "recommendations" (event_id, suggested_user_id);
CREATE TABLE "interactions" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "event_id" uuid NOT NULL,
  "user_a_id" uuid NOT NULL,
  "user_b_id" uuid NOT NULL,
  "started_at" timestamptz(6) NOT NULL DEFAULT now(),
  "ended_at" timestamptz(6)
);
CREATE INDEX "interactions_idx_0" ON "interactions" (event_id, user_a_id);
CREATE INDEX "interactions_idx_1" ON "interactions" (event_id, user_b_id);
CREATE TABLE "feedback" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "interaction_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "conversation_ease" smallint NOT NULL,
  "perceived_value" smallint NOT NULL,
  "willingness_to_reconnect" boolean NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  UNIQUE (interaction_id, user_id)
);
CREATE INDEX "feedback_idx_1" ON "feedback" (user_id);
-- Supabase Auth supports anonymous identities: no app password column exists.
ALTER TABLE users ADD CONSTRAINT users_auth_fk FOREIGN KEY (auth_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE users ADD CONSTRAINT display_name_nonempty CHECK (length(trim(display_name)) > 0);
ALTER TABLE events ADD FOREIGN KEY (organizer_id) REFERENCES users(id);
ALTER TABLE events ADD CONSTRAINT event_code_format CHECK (event_code ~ '^[A-Z0-9]{4,16}$');
ALTER TABLE event_participants ADD FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE, ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE questions ADD FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE, ADD CHECK (position >= 0), ADD CHECK ((kind = 'preference' AND cardinality(options) = 2) OR (kind = 'event_goal' AND cardinality(options) >= 2));
ALTER TABLE answers ADD FOREIGN KEY (event_id,user_id) REFERENCES event_participants(event_id,user_id) ON DELETE CASCADE, ADD FOREIGN KEY (event_id,question_id) REFERENCES questions(event_id,id) ON DELETE CASCADE, ADD CHECK ((skipped AND option_index IS NULL) OR (NOT skipped AND option_index IS NOT NULL AND option_index >= 0));
ALTER TABLE user_interests ADD FOREIGN KEY (event_id,user_id) REFERENCES event_participants(event_id,user_id) ON DELETE CASCADE, ADD CHECK (length(trim(topic)) > 0);
ALTER TABLE user_contacts ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, ADD CHECK (NOT share_consent OR consented_at IS NOT NULL), ADD CHECK (visibility = 'private' OR share_consent);
ALTER TABLE connection_requests ADD FOREIGN KEY (event_id,sender_id) REFERENCES event_participants(event_id,user_id) ON DELETE CASCADE, ADD FOREIGN KEY (event_id,recipient_id) REFERENCES event_participants(event_id,user_id) ON DELETE CASCADE, ADD CHECK (sender_id <> recipient_id), ADD CHECK (expires_at > created_at);
ALTER TABLE connection_request_decisions ADD FOREIGN KEY (request_id,recipient_id) REFERENCES connection_requests(id,recipient_id) ON DELETE CASCADE;
ALTER TABLE recommendations ADD FOREIGN KEY (event_id,user_id) REFERENCES event_participants(event_id,user_id) ON DELETE CASCADE, ADD FOREIGN KEY (event_id,suggested_user_id) REFERENCES event_participants(event_id,user_id) ON DELETE CASCADE, ADD CHECK (user_id <> suggested_user_id), ADD CHECK (score_internal > '-Infinity'::float8 AND score_internal < 'Infinity'::float8);
ALTER TABLE interactions ADD FOREIGN KEY (event_id,user_a_id) REFERENCES event_participants(event_id,user_id) ON DELETE CASCADE, ADD FOREIGN KEY (event_id,user_b_id) REFERENCES event_participants(event_id,user_id) ON DELETE CASCADE, ADD CHECK (user_a_id <> user_b_id), ADD CHECK (ended_at IS NULL OR ended_at >= started_at);
ALTER TABLE feedback ADD FOREIGN KEY (interaction_id) REFERENCES interactions(id) ON DELETE CASCADE, ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, ADD CHECK (conversation_ease BETWEEN 1 AND 5), ADD CHECK (perceived_value BETWEEN 1 AND 5);
CREATE INDEX participants_availability_idx ON event_participants(event_id,availability_status,available_until);
CREATE INDEX answers_user_idx ON answers(user_id);
CREATE INDEX interests_user_idx ON user_interests(user_id);
CREATE INDEX decisions_recipient_idx ON connection_request_decisions(recipient_id);
CREATE INDEX feedback_interaction_idx ON feedback(interaction_id);

CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC;
GRANT USAGE ON SCHEMA app_private TO authenticated;
CREATE FUNCTION app_private.current_user_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT id FROM public.users WHERE auth_id = (SELECT auth.uid())
$$;
REVOKE ALL ON FUNCTION app_private.current_user_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_private.current_user_id() TO authenticated;

CREATE FUNCTION app_private.validate_answer() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NOT NEW.skipped AND NOT EXISTS (
    SELECT 1 FROM public.questions q WHERE q.id = NEW.question_id
      AND q.event_id = NEW.event_id AND NEW.option_index < cardinality(q.options)
  ) THEN RAISE EXCEPTION 'Answer option is outside question options'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER validate_answer BEFORE INSERT OR UPDATE ON answers FOR EACH ROW EXECUTE FUNCTION app_private.validate_answer();
CREATE FUNCTION app_private.validate_feedback() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.interactions i WHERE i.id = NEW.interaction_id AND NEW.user_id IN (i.user_a_id,i.user_b_id))
    THEN RAISE EXCEPTION 'Feedback author must belong to interaction'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER validate_feedback BEFORE INSERT OR UPDATE ON feedback FOR EACH ROW EXECUTE FUNCTION app_private.validate_feedback();
REVOKE ALL ON FUNCTION app_private.validate_answer(), app_private.validate_feedback() FROM PUBLIC;

-- Future authenticated server endpoints perform writes after authorization.
-- No browser mutation grants: protects identity, consent, membership, and acceptance.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE users FROM anon, authenticated;
GRANT SELECT ON TABLE users TO authenticated;
CREATE POLICY users_read ON users FOR SELECT TO authenticated USING (id = app_private.current_user_id());
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE events FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE events FROM anon, authenticated;
GRANT SELECT ON TABLE events TO authenticated;
CREATE POLICY events_read ON events FOR SELECT TO authenticated USING (organizer_id = app_private.current_user_id() OR EXISTS (SELECT 1 FROM public.event_participants p WHERE p.event_id = events.id AND p.user_id = app_private.current_user_id()));
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE event_participants FROM anon, authenticated;
GRANT SELECT ON TABLE event_participants TO authenticated;
CREATE POLICY event_participants_read ON event_participants FOR SELECT TO authenticated USING (user_id = app_private.current_user_id());
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE questions FROM anon, authenticated;
GRANT SELECT ON TABLE questions TO authenticated;
CREATE POLICY questions_read ON questions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.event_participants p WHERE p.event_id = questions.event_id AND p.user_id = app_private.current_user_id()));
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE answers FROM anon, authenticated;
GRANT SELECT ON TABLE answers TO authenticated;
CREATE POLICY answers_read ON answers FOR SELECT TO authenticated USING (user_id = app_private.current_user_id());
ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interests FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE user_interests FROM anon, authenticated;
GRANT SELECT ON TABLE user_interests TO authenticated;
CREATE POLICY user_interests_read ON user_interests FOR SELECT TO authenticated USING (user_id = app_private.current_user_id());
ALTER TABLE user_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_contacts FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE user_contacts FROM anon, authenticated;
GRANT SELECT ON TABLE user_contacts TO authenticated;
CREATE POLICY user_contacts_read ON user_contacts FOR SELECT TO authenticated USING (user_id = app_private.current_user_id());
ALTER TABLE connection_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_requests FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE connection_requests FROM anon, authenticated;
GRANT SELECT ON TABLE connection_requests TO authenticated;
CREATE POLICY connection_requests_read ON connection_requests FOR SELECT TO authenticated USING (sender_id = app_private.current_user_id() OR recipient_id = app_private.current_user_id());
ALTER TABLE connection_request_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_request_decisions FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE connection_request_decisions FROM anon, authenticated;
GRANT SELECT ON TABLE connection_request_decisions TO authenticated;
CREATE POLICY connection_request_decisions_read ON connection_request_decisions FOR SELECT TO authenticated USING (recipient_id = app_private.current_user_id());
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE recommendations FROM anon, authenticated;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE interactions FROM anon, authenticated;
GRANT SELECT ON TABLE interactions TO authenticated;
CREATE POLICY interactions_read ON interactions FOR SELECT TO authenticated USING (user_a_id = app_private.current_user_id() OR user_b_id = app_private.current_user_id());
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE feedback FROM anon, authenticated;
GRANT SELECT ON TABLE feedback TO authenticated;
CREATE POLICY feedback_read ON feedback FOR SELECT TO authenticated USING (user_id = app_private.current_user_id());
-- Decline changes ONLY the recipient-private decision row. The shared row stays
-- pending with its ORIGINAL expiry. Do not delete it or change timestamps on decline.
-- Accepted state is published only by a future authorized server transaction.
-- Never add these tables to Realtime publication; do not expose Prisma/admin clients.

COMMIT;

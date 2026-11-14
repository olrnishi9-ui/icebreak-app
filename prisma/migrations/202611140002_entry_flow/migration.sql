BEGIN;
-- Event-local display/profile data must not spill between memberships.
ALTER TABLE event_participants
 ADD COLUMN display_name varchar(80),
 ADD COLUMN goal varchar(200),
 ADD COLUMN field varchar(160) NOT NULL DEFAULT '',
 ADD COLUMN fun_fact varchar(500) NOT NULL DEFAULT '',
 ADD COLUMN field_visible boolean NOT NULL DEFAULT false,
 ADD COLUMN fun_fact_visible boolean NOT NULL DEFAULT false,
 ADD COLUMN setup_complete boolean NOT NULL DEFAULT false,
 ADD COLUMN opened_at timestamptz(6);
UPDATE event_participants p SET display_name=u.display_name,
 goal=COALESCE((SELECT q.options[a.option_index+1] FROM answers a JOIN questions q ON q.id=a.question_id AND q.event_id=a.event_id WHERE a.event_id=p.event_id AND a.user_id=p.user_id AND q.kind='event_goal' AND NOT a.skipped), 'Just socialize')
 FROM users u WHERE u.id=p.user_id;
ALTER TABLE event_participants ALTER COLUMN display_name SET NOT NULL, ALTER COLUMN goal SET NOT NULL, ALTER COLUMN display_name SET DEFAULT 'Guest', ALTER COLUMN goal SET DEFAULT 'Just socialize';
ALTER TABLE event_participants ADD CHECK(length(trim(display_name))>0), ADD CHECK(length(trim(goal))>0);
-- Existing own-membership RLS covers all added fields. No new browser grants.
COMMIT;

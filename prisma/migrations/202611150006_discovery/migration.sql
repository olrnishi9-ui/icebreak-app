BEGIN;
CREATE TABLE saved_people (
 event_id uuid NOT NULL, user_id uuid NOT NULL, person_id uuid NOT NULL,
 created_at timestamptz(6) NOT NULL DEFAULT now(), PRIMARY KEY(event_id,user_id,person_id),
 CHECK(user_id<>person_id),
 FOREIGN KEY(event_id,user_id) REFERENCES event_participants(event_id,user_id) ON DELETE CASCADE,
 FOREIGN KEY(event_id,person_id) REFERENCES event_participants(event_id,user_id) ON DELETE CASCADE
);
CREATE TABLE stations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
 name varchar(80) NOT NULL CHECK(length(trim(name))>0), description varchar(500) NOT NULL DEFAULT '',
 tags text[] NOT NULL CHECK(cardinality(tags) BETWEEN 1 AND 20), location_note varchar(240) NOT NULL DEFAULT '',
 UNIQUE(event_id,id)
);
CREATE TABLE station_dismissals (
 event_id uuid NOT NULL, user_id uuid NOT NULL, station_id uuid NOT NULL, PRIMARY KEY(event_id,user_id,station_id),
 FOREIGN KEY(event_id,user_id) REFERENCES event_participants(event_id,user_id) ON DELETE CASCADE,
 FOREIGN KEY(event_id,station_id) REFERENCES stations(event_id,id) ON DELETE CASCADE
);
CREATE TABLE discovery_dismissals (
 event_id uuid NOT NULL, user_id uuid NOT NULL, person_id uuid NOT NULL, PRIMARY KEY(event_id,user_id,person_id),
 FOREIGN KEY(event_id,user_id) REFERENCES event_participants(event_id,user_id) ON DELETE CASCADE,
 FOREIGN KEY(event_id,person_id) REFERENCES event_participants(event_id,user_id) ON DELETE CASCADE
);
-- Proposal votes are never browser-readable. A negative vote does not change
-- the pending proposal or either participant's projection before its natural end.
CREATE TABLE session_extensions (
 session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
 base_duration integer NOT NULL CHECK(base_duration IN(5,10,15)),
 proposer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 a_agrees boolean NOT NULL, b_agrees boolean NOT NULL,
 PRIMARY KEY(session_id,base_duration)
);
ALTER TABLE sessions DROP CONSTRAINT sessions_duration_check;
ALTER TABLE sessions ADD CONSTRAINT sessions_duration_check CHECK(duration IN(5,10,15,20));
ALTER TABLE feedback ADD COLUMN reasons text[] NOT NULL DEFAULT '{}',
 ADD COLUMN private_note varchar(500) NOT NULL DEFAULT '',
 ADD CONSTRAINT feedback_reasons CHECK(reasons <@ ARRAY['collaboration','learning','investment','advice']::text[]);
-- Feedback remains write-only to browser roles, including its author.
REVOKE ALL ON feedback FROM anon,authenticated;
GRANT SELECT ON feedback TO authenticated; -- no SELECT policy: even the author sees no rows
ALTER TABLE saved_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_people FORCE ROW LEVEL SECURITY;
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE stations FORCE ROW LEVEL SECURITY;
ALTER TABLE station_dismissals ENABLE ROW LEVEL SECURITY;
ALTER TABLE station_dismissals FORCE ROW LEVEL SECURITY;
ALTER TABLE discovery_dismissals ENABLE ROW LEVEL SECURITY;
ALTER TABLE discovery_dismissals FORCE ROW LEVEL SECURITY;
ALTER TABLE session_extensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_extensions FORCE ROW LEVEL SECURITY;
REVOKE ALL ON saved_people,stations,station_dismissals,discovery_dismissals,session_extensions FROM PUBLIC,anon,authenticated;
GRANT SELECT ON saved_people,stations,station_dismissals,discovery_dismissals TO authenticated;
CREATE POLICY own_saved ON saved_people FOR SELECT TO authenticated USING(user_id=app_private.current_user_id());
CREATE POLICY own_station_dismissals ON station_dismissals FOR SELECT TO authenticated USING(user_id=app_private.current_user_id());
CREATE POLICY own_discovery_dismissals ON discovery_dismissals FOR SELECT TO authenticated USING(user_id=app_private.current_user_id());
CREATE POLICY event_stations ON stations FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM event_participants p WHERE p.event_id=stations.event_id AND p.user_id=app_private.current_user_id()));
-- Extend Sent history without revealing recipient decisions or their timing.
CREATE OR REPLACE FUNCTION app_private.request_projection(e uuid, viewer uuid, at_time timestamptz)
RETURNS TABLE(id uuid, side text, "displayName" text, "goalLine" text, "sharedReason" text,
 duration integer, kind text, status text, "expiresAt" timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT r.id, CASE WHEN r.sender_id=viewer THEN 'outgoing' ELSE 'incoming' END,
 p.display_name::text,p.goal::text,r.shared_reason,r.duration,r.kind,
 CASE WHEN r.status='accepted' THEN CASE WHEN EXISTS(SELECT 1 FROM public.sessions s WHERE s.request_id=r.id AND s.closed_at IS NULL) THEN 'accepted' ELSE 'expired' END WHEN r.withdrawn OR r.expires_at<=at_time THEN 'expired' ELSE 'pending' END,
 r.expires_at FROM public.connection_requests r
 JOIN public.event_participants p ON p.event_id=r.event_id AND p.user_id=CASE WHEN r.sender_id=viewer THEN r.recipient_id ELSE r.sender_id END
 WHERE r.event_id=e AND (r.sender_id=viewer OR (r.recipient_id=viewer AND r.status='pending' AND NOT r.withdrawn AND r.expires_at>at_time AND NOT EXISTS(SELECT 1 FROM public.connection_request_decisions d WHERE d.request_id=r.id)))
 ORDER BY r.created_at,r.id
$$;
COMMIT;

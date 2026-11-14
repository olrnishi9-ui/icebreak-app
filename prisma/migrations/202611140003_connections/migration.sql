BEGIN;
ALTER TABLE event_participants ADD COLUMN short_code varchar(8) NOT NULL DEFAULT upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
CREATE UNIQUE INDEX participant_short_code ON event_participants(event_id,short_code);
ALTER TABLE connection_requests ADD COLUMN duration integer NOT NULL DEFAULT 5 CHECK(duration IN (5,10)),
 ADD COLUMN shared_reason text NOT NULL DEFAULT '',
 ADD COLUMN kind text NOT NULL DEFAULT 'board' CHECK(kind IN ('board','code')),
 ADD COLUMN withdrawn boolean NOT NULL DEFAULT false;
CREATE TABLE meeting_points (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
 label varchar(80) NOT NULL, photo_url text NOT NULL, direction varchar(240) NOT NULL, position integer NOT NULL,
 UNIQUE(event_id,position), UNIQUE(event_id,id)
);
CREATE TABLE sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_id uuid NOT NULL,
 request_id uuid NOT NULL UNIQUE REFERENCES connection_requests(id) ON DELETE CASCADE,
 user_a_id uuid NOT NULL, user_b_id uuid NOT NULL,
 duration integer NOT NULL CHECK(duration IN (5,10)), shared_reason text NOT NULL,
 meeting_point jsonb, created_at timestamptz NOT NULL DEFAULT now(),
 arrived_a boolean NOT NULL DEFAULT false, arrived_b boolean NOT NULL DEFAULT false,
 late_a boolean NOT NULL DEFAULT false, late_b boolean NOT NULL DEFAULT false,
 started_at timestamptz, closed_at timestamptz,
 FOREIGN KEY(event_id,user_a_id) REFERENCES event_participants(event_id,user_id) ON DELETE CASCADE,
 FOREIGN KEY(event_id,user_b_id) REFERENCES event_participants(event_id,user_id) ON DELETE CASCADE,
 CHECK(user_a_id<>user_b_id)
);
CREATE INDEX sessions_live ON sessions(event_id) WHERE closed_at IS NULL;
CREATE TABLE blocks (
 event_id uuid NOT NULL, actor_id uuid NOT NULL, target_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(event_id,actor_id,target_id), CHECK(actor_id<>target_id),
 FOREIGN KEY(event_id,actor_id) REFERENCES event_participants(event_id,user_id) ON DELETE CASCADE,
 FOREIGN KEY(event_id,target_id) REFERENCES event_participants(event_id,user_id) ON DELETE CASCADE
);
CREATE TABLE reports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_id uuid NOT NULL, actor_id uuid NOT NULL, target_id uuid NOT NULL,
 category varchar(80), created_at timestamptz NOT NULL DEFAULT now(), CHECK(actor_id<>target_id),
 FOREIGN KEY(event_id,actor_id) REFERENCES event_participants(event_id,user_id) ON DELETE CASCADE,
 FOREIGN KEY(event_id,target_id) REFERENCES event_participants(event_id,user_id) ON DELETE CASCADE
);
-- Lock the event for all connect mutations. This also serializes point occupancy,
-- incoming caps and opposite-direction sends. The trigger independently forbids
-- overlapping pending requests for an unordered pair, including direct SQL writes.
CREATE FUNCTION app_private.unique_pending_pair() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 PERFORM 1 FROM public.events WHERE id=NEW.event_id FOR UPDATE;
 IF NEW.status='pending' AND NOT NEW.withdrawn AND EXISTS(
 SELECT 1 FROM public.connection_requests r WHERE r.event_id=NEW.event_id AND r.id<>NEW.id
 AND least(r.sender_id,r.recipient_id)=least(NEW.sender_id,NEW.recipient_id)
 AND greatest(r.sender_id,r.recipient_id)=greatest(NEW.sender_id,NEW.recipient_id)
 AND r.status='pending' AND NOT r.withdrawn AND r.expires_at>NEW.created_at AND NEW.expires_at>r.created_at
 ) THEN RAISE EXCEPTION 'Pair already pending' USING ERRCODE='23505'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER unique_pending_pair BEFORE INSERT OR UPDATE ON connection_requests FOR EACH ROW EXECUTE FUNCTION app_private.unique_pending_pair();
REVOKE ALL ON FUNCTION app_private.unique_pending_pair() FROM PUBLIC;
-- No raw requests or recipient decisions are readable through the browser DB API.
REVOKE SELECT ON connection_requests,connection_request_decisions FROM authenticated;
CREATE FUNCTION app_private.request_projection(e uuid, viewer uuid, at_time timestamptz)
RETURNS TABLE(id uuid, side text, "displayName" text, "goalLine" text, "sharedReason" text,
 duration integer, kind text, status text, "expiresAt" timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT r.id, CASE WHEN r.sender_id=viewer THEN 'outgoing' ELSE 'incoming' END,
 p.display_name::text,p.goal::text,r.shared_reason,r.duration,r.kind,
 CASE WHEN r.status='accepted' THEN 'accepted' WHEN at_time<r.expires_at THEN 'pending' ELSE 'expired' END,
 r.expires_at
 FROM public.connection_requests r JOIN public.event_participants p ON p.event_id=r.event_id
 AND p.user_id=CASE WHEN r.sender_id=viewer THEN r.recipient_id ELSE r.sender_id END
 WHERE r.event_id=e AND viewer IN(r.sender_id,r.recipient_id) AND NOT r.withdrawn
 AND ((r.expires_at>at_time AND r.status='pending') OR
      (r.sender_id=viewer AND r.status='accepted' AND EXISTS(SELECT 1 FROM public.sessions s WHERE s.request_id=r.id AND s.closed_at IS NULL)))
 AND (r.sender_id=viewer OR NOT EXISTS(SELECT 1 FROM public.connection_request_decisions d WHERE d.request_id=r.id))
 ORDER BY r.created_at,r.id
$$;
REVOKE ALL ON FUNCTION app_private.request_projection(uuid,uuid,timestamptz) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.own_connections(e uuid)
RETURNS TABLE(id uuid, side text, "displayName" text, "goalLine" text, "sharedReason" text,
 duration integer, kind text, status text, "expiresAt" timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT * FROM app_private.request_projection(e,app_private.current_user_id(),now())
 WHERE EXISTS(SELECT 1 FROM public.events WHERE id=e AND status='active' AND (ends_at IS NULL OR ends_at>now()))
$$;
REVOKE ALL ON FUNCTION public.own_connections(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.own_connections(uuid) TO authenticated;
ALTER TABLE meeting_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_points FORCE ROW LEVEL SECURITY;
REVOKE ALL ON meeting_points FROM PUBLIC,anon,authenticated;
GRANT SELECT ON meeting_points TO authenticated;
CREATE POLICY points_read ON meeting_points FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM event_participants p WHERE p.event_id=meeting_points.event_id AND p.user_id=app_private.current_user_id()));
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions FORCE ROW LEVEL SECURITY;
REVOKE ALL ON sessions FROM PUBLIC,anon,authenticated;
GRANT SELECT ON sessions TO authenticated;
CREATE POLICY sessions_read ON sessions FOR SELECT TO authenticated USING(app_private.current_user_id() IN(user_a_id,user_b_id));
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks FORCE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports FORCE ROW LEVEL SECURITY;
REVOKE ALL ON blocks,reports FROM PUBLIC,anon,authenticated;
COMMIT;

-- Development/demo only. Run explicitly as the database administrator after seed.
-- This never binds fictional guests to Auth identities or modifies real guests.
BEGIN;
UPDATE event_participants p SET availability_status='open',
 available_until=now()+interval '15 minutes', opened_at=now()
FROM users u, events e
WHERE p.user_id=u.id AND p.event_id=e.id AND e.event_code='HELLO26'
 AND u.auth_id IS NULL
 AND u.id BETWEEN '00000000-0000-4000-8000-000000000001'::uuid
              AND '00000000-0000-4000-8000-000000000006'::uuid;
COMMIT;

BEGIN;
-- Private, unverified display label only. Existing own-user RLS covers this column.
-- Keep it separate from verified Auth email and double-opt-in contact details.
ALTER TABLE users ADD COLUMN demo_email_label varchar(254) NOT NULL DEFAULT '';
COMMIT;

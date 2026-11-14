import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

test('migration, repeatable seed, integrity and browser-role privacy', async t => {
  const db = new PGlite();
  t.after(() => db.close());
  // Supabase owns these roles and Auth objects in production.
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA auth, public TO anon, authenticated;
    GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;`);
  await db.exec(await readFile(new URL('../prisma/migrations/202611140001_foundation/migration.sql', import.meta.url),'utf8'));
  const seed = await readFile(new URL('../prisma/seed.sql', import.meta.url),'utf8');
  await db.exec(seed);
  await db.exec(seed);
  async function asUser(n, callback) {
    await db.exec('BEGIN; SET LOCAL ROLE authenticated;');
    try {
      await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)", [id(n)]);
      return await callback();
    } finally { await db.exec('ROLLBACK'); }
  }
  const rows = async sql => (await db.query(sql)).rows;
  for (let n=1;n<=6;n++) {
    await db.query('INSERT INTO auth.users VALUES ($1)', [id(n)]);
    await db.query('UPDATE users SET auth_id=$1 WHERE id=$1', [id(n)]);
  }
  await t.test('seed has six guests, five binary questions, one goal, and explicit skips', async () => {
    assert.equal((await rows('SELECT * FROM users')).length,6);
    assert.equal((await rows('SELECT * FROM event_participants')).length,6);
    assert.equal((await rows("SELECT * FROM questions WHERE kind='preference' AND cardinality(options)=2")).length,5);
    assert.equal((await rows("SELECT * FROM questions WHERE kind='event_goal'")).length,1);
    assert.equal((await rows('SELECT * FROM answers')).length,36);
    assert.ok((await rows('SELECT * FROM answers WHERE skipped AND option_index IS NULL')).length > 0);
    assert.equal((await rows('SELECT DISTINCT interest_type FROM user_interests')).length,5);
  });
  await db.exec(`INSERT INTO user_contacts(user_id,field,value) VALUES ('${id(2)}','email','private@example.invalid');
    INSERT INTO connection_requests(id,event_id,sender_id,recipient_id,expires_at) VALUES ('${id(300)}','${id(100)}','${id(1)}','${id(2)}',now()+interval '5 minutes');
    INSERT INTO recommendations(event_id,user_id,suggested_user_id,score_internal) VALUES ('${id(100)}','${id(1)}','${id(2)}',0.5);
    INSERT INTO interactions(id,event_id,user_a_id,user_b_id) VALUES ('${id(400)}','${id(100)}','${id(1)}','${id(2)}');
    INSERT INTO feedback(interaction_id,user_id,conversation_ease,perceived_value,willingness_to_reconnect) VALUES ('${id(400)}','${id(2)}',4,5,true);`);
  await t.test('participant sees only own answers, contacts, interests and feedback', async () => {
    await asUser(1, async () => {
      assert.equal((await rows('SELECT * FROM answers')).length,6);
      assert.ok((await rows('SELECT * FROM answers')).every(r => r.user_id===id(1)));
      assert.equal((await rows('SELECT * FROM user_contacts')).length,0);
      assert.equal((await rows('SELECT * FROM feedback')).length,0);
      assert.equal((await rows('SELECT * FROM users')).length,1);
      assert.equal((await rows('SELECT * FROM user_interests')).length,5);
      assert.equal((await rows('SELECT * FROM events')).length,1);
    });
    await asUser(2, async () => {
      assert.equal((await rows('SELECT * FROM user_contacts')).length,1);
      assert.equal((await rows('SELECT * FROM feedback')).length,1);
    });
  });
  await t.test('internal recommendations cannot be selected by any participant', async () => {
    await assert.rejects(asUser(1, () => rows('SELECT score_internal FROM recommendations')), /permission denied/);
  });
  await t.test('private decline leaves sender response and expiry identical', async () => {
    const before = await asUser(1, () => rows('SELECT * FROM connection_requests'));
    await db.exec(`INSERT INTO connection_request_decisions(request_id,recipient_id,decision) VALUES ('${id(300)}','${id(2)}','declined')`);
    assert.deepEqual(await asUser(1, () => rows('SELECT * FROM connection_requests')),before);
    assert.equal((await asUser(1, () => rows('SELECT * FROM connection_request_decisions'))).length,0);
    assert.equal((await asUser(2, () => rows('SELECT * FROM connection_request_decisions')))[0].decision,'declined');
    assert.equal((await asUser(3, () => rows('SELECT * FROM connection_requests'))).length,0);
  });
  await t.test('browser cannot forge membership, identity, acceptance or consent', async () => {
    for (const sql of ["UPDATE users SET auth_id=null", "UPDATE connection_requests SET status='accepted'", "UPDATE user_contacts SET share_consent=true", `INSERT INTO event_participants(event_id,user_id) VALUES ('${id(100)}','${id(1)}')`]) {
      await assert.rejects(asUser(1, () => db.exec(sql)), /permission denied/);
    }
    await db.exec('BEGIN; SET LOCAL ROLE anon;');
    try { await assert.rejects(db.query('SELECT * FROM answers'), /permission denied/); }
    finally { await db.exec('ROLLBACK'); }
  });
  await t.test('constraints reject cross-event answers, invalid options and unrelated feedback', async () => {
    await assert.rejects(db.exec(`UPDATE answers SET option_index=99 WHERE user_id='${id(1)}' AND question_id='${id(200)}'`), /outside question options/);
    await assert.rejects(db.exec(`INSERT INTO feedback(interaction_id,user_id,conversation_ease,perceived_value,willingness_to_reconnect) VALUES ('${id(400)}','${id(3)}',4,4,true)`), /must belong/);
    await assert.rejects(db.exec(`INSERT INTO event_participants(event_id,user_id) VALUES ('${id(999)}','${id(1)}')`), /foreign key/);
    await db.exec(`INSERT INTO events(id,event_code,name,organizer_id) VALUES ('${id(500)}','OTHER26','Other event','${id(1)}');
      INSERT INTO event_participants(event_id,user_id) VALUES ('${id(500)}','${id(1)}');
      INSERT INTO questions(id,event_id,kind,prompt,options,position) VALUES ('${id(501)}','${id(500)}','preference','Other?',ARRAY['A','B'],0);`);
    await assert.rejects(db.exec(`INSERT INTO answers(event_id,user_id,question_id,skipped) VALUES ('${id(100)}','${id(1)}','${id(501)}',true)`), /foreign key/);
    await asUser(999, async () => {
      for (const table of ['users','events','questions','answers','user_contacts','feedback','connection_requests']) {
        assert.equal((await rows(`SELECT * FROM ${table}`)).length,0);
      }
    });
    const tables=await rows("SELECT relname,relrowsecurity,relforcerowsecurity FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind='r'");
    assert.equal(tables.length,12);
    assert.ok(tables.every(r => r.relrowsecurity && r.relforcerowsecurity));
  });
});

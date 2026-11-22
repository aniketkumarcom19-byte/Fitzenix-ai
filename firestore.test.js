const test = require('node:test');
const fs = require('node:fs');
const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} = require('@firebase/rules-unit-testing');
const {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  orderBy,
  serverTimestamp,
} = require('firebase/firestore');

const PROJECT_ID = 'gen-lang-client-0370019269';
const DATABASE_ID = 'ai-studio-android-fitzenix-169c0c8f-dd94-4111-9c29-3132a4dd1190';
const RULES = fs.readFileSync('firestore.rules', 'utf8');

test('Fitzenix AI Firestore Security Rules', async (t) => {
  const env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: RULES,
      host: '127.0.0.1',
      port: 8085,
    },
  });

  t.after(async () => {
    await env.cleanup();
  });

  await t.test('owner can create, read, update user root doc and subcollections', async () => {
    const aliceCtx = env.authenticatedContext('alice_uid');
    const db = aliceCtx.firestore(DATABASE_ID);

    const userRef = doc(db, 'users', 'alice_uid');
    await assertSucceeds(setDoc(userRef, {
      uid: 'alice_uid',
      email: 'alice@example.com',
      displayName: 'Alice',
      photoUrl: '',
      profileJson: '{"nickname":"Alice"}',
      weeklyScheduleJson: '[]',
      dietPreferencesJson: '{}',
      dietPlanJson: '[]',
      settingsJson: '{}',
      unlockedBadgesJson: '{}',
      challengesJson: '[]',
      favoriteFoodIds: ['f_oats'],
      favoriteTrackIds: ['trk_1'],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }));

    await assertSucceeds(getDoc(userRef));
    await assertSucceeds(updateDoc(userRef, {
      displayName: 'Alice Fit',
      updatedAt: serverTimestamp(),
    }));

    const workoutRef = doc(db, 'users', 'alice_uid', 'workouts', 'w_1');
    await assertSucceeds(setDoc(workoutRef, {
      id: 'w_1',
      userId: 'alice_uid',
      dateKey: '2026-11-21',
      dayOfWeekIndex: 5,
      workoutTitle: 'Upper Body Power',
      durationSeconds: 1800,
      completedExercisesCount: 4,
      completedSetsCount: 12,
      estimatedCalories: 240,
      notes: '',
      timestampMs: 1700000000000,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }));

    await assertSucceeds(getDocs(query(collection(db, 'users', 'alice_uid', 'workouts'), orderBy('timestampMs', 'desc'))));
  });

  await t.test('unauthenticated and cross-user reads/writes are denied', async () => {
    const unauthDb = env.unauthenticatedContext().firestore(DATABASE_ID);
    const bobDb = env.authenticatedContext('bob_uid').firestore(DATABASE_ID);

    await assertFails(getDoc(doc(unauthDb, 'users', 'alice_uid')));
    await assertFails(getDocs(collection(unauthDb, 'users')));
    await assertFails(getDoc(doc(bobDb, 'users', 'alice_uid')));
    await assertFails(getDocs(collection(bobDb, 'users', 'alice_uid', 'workouts')));
    await assertFails(setDoc(doc(bobDb, 'users', 'alice_uid', 'workouts', 'w_bad'), {
      id: 'w_bad',
      userId: 'alice_uid',
      dateKey: '2026-11-21',
      dayOfWeekIndex: 1,
      workoutTitle: 'Hack',
      durationSeconds: 100,
      completedExercisesCount: 1,
      completedSetsCount: 1,
      estimatedCalories: 10,
      timestampMs: 1000,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }));
  });

  await t.test('invalid workout payload or immutable field mutation is denied', async () => {
    const aliceDb = env.authenticatedContext('alice_uid').firestore(DATABASE_ID);
    const badWorkout = doc(aliceDb, 'users', 'alice_uid', 'workouts', 'w_invalid');
    await assertFails(setDoc(badWorkout, {
      id: 'w_invalid',
      userId: 'alice_uid',
      dateKey: '2026-11-21',
      dayOfWeekIndex: 9,
      workoutTitle: '',
      durationSeconds: -5,
      completedExercisesCount: 1,
      completedSetsCount: 1,
      estimatedCalories: 10,
      timestampMs: 1000,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }));

    await assertSucceeds(deleteDoc(doc(aliceDb, 'users', 'alice_uid', 'workouts', 'w_1')));
  });
});

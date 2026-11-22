# Fitzenix AI — Release, Signing, Distribution & Future Update Guide

## 1. Application Identity & Version Info
- **App Name**: Fitzenix AI (`Rise Stronger Every Day.`)
- **Application ID / Package Name**: `com.aistudio.fitzenixai.kxmrqz`
- **Version Code**: `1`
- **Version Name**: `1.0.0`
- **SDK Compatibility**: `minSdk = 24` (Android 7.0+), `targetSdk = 36`, `compileSdk = 36`
- **Firebase Project ID**: `gen-lang-client-0370019269`
- **Firestore Named Database ID**: `ai-studio-android-fitzenix-169c0c8f-dd94-4111-9c29-3132a4dd1190`

---

## 2. Generating Signed Release APK & Android App Bundle (AAB)

In AI Studio, you can export a signed APK/AAB directly from the **Settings** menu, or build locally in Android Studio / CLI once you have your permanent upload keystore (`my-upload-key.jks`):

### Step 1: Create Your Permanent Upload Keystore (First Release Only)
Run once on your local machine (keep this file forever—never lose it):
```bash
keytool -genkey -v -keystore my-upload-key.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
```

### Step 2: Securely Supply Signing Credentials (Never Commit Passwords)
Set environment variables before building (do **not** hardcode passwords in `build.gradle.kts` or commit `.jks` files to Git):
```bash
export KEYSTORE_PATH="/absolute/path/to/my-upload-key.jks"
export STORE_PASSWORD="your-keystore-password"
export KEY_PASSWORD="your-key-password"
```
`app/build.gradle.kts` already reads `KEYSTORE_PATH`, `STORE_PASSWORD`, `KEY_PASSWORD`, and key alias `upload`, with R8 minification (`isMinifyEnabled = true`), resource shrinking (`isShrinkResources = true`), and production ProGuard rules (`app/proguard-rules.pro`).

### Step 3: Build Release Artifacts
- **Signed Release AAB (for Google Play Store)**:
  ```bash
  ./gradlew :app:bundleRelease
  # Output: app/build/outputs/bundle/release/app-release.aab
  ```
- **Signed Release APK (for direct phone installation/sideloading)**:
  ```bash
  ./gradlew :app:assembleRelease
  # Output: app/build/outputs/apk/release/app-release.apk
  ```

### Step 4: Register Release SHA-1 / SHA-256 for Google Sign-In & App Check
1. Extract your release/Play App Signing SHA-1 & SHA-256:
   ```bash
   keytool -list -v -keystore my-upload-key.jks -alias upload
   ```
2. Add the **Upload Key** SHA-1/SHA-256 (and, once enrolled in Play App Signing, Google Play's **App Signing Key Certificate** SHA-1/SHA-256 from Play Console -> *Test and release -> Setup -> App signing*) in **Firebase Console -> Project Settings -> Your Android App (`com.aistudio.fitzenixai.kxmrqz`)**.
3. Download the updated `google-services.json` if any OAuth clients change, and ensure your `recaptcha_site_key` in `app/src/main/res/values/firebase_applet_config.xml` is registered in **Firebase Console -> App Check** for release builds.

---

## 3. Keystore Security & Backup Checklist
- Store `my-upload-key.jks` and its passwords/alias in at least two offline/encrypted locations (e.g., an encrypted password manager + offline hardware backup).
- Add `*.jks` and `*.keystore` to `.gitignore` so keys are never pushed to GitHub.
- Enroll in **Google Play App Signing** so Google safeguards the final distribution signing key and allows upload key resets if your upload key is ever compromised.

---

## 4. Releasing Future Updates Without Losing User Data
1. **Never change `applicationId`** (`com.aistudio.fitzenixai.kxmrqz`) or the upload keystore.
2. **Increment `versionCode` by +1** for every release (`2`, `3`, `4`, ...) and bump `versionName` (`"1.0.1"`, `"1.1.0"`, etc.) in `app/build.gradle.kts`.
3. **Preserve Room Database**: `FitzenixDatabase` has `exportSchema = true` (schemas exported to `app/schemas/`) and **no destructive migration fallback**. Whenever you modify `@Entity` tables, bump `version` in `FitzenixDatabase` and add an explicit `Migration(oldVer, newVer)` object to `MIGRATIONS`.
4. **Preserve Cloud & Local Backup**:
   - Signed-in Google users automatically sync profiles, weekly schedules, workouts, nutrition logs, water, sleep, measurements, bookmarks, and playlists to Cloud Firestore under `/users/{uid}`.
   - Local DataStore & `fitzenix_ai.db` are included in `app/src/main/res/xml/backup_rules.xml` and `data_extraction_rules.xml`.

---

## 5. Firebase Authentication, Email/Password & Live Gemini AI Notes
- **Google Sign-In**: Implemented via Jetpack Credential Manager (`GetSignInWithGoogleOption`) + Firebase Auth.
- **Email/Password Registration & Recovery**: AI Studio's backend provisioning enables **Google Sign-In** only. To enable Email/Password registration, login, and password-recovery emails in production, turn on **Email/Password** in **Firebase Console -> Authentication -> Sign-in method** and wire `createUserWithEmailAndPassword`, `signInWithEmailAndPassword`, and `sendPasswordResetEmail` into `AuthManager` and `AuthScreen`.
- **Live Gemini AI**: Powered by **Firebase AI Logic** (`Firebase.ai.generativeModel("gemini-3.8-flash")`) and **Firebase App Check** (`configureAppCheck(this, intent)` in `MainActivity`). No `GEMINI_API_KEY` is embedded in the APK.

---

## 6. Google Play Store Publishing Checklist
1. Create an app in **Google Play Console** matching `com.aistudio.fitzenixai.kxmrqz`.
2. Opt in to **Play App Signing** and upload `app-release.aab`.
3. Complete **App Content** declarations:
   - **Data Safety**: Disclose Firebase Authentication (email/name/photo for Google Sign-In), Cloud Firestore sync, and optional Camera/Microphone/Activity permissions.
   - **Health / Fitness Disclaimer**: Disclose that workout/nutrition/form cues are informational only (not medical advice).
   - **Privacy Policy URL**: Host and link your public Privacy Policy matching the app's disclosures.
4. Test via **Internal Testing** track first, verify Google Sign-In (with Play App Signing SHA-1 registered in Firebase) and Gemini AI (with Release reCAPTCHA App Check), then promote to **Production**.

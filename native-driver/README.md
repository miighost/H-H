# Native driver module

Actual Flutter source and SQLite tracking outbox, using the SAME Firebase identity and `/api/operations` routes. It is not a signed IPA/APK or an app-store-ready claim. No Flutter SDK or real iOS/Android devices were available in this workspace, so this source has NOT been compiled or device-tested. Do not call it verified until `flutter analyze`, platform builds and device tests pass.

Run `./bootstrap.sh` to generate standard platform scaffolding and configure manifest/plist permissions. Preserve these supplied lib/pubspec/assets files if Flutter prompts about conflicts. Configure the existing Firebase project for the generated app IDs and supply:

```
flutter run --dart-define=HH_API_ORIGIN=https://hornandharvest.com --dart-define=HH_FIREBASE_API_KEY=... --dart-define=HH_FIREBASE_APP_ID=... --dart-define=HH_FIREBASE_SENDER_ID=... --dart-define=HH_FIREBASE_PROJECT_ID=...
```

Use platform-specific Firebase app IDs. Android compile SDK must be at least 35. iOS requires Location Updates background capability and signing. Explicitly allow Always/background location; OS force-quit, revoked permission or battery restrictions can stop tracking. No software can guarantee GPS after force-quit. Offline events remain in SQLite and are removed only after server acceptance. Stop tracking, deliver and sign out each stop the GPS stream. Test locked-screen, no signal/reconnect, permission denial, revoked session, device restart, camera and delivery proof on actual devices before release. A failed upload remains queued; review rejected events rather than deleting them blindly.

Dependencies require internet only for engineer build/install, no subscription. Gateway merchant fees and mobile data remain outside this code. Follow official plugin setup: https://pub.dev/packages/geolocator and https://firebase.google.com/docs/flutter/setup.

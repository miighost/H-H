# V47 verification — 8 October 2026

This report covers the repaired connected core, not certification of the whole historical specification or of the live production deployment.

## Three passes

1. Domain/API checks: 15 automated tests passed, including the retained CEO authentication tests. Tests cover exact server pricing, overselling, duplicate requests/receipts, account isolation, deposits, equipment access, role/state enforcement and mandatory delivery proof. TypeScript lint and production build passed.
2. Built-browser navigation/layout: 126 checks initially passed. Repeated after corrections: 151 checks passed. Widths exercised: 320, 375, 390, 430, 768, 820, 1024, 1280, 1440 and 1920 pixels. Customer and staff URL paths, reload/Back, and viewport overflow checked.
3. Complete browser journey: 152 checks passed, including customer order creation, administrator verified-receipt entry, warehouse preparing/ready, assigned driver dispatch/arrival/photo/receiver, and customer invoice PDF download. Invoice export received a further table-alignment correction and was rebuilt/retested: the final repeated browser run passed all 152 checks with no reported page errors. The exported PDF was rendered and inspected. Archive contents and checksums were verified separately.

## Important evidence limits

The browser exercised the compiled UI and actual Express operations router against an isolated in-memory Firestore-compatible test repository. Browser Firebase authentication was intercepted with test identities. This is not a live Firebase, emulator or production gateway test. No test records were installed in production. Tests/helpers remain under tests/, never a production account bypass.

No real iPhone/Safari or Android device was available. Viewport checks in Chromium do not prove native camera, background GPS or real-device download behaviour. Julian must commission and smoke-test the actual Firebase project and server before public commerce.

Automatic settlement, offline/background GPS, route optimisation/live ETA, attendance and all original intelligence modules remain outside this completed core. See CONNECTED_HANDOVER_V47.md. The public website has not been deployed by this repair.

## Packaging

Original source files, supplied assets and documents are retained for reference. Old hashed dist bundles are superseded by the current compiled build; these are generated outputs, not missing source modules. Current executable entry points are identified in CONNECTED_HANDOVER_V47.md. Legacy demo sources and older wider API specifications are not proof of completed production functionality. node_modules is excluded; npm ci recreates pinned dependencies. No server credentials are included.

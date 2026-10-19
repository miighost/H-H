> Historical/reference document. For current behaviour and deployment, use ENGINEER_START_HERE_V48.md and verification/V48_RESULTS.md. Earlier completion wording is not current release evidence.

> Historical V46 material. Read `CONNECTED_HANDOVER_V47.md` and `V47_VERIFICATION.md` first. This document is not evidence that production operational services are commissioned.

# Horn & Harvest — feature reconciliation and developer handover

Audit started: 7 September 2026. Final handover review: 20 September 2026. Baseline: original App.tsx inside the supplied Horn-Harvest-main.zip, its component inventory, the current locked checkout and the publicly deployed candidate. The public candidate was subsequently opened successfully and compared with the locked source. This remains a production handover audit, not a certification that uncommissioned external services work.

## Feature reconciliation

| Original capability | Review website status |
| --- | --- |
| Product collection and ordering entry | Preserved: five fruits, quantity controls, retail totals |
| Phone/password registration and sign-in | Original AuthModal and Firebase service retained; live access not verified |
| Customer ledger, order history and administration | Original components retained and reachable through Trade & Hospitality; backend commissioning required |
| Product traceability modal | Replaced with per-fruit Origin & batch information disclosures and batch enquiry. Unsupported sample laboratory results are not presented as verified public records |
| Packaging presentation modal | Restored as Packaging & presentation disclosure in Client services using supplied packaging image; original video component retained, video playback not claimed |
| Production narrative / interactive journey | Restored as a clickable five-stage bilingual production journey. Unsupported scientific/certification claims removed; this presentation is not a warehouse integration |
| Trade/sample enquiry form | Restored in Client services; produces an email draft with explicit unsent state. Original simulated submission success not reproduced |
| FAQ accordion | Restored as Ordering questions, in Somali and English |
| Company profile | Direct bundled PDF link restored on main page; retained on trade page |
| Product catalogue | Request-by-email retained. No separately verified catalogue file was available for direct download |
| Contact and social navigation | Verified phone, email, website and Mogadishu operating location retained. Unverified social destinations are not published |
| Certification and comparative laboratory tables | Not reproduced as verified claims, following prior instruction not to publish unheld certifications. Requires actual evidence before reinstatement |
| Firebase connection guide | Developer-only source retained; not exposed in customer navigation |
| Warehouse and delivery coordination | Connected operations blueprint and demonstration code retained for engineering handover. It is not advertised in public homepage navigation and remains browser-local until commissioned |

## Payment findings and changes

The review Site hosts static Vite output, not the Express server. A checkout button cannot therefore complete the /api/waafi/checkout flow here. Live checkout is disabled by default with an explicit review-site explanation. The Node integration is retained for the developer. VITE_PAYMENTS_ENABLED must remain false until the entire payment workflow is commissioned.

The return URL previously claimed payment received based only on its path. It now explicitly says payment must be verified. Gateway redirects now require HTTPS and an exact waafipay.com host or its subdomain, rather than any hostname ending in that string.

## Required before real orders

1. Deploy and configure the Node server on Hostinger with the actual approved merchant configuration. Validate the provider contract against current merchant documentation.
2. Persist an order BEFORE checkout and add idempotency, verified server-side payment callbacks/status checks, amount/currency/reference matching and reconciliation. A browser success URL is not proof of payment. These are not yet complete.
3. Migrate Operations DEMO records to a shared database; enforce role access on the server. Browser role selection and sessionStorage are not authorization. Test two devices and concurrent inventory reservations.
4. Review Firebase authentication, rules and existing seeded data. Do not migrate demonstration users, laboratory values or passwords into production. Verify client approval and admin/warehouse/driver permissions through server identity.
5. Unify trade orders, warehouse reservations, production batches and driver tasks. Existing Firebase ledger and browser-local demo are separate data paths, not automatically connected.
6. Add expiry/lot allocation, batch-to-order traceability, controlled stock adjustments, returns/refunds, payment failure recovery, backup/restore and audit retention. Demo activity history is not an immutable business audit log.
7. Confirm delivery zones, operating days, production/cooling/QA lead times and capacity before displaying promised delivery dates. Demo forecast is an estimate only.
8. Replace all example costs with actual expenses, stock valuation and payroll records. Reports currently show illustrative results since reset, not audited monthly profit or formal accounts. Add month filtering and accounting reconciliation before relying on them.
9. Complete bilingual review of retained account screens and Operations DEMO (currently mostly English). New Client services is bilingual; this is not a claim that the entire app is fully translated.
10. Complete mobile/desktop browser testing, payment sandbox tests, real destination-link verification and developer acceptance. No live payments or messages were sent during this audit.

## Demo verification

Automated operations scenario covers reservation without premature physical deduction; waiting order allocation; fresh-fruit consumption; one-dryer restriction; actual packed output; payment gate; packing; one-time dispatch deduction; proof of delivery; cancellation releasing reservation; role action checks and fixed retail pricing.

## Transfer

Use the included package-lock.json. Build with npm ci then npm run build; start the Node application with npm start. Provide environment values privately using .env.example as a key reference. The dist folder alone is a static review, not the production payment/warehouse backend. Keep .openai metadata for the review Site separate from Hostinger deployment configuration. No live merchant secrets are included in this handover.

Packaging video: original source embeds YouTube video nm7DnFiAueU. Its ownership, subject and current playback have not been verified; it has not been represented as official Horn & Harvest footage. A verified video asset is needed before restoring playback.

## Video update — 8 September 2026
Both owner-supplied clips, 481.mp4 and 513.mp4, are now presented directly in Behind our packaging below the interactive production journey. Original speech is excluded entirely from both outputs. A newly synthesized, gentle instrumental arpeggio replaces it. These are the supplied standard-resolution recordings, not 4K footage. Muted playback starts on entering view where the browser permits, pauses out of view, respects reduced-motion preferences, and has native controls plus an optional music toggle. No YouTube dependency. Earlier missing-video note is superseded for these supplied films. Real-world browser playback has not been verified in the blocked preview environment.

## Editorial handover — 8 September 2026
Applied manager recommendations selectively: retained the concise hero, official fruit names, core slogan, assets, routes, approved retail presentation and business logic. The final public palette is Deep Harvest Green #1C3B2F, Warm Cream #F5F0E1 and Metallic Gold #D4AF37. Control text sizes, spacing, mobile header and visible focus were refined. Customer, warehouse and delivery labels are descriptive while internal role identifiers remain unchanged. Payment simulations remain explicitly labelled. Display dates use full month names in operations and retained customer date formatting. Company Profile uses a direct PDF action. Banana - Lady Spicy is the locked product name. Somali navigation labels were added to the demo; full operational forms and system messages still require production translation review.

No new independent accreditation, international verification, comparative sweetness, licence or market-first claim was added. Commitment wording expresses an aim to meet international food safety and quality standards, not third-party certification. No 3D viewer is promised. Supplied packaging assets and videos remain unchanged.

The previous feature reconciliation above remains the developer checklist. This pass does not commission backend services. The production build and public-page browser inspection pass; final acceptance still requires engineer testing on the production domain, real devices and configured backend services.

## Mobile and visual refinement
Operations navigation wraps; warehouse table becomes labelled vertical rows below 760px; forms, delivery actions and metric cards reflow for small screens. Product batch details now flow below photos, heading leading is increased, hero overlay softened, H&H ornament simplified and contact/footer readability improved. Product illustration received a conservative AI texture retouch; not represented as real photography. Business engine unchanged. Build and workflow regression pass; browser visual acceptance remains outstanding.

## Approved imagery decision
The origin-story H&H ornament is replaced with an exact crop of the approved farmer-hands composition; embedded poster text and logo fall outside the crop, and the hands and mango pixels are not regenerated. The mango collection card now uses the approved refined 100 g pouch composition. The generated five-fruit landscape concept was rejected and is not included.

# Ethical youth-safe product constraints

_Research snapshot: 10 July 2026_

## Decision this research supports

This note resolves the product question in [issue #3](https://github.com/todorone/gamebuds/issues/3): what Gamesbud must build into its MVP, and what must remain a jurisdiction-specific launch gate, for an English-language iOS and Android game aimed at Players aged 13–30.

The assumed product is the one defined in `CONTEXT.md`: two to four known Players enter a Private Session through a Session Invitation; there is no public discovery, matchmaking, direct messaging, voice chat, or advertising; a Session Identity works without registration; a Player Account is optional after a first Game; answers and drawings are Ephemeral Play Content; and one Player's Group Unlock may unlock the catalog for the Play Group during a Game Session.

## Boundary and status

This is product and engineering research, not legal advice or a certification of compliance. Laws can apply differently according to the operator's establishment, the Player's location, the service's actual audience and use, the chosen legal basis for each processing purpose, and the vendors and data flows eventually used. Store policy is separate from law and can change faster.

The constraints labelled **MVP rule** below are conservative product decisions chosen to reduce foreseeable youth, privacy, store-review, and operational risk. They do not prove compliance. The constraints labelled **launch gate** require qualified review or an external approval before enabling a country or storefront.

## Bottom line

Gamesbud can preserve its intended low-friction experience, including account-free first play, but the safe MVP is narrower than the conceptual product:

- Build one high-privacy experience for everyone, not an adult experience with weaker defaults. Use age ranges only to enforce the 13+ boundary and jurisdictional requirements; do not use age for profiling, analytics, marketing, or pricing. The GDPR requires purpose limitation, minimisation, storage limitation, security, and accountability, gives children's interests particular weight, and requires data protection by design and default.[^gdpr]
- Treat answers and drawings exchanged inside a Private Session as UGC for safety and store-review purposes even though they are neither public nor persistent. Apple requires filtering, reporting, blocking, and contact information for UGC apps; Google requires terms, ongoing moderation, in-app reporting/blocking where applicable, and action against objectionable content and users.[^apple-review][^google-ugc]
- Do not put photos, camera input, imported media, audio, free-form chat, public profiles, friend graphs, or stranger discovery in the MVP. Keep Ephemeral Play Content to constrained text and in-app drawing surfaces. This is a risk-reducing MVP decision, not a claim that those features are prohibited.
- Use first-party, session-scoped measurement only. Do not include ad SDKs, cross-app tracking, advertising identifiers, fingerprinting, or a general third-party analytics SDK in the MVP. Apple requires ATT when data is shared for tracking across apps or websites and prohibits fingerprinting; Google restricts identifiers and SDKs when an app targets both children and older users.[^apple-att][^apple-required-reasons][^google-families-data]
- Sell Group Unlock only through StoreKit/In-App Purchase on iOS and Google Play Billing on Play-distributed Android builds as the default worldwide implementation. Both stores treat unlocking game functionality or digital content as an in-app digital purchase; regional alternatives are a later, separately reviewed variation, not an MVP shortcut.[^apple-review][^google-payments]
- Do not switch on every storefront at once. Maintain a country allowlist. A country enters the allowlist only after the launch checklist in this document is complete for that country, including privacy/children's-law review, store declarations, ratings, payment/consumer terms, hosting and international-transfer analysis, and support readiness.

## Requirements matrix

| Area | Platform-wide MVP rule | Primary basis | Launch-specific gate |
| --- | --- | --- | --- |
| Audience | Market and operate as 13+; reject an under-13 age result; do not use “for kids” positioning or enter Apple's Kids Category. | COPPA applies to under-13 child-directed services and general-audience services with actual knowledge; neutral age screening can be used by a general-audience service.[^ftc-coppa] | Confirm that the design and actual audience support “general audience, 13+” rather than child-directed or mixed-audience treatment in each launch market. |
| Age assurance | Request only the minimum age range needed: under 13, 13–15, 16–17, 18+. Prefer Apple's Declared Age Range and Play Age Signals where available; otherwise use a neutral self-declared age screen. Never store exact birth date. | Apple and Google provide privacy-preserving age-range signals, but both say the developer remains responsible for applicable law; Google's signal may only be used for age-appropriate experiences, not analytics or profiling.[^apple-age-range][^play-age-signals] | Implement required platform signals, parental approvals, and significant-change flows for every regulated region before enabling it; provide a tested fallback for unsupported OS versions and unavailable signals. |
| Consent and lawful basis | Maintain a processing-purpose register. Do not treat acceptance of Terms or one bundled toggle as consent for all processing. Make withdrawal as easy as opt-in. Disable optional analytics for all Players in MVP. | GDPR consent must be specific, distinguishable, clear, withdrawable, and not unnecessarily tied to service access; where consent is relied on for an information-society service, Member States may set the child's consent age between 13 and 16.[^gdpr] | Counsel must select and document the lawful basis for each purpose, map local digital-consent ages, assess minors' contractual capacity, and define any parental-authorisation flow. |
| Data minimisation | Collect only session operations, optional account authentication, entitlement, safety-report, crash/performance, and tightly defined product events. No contacts, location, advertising ID, device fingerprint, or background collection. | GDPR Articles 5 and 25 require minimisation and privacy by default; the UK Children's Code calls for high privacy defaults, minimisation, geolocation off, profiling off, and child-readable transparency.[^gdpr][^ico-code] | Complete a DPIA or equivalent youth/privacy risk assessment before production and repeat it for material changes. GDPR requires a DPIA where processing is likely to create high risk.[^gdpr] |
| Accounts | First Game Session needs no Player Account. Offer account creation only after play. Offer in-app deletion on both platforms and a working web deletion path for Google Play. | Apple says apps without significant account-based features must allow use without login and account-creating apps must offer in-app deletion; Google requires both in-app and web account-deletion paths.[^apple-review][^google-account-deletion] | Review account age/capacity, identity-provider terms, deletion exceptions, and entitlement restoration per market. |
| UGC and safety | Constrain UGC; publish rules; filter before distribution; expose report, block, Host kick, and support-contact actions; operate a documented moderation and escalation queue. | Apple Guideline 1.2 and Google Play's UGC policy apply safety controls to UGC services.[^apple-review][^google-ugc] | Confirm legal reporting/preservation duties, response SLAs, and escalation contacts for child sexual abuse material, threats, self-harm, and other illegal content in each market. |
| Ephemeral content | Delete ordinary Ephemeral Play Content when the session closes, with a hard 24-hour recovery ceiling. Clearly disclose the narrow exception for content attached to a safety report or legal hold. | Storage limitation requires identifiable data to be kept no longer than necessary; transparency must state retention periods or criteria.[^gdpr] | Validate whether any market requires a longer or shorter preservation period for reported content; do not retain everything “just in case.” |
| Analytics and SDKs | No ads, ATT tracking, AAID, fingerprinting, third-party analytics, session replay, heatmaps, or raw UGC in analytics. Use first-party event counts keyed to rotating session identifiers. | Apple requires disclosure of the app and integrated partners' collection, ATT for cross-company tracking, and valid privacy manifests/required-reason declarations; Google makes the developer responsible for SDK data practices and Data Safety accuracy.[^apple-privacy][^apple-att][^apple-sdk][^google-user-data][^google-data-safety] | Review every SDK and processor, device-storage/consent rules, data-transfer mechanism, and privacy label before each release. |
| Purchases | Use a transparent, non-consumable or otherwise clearly defined store product; server-validate transactions; provide restore; make the payer, price, duration, scope, and refund effect clear; no loot boxes, subscription, urgency, or social pressure in MVP. | Store rules require their billing systems for in-app digital unlocks by default and clear pricing; Google Families policy rejects emotionally manipulative purchase tactics and unclear real-money purchases in child-accessible apps.[^apple-review][^google-payments][^google-families] | Confirm the exact SKU type and Group Unlock behavior with both review teams, plus local consumer, refund, tax, and minors' purchase rules. |
| Ratings and declarations | Complete the current Apple questionnaire and Google's IARC questionnaire accurately; disclose interactive and UGC capabilities; resubmit when content or features change. | Apple generates global and region-specific ratings from the required questionnaire; Google requires an IARC rating and can remove unrated or misrepresented apps.[^apple-rating][^google-rating] | Release only where the returned rating admits 13-year-olds and all local classification steps are complete; otherwise adjust content or omit that storefront. |
| Global release | Default-deny country allowlist and geofence unsupported countries at the service layer, not only in store metadata. | Apple ratings and age-assurance behavior vary by region; Google likewise displays region-specific IARC ratings and age signals only in applicable regions.[^apple-rating][^apple-age-regions][^google-rating][^play-age-signals] | Obtain a written go/no-go for every country. “Available in English” does not resolve local privacy, consumer, content, youth, classification, tax, or language obligations. |

## Explicit MVP product constraints

### 1. Age boundary, age assurance, and consent

1. On first launch, determine only one of four bands: **under 13**, **13–15**, **16–17**, or **18+**. Request the platform-provided band first on supported systems. If the platform returns no usable signal, show a neutral month-and-year or age-range screen with no preselected adult value and no copy that tells a Player which answer unlocks the app. FTC guidance describes neutral month/year collection and warns against encouraging age falsification.[^ftc-coppa]
2. An under-13 result stops account creation and networked play and offers a neutral exit. Delete any entered birth information immediately. If support or moderation later gives actual knowledge that a Player is under 13, suspend the Player's network access and route the record through the under-13 deletion/parental-response procedure; COPPA's actual-knowledge rule is not avoided by a 13+ term.[^ftc-coppa]
3. Persist only `ageBand`, `source` (platform/self-declared/guardian where supplied), `assessedAt`, and the minimum regulatory flags needed to enforce age-appropriate behavior. Never persist date of birth or use the band for analytics, segmentation, pricing, recommendations, or marketing. Apple's API is specifically designed to return a range instead of exact birth date; Google's terms restrict its signal to age-appropriate experiences.[^apple-age-range][^play-age-signals]
4. Give 13–17-year-olds the same high-privacy defaults as everyone else. Do not ask for a parent email merely because the Player is under 18. Parental authorisation is introduced only where a documented jurisdictional rule and legal design require it; requesting extra family data “just in case” conflicts with minimisation.[^gdpr][^ico-code]
5. Do not rely on consent for core session routing, security, or entitlement processing without a documented legal analysis. If a future optional purpose does rely on consent, present a separate, age-readable choice; no pre-ticked box, degraded core play, or repeated nagging after refusal; and implement withdrawal. GDPR Article 8's 13–16 Member-State range applies only where consent is the chosen Article 6 basis for the direct offer of an information-society service—it is not a universal account age.[^gdpr]
6. On Google Play, declare the actual target groups that cover 13–30. Because “children” varies by locale, plan the build and SDK set to satisfy the child-included Families path wherever a selected target group is treated as children; do not assume “13+” avoids Families obligations.[^google-target-audience][^google-families]
7. Do not use the App Store or IARC content rating as the in-app age decision. Ratings tell families about content and drive store controls; they do not establish the individual Player's age or replace a locally required age-assurance/parental-authorisation flow.[^apple-rating][^google-rating][^apple-age-range][^play-age-signals]

### 2. Data inventory and collection limits

The approved MVP data inventory is:

| Purpose | Minimum fields |
| --- | --- |
| Private Session | random Session ID, hashed/redeemable invitation secret, Game ID/version, coarse timestamps, role, connection state |
| Session Identity | random participant ID and Player-chosen display name, scoped to one Game Session |
| Ephemeral Play Content | constrained answer/drawing payload, author Session Identity, Game step, created/expiry timestamps |
| Optional Player Account | identity-provider subject, email or Apple private-relay address if supplied, display name, age band/regulatory flags, preferences |
| Group Unlock | store, product ID, platform transaction/purchase token, validation state, entitlement owner, refund/revocation state |
| Safety report | report ID, reporter and subject pseudonymous IDs, category, Player description, minimal attached evidence, moderation actions and timestamps |
| Reliability | error code, app/OS version, coarse device class, latency and crash/performance fields that do not contain UGC or stable device identifiers |
| Product learning | Game/session events listed in the analytics section, keyed to a rotating session ID |

The MVP must not request Contacts, precise or coarse location, microphone, camera, photo library, Bluetooth discovery, phone number, health data, or broad file access. A Session Invitation uses an OS share sheet or a copied link/QR code without reading the address book. If a future Game genuinely needs a permission, it requires a new purpose/necessity review, child-readable just-in-time disclosure, denial fallback, store-declaration update, and DPIA/risk-assessment update. Google limits personal and sensitive data access to expected app functionality and requires prominent in-app disclosure where collection would not reasonably be expected.[^google-user-data]

All network traffic must use current transport encryption; sensitive content and tokens must be encrypted at rest; invitation and reset tokens must be hashed or otherwise stored so a database read cannot directly redeem them; access to report evidence must be role-limited and audited. GDPR requires risk-appropriate technical and organisational security measures, and Google requires secure handling and disclosure of those practices.[^gdpr-security][^google-user-data]

### 3. Retention and deletion schedule

These are MVP maximums, not legal safe harbours. A shorter operational period wins. A documented legal hold may pause deletion only for the affected record.

| Data | MVP retention ceiling | Deletion behavior |
| --- | --- | --- |
| Unredeemed Session Invitation | 30 minutes | Expire and make non-redeemable; retain no raw secret |
| Session state and Session Identity | Session end + up to 24 hours for reconnect/recovery | Automatic hard delete |
| Ordinary Ephemeral Play Content | Session end + up to 24 hours for reconnect/recovery | Automatic hard delete from primary storage; never copy to analytics |
| Age-screen input | In-memory until band derived | Delete exact input immediately; retain only band and minimum provenance |
| Raw operational logs | 30 days | Rolling deletion; redact IP, tokens, names, emails, answers, drawings |
| Raw product events | 30 days | Rolling deletion; aggregate only approved metrics |
| Pseudonymous aggregates | 90 days | Rolling deletion; longer retention only after a documented test that data is no longer reasonably linkable to a Player or device |
| Safety report and attached evidence | 90 days after closure | Encrypt, access-log, and delete automatically unless a documented legal hold or required escalation applies |
| Account profile | Until deletion request or account inactivity policy applies | Disable promptly; delete from primary systems within 30 days, subject to itemised legal/security exceptions disclosed to the Player |
| Entitlement/transaction record | Minimum needed for restore, refunds, fraud, and mandatory accounting/tax records | Separate from gameplay/profile data; delete or de-identify when the applicable obligation and entitlement end |
| Backups | 30 days after primary deletion | Age out without restoration into live use; re-apply tombstones after disaster recovery |

The privacy notice must state these periods or their determination criteria. Store and legal exceptions—such as a minimum transaction record needed to honour restore, refund, accounting, security, or a valid legal hold—must be itemised rather than used to preserve the whole account. GDPR expressly requires storage limitation and disclosure of retention periods/criteria; the amended COPPA Rule also prohibits indefinite retention by covered operators.[^gdpr][^coppa-2025]

### 4. Account and authentication design

- A Player can install, accept the current Terms/community rules, create or join a Game Session, choose a Session Identity, play one complete Game, and receive the result without a Player Account. This follows the product model and Apple's direction to avoid login when significant account features are absent.[^apple-review]
- After the first completed Game, offer a Player Account for cross-device progress, preferences, and entitlement portability. Do not import an identity-provider contact list, avatar, birthday, gender, or social graph.
- On iOS, if Google Sign-In is offered for the primary account, provide Sign in with Apple or another login option satisfying Apple's Guideline 4.8; using Sign in with Apple is the straightforward MVP choice.[^apple-review]
- Account deletion must be reachable inside both apps. It must also be requestable from a stable public web page for Google Play. Explain what will be deleted, what minimal transaction/security records remain and why, and what happens to store restoration before final confirmation.[^apple-review][^google-account-deletion]
- Store ownership and Gamesbud identity are separate. Free play never requires an account. A store purchase can be restored on the purchasing platform without forcing unrelated profile collection. Cross-platform entitlement portability may require an optional Player Account, and the purchase screen must say so before payment.
- Use short-lived access tokens, rotating refresh tokens, provider-token verification, rate limiting, replay protection, device/session revocation, and reauthentication for deletion or sensitive account changes. Do not use Session Invitations as account authentication.

### 5. Private Sessions, UGC, and ephemerality

Private and ephemeral are valuable risk controls, but neither removes the need for UGC controls. Apple's rule covers apps “with user-generated content”; Google's UGC policy requires robust, effective, ongoing moderation and safeguards according to the kind of interaction.[^apple-review][^google-ugc]

The MVP must:

1. Limit creation to structured prompt answers with visible length limits and drawings made in the Gamesbud canvas. Do not allow pasted links, images, files, camera/photo uploads, audio, video, arbitrary chat, or content import.
2. Show age-readable community rules before first networked play and keep them accessible. Prohibit sexual exploitation, sexual content involving minors, grooming, threats, bullying, hate, doxxing, self-harm encouragement, illegal activity, and intellectual-property abuse. Google states that apps which fail to prohibit content facilitating child exploitation or abuse are subject to removal.[^google-child-safety]
3. Run proportionate pre-distribution controls for text and drawings, plus rate/size limits. A filter is not the whole moderation system: a Player must be able to report content or a Player from the active Game screen and the session summary, and the service must act on reports.[^apple-review][^google-ugc]
4. Give every Player **mute/hide**, **block**, **leave**, and **report**. Give the Host **kick** and **revoke invitation**. A block prevents the blocked identity from joining the blocker's future Game Sessions when the service can recognise the identity; for account-free Players, maintain a privacy-preserving local/device block and enforce the active-session removal.
5. Make Session Invitation tokens high entropy, short-lived, revocable, single-session, and excluded from logs, analytics, indexing, previews, and Result Cards. Joining always shows the Game and Host/Play Group context before entry; never auto-enrol from a scanned link.
6. Tell Players before creation: “Answers and drawings are deleted after the Game Session, except material you or another Player reports for safety review.” Do not call content ephemeral if ordinary copies persist in logs, analytics, backups beyond the documented window, support tools, or Result Cards.
7. Keep Result Cards limited to the Game, outcome/score, and a generic challenge. Never include Ephemeral Play Content, Session Identity, invitation token, age band, or Player Account information.

### 6. Safety operations and reporting

- Publish a support/safety contact in the app and store listing. Apple explicitly requires readily available contact information for UGC services.[^apple-review]
- Provide report categories for sexual content/exploitation, threat or immediate danger, bullying/harassment, hate, self-harm, personal information, cheating/spam, and other. Allow a child to report without drafting a legal explanation.
- Acknowledge reports immediately, triage potential immediate danger or child sexual exploitation on an urgent queue, and triage all other MVP reports within 24 hours. This is an internal service target, not a statutory deadline.
- Preserve only the minimum content and context attached to a report. Restrict reviewer access, record every view/export, separate reviewer notes from general analytics, and delete on the retention schedule unless the documented escalation procedure requires a hold.
- Maintain an incident playbook covering account/session containment, Player notification, evidence preservation, platform escalation, qualified legal review, and regulator/law-enforcement reporting. Do not improvise automated scanning or external reporting without assessing accuracy, privacy, security, and local duties.
- Test abuse cases with minor-safety expertise before launch: leaked invitation, hostile known peer, coercion by a Host, repeated rejoin, explicit drawing, self-harm answer, doxxing in a display name, false report, under-13 disclosure, and a reported Player with no account.

For the UK, assume the service needs a formal Online Safety Act scope decision before launch. The statutory definition of a user-to-user service covers an internet service where user-generated/uploaded/shared content may be encountered by another user, regardless of the proportion of UGC; Ofcom says in-scope services likely to be accessed by children must assess access, perform and maintain a children's risk assessment, implement proportionate protections, and provide reporting/complaints.[^uk-osa][^ofcom-children] Invitation-only access does not by itself settle that analysis.

For the EEA, the DSA's “online platform” definition focuses on dissemination to a potentially unlimited public; its recitals distinguish finite, sender-determined interpersonal communication from public dissemination. That makes the Private Session design relevant, but it is not enough here to conclude that Gamesbud falls outside every DSA intermediary/hosting obligation. Obtain a written classification; if it is an online platform accessible to minors, Article 28 requires proportionate measures for a high level of minors' privacy, safety, and security and prohibits profiled ads to known minors.[^dsa]

### 7. Analytics, diagnostics, and SDK governance

Approved first-party MVP events are limited to:

- app opened; age gate completed/blocked (band is not attached to the event);
- Game Session created, invitation redeemed/failed by reason code, Player joined/left;
- Game started/completed/abandoned, Game ID/version, participant count, coarse duration and outcome class;
- screen/step error code, reconnect, latency bucket, crash and performance diagnostics;
- paywall viewed, store flow started, purchase validated/failed/restored/refunded by product and reason code; and
- report submitted and resolved by category and coarse time-to-action, without report text or evidence.

Events use a random identifier that rotates per Game Session. Do not send display names, emails, identity-provider subjects, purchase tokens, IP addresses, invitation tokens, free-form answers, drawing payloads, report narrative/evidence, exact timestamps when a coarse bucket works, or a persistent cross-session/device ID. Application logs must drop or promptly truncate IP addresses at ingress unless a time-limited security control has a documented need.

Do not ship Firebase Analytics, Google Analytics, Meta SDK, ad attribution, session replay, heatmaps, fingerprinting libraries, or another general event SDK in the MVP. A future SDK requires a named owner, data-flow capture, contract/DPA and subprocessor review, child-directed/Families eligibility check, privacy/security review, retention configuration, deletion test, transfer assessment, store-label diff, and kill switch. Google says the app is responsible for third-party code and forbids child-accessible builds from transmitting specified persistent identifiers from children or unknown-age users; Apple makes developers responsible for integrated partners' collection and requires manifests/signatures for listed SDKs, including Capacitor.[^google-user-data][^google-families-data][^apple-privacy][^apple-sdk]

The iOS build should not request ATT because the MVP performs no tracking. It must include accurate `PrivacyInfo.xcprivacy` data declarations and approved reasons for any required-reason API used by the app or dependencies; App Store Connect rejects missing required-reason declarations and invalid manifests.[^apple-att][^apple-required-reasons][^apple-sdk]

Before submission, reconcile one machine-readable data inventory against all four surfaces: runtime network observations, privacy policy, Apple's App Privacy answers, and Google Play Data Safety. Apple requires disclosure of the app and third-party partners' collection, and Google requires every published app to complete an accurate Data Safety form and provide a privacy policy, even when no user data is collected.[^apple-privacy][^google-data-safety]

### 8. Group Unlock and purchases

Group Unlock is a digital feature/content unlock. The baseline iOS flow therefore uses StoreKit In-App Purchase and the baseline Play-distributed Android flow uses Google Play Billing. Storefront-specific alternative billing or external-link programs are excluded from MVP because eligibility, disclosures, fees, APIs, and permitted UX vary by region and are changing.[^apple-review][^google-payments]

MVP purchase behavior:

1. Define one clear product: preferably a non-consumable catalog entitlement owned by the purchaser. “Group” describes temporary access during a Game Session, not transfer of ownership to other Players.
2. When any present Player has a valid Group Unlock, the server unlocks eligible catalog Games for that Play Group only while that Player remains in the Game Session. Other Players receive no durable entitlement, gift, currency, or transferable token.
3. Validate signed store transactions on the server, make processing idempotent, handle pending/failed/duplicate purchases, and consume/acknowledge only according to the selected store product type. Apply refund and revocation notifications to future entitlement checks.
4. Put price, currency, product duration, scope, payer ownership, restore behavior, account/cross-platform limits, and refund effect adjacent to the buy button. Google requires clear and accurate terms and pricing; Apple requires an understandable business model and IAP.[^google-payments][^apple-review]
5. Provide **Restore Purchases** without requiring a new purchase. If a Player Account is needed for cross-platform portability, disclose that before purchase; never require it for free play.
6. Never show a countdown, fake scarcity, random reward, loot box, repeated interruption, guilt (“your friends are waiting”), public non-payer badge, or prompt that asks another Player to pressure the payer. Google Families policy expressly prohibits shocking or emotionally manipulative tactics encouraging child-accessible IAP and requires a clear distinction between virtual and real money.[^google-families]
7. Present the native store purchase sheet and respect Apple Ask to Buy / Google family purchase approvals where configured. These controls can let a family organiser approve a child's IAP, but their presence does not by itself resolve local contractual or consent law.[^apple-ask-to-buy][^google-family-payment]

The App Review notes and Play review-access instructions must explain Group Unlock with a two-device demo: who owns the product, why other Players can use catalog Games only during the purchaser's active Private Session, what happens when the purchaser leaves, how restore works, and that no entitlement is gifted or traded. Obtain written review feedback before depending on this model commercially.

### 9. Age ratings and store declarations

- Complete Apple's current age-rating questionnaire rather than self-selecting “13+.” Apple produces a global rating plus region-specific ratings from disclosed content descriptors, in-app controls, and capabilities; the rating is required.[^apple-rating]
- Complete Google's current IARC questionnaire and the Target Audience and Content declaration. Google produces ratings from multiple regional authorities, requires a rating for every active app, and requires a new questionnaire when content/features change the answers.[^google-rating][^google-target-audience]
- Describe the real interactive design: constrained answers/drawings shared within a finite invitation-only group; no public feed, matchmaking, direct chat, voice, imported media, ads, or unrestricted web access; report/block/Host controls; and automatic deletion. Do not answer “no UGC” merely because content is private or ephemeral. Where Apple's rating definition of UGC refers to “broad distribution,” ask App Review how to declare the finite-group capability and retain the response.[^apple-rating]
- Keep provider-authored MVP content compatible with the youngest intended Player in every enabled region: no sexual content, realistic violence, gambling/simulated gambling, drugs, strong profanity, horror likely to push the returned rating above the 13-year-old audience, or external unrestricted web content. This is a product target; the authorities' returned ratings control release.[^apple-rating][^google-rating]
- If any authority returns a rating that excludes 13-year-olds, either change the content/features and rerate or remove that storefront. Never use an in-app 13+ statement to contradict a higher official classification.
- Finish country-specific game classification before enabling the storefront. Apple, for example, requires a GRAC Rating Classification Number for certain apps offered in South Korea; requirements and generated ratings also change by region and OS version.[^apple-app-info]
- Keep Apple App Privacy, Google Data Safety, privacy-policy, account-deletion, content-rating, target-audience, ads (“no”), IAP, review-access, and support-contact declarations in release version control and review them on every dependency or feature change.[^apple-privacy][^google-data-safety]

## Data-subject and family-facing controls

The in-app Privacy & Safety area must be available without a Player Account and use language understandable at age 13. It provides:

- what data is collected and why, retention periods, vendors/recipients, contact and complaint routes;
- session-content deletion explanation and safety-report exception;
- optional account access/export, correction, deletion, provider unlinking, and token/session revocation;
- a way to request deletion of account-free session/support data using the minimum verification possible;
- report history/status where exposing it does not compromise another Player's privacy or safety;
- age-band correction/reassessment without exposing an exact birth date; and
- store purchase restoration and refund-help links.

GDPR Article 12 requires concise, transparent, intelligible, accessible, clear language, especially for information addressed to a child. The UK Children's Code additionally calls for prominent, accessible tools through which children can exercise privacy rights and report concerns.[^gdpr][^ico-code]

## What is universal and what is jurisdiction-specific

### Safe to specify platform-wide

The following product architecture does not depend on finding a single global age of consent: 13+ positioning; under-13 block; high-privacy defaults for all; exact-birth-date avoidance; no ads/tracking/AAID/fingerprinting; no contacts/location/camera/audio/imported media; account-free first play; optional minimal account; private finite Sessions; constrained Ephemeral Play Content; report/block/kick/leave; short retention; first-party session analytics; native store billing; no manipulative monetisation; accurate store declarations; and country allowlisting.

These rules reduce data and risk everywhere, but they do not replace local legal review.

### Must remain a launch-jurisdiction gate

| Market/scope | Required pre-launch decision |
| --- | --- |
| EEA | Confirm GDPR territorial scope, controller/processor roles, Article 6 basis by purpose, each Member State's Article 8 age if consent is used, child-readable notices, DPIA outcome, EU representative/DPO need, processor contracts, hosting/transfers, rights workflow, and breach procedure. Obtain a DSA classification; Private Sessions may be relevant to the public-dissemination test but are not a self-declared exemption.[^gdpr][^dsa] |
| United Kingdom | Apply the Children's Code or document a defensible alternative only after qualified review; complete data-protection/age-assurance analysis and a DPIA. Obtain an Online Safety Act scope decision and, if in scope, complete the required access/risk assessments, controls, records, complaints, and reporting design before public launch.[^ico-code][^uk-osa][^ofcom-children] |
| United States | Confirm general/mixed/child-directed status under current COPPA and maintain the under-13 actual-knowledge response. Review state privacy, minors, consumer, auto-renewal, app-store age-signal, and parental-approval laws for every enabled state; wire Apple/Google regional age signals where required. If CCPA applies, Gamesbud's no-sale/no-share rule avoids the under-16 opt-in path only if actual vendor/data flows genuinely do not constitute sale or sharing.[^ftc-coppa][^coppa-2025][^california-minors][^apple-age-regions][^play-age-regions] |
| Every other country | Review local child definition/consent and capacity, privacy/data localisation/transfer, online safety and illegal-content process, game classification, UGC, consumer/refund, payments/tax, sanctions and required-language rules. Verify that both stores, backend vendors, support, and moderation can serve the country before allowlisting it. |

“Global availability” should therefore mean **an expanding reviewed allowlist**, not “all countries on day one.” Store availability and backend access must use the same source of truth. When location cannot be reliably determined without collecting more personal data, storefront country, billing storefront, platform regulatory signal, and coarse server-derived country used transiently at the edge can inform the allowlist; do not add precise GPS.

## Downstream constraints for planned work

- [Issue #7 — install-to-join](https://github.com/todorone/gamebuds/issues/7): preserve only a short-lived, non-logged Session Invitation through installation; do not read Contacts; show context and explicit join before entry; run the age decision before collecting Session Identity or analytics; support revoke, expiry, safe failure, and country-denied states.
- [Issue #11 — identity and entitlement](https://github.com/todorone/gamebuds/issues/11): model Session Identity as session-scoped and expiring; keep first play accountless; implement age-band provenance, in-app/web deletion, restore/revocation, and a payer-owned Group Unlock whose benefit is non-transferable and limited to an active Game Session.
- [Issue #13 — measurement](https://github.com/todorone/gamebuds/issues/13): metric definitions must work with rotating session IDs and aggregate counts. Invitation attribution cannot justify a persistent cross-app/device identifier; no display name, answer, drawing, report evidence, exact birth data, invitation token, IDFA, or AAID may enter events.
- [Issue #15 — Result Card](https://github.com/todorone/gamebuds/issues/15): cards and share payloads must exclude Session Identity, Ephemeral Play Content, age band, account data, and live invitation secrets; use the OS share sheet without reading recipients; any install attribution must obey the same short retention and no-tracking rule; the UX must not shame or pressure Players to return or buy.

## Launch-gate checklist

All items below are unresolved until evidence is attached to the release record:

- [ ] Legal entity, controller, privacy/safety contacts, support hours, and incident owners are named.
- [ ] Initial country/state storefront allowlist is explicit; “worldwide” is not selected.
- [ ] Per-country legal memo covers youth/privacy consent or other legal bases, minors' capacity, UGC/online safety, purchases/consumer rules, rating/classification, hosting/transfers, and required languages.
- [ ] Data map identifies every field, event, log, backup, processor, subprocessor, region, retention job, access role, and deletion path.
- [ ] DPIA/youth safety risk assessment is approved and includes age assurance, invitations, UGC, moderation, analytics, entitlement, and vendor failure modes.
- [ ] Under-13, parental-authorisation/significant-change, consent-revocation, and age-band-change paths are implemented and tested for each enabled regulated region.
- [ ] Community rules, privacy notice, Terms, purchase disclosures, deletion page, support and safety processes are live and readable at age 13.
- [ ] Moderation has trained human coverage, urgent escalation, access controls, audit logs, retention automation, and test reports for all abuse scenarios.
- [ ] Security review covers invitation entropy/leakage, authentication, store receipt validation, replay/abuse, UGC isolation, encryption, secrets, rate limits, account deletion, backups, and breach response.
- [ ] Apple App Privacy, privacy manifest/required reasons, age rating, IAP, account deletion, login, UGC, and review notes match the shipped binary and observed traffic.
- [ ] Google Data Safety, privacy policy, target audience/Families treatment, SDK/identifier behavior, IARC rating, billing, account deletion web path, UGC, ads declaration, and review access match the shipped binary and observed traffic.
- [ ] Returned rating in every enabled territory admits a 13-year-old; local classification IDs/approvals are recorded.
- [ ] Group Unlock has store-review confirmation, exact SKU/restore/refund/revocation semantics, server validation, and a minors-safe purchase UX.
- [ ] Production retention/deletion jobs and data-subject requests have passed end-to-end tests, including backups and account-free Session Identity.
- [ ] A release owner rechecks store policies and launch-country law immediately before submission; this research snapshot is not treated as permanently current.

## Sources

### Apple

[^apple-review]: Apple, [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) (notably 1.2 UGC, 3.1.1 IAP, 4.8 login, and 5.1.1 privacy/account deletion).
[^apple-age-range]: Apple Developer Documentation, [Requesting people's age range information in your app](https://developer.apple.com/documentation/declaredagerange/requesting-people-share-their-age-range-with-your-app) and [Declared Age Range overview](https://developer.apple.com/documentation/DeclaredAgeRange).
[^apple-age-regions]: Apple Developer, [Age requirements for apps distributed in Brazil, Australia, Singapore, Utah, and Louisiana](https://developer.apple.com/news/?id=f5zj08ey) and [Age assurance frameworks Q&A](https://developer.apple.com/support/age-assurance).
[^apple-att]: Apple Developer Documentation, [App Tracking Transparency](https://developer.apple.com/documentation/apptrackingtransparency) and Apple Developer, [User Privacy and Data Use](https://developer.apple.com/app-store/user-privacy-and-data-use/).
[^apple-required-reasons]: Apple Developer Documentation, [Describing use of required reason API](https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api).
[^apple-privacy]: Apple Developer, [App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/).
[^apple-sdk]: Apple Developer, [Third-party SDK requirements](https://developer.apple.com/support/third-party-SDK-requirements/) and [Adding a privacy manifest](https://developer.apple.com/documentation/bundleresources/adding-a-privacy-manifest-to-your-app-or-third-party-sdk).
[^apple-rating]: Apple App Store Connect Help, [Set an app age rating](https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating) and [Age ratings values and definitions](https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions/).
[^apple-app-info]: Apple App Store Connect Help, [App information reference](https://developer.apple.com/help/app-store-connect/reference/app-information/app-information).
[^apple-ask-to-buy]: Apple Support, [Approve what kids buy and download with Ask to Buy](https://support.apple.com/en-euro/105055).

### Google Play and Android

[^google-ugc]: Google Play Console Help, [User-generated content](https://support.google.com/googleplay/android-developer/answer/9876937?hl=en).
[^google-user-data]: Google Play Console Help, [User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en).
[^google-data-safety]: Google Play Console Help, [Provide information for Google Play's Data safety section](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en).
[^google-account-deletion]: Google Play Console Help, [Understanding Google Play's app account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en).
[^google-payments]: Google Play Console Help, [Payments](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en) and [Understanding Google Play's payments policy](https://support.google.com/googleplay/android-developer/answer/10281818?hl=en).
[^google-rating]: Google Play Console Help, [Content Ratings](https://support.google.com/googleplay/android-developer/answer/9898843?hl=en) and [Content rating requirements](https://support.google.com/googleplay/android-developer/answer/9859655?hl=en).
[^google-target-audience]: Google Play Console Help, [Manage target audience and app content settings](https://support.google.com/googleplay/android-developer/answer/9867159?hl=en).
[^google-families]: Google Play Console Help, [Developer Program Policy — Families and monetisation](https://support.google.com/googleplay/android-developer/answer/17105854?hl=en).
[^google-families-data]: Google Play Console Help, [Data practices in Families apps](https://support.google.com/googleplay/android-developer/answer/11043825?hl=en).
[^google-child-safety]: Google Play Console Help, [Developer Program Policy — Child Endangerment](https://support.google.com/googleplay/android-developer/answer/17105854?hl=en).
[^play-age-signals]: Android Developers, [Play Age Signals overview](https://developer.android.com/google/play/age-signals/overview) and [Use Play Age Signals API](https://developer.android.com/google/play/age-signals/use-age-signals-api).
[^play-age-regions]: Google Play Console Help, [Changes to Google Play for upcoming app store bills for users in applicable US states](https://support.google.com/googleplay/android-developer/answer/16569691?hl=en).
[^google-family-payment]: Google Play Help, [Use a family payment method on Google Play](https://support.google.com/googleplay/answer/6294544?hl=en).

### Legislation and regulators

[^gdpr]: European Union, [General Data Protection Regulation](https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng), especially Articles 5–8, 12–13, 25, 35 and 44–49.
[^gdpr-security]: European Union, [General Data Protection Regulation](https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng), especially Articles 25 and 32–34.
[^dsa]: European Union, [Digital Services Act](https://eur-lex.europa.eu/eli/reg/2022/2065/oj/eng), especially recitals 13–15, Article 3 and Article 28.
[^ftc-coppa]: US Federal Trade Commission, [Complying with COPPA: Frequently Asked Questions](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions), especially coverage, actual knowledge, general/mixed audience and neutral age-screen guidance.
[^coppa-2025]: US Federal Trade Commission, [COPPA Final Rule Amendments](https://www.ftc.gov/legal-library/browse/federal-register-notices/16-cfr-part-312-coppa-final-rule-amendments) and [FTC summary of the final changes](https://www.ftc.gov/news-events/news/press-releases/2025/01/ftc-finalizes-changes-childrens-privacy-rule-limiting-companies-ability-monetize-kids-data).
[^california-minors]: California Legislature, [Civil Code § 1798.120](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.120) (under-16 sale/share opt-in where the CCPA applies).
[^ico-code]: UK Information Commissioner's Office, [Age appropriate design: a code of practice for online services](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/) and [Code standards](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/code-standards/). The ICO notes that this guidance is under review following the Data (Use and Access) Act 2025, so recheck it at launch.
[^uk-osa]: UK, [Online Safety Act 2023 explanatory notes](https://www.legislation.gov.uk/ukpga/2023/50/notes/division/6/index.htm), especially sections 3–4.
[^ofcom-children]: Ofcom, [Protection of children duties under the Online Safety Act](https://www.ofcom.org.uk/online-safety/protecting-children/protection-of-children-duties-under-the-online-safety-act) and [Gaming: know the online safety risks, the rules, and how to comply](https://www.ofcom.org.uk/online-safety/illegal-and-harmful-content/the-online-safety-act-and-gaming-know-the-risks-know-the-rules-know-how-to-comply).

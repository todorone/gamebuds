---
status: accepted
---

# Solo-friendly mobile and realtime architecture

Gamebuds is built by a solo, AI-assisted creator shipping iOS and Android within roughly nine months, and needs reliable low-latency Game Sessions for two to four co-located phones plus auth, purchases, and analytics. We decided on an in-house Cloudflare-native backend (Hono + Workers, D1, R2, Drizzle, Better Auth) with WebRTC device-to-device data channels for Game Sessions, rather than a bundled BaaS (Firebase/Supabase) or a server-authoritative relay (Durable Objects terminating WebRTC). The driving reason: the creator wants to own the stack end-to-end on a single platform (Cloudflare) with minimal third-party vendors, accepting the added reliability risk of phone-hosted session state as a deliberate, spike-tested trade-off rather than paying for a managed alternative up front.

## Decisions

- **Client foundation**: keep the existing Capacitor + Phaser + Vite/TypeScript scaffold; not reopened by this ADR. _Amended by [ADR 0004](0004-react-shell-with-per-game-phaser-lifecycle.md): a React shell now owns the Catalog and navigation, with each Game mounting its own `Phaser.Game` instance; Capacitor, Phaser, and Vite/TypeScript themselves are unchanged._
- **Backend**: Hono on Cloudflare Workers, D1 (via Drizzle ORM) for durable data, R2 for object storage (e.g. Result Card images), Better Auth for Apple/Google sign-in.
- **Realtime transport**: WebRTC data channels, **device-to-device** (not terminated at a Durable Object). Topology is a star: every non-Host Player's phone connects directly to the **Host**'s phone, which holds authoritative Game Session state. The Hono backend/Durable Objects handle only signaling (SDP/ICE exchange), not the data path.
- **Host-disconnect behavior (v1)**: if the Host's phone drops, the Game Session ends. No host migration in the first cut.
- **Session Invitation / deep linking**: self-hosted Universal Links (iOS) / App Links (Android) for installed Players. For uninstalled Players, no deferred deep linking is implemented — the Player installs from the store and taps the Session Invitation link/QR again. No third-party linking platform (Branch, AppsFlyer, etc.).
- **Purchases (Group Unlock)**: RevenueCat wraps StoreKit/Play Billing, receipt validation, and cross-platform entitlement sync; Group Unlock's "any Player in the group" check is a custom lookup against RevenueCat-synced entitlement data at session-join time.
- **Analytics & observability**: self-hosted OpenObserve, fed by an OpenTelemetry client on mobile (traces/metrics for reliability — connection latency, reconnects — and structured log events for product/behavioral analytics and RUM). Firebase Crashlytics is used narrowly for native crash reporting only; no other Firebase product is adopted.
- **Deployment**: Wrangler-deployed Workers/D1/R2, a direct consequence of the backend choice above rather than a separate fork.

## Considered options

- **Bundled BaaS (Firebase or Supabase)**: rejected in favor of the in-house Cloudflare stack the creator specifically wanted to run — fewer platforms, but more code to own.
- **WebRTC terminated at a Durable Object (server-authoritative)**: would have removed the Host-as-single-point-of-failure risk and kept unreliable/unordered delivery, but was rejected in favor of true device-to-device for the first attempt.
- **Third-party deferred deep linking (Branch/AppsFlyer/Adjust)**: rejected as unnecessary vendor/tracking surface for a private, no-discovery product with a youth audience; "tap the link again" accepted instead, pending spike evidence.
- **Raw StoreKit/Play Billing integration**: rejected in favor of RevenueCat to avoid hand-building receipt validation and store webhook handling.
- **Firebase Analytics / PostHog**: rejected in favor of the creator's existing self-hosted OpenObserve instance.

## Consequences

- Host-phone-as-authority means a backgrounded, disconnected, or killed Host app ends the Game Session for the whole Play Group; this is an accepted v1 risk, not an oversight.
- No deferred deep linking means a newly-installed Player must re-open the Session Invitation after store install; this trades build effort for a small amount of join friction.
- This bundles several technology choices that would each take real effort to reverse (backend platform, realtime transport, auth provider, purchase vendor); revisit as a whole via a new ADR rather than piecemeal if the spikes below invalidate a piece of it.

## Open questions for the technical spike

1. WebRTC device-to-device connection success rate on real cellular networks for 3–4 phones, and whether Cloudflare's TURN relay is wired in as a fallback.
2. Real-world Host-disconnect frequency, to decide if host migration becomes necessary.
3. Whether "tap the link again" breaks the join flow in practice.
4. Better Auth Apple Sign-In on the Workers runtime, and whether open bug #4203 (session refresh from secondary storage) affects this setup.
5. RevenueCat webhook integration into Hono/D1 and the latency of the Group Unlock entitlement check at session-join time.
6. Whether the OpenTelemetry Web SDK inside the Capacitor WebView captures useful data without excessive battery/data cost, and reaches the self-hosted OpenObserve instance reliably over mobile networks.

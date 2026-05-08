# Divvy V2 Strategy — Friend-Group Utility Belt

**Generated:** 2026-05-08
**Status:** Strategic plan, not yet a build plan. See `PLAN.md` for current V1 work.

---

## Headline

The "friend-group utility belt" category is **genuinely vacant** — Geneva got acquired by Bumble (May 2024) and folded into BFF; Houseparty died (Oct 2021); Cozi / FamilyWall / Picniic are kitchen-sink failures (Cozi: 2.1★ on Trustpilot after May 2024 paywall). No incumbent owns "the app your friend group opens when you're doing something together."

**The pivot writes itself**, but **stage it.** Don't flip positioning yet. Reasoning:

- "Splitwise alternative" is a high-intent ASO term right now. Splitwise users are actively fleeing daily caps + ads (Reddit, App Store reviews). That's free acquisition.
- Broad positioning ("your friend group's app") matches no high-intent search. ASO research consistently favors niche keywords for indie apps.
- Slack and Discord pivoted from **internal product-market fit**, not marketing aspiration. Divvy hasn't won the bill-splitting niche yet — there's no traction base to rebrand from.

**Phased plan:**
1. **Phase 1 (now → 6mo):** Stay "Splitwise alternative" in App Store metadata. Capture refugee flow. Add new features as **modules** with their own subtitle rotations + screenshot variants.
2. **Phase 2 (6–12mo):** Once 3–4 features are live, A/B test broader tagline. Start with subtitle/secondary copy, not the app name.
3. **Phase 3:** Rebrand only if multi-tool retention metrics prove the thesis (do bill-split users actually open Secret Santa?).

The thing to avoid: a Cozi-style "kitchen sink, mediocre at everything, aggressive paywall" perception.

---

## The three planned features — ranked

### 1. Game scoring (highest strategic value)

**Why first:** every existing score-tracker (BG Stats, Scory, Tally, Score Anything) assumes one device passed around the table. **None use a multi-phone-join code pattern.** Divvy already has the join-code primitive — this is the cleanest free differentiation in any of the three feature categories.

**Spec:**
- Generic point tracker V1 (any game), templates V2 (Alias, Catan, poker)
- High-wins / low-wins toggle
- Live multi-device scoreboard via existing `subscribeToGroup` pattern
- New RTDB path `/groups/{id}/games/{gameId}` with `{ id, name, scoringDirection, participants, scores, rounds?, startedAt, endedAt? }`
- No notifications needed (live presence)

**Effort:** 3–5 days. New screen, new path, no new infrastructure.

**Distribution angle:** "best Catan score app" is wide open in TikTok-coded content (BG Stats is BGG-forum-coded). Tabletop community on Instagram and TikTok is highly engaged.

### 2. Secret Santa (acquisition wedge, not retention)

**Why second:** seasonal Nov 15 – Dec 20 spike. Once-a-year use means **retention isn't the metric** — acquisition is. Elfster has 4.9★ but recent (Dec 2025) reviews show login failures, broken iOS, primitive search. There's a quality opening.

**Spec:**
- Group → "Start Secret Santa draw" → exclusion rules (couples, etc) → draw → private assignment per participant
- Push notification: "Your Secret Santa is ready! Tap to see who you got."
- Optional wishlist per person within the draw
- RTDB path `/draws/{drawId}` with per-user-readable `assignments/{uid}` paths

**Privacy decision:** V1 = client-side draw (organizer momentarily sees all assignments before they're written to private paths). V2 = Cloud Function for true zero-knowledge (requires Firebase Blaze plan).

**Effort:** 3–4 days for the draw + privacy paths. +1 day to wire `expo-notifications` + FCM (reusable for birthday reminders, settle-up reminders).

**Distribution angle:** standalone landing page `divvy.app/santa` for SEO. Apple Search Ads on "secret santa app" in November is cheap relative to year-round bill-split keywords.

### 3. Birthday wishlist (compounding value)

**Why third:** this category is underserved as a standalone (Giftful, Giftster, DreamList, WishGiven all do roughly the same thing, none dominant) but **perfect-fit inside a multi-tool.** Throne is the breakout in adjacent space but it's creator-gifting, not friend-groups. Most friend groups currently default to Amazon Wishlist or a screenshot in the group chat.

**Spec:**
- Per-member wishlist: `/groups/{id}/wishlists/{memberId}` with item array
- Item: `{ id, title, url?, priceCents?, claimedBy?, claimedAt? }`
- **Privacy gotcha:** RTDB rules can't mask fields per-user, so split into public path (`items`) + private path (`claims`) so wishlist owner doesn't see who claimed what (preserves the gift surprise)
- Birthday reminders via push (reuses Secret Santa's FCM scaffolding)

**Effort:** 2 days. New screen, new path, reuses notification scaffolding.

**Compounding angle:** every group member has a birthday → ~12 wishlist activations/year/group. Highest engagement-per-feature ratio of the three.

---

## Other adjacencies — beyond V2

Research-validated map of what friend groups do that's underserved:

| Activity | Status | Verdict for Divvy |
|---|---|---|
| **Group gift pool** ("we're each chipping in $30 for Alice's gift") | No clear owner | ✅ Natural extension of bill-splitting |
| **Trip "who's bringing what"** / potluck planning | Wanderlog owns trip itinerary; the sub-niche of who-brings-what is uncontested | ✅ Strong fit, low effort |
| **Post-event photo albums** | Retro (~1M users) and Locket (80M downloads) prove pattern | ✅ Bolt onto groups, but high effort |
| **Friendly bets** | WagerLab / BettorEdge / Friendly Wagers — fragmented, no breakout | 🟡 Niche; revisit if user-requested |
| **Group fitness challenges** | Strava owns runners; rest are utility-only | 🟡 Year-end ("no spend Jan", New Year fitness) angle only |
| **Recipe/potluck coordination** | Genuinely underserved | 🟡 Worth exploring V3+ |
| **Movie picking** | Reelgood / Plex have weak voting | 🟡 Revisit |
| **Polls / "where to eat?"** | iOS 26 just shipped native iMessage polls | ❌ Avoid — Apple just absorbed this |
| **Calendar** | Cozi's grave | ❌ Avoid |
| **Group chat** | Discord/WhatsApp own this | ❌ Avoid |
| **Live video hangouts** | Houseparty's grave | ❌ Avoid |

**Cleanest greenfields if asked to rank:** group gift pool > trip-bring-what > friendly bets > post-event photos.

---

## Monetization rethink

V1 plan in `ANALYSIS.md` was **$4.99 lifetime per device** (Splid-style) for Splitwise alternative positioning. The multi-tool framing changes the math.

**What works in adjacent multi-tool categories:**
- BG Stats: one-time paid app + $0.99/yr cloud sync — users love this
- Cozi/FamilyWall: $39–45/yr — users hate the gating but pay anyway because of switching cost (years of family data)
- Marco Polo: $5/mo — generates real revenue ($700K/mo) but heavy review backlash on the specific features paywalled
- Bumble BFF (post-Geneva): free, monetized via cross-product (Bumble dating)
- Throne: zero subscription, takes 7–8.9% per gift transaction

**For Divvy specifically:**
- Single Pro tier, **$2.99/mo or $19.99/yr or $34.99 lifetime** (gives users the choice — research suggests lifetime tiers are increasingly the indie sweet spot)
- **Avoid feature-level paywalls** — Cozi and Splitwise both lose users to this. Users find them confusing and resentful.
- Frame Pro around **capacity**, not capability:
  - Free Secret Santa works for groups ≤8; Pro unlocks larger
  - Free game scoring keeps last 10 sessions; Pro keeps unlimited history
  - Free expense splitting keeps 1–2 active groups; Pro unlocks unlimited
- **Never paywall:** core split math, simplify-debts, settle-up — those are the explicit anti-Splitwise positioning

The **anonymous group identity** (6-letter code, no signup) is itself a paid-quality differentiator — Spllito and Kittysplit prove no-account demand. Divvy can charge Pro fees without ever forcing signup.

---

## Distribution playbook (now possible because of multi-tool framing)

1. **Seasonal pulses Splitwise can't reach:**
   - **Secret Santa Nov 15 – Dec 20.** Apple Search Ads on "secret santa app" — cheap vs. year-round bill-split keywords. Standalone landing page `divvy.app/santa`.
   - **Birthdays continuous.** Wishlist features compound month-by-month.
   - **New Year's:** "no spend challenge" / fitness challenge angle.
2. **6-letter code virality compounds with every feature added.** Each new feature = new viral surface ("join my Catan tally," "join the family Secret Santa"). k-factor *multiplies*, not adds.
3. **TikTok game-night content.** Tabletop communities are highly engaged on TikTok and Instagram. "Best [game] score app" is wide open vs. BG Stats's BGG-forum-coded SEO.
4. **University freshman wedge.** Bill-split + Secret Santa + game scoring is dorm-life-perfect.
5. **Reddit refugees from r/Splitwise.** Active threads asking for alternatives. Direct messaging that name-drops the daily caps.

---

## Concrete next-build roadmap

This is Phase 2 / 3 after V0.1 → V1 work in `PLAN.md` lands.

```
V1.5  Post-launch hardening  (~2 weeks)
  ├── Push notifications scaffold (FCM + expo-notifications)
  │   — needed by Secret Santa, birthday reminders, settle-up reminders
  ├── Perf fixes (addGroup → reload chain, GroupsContext.refresh selective fetch)
  └── 3-group free / unlimited Pro paywall via RevenueCat
       — single Pro tier, capacity-based limits, no feature unlocks

V2  Game scoring + Birthday wishlist  (~1 month)
  ├── Generic point tracker module (any game, multi-phone real-time)
  ├── Birthday wishlist with claim-hidden-from-owner privacy
  └── ASO test: subtitle "Split bills + score games + plan gifts"

V2.5  Seasonal Secret Santa  (~2 weeks, ship by mid-November)
  ├── Draw + private per-uid assignment paths + push notification flow
  ├── divvy.app/santa standalone landing
  └── Apple Search Ads campaign for "secret santa app"

V3  Data-driven adjacencies  (~1 month, choose based on V2 retention data)
  ├── Group gift pool (cleanest extension of bill-splitting)
  ├── "Who's bringing what" / potluck lists
  └── Optional: post-event shared photo albums (Retro pattern)

Phase 3 rebrand decision  (only if multi-tool retention data supports)
  └── App name change + broader tagline + new ASO surface
```

---

## Risks

1. **Feature catalog trap.** Cozi shows what happens when "all-in-one" becomes "mediocre at everything." Each new feature must hit Streaks-level polish or skip.
2. **Notification reliability.** FamilyWall's reviews are full of "notifications stopped working" complaints. FCM + APNS need real testing on actual devices, not just emulator.
3. **Privacy bugs in Secret Santa or Wishlist.** Both rely on RTDB rules that hide data from the owner. A misconfigured rule = ruined surprise = trust loss + Reddit thread. Test rules with the smoke-test pattern before launch.
4. **iMessage polls (iOS 26)** ate the casual "where to eat" niche. Don't build polls; if you do, the angle is persistence/history that iMessage can't match.
5. **Seasonal Secret Santa misses December.** Has to ship before Nov 15 to catch the window. Late = lost a year of acquisition.

---

## Sources (research-driven)

Friend group app landscape: TechCrunch (Bumble buys Geneva, May 2024), Failory (Houseparty post-mortem), Variety (Houseparty shutdown), Trustpilot (Cozi 2.1★), Calendara (Cozi 2026 review), Educational App Store (FamilyWall).

Score trackers: bgstatsapp.com, Denexa Games review roundup, Tally App Store reviews.

Secret Santa: YourAppLand (Elfster vs DrawNames), JustUseApp (Elfster reviews).

Wishlists: Geekflare universal wishlist apps, Throne via Whop, getwish.app comparisons.

Adjacencies: Wanderlog, Locket via TechCrunch (80M downloads), Retro via TechCrunch (Apr 2024 collaborative journals + Dec 2025 time-travel), WagerLab, Strive, Strava Group Challenges.

Pivot pattern reading: StartupArchive (Slack from Glitch), Digital Trends (Discord rebrand).

iMessage threat: Apple Magazine on iOS 26 polls.

ASO/keyword strategy: Apptweak, MobileAction.

Splitwise refugee data: Splitty, PartyTab, Reddit r/Splitwise threads via Oreate AI summary.

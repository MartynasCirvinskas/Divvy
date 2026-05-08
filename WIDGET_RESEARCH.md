# Divvy Widget Research — May 2026

Research-driven brief on home-screen widgets for Divvy (RN 0.74, Expo SDK 51, Android-first). Bottom line: **V1.1 retention boost, not day-one launch differentiator.** Specifically a Balance + Quick-Add Android widget — directly attacks Splitwise's #1 unfulfilled feature request.

---

## Headline finding

**Splitwise has no widget on either platform** — and "home screen widget" / "quick add expense widget" have been the top-voted requests on their feedback forum for years, unfulfilled. That's a real wedge for Divvy.

## Tech stack reality (Expo SDK 51, RN 0.74)

| Platform | Library | Maturity | Effort to ship balance widget |
|---|---|---|---|
| **Android** | [`react-native-android-widget`](https://github.com/sAleksovski/react-native-android-widget) v0.20.3 (May 2026) | ✅ Active, Expo config plugin, ~859 stars, 43 releases | **~2-4 days** for data-only + tap-to-deep-link |
| **Android** (interactive) | Same lib + PendingIntent | Doable but more native Android work | +1-3 days for in-widget actions |
| **iOS** (today) | [`expo-apple-targets`](https://github.com/EvanBacon/expo-apple-targets) (Evan Bacon) — scaffolds SwiftUI widget into `/targets`, plugin patches Xcode on prebuild | Stable but you must write SwiftUI by hand | **~5-8 days** for solo dev with no Swift |
| **iOS** (post-SDK-56) | Official `expo-widgets` module — alpha SDK 55, stable SDK 56 (May 2026) | iOS-only, no Android counterpart | ~2-3 days but requires SDK upgrade |

**No single first-party module covers both platforms.** The realistic 2026 stack is `react-native-android-widget` for Android + `expo-apple-targets` (or wait for SDK 56) for iOS.

**CNG/prebuild impact:** Both plugins require `expo prebuild`. Divvy is already on prebuild via the V1 build setup, so no new cost.

## What works for utility apps

The dominant 2026 pattern: **glanceable data + 1–2 interactive buttons** (iOS 17 App Intents). Pure deep-link widgets feel dated; full in-widget CRUD is overkill.

- **Cozi** ships three iOS widgets (Shopping, To-Do, Calendar), gated behind Cozi Gold paywall. Pure data display + deep-link.
- **Notion** widgets are quick-access tiles to a chosen page/database, no in-widget editing.
- **Apple Reminders** uses the iOS 17+ "tap checkbox in widget itself" pattern — gold standard for productivity.
- **Spark Mail, Calendars (Readdle)** adopted iOS 17 App Intents for in-widget actions (mark done, RSVP).

## What worked for category-defining widgets

- **Locket** shipped Jan 1 2022, hit #1 US App Store in <2 weeks, ~2M widget installs first month, raised $12.5M. **Widget WAS the product** — friends' faces directly on home screen, no app open needed. Lesson: widgets win when they *replace* app opens, not supplement.
- **Retro** tried similar widget-first photo pivot, weaker traction.
- **BeReal** does NOT rely on widgets — daily engagement (72%) is notification-driven.
- **Widgetsmith / Color Widgets** (2020-2022 customization wave) flattened — *decorative* widget novelty faded. **Functional widgets did not** (Reminders, Calendar, Fantastical, Spark, Cozi remain table stakes).

## Feature-to-widget mapping for Divvy

| Feature | Utility | Complexity | Recommendation |
|---|---|---|---|
| **Quick-add expense** | High — directly addresses Splitwise's #1 unmet request | Medium (deep-link version is easy; in-widget add needs App Intent on iOS) | ✅ V1.1 — combined with Balance |
| **Balance summary** | High — killer glanceable use case ("you owe / you're owed") | Low (data-only) | ✅ V1.1 — combined with Quick-Add |
| **Active game scoreboard** | Medium — only useful while game in progress | High (multi-state, frequent updates, RTDB→widget sync; Live Activity is iOS-only) | ❌ Skip until Live Activities + post-product-validation |
| **Wishlist/shopping** | Medium — duplicates Apple Reminders / Cozi turf | Medium | ❌ Skip unless analytics show wishlist is top-3 retained |
| **Recent groups** | Low standalone | Low | Folded into Balance widget |

## Recommendation — staged plan

1. **Don't block launch on widgets.** Pre-launch with no users, marginal acquisition lift is ~zero. Locket-as-product is the exception that proves the rule; Divvy is a utility, not a content surface.
2. **V1.1 (~6-8 weeks post-launch):** Ship a single Android Balance + Quick-Add widget. ~1 week effort. Library stack: `react-native-android-widget` + Firebase RTDB listener writing to AsyncStorage / SharedPreferences. Listing-screenshot moment: "the bill-splitter with the widget Splitwise users have been begging for."
3. **V1.2 (or post-SDK-56 upgrade):** iOS WidgetKit equivalent. Wait for `expo-widgets` stable rather than paying the `expo-apple-targets` SwiftUI tax now.
4. **V2:** Defer game scoreboard widget / Live Activities — only useful during active sessions, iOS-only, validate retention first.
5. **Skip wishlist/shopping widgets** entirely unless data shows demand — Cozi and Reminders already own that real estate.

## Why this is V1.1, not V1.0

Pre-launch the user-acquisition ROI of widgets is near zero — nobody discovers Divvy via "look at my friend's home screen." Splitwise users defecting from the bill-cap dark-pattern are the V1 acquisition channel; widgets are a deepen-moat retention move *after* PMF.

## Sources

- [react-native-android-widget](https://github.com/sAleksovski/react-native-android-widget) (859 stars, May 2026 v0.20.3)
- [Expo widgets docs](https://docs.expo.dev/versions/latest/sdk/widgets/)
- [Expo SDK 56 changelog](https://expo.dev/changelog/sdk-56-beta)
- [expo-apple-targets](https://github.com/EvanBacon/expo-apple-targets)
- [Splitwise feedback: home screen widget request](https://feedback.splitwise.com/forums/162446-general/suggestions/3913957-to-add-a-widget-for-the-homescreen)
- [Splitwise feedback: quick add expense widget](https://feedback.splitwise.com/forums/162446-general/suggestions/18749758-add-shortcut-to-home-screen-widget-to-add-expense)
- [Cozi iOS widget](https://www.cozi.com/blog/cozi-ios-widget/)
- [Locket widget growth — Fast Company](https://www.fastcompany.com/90712709/locket-the-1-app-in-apples-app-store-uses-a-trick-hiding-in-plain-sight)
- [Apple: Adding interactivity to widgets](https://developer.apple.com/documentation/widgetkit/adding-interactivity-to-widgets-and-live-activities)
- [Evan Bacon: Apple home screen widgets with Expo](https://evanbacon.dev/blog/apple-home-screen-widgets)

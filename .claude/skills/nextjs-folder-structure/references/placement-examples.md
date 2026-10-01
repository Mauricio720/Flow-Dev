# Placement examples

Worked decisions for common cases. Paths assume `src/` and the `@/*` alias; substitute the project's real ones.

## 1. Tiny helper used by one route

> A weak-password hint shown only on the signup form. A few lines, no API call, no other consumer.

**Decision:** colocate it at `app/signup/PasswordStrengthHint.tsx`, following the nearest filename convention.

**Why:** it has exactly one owner. A feature folder or `components/shared/` adds indirection and suggests reuse that doesn't exist. Don't add a provider, service, or new folder.

**Promote later if** a second screen (password change, admin user creation) needs it. At that point move it to `components/auth/`.

## 2. New private area with real behavior

> `/favorites`: the server loads the user's favorites, shows an empty state, and lets the user remove an item on the client.

```text
app/favorites/page.tsx                  loads data via the server-side client, renders <FavoritesView>
features/favorites/
├── index.tsx                           exports FavoritesView
├── components/FavoritesList.tsx        server-rendered list + empty state
├── components/RemoveFavoriteButton.tsx "use client"; calls the client-side data client
└── types.ts                            only if a local view type is needed; API types are inferred
```

**Why:** several cooperating pieces with their own behavior justify a feature, and the page stays thin. Only the remove button is a client boundary, so the list and empty state render on the server. After the mutation, refresh the route (`router.refresh()`) or revalidate. Add a query-cache library only if the project already has one or needs shared cache state.

**Don't forget** to register the route as private if the app protects routes through a path list or middleware rather than a route group or layout.

**Avoid** making the whole page a client component, redefining API types by hand, or touching sibling routes.

## 3. Component outgrowing its feature

> `StatusBadge` lives in `features/subscriptions/list/components/`. The subscription detail feature now needs it too.

**Decision:** move it to `components/subscriptions/StatusBadge.tsx` and update both imports in the same change. Move constants it alone uses (such as a status-to-label map) along with it, so the new location doesn't depend back on the feature.

**Why:** two features of the same domain share it, so the narrowest common owner is the domain folder, not `components/shared/`. Letting `features/subscriptions/detail` import from `features/subscriptions/list` couples sibling features.

**If another app also needs it:** promote the presentational part to the shared UI package only when that app actually consumes it. Keep app-specific vocabulary, such as labels that differ between customer and admin apps, in each app. Check whether the UI package already has an equivalent before adding one.

## 4. Formatting helper used everywhere

> A currency formatter used by checkout, orders, and subscriptions.

**Decision:** `lib/format/currency.ts`, or the existing `lib/<domain>/` grouping.

**Why:** it's infrastructure with no UI and no product rule beyond formatting.

## 5. Refactor request mixed with a feature

> "Add the order-tracking page. Also the folders are a mess, fix that."

**Decision:** implement the page in the right place, then move only what blocks it or sits inside its scope. List the remaining mess as follow-up debt instead of migrating everything in one diff.

**Why:** a feature and a mass move in one change are hard to review and hard to revert independently.

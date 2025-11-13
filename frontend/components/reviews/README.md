# Reviews & Q&A Main Container

This lightweight module orchestrates the global state for the Reviews + Questions & Answers feature (Story #162, Epic #14). It is intentionally framework‑agnostic so it can be dropped into any page that loads ES modules.

## Usage

```html
<section id="reviewsQaMount"></section>
<script type="module">
  import { mountReviewsQaContainer } from "./components/reviews/main-container.js";

  const currentUser = JSON.parse(localStorage.getItem("user") || "null");

  mountReviewsQaContainer({
    target: "#reviewsQaMount",
    eventId: 42,
    organizerId: 7,
    currentUser,
    renderers: {
      reviews: ({ container, eventId }) => {
        container.textContent = `Render P3-T2 Reviews feed for event ${eventId}`;
      },
      qa: async ({ container, organizerId }) => {
        container.textContent = "Loading Q&A...";
        const res = await fetch(`/api/questions?organizer_id=${organizerId}`);
        const data = await res.json();
        // Mount your actual component once data resolves.
        container.textContent = `Loaded ${data.length} questions`;
      },
    },
    onTabChange: ({ activeTab }) => console.info("Switched to", activeTab),
  });
</script>
```

### Renderers

Each renderer receives a payload with:

| Key | Description |
| --- | --- |
| `container` | DOM node to render into (already cleared) |
| `eventId` | Current event identifier |
| `organizerId` | Organizer identifier |
| `currentUser` | User object from the session/localStorage (if available) |
| `activeTab` | `"reviews"` or `"qa"` |
| `switchTab(tabKey)` | Helper to programmatically set the active tab |
| `emit(name, detail)` | Dispatches a bubbling `CustomEvent` from the host element |

Renderers can:

- Directly manipulate `container` and return nothing.
- Return a DOM node, fragment, or HTML string.
- Return a `Promise` that resolves to any of the above for async data loading.

### Error Handling

- Missing `eventId`/`organizerId` renders an inline warning instead of the tabs.
- Renderer errors are caught and surfaced within the panel while logging to the console.
- `updateProps({ eventId, organizerId, currentUser })` can be called to swap the context without remounting.

## Reviews Tab Component (Story #183)

The Reviews tab renderer lives in `components/reviews/reviews-tab.js`. Import and register it with the container to automatically fetch the organizer's average rating and the 1–5 star distribution.

```js
import { reviewsTabRenderer } from "./components/reviews/reviews-tab.js";

mountReviewsQaContainer({
  target: "#reviewsQaMount",
  eventId: 42,
  organizerId: 7,
  renderers: {
    reviews: reviewsTabRenderer,
  },
});
```

The component:

- Calls `/api/reviews/summary?organizer_id=:id` (Story #174) and falls back to deriving the distribution from `/api/reviews`.
- Displays the organizer's average rating with prominent stars and review count pulled from `users.average_rating`.
- Renders placeholder sections for the submission form (Story #184) and the review list (Story #185) so future stories can hydrate those slots without changing the surrounding layout.

## New Review Form (Story #184)

`components/reviews/review-form.js` powers the submission experience rendered inside the Reviews tab. It provides:

- Clickable 1–5 star selector with keyboard-friendly buttons.
- Required title/content inputs plus optional category dropdown and image upload (up to 3 images, converted to base64 strings and sent via `image_urls`).
- Client-side validation with inline messaging before firing `POST /api/reviews`.
- Success/error feedback messaging and an `onSuccess` callback used by the Reviews tab to refresh summary stats.

If you need to mount it manually (outside the tab), call:

```js
import { mountReviewForm } from "./components/reviews/review-form.js";

mountReviewForm({
  target: "#reviewFormRoot",
  eventId: 42,
  organizerId: 7,
  currentUser: JSON.parse(localStorage.getItem("user") || "null"),
  onSuccess: () => console.log("Review submitted!"),
});
```

## Review Card Component (Story #185)

`components/reviews/review-card.js` exposes a lightweight class that receives a `review` object (matching `/api/reviews` payloads) plus the current user context and callback handlers. Features include:

- Reviewer identity block with avatar fallback, date, and rating stars.
- Title/category chips, full review text, and optional gallery when `image_urls` is populated.
- Helpful button wired to `POST /api/reviews/:id/helpful` along with a live count display.
- Edit/Delete action buttons that only render for the review’s author so future moderation stories can hook in.

```js
import { ReviewCard } from "./components/reviews/review-card.js";

const card = new ReviewCard({
  review,
  currentUser,
  onHelpful: () => apiIncrementHelpful(review.id),
  onEdit: () => openEditModal(review),
  onDelete: () => confirmDelete(review),
});

document.querySelector("#reviewsList").appendChild(card.element);
```

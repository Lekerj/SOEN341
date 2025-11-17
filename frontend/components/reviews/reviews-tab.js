import { getApiBase } from "../../utils/api.js";
import { mountReviewForm } from "./review-form.js";
import { ReviewCard } from "./review-card.js";

const DEFAULT_DISTRIBUTION = {
  5: 0,
  4: 0,
  3: 0,
  2: 0,
  1: 0,
};

const SUMMARY_ENDPOINT = (organizerId) =>
  `${getApiBase()}/api/reviews/summary?organizer_id=${encodeURIComponent(
    organizerId
  )}`;

const SORT_MAP = {
  newest: { sort: "created_at", order: "DESC" },
  highest: { sort: "rating", order: "DESC" },
  lowest: { sort: "rating", order: "ASC" },
};

export class ReviewsTabView {
  constructor(payload) {
    this.container = payload.container;
    this.eventId = payload.eventId;
    this.organizerId = payload.organizerId;
    this.currentUser = payload.currentUser;
    this.abortController = null;
    this.formView = null;
    this.summaryRefs = {};
    this.elements = {
      summary: null,
      listRoot: null,
      listEmpty: null,
      sortSelect: null,
    };
    this.helpfulProcessing = new Set();
    this.state = {
      loading: true,
      error: null,
      averageRating: null,
      totalReviews: 0,
      distribution: { ...DEFAULT_DISTRIBUTION },
      summaryError: null,
      reviews: [],
      reviewsLoading: true,
      reviewsError: null,
      sortKey: "newest",
    };
  }

  mount() {
    if (!this.hasEssentialData()) {
      this.showError(
        "Organizer identifier missing. Cannot load reviews and feedback."
      );
      return;
    }
    this.container.classList.add("reviews-tab");
    this.renderLayout();
    this.loadSummaryData();
    this.loadReviews();
  }

  hasEssentialData() {
    return Boolean(this.organizerId);
  }

  renderLayout() {
    this.container.innerHTML = "";
    const fragment = document.createDocumentFragment();
    const summarySection = this.buildSummarySection();
    fragment.appendChild(summarySection);
    const layout = this.buildBodyLayout();
    fragment.appendChild(layout);
    this.container.appendChild(fragment);
    this.mountForm();
    this.bindListEvents();
    this.renderReviewsList();
  }

  buildSummarySection() {
    const summary = document.createElement("section");
    summary.className = "reviews-tab__summary";
    summary.innerHTML = `
      <div class="reviews-tab__summary-loader" data-summary-loader>
        <span class="reviews-qa__spinner"></span>
        <p>Loading rating insights…</p>
      </div>
      <div class="reviews-tab__score-card">
        <p class="reviews-tab__label">Organizer Rating</p>
        <div class="reviews-tab__score-value" data-rating>-</div>
        <div class="reviews-tab__stars" data-stars></div>
        <p class="reviews-tab__total" data-total-reviews>0 reviews</p>
      </div>
      <div class="reviews-tab__distribution" data-distribution>
        ${this.buildDistributionPlaceholders()}
      </div>
      <p class="reviews-tab__summary-error" data-summary-error hidden></p>
    `;
    this.elements.summary = summary;
    this.summaryRefs = {
      loader: summary.querySelector("[data-summary-loader]"),
      rating: summary.querySelector("[data-rating]"),
      stars: summary.querySelector("[data-stars]"),
      total: summary.querySelector("[data-total-reviews]"),
      distribution: summary.querySelector("[data-distribution]"),
      error: summary.querySelector("[data-summary-error]"),
    };
    return summary;
  }

  buildDistributionPlaceholders() {
    // Create placeholder distribution bars for 5-star rating system
    const rows = [];
    for (let rating = 5; rating >= 1; rating--) {
      rows.push(`
        <div class="reviews-tab__distribution-row" data-rating-row="${rating}">
          <div class="reviews-tab__rating-label">${rating} ★</div>
          <div class="reviews-tab__progress-bar-container">
            <div class="reviews-tab__progress-bar" style="width: 0%"></div>
          </div>
          <div class="reviews-tab__count" data-count="0">0</div>
        </div>
      `);
    }
    return rows.join("");
  }

  buildBodyLayout() {
    const layout = document.createElement("div");
    layout.className = "reviews-tab__layout";
    layout.innerHTML = `
      <section class="reviews-tab__submission" data-form-placeholder>
        <header>
          <p class="reviews-tab__eyebrow">Share your voice</p>
          <h3>Write a new review</h3>
          <p>Star ratings, titles, and detailed stories help future attendees decide.</p>
        </header>
        <div data-form-root></div>
      </section>
      <section class="reviews-tab__list" data-list-placeholder>
        <header class="reviews-tab__list-header">
          <div>
            <p class="reviews-tab__eyebrow">Story #185 · Review Feed</p>
            <h3>Recent attendee feedback</h3>
          </div>
          <div class="reviews-tab__sort">
            <label for="reviewsSort">Sort</label>
            <select id="reviewsSort">
              <option value="newest">Newest first</option>
              <option value="highest">Highest rating</option>
              <option value="lowest">Lowest rating</option>
            </select>
          </div>
        </header>
        <div class="review-card__list" data-reviews-list></div>
        <div class="reviews-tab__list-empty" data-reviews-empty>
          <div class="reviews-tab__empty-icon">📝</div>
          <p>No reviews yet. Be the first to share your experience!</p>
        </div>
      </section>
    `;
    this.elements.listRoot = layout.querySelector("[data-reviews-list]");
    this.elements.listEmpty = layout.querySelector("[data-reviews-empty]");
    this.elements.sortSelect = layout.querySelector("#reviewsSort");
    return layout;
  }

  mountForm() {
    const formTarget = this.container.querySelector("[data-form-root]");
    if (!formTarget) return;
    this.formView = mountReviewForm({
      target: formTarget,
      eventId: this.eventId,
      organizerId: this.organizerId,
      currentUser: this.currentUser,
      onSuccess: () => {
        this.refreshSummaryData();
        this.loadReviews();
      },
    });
  }

  bindListEvents() {
    if (!this.elements.sortSelect) return;
    this.elements.sortSelect.value = this.state.sortKey;
    this.elements.sortSelect.addEventListener("change", (event) => {
      this.state.sortKey = event.target.value;
      this.loadReviews();
    });
  }

  async loadSummaryData() {
    this.setSummaryLoading(true);
    this.abortController = new AbortController();
    try {
      const summary = await this.fetchSummary();
      this.state.summaryError = null;
      this.applySummary(summary);
    } catch (error) {
      console.error("[ReviewsTab] Unable to load summary:", error);
      this.state.summaryError =
        error?.message || "Unable to load summary data. Please try again.";
      this.renderSummaryError(this.state.summaryError);
    } finally {
      this.setSummaryLoading(false);
      this.abortController = null;
    }
  }

  async refreshSummaryData() {
    try {
      const summary = await this.fetchSummary();
      this.state.summaryError = null;
      this.applySummary(summary);
    } catch (error) {
      console.error("[ReviewsTab] Unable to refresh summary:", error);
    }
  }

  async fetchSummary() {
    const summaryUrl = SUMMARY_ENDPOINT(this.organizerId);
    try {
      const response = await fetch(summaryUrl, {
        credentials: "include",
        signal: this.abortController?.signal,
      });
      if (!response.ok) {
        throw new Error(`Summary request failed (${response.status})`);
      }
      const payload = await response.json();
      if (!payload) {
        throw new Error("Summary payload missing");
      }
      return {
        average_rating:
          payload.average_rating ??
          payload.organizer_average ??
          payload.average ??
          null,
        total_reviews:
          payload.total_reviews ??
          payload.total ??
          payload?.distribution_total ??
          0,
        distribution: normalizeDistribution(payload.distribution),
      };
    } catch (error) {
      console.warn(
        "[ReviewsTab] Summary endpoint unavailable, falling back to derived data."
      );
      return this.fetchDerivedSummary();
    }
  }

  async fetchDerivedSummary() {
    const response = await fetch(
      `${getApiBase()}/api/reviews?organizer_id=${encodeURIComponent(
        this.organizerId
      )}`,
      {
        credentials: "include",
        signal: this.abortController?.signal,
      }
    );
    if (!response.ok) {
      throw new Error(`Reviews request failed (${response.status})`);
    }
    const payload = await response.json();
    const reviews = Array.isArray(payload.reviews) ? payload.reviews : [];
    const distribution = { ...DEFAULT_DISTRIBUTION };
    let total = 0;
    let sum = 0;
    reviews.forEach((review) => {
      const rating = Number(review.rating);
      if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
        return;
      }
      distribution[rating] += 1;
      sum += rating;
      total += 1;
    });

    const average = total ? Number((sum / total).toFixed(2)) : null;

    return {
      average_rating: average,
      total_reviews: payload?.pagination?.total ?? total,
      distribution,
    };
  }

  applySummary(summary) {
    const { average_rating = null, total_reviews = 0, distribution } =
      summary || {};
    this.state.averageRating =
      typeof average_rating === "number"
        ? Number(average_rating.toFixed(2))
        : null;
    this.state.totalReviews = total_reviews || 0;
    this.state.distribution = normalizeDistribution(distribution);
    this.updateSummaryUI();
    this.renderSummaryError(null);
  }

  updateSummaryUI() {
    if (!this.summaryRefs.rating) return;
    this.summaryRefs.rating.textContent =
      this.state.averageRating === null
        ? "—"
        : this.state.averageRating.toFixed(1);
    if (this.summaryRefs.stars) {
      this.summaryRefs.stars.innerHTML = buildStarIcons(this.state.averageRating);
    }
    if (this.summaryRefs.total) {
      this.summaryRefs.total.textContent =
        this.state.totalReviews === 1
          ? "1 review"
          : `${this.state.totalReviews} reviews`;
    }
    if (this.summaryRefs.distribution) {
      const totalCount = Object.values(this.state.distribution).reduce(
        (acc, count) => acc + count,
        0
      );
      this.summaryRefs.distribution
        .querySelectorAll(".reviews-tab__distribution-row")
        .forEach((row) => {
          const rating = Number(row.dataset.ratingRow);
          const count = this.state.distribution[rating] || 0;
          const percent =
            totalCount === 0 ? 0 : Math.round((count / totalCount) * 100);
          const bar = row.querySelector(".reviews-tab__progress-bar");
          const countEl = row.querySelector(".reviews-tab__count");
          if (bar) bar.style.width = `${percent || 0}%`;
          if (countEl) {
            countEl.textContent = count;
            countEl.dataset.count = String(count);
          }
        });
    }
  }

  renderSummaryError(message) {
    if (!this.summaryRefs.error) return;
    if (!message) {
      this.summaryRefs.error.hidden = true;
      this.summaryRefs.error.textContent = "";
      return;
    }
    this.summaryRefs.error.hidden = false;
    this.summaryRefs.error.textContent = message;
  }

  setSummaryLoading(isLoading) {
    if (this.summaryRefs.loader) {
      this.summaryRefs.loader.hidden = !isLoading;
    }
    if (this.elements.summary) {
      this.elements.summary.classList.toggle("is-loading", isLoading);
    }
  }

  async loadReviews() {
    if (!this.elements.listRoot) return;
    this.state.reviewsLoading = true;
    this.state.reviewsError = null;
    this.renderReviewsList();
    try {
      const payload = await this.fetchReviews();
      this.state.reviews = Array.isArray(payload.reviews)
        ? payload.reviews
        : [];
    } catch (error) {
      console.error("[ReviewsTab] Unable to load reviews:", error);
      this.state.reviewsError =
        error?.message || "Unable to load reviews. Please try again.";
    } finally {
      this.state.reviewsLoading = false;
      this.renderReviewsList();
    }
  }

  async fetchReviews() {
    const sortOption = SORT_MAP[this.state.sortKey] || SORT_MAP.newest;
    const params = new URLSearchParams({
      organizer_id: this.organizerId,
      limit: "25",
      sort: sortOption.sort,
      order: sortOption.order,
    });
    const response = await fetch(
      `${getApiBase()}/api/reviews?${params.toString()}`,
      { credentials: "include" }
    );
    if (!response.ok) {
      throw new Error(`Failed to load reviews (${response.status})`);
    }
    return response.json();
  }

  renderReviewsList() {
    if (!this.elements.listRoot || !this.elements.listEmpty) return;
    if (this.state.reviewsLoading) {
      this.elements.listRoot.innerHTML = `
        <div class="reviews-tab__loading">
          <span class="reviews-qa__spinner"></span>
          <p>Loading reviews…</p>
        </div>
      `;
      this.elements.listEmpty.hidden = true;
      return;
    }

    if (this.state.reviewsError) {
      this.elements.listRoot.innerHTML = "";
      this.elements.listEmpty.hidden = false;
      this.elements.listEmpty.innerHTML = `
        <div class="reviews-tab__empty-icon">⚠️</div>
        <p>${this.state.reviewsError}</p>
      `;
      return;
    }

    if (!this.state.reviews.length) {
      this.elements.listRoot.innerHTML = "";
      this.elements.listEmpty.hidden = false;
      this.elements.listEmpty.innerHTML = `
        <div class="reviews-tab__empty-icon">📝</div>
        <p>No reviews yet. Be the first to share your experience!</p>
      `;
      return;
    }

    this.elements.listEmpty.hidden = true;
    this.elements.listRoot.innerHTML = "";
    this.state.reviews.forEach((review) => {
      const card = new ReviewCard({
        review,
        currentUser: this.currentUser,
        helpfulProcessing: this.helpfulProcessing.has(review.id),
        onHelpful: () => this.handleHelpfulClick(review),
        onEdit: () => this.handleEdit(review),
        onDelete: () => this.handleDelete(review),
      });
      this.elements.listRoot.appendChild(card.element);
    });
  }

  async handleHelpfulClick(review) {
    if (!review?.id || this.helpfulProcessing.has(review.id)) return;
    this.helpfulProcessing.add(review.id);
    this.renderReviewsList();
    try {
      const response = await fetch(
        `${getApiBase()}/api/reviews/${review.id}/helpful`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ action: "increment" }),
        }
      );
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error || "Unable to update helpful count.");
      }
      const data = await response.json();
      const nextCount = Number(data.helpful_count);
      this.state.reviews = this.state.reviews.map((item) =>
        item.id === review.id
          ? { ...item, helpful_count: Number.isFinite(nextCount) ? nextCount : item.helpful_count }
          : item
      );
    } catch (error) {
      console.error("[ReviewsTab] Helpful interaction failed:", error);
      alert(error?.message || "Unable to mark review as helpful.");
    } finally {
      this.helpfulProcessing.delete(review.id);
      this.renderReviewsList();
    }
  }

  handleEdit(review) {
    console.info("Edit review clicked", review);
  }

  handleDelete(review) {
    console.info("Delete review clicked", review);
  }

  showError(message) {
    this.container.innerHTML = `
      <div class="reviews-qa__error reviews-qa__error--inline">
        <div class="reviews-qa__error-icon">⚠️</div>
        <div>
          <h3>Reviews unavailable</h3>
          <p>${message}</p>
        </div>
      </div>
    `;
  }
}

export function mountReviewsTab(payload) {
  const view = new ReviewsTabView(payload);
  view.mount();
  return view;
}

export function reviewsTabRenderer(payload) {
  const view = new ReviewsTabView(payload);
  view.mount();
  return null;
}

function buildStarIcons(rating) {
  const stars = [];
  const value = Number(rating);
  for (let i = 1; i <= 5; i += 1) {
    const filled = Number.isFinite(value) && value >= i - 0.25;
    const half = Number.isFinite(value) && !filled && value >= i - 0.75;
    stars.push(
      `<span class="reviews-tab__star ${
        filled ? "is-filled" : half ? "is-half" : ""
      }" aria-hidden="true">★</span>`
    );
  }
  return stars.join("");
}

function normalizeDistribution(dist = {}) {
  const normalized = { ...DEFAULT_DISTRIBUTION };
  Object.entries(dist || {}).forEach(([rating, count]) => {
    const key = Number(rating);
    if (!Number.isInteger(key) || key < 1 || key > 5) return;
    normalized[key] = Number(count) || 0;
  });
  return normalized;
}

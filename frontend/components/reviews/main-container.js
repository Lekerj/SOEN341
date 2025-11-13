const TAB_DEFINITIONS = [
  {
    key: "reviews",
    label: "Reviews",
    description: "Ratings, highlights, and in-depth attendee feedback.",
  },
  {
    key: "qa",
    label: "Questions & Answers",
    description: "Live discussions between attendees and the organizer.",
  },
];

const TAB_MAP = TAB_DEFINITIONS.reduce((acc, tab) => {
  acc[tab.key] = tab;
  return acc;
}, {});

const DEFAULT_TAB = "reviews";

const isProvided = (value) =>
  !(value === undefined || value === null || value === "");

/**
 * High-level container that orchestrates the Reviews & Q&A tabs.
 * This component is intentionally framework-agnostic so that it can be mounted
 * on any static page or within a React/Vue/Svelte wrapper in future stories.
 */
export class ReviewsQaContainer {
  /**
   * @param {Object} options
   * @param {HTMLElement|string} options.target Root node or selector
   * @param {string|number} options.eventId Event identifier
   * @param {string|number} options.organizerId Organizer identifier
   * @param {Object|null} [options.currentUser] Logged-in user payload
   * @param {Object} [options.renderers] Tab specific renderer functions
   * @param {Function} [options.renderers.reviews] Renderer for Reviews tab
   * @param {Function} [options.renderers.qa] Renderer for Q&A tab
   * @param {string} [options.defaultTab] Default tab key
   * @param {Function} [options.onTabChange] Optional callback when tabs switch
   */
  constructor(options = {}) {
    const {
      target,
      eventId,
      organizerId,
      currentUser = null,
      renderers = {},
      defaultTab = DEFAULT_TAB,
      onTabChange = null,
    } = options;

    this.root = this.resolveRoot(target);
    this.eventId = eventId ?? null;
    this.organizerId = organizerId ?? null;
    this.currentUser = currentUser ?? null;
    this.renderers = {
      reviews: renderers.reviews ?? null,
      qa: renderers.qa ?? null,
    };
    this.activeTab = TAB_MAP[defaultTab] ? defaultTab : DEFAULT_TAB;
    this.onTabChange = typeof onTabChange === "function" ? onTabChange : null;

    this.elements = {
      wrapper: null,
      header: null,
      tabs: null,
      buttons: new Map(),
      panel: null,
      error: null,
    };

    this.render();
  }

  resolveRoot(target) {
    if (target instanceof HTMLElement) {
      return target;
    }
    if (typeof target === "string") {
      const el = document.querySelector(target);
      if (!el) {
        throw new Error(
          `ReviewsQaContainer could not find target element for selector "${target}".`
        );
      }
      return el;
    }
    throw new Error(
      "ReviewsQaContainer requires a valid DOM node or selector for `target`."
    );
  }

  render() {
    this.root.innerHTML = "";
    this.resetElements();
    this.root.classList.add("reviews-qa-host");
    if (!this.hasEssentialData()) {
      this.renderMissingDataNotice();
      return;
    }

    this.elements.wrapper = document.createElement("section");
    this.elements.wrapper.className = "reviews-qa";
    this.elements.buttons.clear();

    this.elements.header = this.buildHeader();
    this.elements.tabs = this.buildTabs();
    this.elements.panel = this.buildPanel();

    this.elements.wrapper.append(
      this.elements.header,
      this.elements.tabs,
      this.elements.panel
    );
    this.root.appendChild(this.elements.wrapper);

    this.setActiveTab(this.activeTab, { emit: false });
    this.dispatchReadyEvent();
  }

  hasEssentialData() {
    return isProvided(this.eventId) && isProvided(this.organizerId);
  }

  renderMissingDataNotice() {
    const alert = document.createElement("div");
    alert.className = "reviews-qa__error";
    alert.innerHTML = `
      <div class="reviews-qa__error-icon">⚠️</div>
      <div>
        <h3>Feedback container unavailable</h3>
        <p>Event and organizer identifiers are required to render Reviews & Q&amp;A. Ensure both IDs are provided before mounting this component.</p>
      </div>
    `;
    this.root.appendChild(alert);
    this.elements.error = alert;
  }

  buildHeader() {
    const header = document.createElement("header");
    header.className = "reviews-qa__header";
    header.innerHTML = `
      <div class="reviews-qa__intro">
        <p class="reviews-qa__eyebrow">Interactive Feedback</p>
        <h2>Reviews &amp; Q&amp;A</h2>
        <p class="reviews-qa__subtitle">
          Central hub for attendee sentiment, live questions, and organizer responses.
        </p>
      </div>
      <div class="reviews-qa__meta">
        <div>
          <span class="reviews-qa__meta-label">Event ID</span>
          <strong class="reviews-qa__meta-value">${this.eventId}</strong>
        </div>
        <div>
          <span class="reviews-qa__meta-label">Organizer ID</span>
          <strong class="reviews-qa__meta-value">${this.organizerId}</strong>
        </div>
        <div>
          <span class="reviews-qa__meta-label">Current User</span>
          <strong class="reviews-qa__meta-value">
            ${this.currentUser?.name || this.currentUser?.email || "Guest"}
          </strong>
        </div>
      </div>
    `;
    return header;
  }

  buildTabs() {
    const nav = document.createElement("nav");
    nav.className = "reviews-qa__tabs";
    nav.setAttribute("role", "tablist");

    TAB_DEFINITIONS.forEach((tab) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "reviews-qa__tab";
      button.dataset.tabKey = tab.key;
      button.setAttribute("role", "tab");
      button.setAttribute("aria-selected", "false");
      button.innerHTML = `
        <span class="reviews-qa__tab-label">${tab.label}</span>
        <span class="reviews-qa__tab-desc">${tab.description}</span>
      `;
      button.addEventListener("click", () => this.setActiveTab(tab.key));
      this.elements.buttons.set(tab.key, button);
      nav.appendChild(button);
    });
    return nav;
  }

  buildPanel() {
    const panel = document.createElement("section");
    panel.className = "reviews-qa__panel";
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("tabindex", "0");
    return panel;
  }

  setActiveTab(tabKey, options = {}) {
    if (!TAB_MAP[tabKey]) {
      console.warn(`[ReviewsQaContainer] Unknown tab "${tabKey}", ignoring.`);
      return;
    }
    if (this.activeTab === tabKey && options.force !== true) {
      return;
    }

    this.activeTab = tabKey;
    this.updateTabHighlight();
    this.renderActiveContent();

    const detail = this.buildPayload();
    if (options.emit !== false) {
      this.dispatchEvent("reviewsqa:tabchange", detail);
      if (this.onTabChange) {
        this.onTabChange(detail);
      }
    }
  }

  updateTabHighlight() {
    this.elements.buttons.forEach((button, key) => {
      const isActive = key === this.activeTab;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", String(isActive));
      if (isActive) {
        button.setAttribute("tabindex", "0");
      } else {
        button.setAttribute("tabindex", "-1");
      }
    });
  }

  renderActiveContent() {
    if (!this.elements.panel) return;

    const renderer = this.renderers[this.activeTab];
    const payload = this.buildPayload();
    this.elements.panel.innerHTML = "";

    if (typeof renderer !== "function") {
      this.elements.panel.appendChild(
        this.buildPlaceholder(
          this.activeTab === "reviews"
            ? "Reviews content is on the way."
            : "Questions & Answers content will appear here."
        )
      );
      return;
    }

    let result;
    try {
      result = renderer(payload);
    } catch (error) {
      this.showRendererError(error);
      return;
    }

    if (result && typeof result.then === "function") {
      this.showLoadingState();
      result
        .then((resolved) => {
          this.commitRendererResult(resolved);
        })
        .catch((error) => {
          this.showRendererError(error);
        });
      return;
    }

    this.commitRendererResult(result);
  }

  commitRendererResult(result) {
    if (!this.elements.panel) return;
    this.elements.panel.innerHTML = "";

    if (result instanceof HTMLElement || result instanceof DocumentFragment) {
      this.elements.panel.appendChild(result);
      return;
    }

    if (typeof result === "string") {
      this.elements.panel.innerHTML = result;
      return;
    }

    if (Array.isArray(result)) {
      result.forEach((node) => {
        if (node instanceof HTMLElement || node instanceof DocumentFragment) {
          this.elements.panel.appendChild(node);
        }
      });
      if (this.elements.panel.childElementCount === 0) {
        this.elements.panel.appendChild(
          this.buildPlaceholder(
            "Renderer returned an empty collection. Ensure DOM nodes are returned."
          )
        );
      }
      return;
    }

    if (result === undefined || result === null) {
      // Assume renderer manipulated the panel directly.
      return;
    }

    this.elements.panel.appendChild(
      this.buildPlaceholder(
        "Renderer returned an unsupported value. Please return a DOM node, string, fragment, or manipulate the container directly."
      )
    );
  }

  buildPlaceholder(message) {
    const box = document.createElement("div");
    box.className = "reviews-qa__empty-state";
    box.innerHTML = `
      <div class="reviews-qa__empty-icon">💬</div>
      <p>${message}</p>
      <small>Event #${this.eventId} · Organizer #${this.organizerId}</small>
    `;
    return box;
  }

  showLoadingState() {
    if (!this.elements.panel) return;
    this.elements.panel.innerHTML = `
      <div class="reviews-qa__loading">
        <span class="reviews-qa__spinner"></span>
        <p>Loading ${TAB_MAP[this.activeTab].label}…</p>
      </div>
    `;
  }

  showRendererError(error) {
    console.error("[ReviewsQaContainer] Renderer failed:", error);
    if (!this.elements.panel) return;
    this.elements.panel.innerHTML = `
      <div class="reviews-qa__error reviews-qa__error--inline">
        <div class="reviews-qa__error-icon">⚠️</div>
        <div>
          <h3>Unable to load ${TAB_MAP[this.activeTab].label}</h3>
          <p>${error?.message || "An unexpected error occurred."}</p>
        </div>
      </div>
    `;
  }

  buildPayload() {
    return {
      container: this.elements.panel,
      eventId: this.eventId,
      organizerId: this.organizerId,
      currentUser: this.currentUser,
      activeTab: this.activeTab,
      switchTab: (tabKey) => this.setActiveTab(tabKey),
      emit: (name, detail = {}) => this.dispatchEvent(name, detail),
    };
  }

  dispatchReadyEvent() {
    this.dispatchEvent("reviewsqa:ready", this.buildPayload());
  }

  dispatchEvent(name, detail = {}) {
    const event = new CustomEvent(name, {
      detail,
      bubbles: true,
    });
    this.root.dispatchEvent(event);
  }

  /**
   * Allows subsequent stories to feed new identifiers (i.e., when navigating
   * between events without remounting).
   * @param {Object} next
   */
  updateProps(next = {}) {
    const previousStateMissing = !this.hasEssentialData();

    if ("eventId" in next) this.eventId = next.eventId;
    if ("organizerId" in next) this.organizerId = next.organizerId;
    if ("currentUser" in next) this.currentUser = next.currentUser;

    if (!this.hasEssentialData()) {
      this.root.innerHTML = "";
      this.resetElements();
      this.renderMissingDataNotice();
      return;
    }

    if (previousStateMissing) {
      this.render();
      return;
    }

    this.refreshMetaDisplay();
    this.renderActiveContent();
  }

  resetElements() {
    this.elements.wrapper = null;
    this.elements.header = null;
    this.elements.tabs = null;
    this.elements.panel = null;
    this.elements.error = null;
    this.elements.buttons.clear();
  }

  refreshMetaDisplay() {
    if (!this.elements.header) return;
    const metaValues = this.elements.header.querySelectorAll(
      ".reviews-qa__meta-value"
    );
    if (metaValues[0]) metaValues[0].textContent = this.eventId ?? "—";
    if (metaValues[1]) metaValues[1].textContent = this.organizerId ?? "—";
    if (metaValues[2]) {
      metaValues[2].textContent =
        this.currentUser?.name || this.currentUser?.email || "Guest";
    }
  }
}

/**
 * Helper factory for consumers that only have the selector available.
 * @param {Object} options
 * @returns {ReviewsQaContainer}
 */
export function mountReviewsQaContainer(options) {
  return new ReviewsQaContainer(options);
}

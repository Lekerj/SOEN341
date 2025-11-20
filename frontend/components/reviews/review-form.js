import { getApiBase } from "../../utils/api.js";

const CATEGORY_OPTIONS = [
  { value: "", label: "Select a category (optional)" },
  { value: "overall", label: "Overall experience" },
  { value: "logistics", label: "Logistics & operations" },
  { value: "content", label: "Event content" },
  { value: "accessibility", label: "Accessibility" },
  { value: "hospitality", label: "Hospitality" },
];

const MAX_IMAGES = 3;
const MAX_IMAGE_SIZE_MB = 3;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

export class ReviewForm {
  constructor(options = {}) {
    const {
      target,
      eventId,
      organizerId,
      currentUser,
      onSuccess = null,
    } = options;

    this.root = this.resolveTarget(target);
    this.eventId = eventId;
    this.organizerId = organizerId;
    this.currentUser = currentUser;
    this.onSuccess = typeof onSuccess === "function" ? onSuccess : null;

    this.state = {
      rating: 0,
      title: "",
      content: "",
      category: "",
      files: [],
      submitting: false,
      feedback: null,
    };

    this.elements = {};
    this.render();
  }

  resolveTarget(target) {
    if (target instanceof HTMLElement) return target;
    if (typeof target === "string") {
      const el = document.querySelector(target);
      if (!el) {
        throw new Error(
          `ReviewForm could not find target element for selector "${target}".`
        );
      }
      return el;
    }
    throw new Error("ReviewForm requires a DOM node or selector.");
  }

  render() {
    if (!this.eventId || !this.organizerId) {
      this.root.innerHTML = `
        <div class="review-form__alert">
          <strong>Missing context.</strong>
          <p>Provide both event and organizer identifiers before rendering this form.</p>
        </div>
      `;
      return;
    }

    if (!this.currentUser) {
      this.root.innerHTML = `
        <div class="review-form review-form--disabled">
          <p>You need to be logged in to share a review.</p>
          <button class="btn btn-secondary" onclick="window.location.href='login.html'">
            Sign in to continue
          </button>
        </div>
      `;
      return;
    }

    this.root.innerHTML = `
      <form class="review-form" novalidate>
        <div class="review-form__group">
          <label class="review-form__label">Your Rating<span>*</span></label>
          <div class="review-form__stars" data-stars>
            ${[1, 2, 3, 4, 5]
              .map(
                (value) =>
                  `<button type="button" class="review-form__star" data-value="${value}" aria-label="${value} star${value === 1 ? "" : "s"}">★</button>`
              )
              .join("")}
          </div>
          <p class="review-form__error" data-error="rating"></p>
        </div>
        <div class="review-form__group">
          <label class="review-form__label" for="reviewTitle">Title<span>*</span></label>
          <input id="reviewTitle" name="title" type="text" placeholder="Summarize your experience" required />
          <p class="review-form__error" data-error="title"></p>
        </div>
        <div class="review-form__group">
          <label class="review-form__label" for="reviewContent">Review<span>*</span></label>
          <textarea id="reviewContent" name="content" rows="4" placeholder="Share details that will help other attendees." required></textarea>
          <p class="review-form__error" data-error="content"></p>
        </div>
        <div class="review-form__group">
          <label class="review-form__label" for="reviewCategory">Category</label>
          <select id="reviewCategory" name="category">
            ${CATEGORY_OPTIONS.map(
              (option) =>
                `<option value="${option.value}">${option.label}</option>`
            ).join("")}
          </select>
        </div>
        <div class="review-form__group">
          <label class="review-form__label" for="reviewImages">Images</label>
          <input id="reviewImages" name="images" type="file" accept="image/*" multiple />
          <small class="review-form__hint">Up to ${MAX_IMAGES} images, ${MAX_IMAGE_SIZE_MB}MB each.</small>
          <ul class="review-form__file-list" data-file-list></ul>
          <p class="review-form__error" data-error="images"></p>
        </div>
        <div class="review-form__group review-form__actions">
          <button type="submit" class="btn btn-primary" data-submit>Submit review</button>
        </div>
        <div class="review-form__feedback" aria-live="polite"></div>
      </form>
    `;

    this.elements.form = this.root.querySelector("form");
    this.elements.stars = Array.from(
      this.root.querySelectorAll(".review-form__star")
    );
    this.elements.inputs = {
      title: this.root.querySelector("#reviewTitle"),
      content: this.root.querySelector("#reviewContent"),
      category: this.root.querySelector("#reviewCategory"),
      images: this.root.querySelector("#reviewImages"),
    };
    this.elements.fileList = this.root.querySelector("[data-file-list]");
    this.elements.submitButton = this.root.querySelector("[data-submit]");
    this.elements.errors = {
      rating: this.root.querySelector('[data-error="rating"]'),
      title: this.root.querySelector('[data-error="title"]'),
      content: this.root.querySelector('[data-error="content"]'),
      images: this.root.querySelector('[data-error="images"]'),
    };
    this.elements.feedback = this.root.querySelector(".review-form__feedback");

    this.bindEvents();
  }

  bindEvents() {
    if (!this.elements.form) return;
    this.elements.stars.forEach((star) =>
      star.addEventListener("click", () =>
        this.setRating(Number(star.dataset.value))
      )
    );
    if (this.elements.inputs.images) {
      this.elements.inputs.images.addEventListener("change", (event) =>
        this.handleFileChange(event)
      );
    }
    this.elements.form.addEventListener("submit", (event) => {
      event.preventDefault();
      this.handleSubmit();
    });
  }

  setRating(value) {
    if (!Number.isInteger(value) || value < 1 || value > 5) return;
    this.state.rating = value;
    this.elements.stars.forEach((star) => {
      const starValue = Number(star.dataset.value);
      star.classList.toggle("is-active", starValue <= value);
    });
  }

  handleFileChange(event) {
    const files = Array.from(event.target.files || []).slice(0, MAX_IMAGES);
    this.state.files = files;
    this.renderFileList();
    this.elements.errors.images.textContent = "";
  }

  renderFileList() {
    if (!this.elements.fileList) return;
    if (!this.state.files.length) {
      this.elements.fileList.innerHTML = "";
      return;
    }
    this.elements.fileList.innerHTML = this.state.files
      .map(
        (file) => `
        <li>
          ${file.name}
          <span>${(file.size / (1024 * 1024)).toFixed(1)} MB</span>
        </li>
      `
      )
      .join("");
  }

  async handleSubmit() {
    if (this.state.submitting) return;
    const errors = this.validate();
    this.renderErrors(errors);
    if (Object.keys(errors).length) {
      this.showFeedback("", "info");
      return;
    }
    this.showFeedback("", "info");
    this.setSubmitting(true);
    try {
      const payload = await this.buildPayload();
      const response = await fetch(`${getApiBase()}/api/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.error || "Unable to submit your review.");
      }
      this.showFeedback("Thank you! Your review was submitted.", "success");
      this.resetForm();
      if (this.onSuccess) {
        this.onSuccess(result);
      }
    } catch (error) {
      this.showFeedback(error.message, "error");
    } finally {
      this.setSubmitting(false);
    }
  }

  validate() {
    const errors = {};
    const title = this.elements.inputs.title.value.trim();
    const content = this.elements.inputs.content.value.trim();
    if (!this.state.rating) {
      errors.rating = "Select a star rating.";
    }
    if (!title) {
      errors.title = "Title is required.";
    }
    if (!content) {
      errors.content = "Review content is required.";
    }
    const oversizedFile = this.state.files.find(
      (file) => file.size > MAX_IMAGE_SIZE_BYTES
    );
    if (oversizedFile) {
      errors.images = `${oversizedFile.name} exceeds ${MAX_IMAGE_SIZE_MB}MB.`;
    }
    return errors;
  }

  renderErrors(errors = {}) {
    Object.entries(this.elements.errors).forEach(([key, node]) => {
      if (!node) return;
      node.textContent = errors[key] || "";
    });
  }

  async buildPayload() {
    const imageUrls = await this.processImages();
    return {
      event_id: this.eventId,
      organizer_id: this.organizerId,
      rating: this.state.rating,
      title: this.elements.inputs.title.value.trim(),
      content: this.elements.inputs.content.value.trim(),
      category: this.elements.inputs.category.value || null,
      image_urls: imageUrls.length ? imageUrls : null,
    };
  }

  async processImages() {
    if (!this.state.files.length) return [];
    const conversions = this.state.files.map(
      (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () =>
            reject(
              new Error(
                `Unable to read ${file.name}. Please try a different image.`
              )
            );
          reader.readAsDataURL(file);
        })
    );
    return Promise.all(conversions);
  }

  resetForm() {
    if (!this.elements.form) return;
    this.elements.form.reset();
    this.state.rating = 0;
    this.state.files = [];
    this.renderFileList();
    this.renderErrors({});
    this.elements.stars.forEach((star) =>
      star.classList.remove("is-active")
    );
  }

  showFeedback(message, variant = "info") {
    if (!this.elements.feedback) return;
    this.elements.feedback.textContent = message;
    this.elements.feedback.dataset.variant = variant;
  }

  setSubmitting(isSubmitting) {
    this.state.submitting = isSubmitting;
    if (this.elements.submitButton) {
      this.elements.submitButton.disabled = isSubmitting;
      this.elements.submitButton.textContent = isSubmitting
        ? "Submitting..."
        : "Submit review";
    }
  }
}

export function mountReviewForm(options) {
  return new ReviewForm(options);
}

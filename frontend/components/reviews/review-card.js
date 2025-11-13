const DEFAULT_AVATAR =
  "https://api.dicebear.com/7.x/initials/svg?seed=Attendee&backgroundColor=ffdede";

export class ReviewCard {
  constructor(options = {}) {
    this.review = options.review || {};
    this.currentUser = options.currentUser || null;
    this.onHelpful = typeof options.onHelpful === "function" ? options.onHelpful : null;
    this.onEdit = typeof options.onEdit === "function" ? options.onEdit : null;
    this.onDelete = typeof options.onDelete === "function" ? options.onDelete : null;
    this.helpfulProcessing = Boolean(options.helpfulProcessing);
    this.element = this.render();
  }

  render() {
    const card = document.createElement("article");
    card.className = "review-card";

    const header = this.buildHeader();
    const body = this.buildBody();
    const footer = this.buildFooter();

    card.append(header, body, footer);
    return card;
  }

  buildHeader() {
    const header = document.createElement("header");
    header.className = "review-card__header";

    const identity = document.createElement("div");
    identity.className = "review-card__identity";

    const avatarWrapper = document.createElement("div");
    avatarWrapper.className = "review-card__avatar";

    const avatarUrl = this.review.reviewer_avatar || DEFAULT_AVATAR;
    const avatarImg = document.createElement("img");
    avatarImg.src = avatarUrl;
    avatarImg.alt = `${this.review.reviewer_name || "Attendee"} avatar`;
    avatarWrapper.appendChild(avatarImg);

    const identityText = document.createElement("div");
    const nameEl = document.createElement("p");
    nameEl.className = "review-card__name";
    nameEl.textContent = this.review.reviewer_name || "Attendee";
    const metaEl = document.createElement("p");
    metaEl.className = "review-card__meta";
    metaEl.textContent = formatDate(this.review.created_at);
    identityText.append(nameEl, metaEl);

    identity.append(avatarWrapper, identityText);

    const ratingWrapper = document.createElement("div");
    ratingWrapper.className = "review-card__rating";
    ratingWrapper.innerHTML = `
      <div class="review-card__stars">${buildStars(this.review.rating)}</div>
      <span class="review-card__rating-value">${Number(this.review.rating || 0).toFixed(1)}</span>
    `;

    header.append(identity, ratingWrapper);
    return header;
  }

  buildBody() {
    const body = document.createElement("div");
    body.className = "review-card__body";

    const titleEl = document.createElement("h4");
    titleEl.textContent = this.review.title || "Untitled review";

    body.appendChild(titleEl);

    if (this.review.category) {
      const categoryChip = document.createElement("span");
      categoryChip.className = "review-card__category";
      categoryChip.textContent = this.review.category;
      body.appendChild(categoryChip);
    }

    const contentEl = document.createElement("p");
    contentEl.textContent = this.review.content || "";
    body.appendChild(contentEl);

    const images = parseImages(this.review.image_urls);
    if (images.length) {
      const gallery = document.createElement("div");
      gallery.className = "review-card__gallery";
      images.forEach((src, index) => {
        const img = document.createElement("img");
        img.src = src;
        img.alt = `${this.review.title || "Review"} image ${index + 1}`;
        gallery.appendChild(img);
      });
      body.appendChild(gallery);
    }

    return body;
  }

  buildFooter() {
    const footer = document.createElement("footer");
    footer.className = "review-card__footer";

    const helpfulGroup = document.createElement("div");
    helpfulGroup.className = "review-card__helpful-group";

    const helpfulButton = document.createElement("button");
    helpfulButton.type = "button";
    helpfulButton.className = "review-card__helpful-btn";
    helpfulButton.innerHTML = `<span>👍</span><span>Helpful</span>`;
    helpfulButton.disabled = this.helpfulProcessing;
    helpfulButton.addEventListener("click", () => {
      if (this.helpfulProcessing || !this.onHelpful) return;
      this.onHelpful(this.review);
    });

    const helpfulCount = document.createElement("span");
    helpfulCount.className = "review-card__helpful-count";
    helpfulCount.textContent = formatHelpfulCount(this.review.helpful_count);

    helpfulGroup.append(helpfulButton, helpfulCount);
    footer.appendChild(helpfulGroup);

    if (this.isOwner()) {
      const actions = document.createElement("div");
      actions.className = "review-card__actions";

      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "btn btn-secondary btn-sm";
      editButton.textContent = "Edit";
      editButton.addEventListener("click", () => {
        if (this.onEdit) this.onEdit(this.review);
      });

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "btn btn-secondary btn-sm";
      deleteButton.textContent = "Delete";
      deleteButton.addEventListener("click", () => {
        if (this.onDelete) this.onDelete(this.review);
      });

      actions.append(editButton, deleteButton);
      footer.appendChild(actions);
    }

    return footer;
  }

  isOwner() {
    if (!this.currentUser || !this.review) return false;
    const currentId = Number(this.currentUser.id || this.currentUser.user_id);
    return Number(this.review.user_id) === currentId;
  }
}

function buildStars(rating) {
  const value = Number(rating) || 0;
  let template = "";
  for (let i = 1; i <= 5; i += 1) {
    const filled = value >= i - 0.25;
    const half = !filled && value >= i - 0.75;
    template += `<span class="review-card__star ${
      filled ? "is-filled" : half ? "is-half" : ""
    }">★</span>`;
  }
  return template;
}

function formatDate(dateString) {
  if (!dateString) return "Recently";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Recently";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function parseImages(imageField) {
  if (!imageField) return [];
  if (Array.isArray(imageField)) return imageField;
  if (typeof imageField === "string") {
    try {
      const parsed = JSON.parse(imageField);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      return [imageField];
    } catch (_) {
      return [imageField];
    }
  }
  return [];
}

function formatHelpfulCount(count) {
  const value = Number(count) || 0;
  if (value === 1) return "1 found this helpful";
  return `${value} found this helpful`;
}

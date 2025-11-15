/**
 * Ask Question Form Component
 * Allows users to submit new questions to event organizers
 */

import { getApiBase, apiFetch } from '../utils/api.js';

class AskQuestionForm {
    constructor() {
        this.form = null;
        this.titleInput = null;
        this.contentInput = null;
        this.submitButton = null;
        this.errorContainer = null;
        this.successContainer = null;
        this.isSubmitting = false;
        
        // Default values - can be set externally
        this.eventId = null;
        this.organizerId = null;
        this.onSuccessCallback = null;
        
        this.init();
    }

    /**
     * Initialize the form component
     */
    init() {
        this.createFormHTML();
        this.bindEvents();
    }

    /**
     * Create the form HTML structure
     */
    createFormHTML() {
        const container = document.getElementById('ask-question-form-container');
        if (!container) {
            console.warn('Ask Question Form: Container element not found');
            return;
        }

        container.innerHTML = `
            <div class="ask-question-form">
                <div class="form-header">
                    <h3>Ask a Question</h3>
                    <p>Get answers from event organizers</p>
                </div>
                
                <div id="ask-question-success" class="success-message" style="display: none;">
                    <span class="success-icon">✓</span>
                    <span class="success-text">Question submitted successfully!</span>
                </div>
                
                <div id="ask-question-error" class="error-message" style="display: none;">
                    <span class="error-icon">⚠</span>
                    <span class="error-text"></span>
                </div>

                <form id="ask-question-form" class="question-form">
                    <div class="form-group">
                        <label for="question-title">Question Title *</label>
                        <input 
                            type="text" 
                            id="question-title" 
                            name="title" 
                            maxlength="255"
                            placeholder="Enter a clear, descriptive title for your question"
                            required
                        >
                        <div class="field-hint">Maximum 255 characters</div>
                    </div>

                    <div class="form-group">
                        <label for="question-content">Question Details *</label>
                        <textarea 
                            id="question-content" 
                            name="content" 
                            rows="5"
                            maxlength="5000"
                            placeholder="Provide detailed information about your question..."
                            required
                        ></textarea>
                        <div class="field-hint">
                            <span class="char-counter">0/5000 characters</span>
                        </div>
                    </div>

                    <div class="form-actions">
                        <button type="submit" id="submit-question" class="btn btn-primary">
                            <span class="btn-text">Submit</span>
                            <span class="btn-spinner" style="display: none;">⟳</span>
                        </button>
                        <button type="button" id="cancel-question" class="btn btn-secondary">
                            Clear
                        </button>
                    </div>
                </form>
            </div>
        `;

        // Cache DOM elements
        this.form = document.getElementById('ask-question-form');
        this.titleInput = document.getElementById('question-title');
        this.contentInput = document.getElementById('question-content');
        this.submitButton = document.getElementById('submit-question');
        this.errorContainer = document.getElementById('ask-question-error');
        this.successContainer = document.getElementById('ask-question-success');
        this.cancelButton = document.getElementById('cancel-question');
        this.charCounter = container.querySelector('.char-counter');
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        if (!this.form) return;

        // Form submission
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Character counter for content
        if (this.contentInput && this.charCounter) {
            this.contentInput.addEventListener('input', () => {
                const count = this.contentInput.value.length;
                this.charCounter.textContent = `${count}/5000 characters`;
                
                if (count > 4500) {
                    this.charCounter.style.color = '#e53e3e';
                } else if (count > 4000) {
                    this.charCounter.style.color = '#d69e2e';
                } else {
                    this.charCounter.style.color = '#666';
                }
            });
        }

        // Cancel button
        if (this.cancelButton) {
            this.cancelButton.addEventListener('click', () => this.resetForm());
        }

        // Real-time validation
        if (this.titleInput) {
            this.titleInput.addEventListener('input', () => this.clearMessages());
        }
        if (this.contentInput) {
            this.contentInput.addEventListener('input', () => this.clearMessages());
        }
    }

    /**
     * Handle form submission
     */
    async handleSubmit(event) {
        event.preventDefault();
        
        if (this.isSubmitting) return;
        
        const formData = new FormData(this.form);
        const title = formData.get('title').trim();
        const content = formData.get('content').trim();
        
        // Client-side validation
        if (!this.validateForm(title, content)) return;
        
        try {
            this.setSubmittingState(true);
            this.clearMessages();
            
            const payload = {
                event_id: this.eventId,
                organizer_id: this.organizerId,
                title: title,
                content: content
            };

            const response = await apiFetch('/api/questions', {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            this.showSuccess('Question submitted successfully! The organizer will be notified.');
            this.resetForm();
            
            // Trigger refresh of questions list if callback provided
            if (this.onSuccessCallback && typeof this.onSuccessCallback === 'function') {
                this.onSuccessCallback(response.question);
            }
            
        } catch (error) {
            console.error('Error submitting question:', error);
            let errorMessage = 'Failed to submit question. Please try again.';
            
            if (error.message) {
                errorMessage = error.message;
            }
            
            this.showError(errorMessage);
        } finally {
            this.setSubmittingState(false);
        }
    }

    /**
     * Validate form data
     */
    validateForm(title, content) {
        if (!title) {
            this.showError('Question title is required');
            this.titleInput.focus();
            return false;
        }
        
        if (title.length > 255) {
            this.showError('Question title must be 255 characters or less');
            this.titleInput.focus();
            return false;
        }
        
        if (!content) {
            this.showError('Question content is required');
            this.contentInput.focus();
            return false;
        }
        
        if (content.length > 5000) {
            this.showError('Question content must be 5000 characters or less');
            this.contentInput.focus();
            return false;
        }

        if (!this.eventId || !this.organizerId) {
            this.showError('Missing event or organizer information');
            return false;
        }
        
        return true;
    }

    /**
     * Set submitting state
     */
    setSubmittingState(submitting) {
        this.isSubmitting = submitting;
        
        if (this.submitButton) {
            this.submitButton.disabled = submitting;
            const btnText = this.submitButton.querySelector('.btn-text');
            const btnSpinner = this.submitButton.querySelector('.btn-spinner');
            
            if (btnText && btnSpinner) {
                btnText.style.display = submitting ? 'none' : 'inline';
                btnSpinner.style.display = submitting ? 'inline' : 'none';
            }
        }
        
        if (this.titleInput) this.titleInput.disabled = submitting;
        if (this.contentInput) this.contentInput.disabled = submitting;
        if (this.cancelButton) this.cancelButton.disabled = submitting;
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        if (this.successContainer) {
            const textElement = this.successContainer.querySelector('.success-text');
            if (textElement) textElement.textContent = message;
            this.successContainer.style.display = 'flex';
        }
        
        if (this.errorContainer) {
            this.errorContainer.style.display = 'none';
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        if (this.errorContainer) {
            const textElement = this.errorContainer.querySelector('.error-text');
            if (textElement) textElement.textContent = message;
            this.errorContainer.style.display = 'flex';
        }
        
        if (this.successContainer) {
            this.successContainer.style.display = 'none';
        }
    }

    /**
     * Clear all messages
     */
    clearMessages() {
        if (this.successContainer) {
            this.successContainer.style.display = 'none';
        }
        if (this.errorContainer) {
            this.errorContainer.style.display = 'none';
        }
    }

    /**
     * Reset form to initial state
     */
    resetForm() {
        if (this.form) {
            this.form.reset();
        }
        
        if (this.charCounter) {
            this.charCounter.textContent = '0/5000 characters';
            this.charCounter.style.color = '#666';
        }
        
        this.clearMessages();
        this.setSubmittingState(false);
    }

    /**
     * Set event and organizer IDs
     */
    setEventContext(eventId, organizerId) {
        this.eventId = eventId;
        this.organizerId = organizerId;
    }

    /**
     * Set success callback for parent component updates
     */
    setOnSuccess(callback) {
        this.onSuccessCallback = callback;
    }

    /**
     * Show/hide the form
     */
    setVisible(visible) {
        const container = document.getElementById('ask-question-form-container');
        if (container) {
            container.style.display = visible ? 'block' : 'none';
        }
    }
}

// Export for use in other modules
export { AskQuestionForm };
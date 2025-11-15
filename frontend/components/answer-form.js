/**
 * Answer Form Component
 * Allows event organizers to submit answers to questions
 * Only visible to authenticated organizers for their events
 */

import { getApiBase, apiFetch } from '../utils/api.js';

class AnswerForm {
    constructor() {
        this.form = null;
        this.contentInput = null;
        this.submitButton = null;
        this.errorContainer = null;
        this.successContainer = null;
        this.isSubmitting = false;
        
        // Context data
        this.questionId = null;
        this.currentUserId = null;
        this.requiredOrganizerId = null;
        this.onSuccessCallback = null;
        
        this.init();
    }

    /**
     * Initialize the form component
     */
    init() {
        this.createFormHTML();
        this.bindEvents();
        this.checkVisibility();
    }

    /**
     * Create the form HTML structure
     */
    createFormHTML() {
        const container = document.getElementById('answer-form-container');
        if (!container) {
            console.warn('Answer Form: Container element not found');
            return;
        }

        container.innerHTML = `
            <div class="answer-form" style="display: none;">
                <div class="form-header">
                    <h4>Submit Answer</h4>
                    <p>Provide an official organizer response</p>
                </div>
                
                <div id="answer-success" class="success-message" style="display: none;">
                    <span class="success-icon">✓</span>
                    <span class="success-text">Answer submitted successfully!</span>
                </div>
                
                <div id="answer-error" class="error-message" style="display: none;">
                    <span class="error-icon">⚠</span>
                    <span class="error-text"></span>
                </div>

                <form id="answer-form" class="answer-submission-form">
                    <div class="form-group">
                        <label for="answer-content">Your Answer *</label>
                        <textarea 
                            id="answer-content" 
                            name="content" 
                            rows="4"
                            maxlength="5000"
                            placeholder="Provide a helpful and detailed answer..."
                            required
                        ></textarea>
                        <div class="field-hint">
                            <span class="answer-char-counter">0/5000 characters</span>
                        </div>
                    </div>

                    <div class="form-actions">
                        <button type="submit" id="submit-answer" class="btn btn-primary">
                            <span class="btn-text">Submit Answer</span>
                            <span class="btn-spinner" style="display: none;">⟳</span>
                        </button>
                        <button type="button" id="cancel-answer" class="btn btn-secondary">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        `;

        // Cache DOM elements
        this.form = document.getElementById('answer-form');
        this.contentInput = document.getElementById('answer-content');
        this.submitButton = document.getElementById('submit-answer');
        this.errorContainer = document.getElementById('answer-error');
        this.successContainer = document.getElementById('answer-success');
        this.cancelButton = document.getElementById('cancel-answer');
        this.charCounter = container.querySelector('.answer-char-counter');
        this.formWrapper = container.querySelector('.answer-form');
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
            this.cancelButton.addEventListener('click', () => {
                this.resetForm();
                this.hide();
            });
        }

        // Real-time validation
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
        const content = formData.get('content').trim();
        
        // Client-side validation
        if (!this.validateForm(content)) return;
        
        try {
            this.setSubmittingState(true);
            this.clearMessages();
            
            const payload = {
                content: content
            };

            const response = await apiFetch(`/api/questions/${this.questionId}/answers`, {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            this.showSuccess('Answer submitted successfully!');
            this.resetForm();
            
            // Hide form after successful submission
            setTimeout(() => {
                this.hide();
            }, 2000);
            
            // Trigger refresh of questions list if callback provided
            if (this.onSuccessCallback && typeof this.onSuccessCallback === 'function') {
                this.onSuccessCallback(response.answer);
            }
            
        } catch (error) {
            console.error('Error submitting answer:', error);
            let errorMessage = 'Failed to submit answer. Please try again.';
            
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
    validateForm(content) {
        if (!content) {
            this.showError('Answer content is required');
            this.contentInput.focus();
            return false;
        }
        
        if (content.length > 5000) {
            this.showError('Answer content must be 5000 characters or less');
            this.contentInput.focus();
            return false;
        }

        if (!this.questionId) {
            this.showError('Question ID is missing');
            return false;
        }

        // Check organizer authorization
        if (!this.isAuthorizedOrganizer()) {
            this.showError('Only the event organizer can submit official answers');
            return false;
        }
        
        return true;
    }

    /**
     * Check if current user is authorized to answer
     */
    isAuthorizedOrganizer() {
        return this.currentUserId && 
               this.requiredOrganizerId && 
               Number(this.currentUserId) === Number(this.requiredOrganizerId);
    }

    /**
     * Check visibility based on authorization
     */
    checkVisibility() {
        if (this.isAuthorizedOrganizer()) {
            this.show();
        } else {
            this.hide();
        }
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
     * Set question and authorization context
     */
    setContext(questionId, currentUserId, requiredOrganizerId) {
        this.questionId = questionId;
        this.currentUserId = currentUserId;
        this.requiredOrganizerId = requiredOrganizerId;
        this.checkVisibility();
    }

    /**
     * Set success callback for parent component updates
     */
    setOnSuccess(callback) {
        this.onSuccessCallback = callback;
    }

    /**
     * Show the form (if authorized)
     */
    show() {
        if (this.formWrapper && this.isAuthorizedOrganizer()) {
            this.formWrapper.style.display = 'block';
        }
    }

    /**
     * Hide the form
     */
    hide() {
        if (this.formWrapper) {
            this.formWrapper.style.display = 'none';
        }
        this.resetForm();
    }

    /**
     * Toggle form visibility for authorized users
     */
    toggle() {
        if (!this.isAuthorizedOrganizer()) {
            console.warn('Answer form: User not authorized to view this form');
            return;
        }
        
        if (this.formWrapper) {
            const isVisible = this.formWrapper.style.display !== 'none';
            if (isVisible) {
                this.hide();
            } else {
                this.show();
                // Focus on textarea when showing
                if (this.contentInput) {
                    setTimeout(() => this.contentInput.focus(), 100);
                }
            }
        }
    }
}

// Export for use in other modules
export { AnswerForm };
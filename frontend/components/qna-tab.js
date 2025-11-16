import { getApiBase, apiFetch } from '../utils/api.js';

/**
 * Q&A Tab Component
 * Manages the Questions & Answers interface including:
 * - Fetching and displaying questions
 * - Sorting controls
 * - Question count display
 * - Loading and error states
 */
class QnATab {
    constructor(eventId = null, organizerId = null) {
        this.questions = [];
        this.currentSort = 'recent';
        this.isLoading = false;
        this.error = null;
        this.eventId = eventId;
        this.organizerId = organizerId;
        
        console.log('🏗️ Initializing Q&A Tab with context:', { eventId: this.eventId, organizerId: this.organizerId });
        
        this.initializeElements();
        this.attachEventListeners();
        this.loadQuestions();
    }

    initializeElements() {
        this.sortSelect = document.getElementById('sortSelect');
        this.questionCount = document.getElementById('questionCount');
        this.questionsContainer = document.getElementById('questionsContainer');
        this.loadingState = document.getElementById('loadingState');
    }

    attachEventListeners() {
        // Sort dropdown change handler
        if (this.sortSelect) {
            this.sortSelect.addEventListener('change', (e) => {
                this.currentSort = e.target.value;
                this.loadQuestions();
            });
        }
    }

    /**
     * Fetch questions from the API with sorting parameters
     */
    async loadQuestions() {
        this.setLoadingState(true);
        this.error = null;

        try {
            // Build query parameters - the backend API handles sorting internally
            const params = new URLSearchParams();
            
            // Add event and organizer filters if available
            if (this.eventId) {
                params.set('event_id', this.eventId);
                console.log('🏷️ Filtering by event_id:', this.eventId);
            }
            if (this.organizerId) {
                params.set('organizer_id', this.organizerId);
                console.log('🏷️ Filtering by organizer_id:', this.organizerId);
            }
            
            // Add any filters for unanswered questions
            if (this.currentSort === 'unanswered') {
                params.set('is_answered', 'false');
            }
            
            // Include answers in the response
            params.set('include_answers', 'true');

            let data;
            
            // Fetch from real API
            console.log('🌐 Fetching questions from:', `/api/questions?${params.toString()}`);
            const response = await apiFetch(`/api/questions?${params.toString()}`);
            
            // apiFetch now throws errors automatically, so if we get here, it's successful
            data = await response.json();
            console.log('✅ Loaded questions from API:', data);
            console.log('📊 Questions array length:', data.questions ? data.questions.length : 'no questions property');

            this.questions = Array.isArray(data) ? data : data.questions || [];
            
            console.log('📊 Loaded', this.questions.length, 'questions from API');
            
            // Sort questions based on current sort selection
            this.sortQuestions();
            
            console.log('🔄 Questions after sorting:', this.questions.length);
            
            this.renderQuestions();
            this.updateQuestionCount();
            
        } catch (error) {
            console.error('Error loading questions:', error);
            this.error = error.message;
            this.renderError();
        } finally {
            this.setLoadingState(false);
        }
    }

    /**
     * Sort questions based on current selection
     */
    sortQuestions() {
        switch (this.currentSort) {
            case 'recent':
                this.questions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                break;
            case 'helpful':
                this.questions.sort((a, b) => (b.helpful_count || 0) - (a.helpful_count || 0));
                break;
            case 'unanswered':
                // Unanswered first, then by recent
                this.questions.sort((a, b) => {
                    const aAnswered = a.is_answered === 1 || a.is_answered === true;
                    const bAnswered = b.is_answered === 1 || b.is_answered === true;
                    
                    if (aAnswered === bAnswered) {
                        return new Date(b.created_at) - new Date(a.created_at);
                    }
                    return aAnswered ? 1 : -1;
                });
                break;
        }
    }

    /**
     * Update the question count display
     */
    updateQuestionCount() {
        if (this.questionCount) {
            const count = this.questions.length;
            const sortLabel = this.getSortLabel();
            this.questionCount.textContent = `${count} question${count !== 1 ? 's' : ''} (${sortLabel})`;
        }
    }

    /**
     * Get human-readable sort label
     */
    getSortLabel() {
        switch (this.currentSort) {
            case 'recent':
                return 'Most Recent';
            case 'helpful':
                return 'Most Helpful';
            case 'unanswered':
                return 'Unanswered First';
            default:
                return 'Default';
        }
    }

    /**
     * Render the questions list
     */
    renderQuestions() {
        if (!this.questionsContainer) {
            console.error('❌ questionsContainer not found!');
            return;
        }

        // Clear container
        this.questionsContainer.innerHTML = '';

        if (this.questions.length === 0) {
            this.renderEmptyState();
            return;
        }

        // Create questions list container
        const questionsList = document.createElement('div');
        questionsList.className = 'questions-list';

        // Render each question
        this.questions.forEach(question => {
            const questionCard = this.createQuestionCard(question);
            questionsList.appendChild(questionCard);
        });

        this.questionsContainer.appendChild(questionsList);
    }

    /**
     * Create a question card element
     */
    createQuestionCard(question) {
        const card = document.createElement('div');
        card.className = 'question-card';
        
        // Determine question status - use is_answered field from API
        const isAnswered = question.is_answered === 1 || question.is_answered === true;
        const statusClass = isAnswered ? 'status-answered' : 'status-unanswered';
        const statusText = isAnswered ? 'Answered' : 'Unanswered';

        // Format date
        const createdDate = new Date(question.created_at);
        const timeAgo = this.formatTimeAgo(createdDate);

        // Count answers if available
        const answerCount = question.answers ? question.answers.length : 0;

        card.innerHTML = `
            <div class="question-header">
                <h3 class="question-title">${this.escapeHtml(question.title)}</h3>
                <span class="question-status ${statusClass}">${statusText}</span>
            </div>
            
            <div class="question-content">
                ${this.escapeHtml(this.truncateText(question.content, 150))}
            </div>
            
            <div class="question-meta">
                <div class="question-stats">
                    <div class="stat-item">
                        <span>👍</span>
                        <span>${question.helpful_count || 0}</span>
                    </div>
                    <div class="stat-item">
                        <span>💬</span>
                        <span>${answerCount} answers</span>
                    </div>
                    <div class="stat-item">
                        <span>👤</span>
                        <span>${this.escapeHtml(question.asker_name || 'Anonymous')}</span>
                    </div>
                </div>
                <div class="question-date">
                    ${timeAgo}
                </div>
            </div>
        `;

        // Add click handler to navigate to question details (future implementation)
        card.addEventListener('click', () => {
            // TODO: Navigate to question detail page
            console.log('Navigate to question:', question.id);
        });

        return card;
    }

    /**
     * Render empty state when no questions are found
     */
    renderEmptyState() {
        this.questionsContainer.innerHTML = `
            <div class="empty-state">
                <h3>No questions found</h3>
                <p>Be the first to ask a question!</p>
            </div>
        `;
    }

    /**
     * Render error state
     */
    renderError() {
        if (!this.questionsContainer) return;

        this.questionsContainer.innerHTML = `
            <div class="error-state">
                <h3>Error Loading Questions</h3>
                <p>${this.escapeHtml(this.error)}</p>
                <button onclick="window.qnaTab.loadQuestions()" class="btn btn-primary">
                    Try Again
                </button>
            </div>
        `;
    }

    /**
     * Set loading state
     */
    setLoadingState(loading) {
        this.isLoading = loading;
        
        if (this.loadingState) {
            this.loadingState.style.display = loading ? 'block' : 'none';
        }

        if (this.sortSelect) {
            this.sortSelect.disabled = loading;
        }

        if (loading && this.questionCount) {
            this.questionCount.textContent = 'Loading questions...';
        }
    }

    /**
     * Utility function to escape HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Utility function to truncate text
     */
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    /**
     * Format time ago string
     */
    formatTimeAgo(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMinutes = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMinutes < 1) return 'Just now';
        if (diffMinutes < 60) return `${diffMinutes}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString();
    }

    /**
     * Public method to refresh questions
     */
    refresh() {
        console.log('🔄 Q&A Tab: Refresh called - reloading questions...');
        this.loadQuestions();
    }
}

// Note: Q&A tab is now initialized from the main page with proper context
// No automatic DOM initialization

// Export for potential use in other modules
export { QnATab };
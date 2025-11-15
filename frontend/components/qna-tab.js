import { getApiBase, apiFetch } from '../utils/api.js';
import { mockQuestions, mockApiCall, sortQuestions } from './qna-mock-data.js';

/**
 * Q&A Tab Component
 * Manages the Questions & Answers interface including:
 * - Fetching and displaying questions
 * - Sorting controls
 * - Question count display
 * - Loading and error states
 */
class QnATab {
    constructor() {
        this.questions = [];
        this.currentSort = 'recent';
        this.isLoading = false;
        this.error = null;
        
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
            // Build query parameters for sorting
            const params = new URLSearchParams();
            
            switch (this.currentSort) {
                case 'recent':
                    params.set('sortBy', 'date');
                    params.set('order', 'desc');
                    break;
                case 'helpful':
                    params.set('sortBy', 'helpful');
                    params.set('order', 'desc');
                    break;
                case 'unanswered':
                    params.set('sortBy', 'unanswered');
                    params.set('order', 'desc');
                    break;
            }

            let data;
            
            try {
                // Try to fetch from real API first
                const response = await apiFetch(`/api/questions?${params.toString()}`);
                
                if (!response.ok) {
                    throw new Error(`API returned ${response.status}`);
                }

                data = await response.json();
                console.log('✅ Loaded questions from API');
                
            } catch (apiError) {
                // Fallback to mock data for development
                console.warn('📝 API not available, using mock data:', apiError.message);
                
                // Simulate API call with mock data
                await mockApiCall(mockQuestions, 500, 0.05);
                data = sortQuestions(mockQuestions, this.currentSort);
            }

            this.questions = Array.isArray(data) ? data : data.questions || [];
            
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
        if (!this.questionsContainer) return;

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
        
        // Determine question status
        const isAnswered = question.answered || question.answer_count > 0;
        const statusClass = isAnswered ? 'status-answered' : 'status-unanswered';
        const statusText = isAnswered ? 'Answered' : 'Unanswered';

        // Format date
        const createdDate = new Date(question.created_at || question.date);
        const timeAgo = this.formatTimeAgo(createdDate);

        card.innerHTML = `
            <div class="question-header">
                <h3 class="question-title">${this.escapeHtml(question.title || question.question)}</h3>
                <span class="question-status ${statusClass}">${statusText}</span>
            </div>
            
            <div class="question-content">
                ${this.escapeHtml(this.truncateText(question.content || question.description || '', 150))}
            </div>
            
            <div class="question-meta">
                <div class="question-stats">
                    <div class="stat-item">
                        <span>👍</span>
                        <span>${question.helpful_count || question.likes || 0}</span>
                    </div>
                    <div class="stat-item">
                        <span>💬</span>
                        <span>${question.answer_count || question.replies || 0} answers</span>
                    </div>
                    <div class="stat-item">
                        <span>👤</span>
                        <span>${this.escapeHtml(question.author || question.user_name || 'Anonymous')}</span>
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
        this.loadQuestions();
    }
}

// Initialize the Q&A tab when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Make instance globally accessible for debugging and external calls
    window.qnaTab = new QnATab();
});

// Export for potential use in other modules
export { QnATab };
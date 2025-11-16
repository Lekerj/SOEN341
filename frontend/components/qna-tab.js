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
        this.pendingHelpfulRequests = new Set(); // Track pending helpful requests to prevent duplicates
        this.userVotedQuestionIds = new Set(); // Track which questions user has already voted on
        this.userVotedAnswerIds = new Set(); // Track which answers user has already voted on

        console.log('🏗️ Initializing Q&A Tab with context:', { eventId: this.eventId, organizerId: this.organizerId });

        this.initializeElements();
        this.attachEventListeners();
        this.loadUserVotes(); // Load user's vote history first
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

            // Add sort parameter to API
            params.set('sort', this.currentSort);
            console.log('📊 Sorting by:', this.currentSort);

            // Add any filters for unanswered questions (no longer needed with server-side sort)
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
            // Sorting is now handled server-side, no need for client-side sorting
            
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
     * Load current user's helpful vote history
     */
    async loadUserVotes() {
        try {
            console.log('📥 Loading user vote history...');
            const response = await apiFetch('/api/questions/user-votes');
            const data = await response.json();

            // Store voted question and answer IDs in Sets for O(1) lookup
            this.userVotedQuestionIds = new Set(data.votedQuestionIds || []);
            this.userVotedAnswerIds = new Set(data.votedAnswerIds || []);

            console.log('✅ Loaded user votes:', {
                votedQuestions: this.userVotedQuestionIds.size,
                votedAnswers: this.userVotedAnswerIds.size,
                questionIds: Array.from(this.userVotedQuestionIds),
                answerIds: Array.from(this.userVotedAnswerIds)
            });
        } catch (error) {
            console.warn('⚠️ Could not load user vote history:', error);
            // It's okay if we can't load votes - just continue without pre-disabling
        }
    }

    /**
     * Update event and organizer context and reload questions
     */
    setContext(eventId, organizerId) {
        this.eventId = eventId;
        this.organizerId = organizerId;
        console.log('🔄 Q&A Tab context updated:', { eventId: this.eventId, organizerId: this.organizerId });
        this.loadQuestions();
    }

    /**
     * Refresh questions (reload from API)
     */
    refresh() {
        console.log('🔄 Refreshing questions...');
        this.loadQuestions();
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

        // Attach event delegation for helpful buttons
        this.attachQuestionHelpfulListeners();
    }

    /**
     * Attach event delegation for question helpful buttons
     */
    attachQuestionHelpfulListeners() {
        console.log('🔌 Attaching event delegation for question helpful buttons');
        console.log('📍 Container element:', this.questionsContainer);

        // Remove any old listeners first
        if (this.questionsContainer.helpfulListener) {
            this.questionsContainer.removeEventListener('click', this.questionsContainer.helpfulListener);
        }

        // Create the event handler - log ALL clicks to debug
        const handler = (e) => {
            // Log every single click to see what's happening
            console.log('🖱️ Click detected on:', e.target, 'Class:', e.target.className);

            const btn = e.target.closest('.question-helpful-btn');
            console.log('🔍 Looking for .question-helpful-btn, found:', !!btn);

            if (!btn) {
                console.log('⚠️ Not a helpful button click, ignoring');
                return;
            }

            e.preventDefault();
            e.stopPropagation();

            const questionId = parseInt(btn.getAttribute('data-question-id'));
            console.log('👍 CLICK! Helpful button clicked for question:', questionId);
            console.log('🔄 Calling handleQuestionHelpful');

            this.handleQuestionHelpful(questionId, btn);
        };

        // Store the handler reference so we can remove it later
        this.questionsContainer.helpfulListener = handler;

        // Attach the listener to the container with capture phase
        this.questionsContainer.addEventListener('click', handler, true);
        console.log('✅ Event delegation attached to container');
    }

    /**
     * Create a question card element with embedded answers
     */
    createQuestionCard(question) {
        const container = document.createElement('div');
        container.className = 'question-card-container';

        // Create main question card
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
                    <button class="stat-item question-helpful-btn" data-question-id="${question.id}" title="Mark as helpful" type="button">
                        <span>👍</span>
                        <span>${question.helpful_count || 0}</span>
                    </button>
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

            <div class="question-actions">
                <button class="answer-btn" data-question-id="${question.id}" data-question-title="${this.escapeHtml(question.title)}">
                    Submit Answer
                </button>
                ${answerCount > 0 ? `<button class="toggle-answers-btn" title="Show/hide answers">
                    <span class="toggle-icon">▼</span> ${answerCount} Answer${answerCount !== 1 ? 's' : ''}
                </button>` : ''}
            </div>
        `;

        container.appendChild(card);

        // Add answers display if answers exist (hidden by default)
        if (answerCount > 0) {
            const answersDisplay = this.createAnswersDisplay(question.answers);
            answersDisplay.style.display = 'none'; // Hide by default
            container.appendChild(answersDisplay);

            // Add toggle button click handler
            const toggleBtn = card.querySelector('.toggle-answers-btn');
            if (toggleBtn) {
                toggleBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const icon = toggleBtn.querySelector('.toggle-icon');
                    this.toggleAnswersVisibility(container);
                    icon.textContent = answersDisplay.style.display === 'none' ? '▼' : '▶';
                });
            }
        }

        // Add click handler to toggle answer visibility on question title
        card.addEventListener('click', (e) => {
            if (e.target.closest('.question-title') && answerCount > 0) {
                const toggleBtn = card.querySelector('.toggle-answers-btn');
                if (toggleBtn) toggleBtn.click();
            }
        });

        // Add answer button click handler
        const answerBtn = card.querySelector('.answer-btn');
        if (answerBtn) {
            answerBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const questionId = parseInt(answerBtn.getAttribute('data-question-id'));
                const questionTitle = answerBtn.getAttribute('data-question-title');
                console.log('📝 Answer button clicked for question:', questionId, questionTitle);

                // Check if user is logged in
                const userData = localStorage.getItem('user');
                if (!userData) {
                    console.warn('⚠️ User not logged in, redirecting to login');
                    alert('You must be logged in to answer questions.');
                    window.location.href = 'login.html';
                    return;
                }

                // Set the question context in the answer form
                if (window.answerForm) {
                    window.answerForm.setQuestion({
                        id: questionId,
                        title: questionTitle
                    });
                    // Scroll to answer form
                    const answerFormContainer = document.getElementById('answer-form-container');
                    if (answerFormContainer) {
                        answerFormContainer.scrollIntoView({ behavior: 'smooth' });
                    }
                } else {
                    console.error('❌ Answer form not initialized');
                    alert('Answer form is not available. Please refresh the page.');
                }
            });
        }

        // Note: Question helpful button click handling is now done via event delegation
        // in attachQuestionHelpfulListeners() method

        // Disable helpful button if user has already voted on this question
        if (this.userVotedQuestionIds.has(question.id)) {
            const helpfulBtn = card.querySelector('.question-helpful-btn');
            if (helpfulBtn) {
                helpfulBtn.disabled = true;
                helpfulBtn.style.opacity = '0.5';
                helpfulBtn.style.cursor = 'not-allowed';
                helpfulBtn.title = 'You have already marked this as helpful';
                console.log('🔒 Pre-disabled helpful button for question', question.id);
            }
        }

        return container;
    }

    /**
     * Create answers display container with styled answer cards
     */
    createAnswersDisplay(answers) {
        const container = document.createElement('div');
        container.className = 'answers-container';

        const header = document.createElement('div');
        header.className = 'answers-header';
        header.textContent = `${answers.length} Answer${answers.length !== 1 ? 's' : ''}`;

        container.appendChild(header);

        if (answers.length === 0) {
            const noAnswers = document.createElement('div');
            noAnswers.className = 'no-answers-state';
            noAnswers.innerHTML = '<p>No answers yet. Be the first to answer!</p>';
            container.appendChild(noAnswers);
            return container;
        }

        const answersList = document.createElement('div');
        answersList.className = 'answers-list';

        answers.forEach(answer => {
            const answerCard = this.createAnswerCard(answer);
            answersList.appendChild(answerCard);
        });

        container.appendChild(answersList);
        return container;
    }

    /**
     * Create individual answer card with styling for official responses
     */
    createAnswerCard(answer) {
        const card = document.createElement('div');
        card.className = 'answer-card';

        // Apply special styling for official organizer responses
        if (answer.is_official_organizer_response) {
            card.classList.add('official-response');
        }

        // Format answer timestamp
        const answerDate = new Date(answer.created_at);
        const timeAgo = this.formatTimeAgo(answerDate);

        // Determine badge type and require name for organizers
        const isOfficial = answer.is_official_organizer_response;
        const isAnonymous = answer.is_anonymous;

        // Debug: Log answer data for troubleshooting
        const isAnonymousBoolDebug = isAnonymous === true || isAnonymous === 1 || isAnonymous === '1';
        console.log('Answer display data:', {
            id: answer.id,
            user_id: answer.user_id,
            author_name: answer.author_name,
            is_anonymous: isAnonymous,
            is_anonymous_boolean: isAnonymousBoolDebug,
            is_official: isOfficial,
            will_show: isAnonymousBoolDebug ? 'Anonymous' : (answer.author_name || 'Anonymous'),
            content: answer.content?.substring(0, 50)
        });

        const badgeHtml = isOfficial
            ? '<span class="official-badge">Official Response</span>'
            : '<span class="community-badge">Community</span>';

        // Determine author name display based on anonymous flag and official status
        // Note: isAnonymous can be 0/1 (from MySQL) or true/false (from JavaScript)
        const isAnonymousBool = isAnonymous === true || isAnonymous === 1 || isAnonymous === '1';

        let authorName;
        if (isAnonymousBool) {
            // User explicitly chose to be anonymous
            authorName = 'Anonymous';
        } else if (isOfficial) {
            // Official organizer response - always show name
            authorName = this.escapeHtml(answer.author_name || 'Event Organizer');
        } else if (answer.author_name) {
            // Regular user, not anonymous, and has a name - show it
            authorName = this.escapeHtml(answer.author_name);
        } else {
            // Regular user, not anonymous, but no name in database - fallback
            authorName = 'Anonymous';
        }

        card.innerHTML = `
            <div class="answer-header">
                <div class="answer-author-info">
                    <div class="answer-author-name">${authorName}</div>
                    <div class="answer-author-badge">
                        ${badgeHtml}
                    </div>
                </div>
            </div>

            <div class="answer-content">
                ${this.escapeHtml(answer.content)}
            </div>

            <div class="answer-footer">
                <div class="answer-timestamp">${timeAgo}</div>
                <button class="answer-helpful-button" data-answer-id="${answer.id}">
                    <span>👍</span>
                    <span>Helpful (${answer.helpful_count || 0})</span>
                </button>
            </div>
        `;

        // Add helpful button event listener
        const helpfulBtn = card.querySelector('.answer-helpful-button');
        if (helpfulBtn) {
            // Check if user has already voted on this answer
            if (this.userVotedAnswerIds.has(answer.id)) {
                helpfulBtn.disabled = true;
                helpfulBtn.style.opacity = '0.5';
                helpfulBtn.style.cursor = 'not-allowed';
                helpfulBtn.title = 'You have already marked this as helpful';
                helpfulBtn.textContent = '✓ Already Helpful';
                console.log('🔒 Pre-disabled helpful button for answer', answer.id);
            } else {
                helpfulBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.handleAnswerHelpful(answer.id, helpfulBtn);
                });
            }
        }

        return card;
    }

    /**
     * Toggle answers visibility when question is clicked
     */
    toggleAnswersVisibility(container) {
        const answersContainer = container.querySelector('.answers-container');
        if (answersContainer) {
            answersContainer.style.display =
                answersContainer.style.display === 'none' ? 'block' : 'none';
        }
    }

    /**
     * Handle helpful button click on answers
     */
    async handleAnswerHelpful(answerId, buttonElement) {
        console.log('Marking answer', answerId, 'as helpful');
        buttonElement.disabled = true;
        buttonElement.style.opacity = '0.6';

        // Show temporary feedback
        const originalText = buttonElement.textContent;
        buttonElement.textContent = '✓ Thanks!';

        try {
            // Find the question ID for this answer
            let questionId = null;
            for (const question of this.questions) {
                if (question.answers && question.answers.some(a => a.id === answerId)) {
                    questionId = question.id;
                    break;
                }
            }

            if (!questionId) {
                console.error('Question ID not found for answer:', answerId);
                throw new Error('Question ID not found');
            }

            // Call API to mark answer as helpful
            const response = await apiFetch(
                `/api/questions/${questionId}/answers/${answerId}/helpful`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                }
            );

            const data = await response.json();
            console.log('✅ Answer marked as helpful:', data);

            // Refresh questions to update the UI with new helpful count
            await this.loadQuestions();
        } catch (error) {
            console.error('❌ Error marking answer as helpful:', error);

            // Check if it's a duplicate vote error (409 Conflict)
            if (error.status === 409) {
                console.warn('⚠️ User has already marked this answer as helpful');
                // Disable the button permanently for this answer
                buttonElement.style.opacity = '0.5';
                buttonElement.style.cursor = 'not-allowed';
                buttonElement.title = 'You have already marked this as helpful';
                buttonElement.textContent = '✓ Already Helpful';
                alert('You have already marked this answer as helpful');
                return;
            } else {
                alert('Failed to mark answer as helpful. Please try again.');
                // Restore button state on error for other errors
                buttonElement.textContent = originalText;
                buttonElement.disabled = false;
                buttonElement.style.opacity = '1';
                return;
            }
        }

        setTimeout(() => {
            buttonElement.textContent = originalText;
            buttonElement.disabled = false;
            buttonElement.style.opacity = '1';
        }, 2000);
    }

    /**
     * Handle helpful button click on questions
     */
    async handleQuestionHelpful(questionId, buttonElement) {
        console.log('👍 Marking question', questionId, 'as helpful');
        console.log('🔍 Button element:', buttonElement);
        console.log('📊 Questions array:', this.questions);

        // Prevent duplicate requests for the same question
        if (this.pendingHelpfulRequests.has(questionId)) {
            console.warn('⚠️ Request already pending for question', questionId, 'ignoring duplicate click');
            return;
        }

        // Mark this request as pending
        this.pendingHelpfulRequests.add(questionId);

        // Visual feedback
        const originalStyle = buttonElement.style.cssText;
        buttonElement.style.opacity = '0.6';
        buttonElement.style.cursor = 'default';
        buttonElement.style.pointerEvents = 'none';

        try {
            // Call API to mark question as helpful
            console.log('🌐 Calling API: /api/questions/' + questionId + '/helpful');
            const response = await apiFetch(
                `/api/questions/${questionId}/helpful`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                }
            );

            const data = await response.json();
            console.log('✅ Question marked as helpful:', data);

            // Update the question in the local questions array
            const question = this.questions.find(q => q.id === questionId);
            console.log('🔍 Found question in array:', question);

            if (question && data.question && data.question.helpful_count !== undefined) {
                question.helpful_count = data.question.helpful_count;
                console.log('📊 Updated question helpful count to:', question.helpful_count);
            }

            // Update the helpful count in the UI
            if (data.question && data.question.helpful_count !== undefined) {
                // Get all spans in the button and update the second one (the count)
                const spans = buttonElement.querySelectorAll('span');
                console.log('🔍 All spans in button:', spans, 'length:', spans.length);

                if (spans.length >= 2) {
                    // The second span (index 1) is the count
                    const countSpan = spans[1];
                    const oldCount = countSpan.textContent;
                    countSpan.textContent = data.question.helpful_count;
                    console.log('📝 Updated UI count from', oldCount, 'to', data.question.helpful_count);
                } else {
                    console.warn('⚠️ Expected 2 spans in button but found:', spans.length);
                }
            }

            // Show temporary feedback
            buttonElement.style.opacity = '1';
            console.log('✅ Helpful button update complete');
        } catch (error) {
            console.error('❌ Error marking question as helpful:', error);

            // Check if it's a duplicate vote error (409 Conflict)
            if (error.status === 409) {
                console.warn('⚠️ User has already marked this question as helpful');
                // Disable the button permanently for this question
                buttonElement.disabled = true;
                buttonElement.style.opacity = '0.5';
                buttonElement.style.cursor = 'not-allowed';
                buttonElement.title = 'You have already marked this as helpful';
                alert('You have already marked this question as helpful');
            } else {
                alert('Failed to mark question as helpful. Please try again.');
                // Restore button state on error for other errors
                buttonElement.style.cssText = originalStyle;
            }
        } finally {
            // Remove from pending requests
            this.pendingHelpfulRequests.delete(questionId);
            console.log('🔄 Removed question', questionId, 'from pending requests');
        }
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
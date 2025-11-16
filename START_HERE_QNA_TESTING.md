# START HERE - Q&A Feature Testing Guide

Welcome! This guide will help you test the completed Q&A feature for Sprint 4.

---

## 📋 What to Read First

Choose based on your needs:

### 1. **Quick Start (5 minutes)** ⚡
**File**: [QUICK_START_QNA.md](QUICK_START_QNA.md)
- Minimal setup instructions
- Visual mockups of what you'll see
- Basic testing workflows
- Troubleshooting tips
- **Best for**: Getting running quickly

### 2. **Complete Testing Checklist (15 minutes)** ✅
**File**: [TESTING_QNA_FEATURES.md](TESTING_QNA_FEATURES.md)
- Comprehensive feature-by-feature testing guide
- Detailed acceptance criteria for each issue
- Visual styling verification
- Responsive design testing
- Success criteria checklist
- **Best for**: Thorough verification and sign-off

### 3. **Technical Implementation Details (10 minutes)** 🔧
**File**: [QNA_IMPLEMENTATION_SUMMARY.md](QNA_IMPLEMENTATION_SUMMARY.md)
- Backend API documentation
- Frontend component architecture
- Database schema details
- Data flow diagrams
- Merge history and strategy
- **Best for**: Understanding the implementation

### 4. **Project Status Report (5 minutes)** 📊
**File**: [SPRINT4_STATUS_REPORT.md](SPRINT4_STATUS_REPORT.md)
- Executive summary
- Issue completion status
- Test results
- Deployment readiness
- **Best for**: Getting overview of project status

---

## 🚀 Quick Start in 3 Steps

### Step 1: Start the Backend (Terminal 1)
```bash
cd /Users/abdel/Desktop/FALL2025/SOEN341/SOEN341/backend
npm start
```
Wait for: `Server running on http://localhost:3000`

### Step 2: Open Browser (Terminal 2)
```
http://localhost/frontend/qna.html
```

### Step 3: Start Testing!
See "Testing Workflows" section below

---

## ✅ What Should Work

### Ask a Question
1. Fill in "Ask a Question" form
2. Title and content have character counters
3. Click "Submit"
4. Question appears in list

### Answer a Question (Regular User)
1. Click "Submit Answer" button under question
2. Form expands with question context
3. Fill in answer content
4. Click "Submit Answer"
5. Answer appears with **PURPLE "COMMUNITY" badge**

### Answer as Organizer (Official Response)
1. Log in as event organizer
2. Answer the question
3. Answer appears with **GREEN "✓ OFFICIAL RESPONSE" badge**
4. Badge has animated pulse effect
5. Background is light green

---

## 🎯 Key Things to Verify

### Must Have (Non-Negotiable)
- [ ] Questions can be asked and appear in list
- [ ] Answers can be submitted
- [ ] Official organizer answers show GREEN styling
- [ ] Community answers show PURPLE styling
- [ ] All 125 backend tests pass
- [ ] No console errors in browser

### Should Have (Important)
- [ ] Character counters work (255 for title, 5000 for content)
- [ ] Form validation prevents empty submissions
- [ ] Success messages appear after submission
- [ ] Forms clear/hide after submission
- [ ] Author names display correctly

### Nice to Have (Polish)
- [ ] Badge has subtle pulse animation
- [ ] Hover effects on answer cards
- [ ] Responsive design on mobile/tablet
- [ ] Sorting/filtering works

---

## 📱 Testing Workflows

### Workflow 1: Basic Question → Answer
1. Ask: "What time does the event start?"
2. Answer as regular user: "I think it's at 2 PM"
3. **Verify**: Purple COMMUNITY badge appears

### Workflow 2: Official Response
1. Same question as above
2. Log in as event organizer
3. Answer: "Confirmed: Event starts at 2:00 PM sharp"
4. **Verify**: Green OFFICIAL RESPONSE badge appears with animation

### Workflow 3: Responsive Design
1. Resize browser to 768px (tablet)
2. Verify layout adjusts
3. Resize to 480px (mobile)
4. Verify text is readable and buttons are accessible

---

## 🔍 Visual Verification

### Official Response (GREEN) ✅
Look for:
- Light green background
- Green left border
- "✓ OFFICIAL RESPONSE" badge
- Animated pulse on badge

### Community Response (PURPLE) ✅
Look for:
- White background
- Gray left border
- "COMMUNITY" badge in purple
- No animation

---

## ⚙️ Technical Verification

### Backend Tests
```bash
cd /Users/abdel/Desktop/FALL2025/SOEN341/SOEN341/backend
npm test
# Should show: ✓ 125 passed
```

### Database Check
```bash
curl http://localhost:3000/api/health
# Should return: {"status":"ok"}
```

### Browser Console (F12)
- No red errors
- No undefined warnings
- Smooth network requests

---

## 🆘 If Something Doesn't Work

### "Can't reach localhost:3000"
→ Make sure backend is running: `npm start` in `/backend`

### "No questions appear"
→ Check backend is running and ask a question via the form

### "Answers are white, not green"
→ Make sure you're logged in as the event organizer

### "Page is blank"
→ Open browser DevTools (F12) and check Console for errors

### "Tests are failing"
→ Check database is connected: `npm test` should pass

---

## 📚 File Structure

```
Main Documentation:
├── START_HERE_QNA_TESTING.md         ← You are here!
├── QUICK_START_QNA.md                ← Quick 5-min guide
├── TESTING_QNA_FEATURES.md           ← Full testing checklist
├── QNA_IMPLEMENTATION_SUMMARY.md     ← Technical details
└── SPRINT4_STATUS_REPORT.md          ← Project status

Code Location:
├── backend/routes/questions.js       ← API endpoints
├── frontend/qna.html                 ← Main page
└── frontend/components/
    ├── qna-tab.js                    ← Controller
    ├── ask-question-form.js          ← Question form
    ├── answer-form.js                ← Answer form
    └── forms.css                     ← Styling
```

---

## 📋 Checklist for Sign-Off

### Before Testing
- [ ] Backend server running (`npm start`)
- [ ] Frontend loaded (http://localhost/frontend/qna.html)
- [ ] 125 tests passing (`npm test`)
- [ ] No console errors (F12)

### Testing Complete
- [ ] Can ask questions
- [ ] Can answer as regular user (PURPLE badge)
- [ ] Can answer as organizer (GREEN badge with animation)
- [ ] Character counters work
- [ ] Forms validate input
- [ ] Success messages appear
- [ ] No console errors

### Ready for Deployment
- [ ] All visual elements match mockups
- [ ] Responsive design works on mobile/tablet
- [ ] API calls succeed (Network tab in DevTools)
- [ ] Database connection working

---

## ✨ Expected Result

After testing, you should see:

1. **Q&A page** with navbar at top
2. **Event selector** dropdown
3. **Ask a Question** form with:
   - Title input (max 255 chars with counter)
   - Content input (max 5000 chars with counter)
   - Submit button
4. **Questions list** showing:
   - Question titles (clickable)
   - Asker names
   - Number of answers
   - "Submit Answer" toggle button
5. **Answers section** (expands on click) showing:
   - GREEN cards with "✓ OFFICIAL RESPONSE" badge for organizer answers
   - PURPLE cards with "COMMUNITY" badge for user answers
   - Author names
   - Timestamps
   - Helpful button

---

## 🎓 Learn More

### Understand the Feature
→ Read [QNA_IMPLEMENTATION_SUMMARY.md](QNA_IMPLEMENTATION_SUMMARY.md)

### See Full Testing Steps
→ Read [TESTING_QNA_FEATURES.md](TESTING_QNA_FEATURES.md)

### Quick Reference
→ Read [QUICK_START_QNA.md](QUICK_START_QNA.md)

### Project Overview
→ Read [SPRINT4_STATUS_REPORT.md](SPRINT4_STATUS_REPORT.md)

---

## 🎉 Success Criteria

**If all the following are true, Sprint 4 is COMPLETE:**

✅ Backend tests: 125/125 PASSING
✅ Ask question: Working
✅ Answer question: Working
✅ Official response: GREEN with animation
✅ Community response: PURPLE
✅ Character counters: Working
✅ Form validation: Working
✅ No console errors
✅ Mobile responsive: Working

**→ Ready for production deployment!**

---

## 📞 Next Steps

1. **Read** the appropriate documentation above
2. **Run** the quick start commands
3. **Test** the feature in your browser
4. **Verify** all items in the checklist
5. **Push** to remote: `git push origin q&a-page`
6. **Create PR** to main branch
7. **Deploy** to production after review

---

**Current Status**: ✅ READY FOR TESTING

**Branch**: q&a-page
**Tests**: 125/125 PASSING
**Date**: November 15, 2025

**Let's test! 🚀**

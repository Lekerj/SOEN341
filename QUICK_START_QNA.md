# Quick Start - Testing Q&A Feature (Sprint 4)

## 1-Minute Setup

### Terminal 1: Start Backend Server
```bash
cd /Users/abdel/Desktop/FALL2025/SOEN341/SOEN341/backend
npm start
```
Expected: `Server running on http://localhost:3000`

### Terminal 2: Open Browser
```
http://localhost/frontend/qna.html
```

---

## What You Should See

### Page Layout
```
┌─────────────────────────────────────────────────────────────────┐
│ ConEvents Navbar (with Q&A link active)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ [Event Dropdown v]                                             │
│                                                                 │
│ "Ask a Question" Form                                          │
│ Title: [_________________] (0/255)                             │
│ Content: [_____________________] (0/5000)                      │
│ [Submit Question]  [Clear]                                     │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ QUESTIONS LIST                                                  │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────┐   │
│ │ Q: What time does the event start?                     │   │
│ │    Asked by John Doe • Nov 15, 2025 • 2 Answers       │   │
│ │ [Submit Answer ▼]                                      │   │
│ │                                                         │   │
│ │ ANSWERS SECTION (click title to expand):              │   │
│ │                                                         │   │
│ │ ┌──────────────────────────────────────────────────┐  │   │
│ │ │ 🟢 Green Card (Official Response)               │  │   │
│ │ │ Event Organizer  ✓ OFFICIAL RESPONSE (animated) │  │   │
│ │ │ "The event starts at 2:00 PM sharp."            │  │   │
│ │ │ Nov 15, 2025  👍 5 found this helpful           │  │   │
│ │ └──────────────────────────────────────────────────┘  │   │
│ │                                                         │   │
│ │ ┌──────────────────────────────────────────────────┐  │   │
│ │ │ 🟣 Purple Card (Community Answer)                │  │   │
│ │ │ Jane Doe  COMMUNITY                             │  │   │
│ │ │ "I believe it starts around 2 PM."              │  │   │
│ │ │ Nov 15, 2025  👍 1 found this helpful           │  │   │
│ │ └──────────────────────────────────────────────────┘  │   │
│ │                                                         │   │
│ └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Testing Workflows

### Workflow 1: Ask a Question

1. **Fill out form**:
   - Title: "What's the WiFi password?"
   - Content: "I need to know the WiFi password for the event."

2. **Click "Submit Question"**
   - ✅ Success message appears
   - ✅ Form clears
   - ✅ Question appears in list below

3. **Verify in list**:
   - ✅ Your name shows as asker
   - ✅ Title matches what you entered
   - ✅ Timestamp shows "just now"
   - ✅ Status shows "Unanswered" or answer count

---

### Workflow 2: Answer as Regular User

1. **Find a question** (ask one if needed)

2. **Click "Submit Answer" button**
   - ✅ Form expands
   - ✅ Shows "Answering: [Question Title]"
   - ✅ Content field is empty

3. **Fill answer form**:
   - Content: "The password should be posted on the event bulletin board."

4. **Click "Submit Answer"**
   - ✅ Success message appears
   - ✅ Form collapses
   - ✅ Answer appears in answers list

5. **Verify answer card**:
   - ✅ Has PURPLE styling
   - ✅ Shows "COMMUNITY" badge
   - ✅ Shows your name as author
   - ✅ Shows recent timestamp
   - ✅ Has "👍 found this helpful" button

---

### Workflow 3: Answer as Organizer (Official Response)

1. **Switch to organizer account** (if not already)
   - Log out
   - Log in as event organizer
   - Navigate back to Q&A page

2. **Find an unanswered question**

3. **Click "Submit Answer"**
   - Form expands

4. **Fill official answer**:
   - Content: "The WiFi password for this event is EventWiFi2025. Check your confirmation email for details."

5. **Click "Submit Answer"**
   - ✅ Answer appears in list
   - ✅ Answer card has GREEN styling (most important!)
   - ✅ Shows "✓ OFFICIAL RESPONSE" badge
   - ✅ Badge has animated pulse effect
   - ✅ Background is light green (#f0fdf4 → #dcfce7)
   - ✅ Border is green (#22c55e)

---

## Critical Visual Elements to Verify

### Official Response Card (GREEN)
```
┌────────────────────────────────────────────┐
│ Light Green Background (#f0fdf4 → #dcfce7) │
├────────────────────────────────────────────┤
│ Organizer Name  ✓ OFFICIAL RESPONSE       │
│                 (badge with checkmark)    │
│                 (animated pulse)          │
├────────────────────────────────────────────┤
│ Answer content appears here...             │
├────────────────────────────────────────────┤
│ Timestamp  👍 X found this helpful         │
└────────────────────────────────────────────┘
  ▲
  Green left border (4px, #22c55e)
```

**Visual Checklist**:
- [ ] Card background is light green
- [ ] Left border is bright green
- [ ] Badge text says "✓ OFFICIAL RESPONSE"
- [ ] Badge has green gradient
- [ ] Badge pulses (watch for 2 seconds)
- [ ] Organizer name visible
- [ ] Answer text visible
- [ ] Timestamp visible

### Community Response Card (PURPLE)
```
┌────────────────────────────────────────────┐
│ White Background with subtle shadow        │
├────────────────────────────────────────────┤
│ Regular User Name  COMMUNITY               │
│                    (purple badge)          │
├────────────────────────────────────────────┤
│ Answer content appears here...             │
├────────────────────────────────────────────┤
│ Timestamp  👍 X found this helpful         │
└────────────────────────────────────────────┘
  ▲
  Gray left border (4px, #d1d5db)
```

**Visual Checklist**:
- [ ] Card background is white
- [ ] Left border is gray
- [ ] Badge text says "COMMUNITY"
- [ ] Badge has purple gradient
- [ ] No pulse animation
- [ ] User name visible
- [ ] Answer text visible
- [ ] Timestamp visible

---

## Browser Developer Tools Check

### Console Errors
```
F12 (or Cmd+Option+I on Mac)
→ Console Tab
```
- ✅ No red errors
- ✅ No "Cannot read property" errors
- ✅ No "undefined" warnings

### Network Requests
```
F12 → Network Tab
Then ask/answer a question
```
You should see:
- ✅ `POST /api/questions` (201 Created)
- ✅ `POST /api/questions/:id/answers` (201 Created)
- ✅ `GET /api/questions?...` (200 OK)
- ✅ All responses contain data

### Browser's Local Storage
```
F12 → Application Tab → Local Storage
```
You should see:
- ✅ User session info
- ✅ No sensitive data exposed

---

## Troubleshooting

### "Cannot reach localhost:3000"
```bash
# Check if backend is running
curl http://localhost:3000/api/health

# If not running:
cd /Users/abdel/Desktop/FALL2025/SOEN341/SOEN341/backend
npm start
```

### "Page shows empty / no questions"
```bash
# Check database connection
cd backend
npm test
# Should show: 125 tests passed

# Check if questions exist in DB:
mysql -u 341 -p convenevents
> SELECT COUNT(*) FROM questions;
```

### "Answer card is white, not green"
1. Check browser console for errors (F12)
2. Verify you're logged in as organizer
3. Check that answer was submitted by organizer user
4. Refresh page (Ctrl+R / Cmd+R)
5. Check backend logs for any errors

### "Badge doesn't pulse"
- This is CSS animation - make sure CSS is loaded
- Press F5 to hard refresh browser
- Clear browser cache (Ctrl+Shift+Delete / Cmd+Shift+Delete)

---

## Verification Commands

### Backend Health Check
```bash
curl http://localhost:3000/api/health
# Should return: {"status":"ok"}
```

### Run All Tests
```bash
cd /Users/abdel/Desktop/FALL2025/SOEN341/SOEN341/backend
npm test
# Should show: ✓ 125 passed
```

### Check Current Branch
```bash
cd /Users/abdel/Desktop/FALL2025/SOEN341/SOEN341
git branch
# Should show: * q&a-page
```

### View Recent Commits
```bash
git log --oneline -5
# Should show merge commit: d7da25a
```

---

## File Verification

### Check All Files Exist
```bash
ls -la /Users/abdel/Desktop/FALL2025/SOEN341/SOEN341/frontend/qna.html
ls -la /Users/abdel/Desktop/FALL2025/SOEN341/SOEN341/frontend/components/forms.css
ls -la /Users/abdel/Desktop/FALL2025/SOEN341/SOEN341/backend/routes/questions.js
```

### Check File Sizes (should be substantial)
```bash
wc -l /Users/abdel/Desktop/FALL2025/SOEN341/SOEN341/frontend/qna.html
# Should be ~790 lines

wc -l /Users/abdel/Desktop/FALL2025/SOEN341/SOEN341/frontend/components/forms.css
# Should be ~540 lines

wc -l /Users/abdel/Desktop/FALL2025/SOEN341/SOEN341/frontend/components/qna-tab.js
# Should be ~478 lines
```

---

## Performance Notes

- **First Load**: Might take 1-2 seconds to load questions
- **Submitting**: Should complete in <1 second with success message
- **Pagination**: Supports up to 100 questions per page
- **Responsiveness**: Smooth on desktop, tablet, and mobile

---

## Summary Checklist

### Before Testing
- [ ] Backend server running (`npm start`)
- [ ] Navigate to `http://localhost/frontend/qna.html`
- [ ] All 125 tests passing (`npm test`)
- [ ] Logged in as a user

### Main Test
- [ ] Ask a question → Question appears
- [ ] Answer as regular user → Purple "COMMUNITY" badge
- [ ] Answer as organizer → Green "✓ OFFICIAL RESPONSE" badge with animation

### Verification
- [ ] No console errors
- [ ] API calls succeed (Network tab)
- [ ] Styling matches mockups
- [ ] Responsive on mobile/tablet

### If All Tests Pass
- ✅ Sprint 4 Issues #186, #187, #188 are COMPLETE!
- Ready to push and create PR
- Ready to merge to main
- Ready to deploy!

---

## Next Steps

Once testing is complete and working:

```bash
# 1. Push to remote
git push origin q&a-page

# 2. Create PR on GitHub (reference issues #186, #187, #188)

# 3. After review, merge to main:
git checkout main
git merge q&a-page
git push origin main

# 4. Deploy to production
# (Follow your deployment process)
```

---

## Questions?

**Check these files for more details:**
- `TESTING_QNA_FEATURES.md` - Comprehensive testing guide with detailed checklist
- `QNA_IMPLEMENTATION_SUMMARY.md` - Technical implementation details
- Backend: `backend/routes/questions.js` - API endpoints
- Frontend: `frontend/components/qna-tab.js` - Component logic
- Styling: `frontend/components/forms.css` - All CSS for Q&A feature

**All documentation in**: `/Users/abdel/Desktop/FALL2025/SOEN341/SOEN341/`

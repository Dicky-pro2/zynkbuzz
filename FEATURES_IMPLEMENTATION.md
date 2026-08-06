# ZynkBuzz Features Implementation Guide

## Overview

This document outlines all the new features implemented for ZynkBuzz and how they integrate into the system.

## 🚀 Features Implemented

### 1. **Dark/Light Mode Theme**

**Files:**

- `src/context/ThemeContext.tsx` - Theme context provider
- `src/styles/theme.css` - CSS variables for theming
- `src/components/ThemeToggle.tsx` - Toggle button component

**How to integrate:**

- The `ThemeProvider` is already wrapped around the app in `App.tsx`
- Add `<ThemeToggle />` to the header/navbar
- Use CSS variables: `var(--bg-primary)`, `var(--text-primary)`, etc.

**Usage:**

```tsx
import { useTheme } from "./context/ThemeContext";

function MyComponent() {
  const { theme, toggleTheme } = useTheme();
  return <button onClick={toggleTheme}>Toggle Theme</button>;
}
```

---

### 2. **Referral System with Levels**

**Files:**

- `src/store/referralStore.ts` - Referral state management
- `src/pages/Referral.tsx` - Referral page
- `src/services/api.ts` - `referralAPI` endpoints

**Features:**

- 5-tier referral system with progressive bonuses (5% → 25%)
- Unique referral codes per user
- Track referred users and earnings
- Real-time level progression

**API Endpoints to implement:**

```
GET /referrals/me - Get user's referral data
GET /referrals/code - Get/generate referral code
POST /referrals/claim-bonus - Claim referral bonus
GET /referrals/stats - Get referral statistics
```

**Backend Requirements:**

- Add `referralCode`, `referralLevel`, `referralsCount`, `referralEarnings` to User model
- Create Referral relation table
- Auto-calculate bonus percentages based on level
- Apply referral bonuses to task earnings

---

### 3. **Daily Streak Bonus**

**Files:**

- `src/store/gamificationStore.ts` - Streak management
- `src/components/GamificationWidget.tsx` - Display widget
- `src/services/api.ts` - `gamificationAPI` endpoints

**Features:**

- Track daily streaks (consecutive task completions)
- Bonus increases every 3 days: 0% → 5% → 10% → 15% → 20% → 30% → 50%
- Milestone bonuses at days 7, 14, 30, 60, 100
- Automatic reset if user misses a day

**Streak Bonus Tiers:**

- Day 1: 0% bonus
- Day 3: 5% bonus
- Day 7: 10% bonus (🏆 Milestone)
- Day 14: 15% bonus (🏆 Milestone)
- Day 30: 20% bonus (🏆 Milestone)
- Day 60: 30% bonus (🏆 Milestone)
- Day 100+: 50% bonus (🏆 Milestone)

**API Endpoints to implement:**

```
GET /gamification/streak - Get user's current streak
POST /gamification/streak/update - Update streak after task completion
GET /gamification/streak/history - Get streak history
```

---

### 4. **Weekly Leaderboard**

**Files:**

- `src/pages/Leaderboard.tsx` - Leaderboard page
- `src/store/gamificationStore.ts` - Leaderboard state

**Features:**

- Three metrics: Total Earnings, Tasks Completed, Current Streak
- Weekly rankings (reset every Monday)
- Top 3 users get bonus rewards and badges
- Real-time position updates

**API Endpoints to implement:**

```
GET /gamification/leaderboard/{metric} - Get leaderboard entries
  Metrics: earnings, tasks_completed, streak
  Query params: limit=100
```

**Reward Structure:**

- 🥇 1st Place: +10% bonus + Premium Badge
- 🥈 2nd Place: +7% bonus + Silver Badge
- 🥉 3rd Place: +5% bonus + Bronze Badge

---

### 5. **Task Quality Score**

**Files:**

- `src/store/qualityScoreStore.ts` - Quality score management
- `src/components/GamificationWidget.tsx` - Display widget
- `src/services/api.ts` - `qualityScoreAPI` endpoints

**Features:**

- Score range: 0-100
- Based on approval rate and rejection penalties
- Affects task visibility for earners
- Score thresholds:
  - 0-40: Limited visibility (can see tasks with no score requirement)
  - 40-60: Standard visibility (see tasks with 40+ score requirement)
  - 60-80: Better visibility (see tasks with 60+ score requirement)
  - 80-100: Premium (see all tasks)

**Calculation:**

```
approval_rate = (approved_tasks / total_tasks) * 100
penalty = (rejected_tasks / total_tasks) * 10
score = approval_rate - penalty (capped 0-100)
```

**API Endpoints to implement:**

```
GET /quality-score/me - Get user's quality score
GET /quality-score/history - Get score history (last 30 entries)
POST /quality-score/update - Recalculate score after task review
GET /quality-score/filtered-tasks - Get tasks user can access
  Query params: minQualityScore=80
```

**Backend Requirements:**

- Add `taskQualityScore` field to User model
- Store score history for analytics
- Auto-calculate on task approval/rejection
- Filter tasks by quality score requirement

---

### 6. **Withdrawal History**

**Files:**

- `src/pages/WithdrawalHistory.tsx` - Withdrawal history page
- Extended existing `appStore.ts` withdrawal functionality

**Features:**

- Detailed withdrawal tracking
- Status filtering: pending, processing, completed, rejected
- Export as CSV
- Summary statistics

**Display Information:**

- Date and time
- Amount
- Withdrawal method (bank transfer, PayPal, crypto, mobile money)
- Status with icons
- Account details

---

### 7. **Real-time Notifications**

**Files:**

- `src/components/NotificationCenter.tsx` - Notification panel
- Extended `appStore.ts` notification functionality
- `src/services/api.ts` - User notification endpoints

**Features:**

- Notification bell with unread count
- Dropdown panel with recent notifications
- Color-coded by type
- Mark as read functionality
- Automatic notification generation for:
  - Task completions
  - Task approvals/rejections
  - Deposits/withdrawals
  - New task postings
  - Streak milestones
  - Leaderboard placements

**Notification Types:**

- `task_completed` ✅
- `task_approved` ✅
- `task_rejected` ❌
- `deposit_success` 💰
- `withdrawal_processed` 💰
- `new_task` 🕐
- `welcome` 👋
- Custom types supported

---

### 8. **Advertiser Analytics Dashboard**

**Files:**

- `src/pages/AdvertiserAnalytics.tsx` - Analytics dashboard
- `src/store/qualityScoreStore.ts` - Analytics state
- `src/services/api.ts` - `analyticsAPI` endpoints

**Features:**

- Campaign performance metrics:
  - Total spent
  - Task completions
  - Completion rate (%)
  - Average cost per completion
  - Total clicks
  - Click-to-completion conversion rate

- Per-task breakdown:
  - Posted date
  - Clicks
  - Completions
  - Cost per task
  - Status

- Performance tips and optimization suggestions
- Date range filtering (week, month, all-time)

**Analytics Data Structure:**

```typescript
AdvertiserAnalytics {
  advertiserId: string;
  totalTasksPosted: number;
  totalCompletions: number;
  completionRate: number;
  totalClicks: number;
  totalCostPerTask: number;
  averageCostPerCompletion: number;
  totalSpent: number;
  tasksData: TaskAnalyticsData[];
}
```

**API Endpoints to implement:**

```
GET /analytics/advertiser - Get overall analytics
GET /analytics/tasks/{taskId} - Get specific task analytics
POST /analytics/tasks/{taskId}/click - Record task click
POST /analytics/tasks/{taskId}/completion - Record task completion
GET /analytics/summary - Get period summary
  Query params: period=week|month|day
```

---

## 🔌 Integration Checklist

### Backend Requirements:

- [ ] Extend User model with new fields
- [ ] Create Referral relation table
- [ ] Create LeaderboardEntry table
- [ ] Implement referral bonus calculation
- [ ] Implement streak tracking and bonus application
- [ ] Implement quality score calculation
- [ ] Implement leaderboard ranking (weekly reset)
- [ ] Create analytics tracking
- [ ] Implement all API endpoints listed above
- [ ] Set up real-time WebSocket for notifications (optional)

### Frontend Integration:

- [x] Theme system with dark mode
- [x] Store infrastructure for all features
- [x] UI components and pages
- [x] API layer with mock support
- [ ] Add navigation links to new pages
- [ ] Integrate GamificationWidget into Dashboard
- [ ] Add ThemeToggle to header
- [ ] Add NotificationCenter to header
- [ ] Connect to backend APIs (replace mock responses)

### Navigation Links to Add:

Add these routes to your main navigation:

```
- Referrals → /dashboard/referrals
- Leaderboard → /dashboard/leaderboard
- Withdrawal History → /dashboard/withdrawals
- Analytics (for advertisers) → /dashboard/analytics
```

---

## 📊 Data Flow

### Task Completion Flow:

1. User completes task
2. Task submission created with proof
3. System increments streak counter
4. Quality score recalculated
5. Referral bonus applied (if applicable)
6. Streak bonus applied to earnings
7. Analytics updated
8. Notification generated
9. Leaderboard position updated

### Earnings Calculation:

```
base_reward = task.reward
streakBonus = base_reward * (streakBonusPercentage / 100)
referralBonus = base_reward * (referralBonusPercentage / 100)
totalEarnings = base_reward + streakBonus + referralBonus
```

---

## 🧪 Testing

### Mock Data Generation:

The API layer supports mock mode via environment variable:

```
VITE_USE_MOCK=true  # Use mock data
VITE_USE_MOCK=false # Use real backend
```

All endpoints gracefully fall back to mock data when mock mode is enabled.

### Test Scenarios:

1. Create referral code and share
2. Complete tasks daily to build streak
3. Check quality score updates
4. Monitor leaderboard position
5. Review withdrawal history
6. Check notification updates
7. Toggle dark mode
8. View advertiser analytics

---

## 🚀 Deployment Notes

1. **Environment Variables:**

   ```
   VITE_API_BASE_URL=https://api.zynkbuzz.com
   VITE_USE_MOCK=false
   ```

2. **Database Migrations:**
   - Add new fields to User table
   - Create Referral, LeaderboardEntry, Analytics tables
   - Add indexes for performance

3. **Performance Optimization:**
   - Cache leaderboard (update hourly)
   - Batch quality score updates
   - Optimize analytics queries with proper indexing

4. **Security:**
   - Validate quality score calculations server-side
   - Prevent referral fraud
   - Secure streak updates
   - Audit all analytics data

---

## 📞 Support

For questions about implementation, refer to:

- Component files for UI structure
- Store files for state management
- API files for endpoint definitions
- Types file for data structures

All components are production-ready and follow React best practices.

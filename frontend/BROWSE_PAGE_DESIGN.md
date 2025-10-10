# Browse Events Page - Design & Implementation Guide

## 🎨 **Design Overview**

Create a dedicated browse events page (`browse.html`) that maintains the **same visual identity and vibe** as your homepage while focusing entirely on event discovery and filtering.

---

## 📐 **Layout Structure**

### **Page Framework** (Same as Homepage)
```
├── Navigation Bar (identical to homepage)
├── Main Content Area
│   ├── Page Header with Search
│   ├── Filters Section  
│   └── Events Grid
└── Footer (identical to homepage)
```

---

## 🎯 **Main Content Area Design**

### **1. Page Header with Search Bar**
```html
<!-- Hero-style header but smaller -->
<div class="browse-header">
  <div class="container">
    <h1 class="page-title">Browse Events</h1>
    <p class="page-subtitle">Discover amazing campus events</p>
    
    <!-- Main Search Bar -->
    <div class="search-container">
      <input type="text" class="search-input" placeholder="Search events, organizers, or organizations...">
      <button class="search-button">🔍</button>
    </div>
  </div>
</div>
```

**Visual Style:**
- **Background:** Same maroon gradient as homepage hero but **50% height**
- **Text:** White text with same shadow effects
- **Search Bar:** Large, prominent, rounded input with gradient border on focus
- **Button:** Maroon gradient background with hover effects

### **2. Filters Section** 
```html
<div class="filters-section">
  <div class="container">
    <div class="filters-grid">
      
      <!-- Quick Filters Row -->
      <div class="quick-filters">
        <span class="filter-label">Quick Filters:</span>
        <button class="filter-chip active">All Events</button>
        <button class="filter-chip">Free Events</button>
        <button class="filter-chip">This Week</button>
        <button class="filter-chip">Sports</button>
        <button class="filter-chip">Social</button>
      </div>

      <!-- Advanced Filters -->
      <div class="advanced-filters">
        <button class="toggle-filters">Advanced Filters ⚙️</button>
        
        <div class="filters-panel" id="filtersPanel">
          <div class="filters-row">
            <!-- Category Dropdown -->
            <div class="filter-group">
              <label>Category</label>
              <select class="filter-select">
                <option value="">All Categories</option>
                <option value="sports">Sports</option>
                <option value="academic">Academic</option>
                <option value="social">Social</option>
                <option value="club">Club</option>
              </select>
            </div>

            <!-- Location Input -->
            <div class="filter-group">
              <label>Location</label>
              <input type="text" class="filter-input" placeholder="Enter location...">
            </div>

            <!-- Organization Input -->
            <div class="filter-group">
              <label>Organization</label>
              <input type="text" class="filter-input" placeholder="Enter organization...">
            </div>
          </div>

          <div class="filters-row">
            <!-- Price Range Slider (Amazon-style) -->
            <div class="filter-group price-range">
              <label>Price Range</label>
              <div class="price-slider-container">
                <input type="range" class="price-slider" id="priceMin" min="0" max="100" value="0">
                <input type="range" class="price-slider" id="priceMax" min="0" max="100" value="100">
                <div class="price-display">
                  <span>$<span id="minPrice">0</span></span>
                  <span>-</span>
                  <span>$<span id="maxPrice">100</span></span>
                </div>
              </div>
            </div>

            <!-- Date Range -->
            <div class="filter-group">
              <label>Date Range</label>
              <div class="date-inputs">
                <input type="date" class="filter-input" id="dateStart">
                <span>to</span>
                <input type="date" class="filter-input" id="dateEnd">
              </div>
            </div>

            <!-- Tickets Needed -->
            <div class="filter-group">
              <label>Tickets Needed</label>
              <select class="filter-select">
                <option value="">Any Amount</option>
                <option value="1">1 ticket</option>
                <option value="2">2+ tickets</option>
                <option value="5">5+ tickets</option>
                <option value="10">10+ tickets</option>
              </select>
            </div>
          </div>

          <!-- Filter Actions -->
          <div class="filter-actions">
            <button class="btn btn-primary apply-filters">Apply Filters</button>
            <button class="btn btn-secondary clear-filters">Clear All</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
```

**Visual Style:**
- **Background:** White with subtle shadow (like cards)
- **Quick Filter Chips:** Small rounded buttons, active state with maroon gradient
- **Advanced Filters:** Collapsible panel with smooth animation
- **Price Slider:** Dual-range slider with maroon gradient track (Amazon-style)

### **3. Events Grid Section**
```html
<div class="events-section">
  <div class="container">
    <!-- Results Header -->
    <div class="results-header">
      <div class="results-info">
        <span class="results-count">Showing <strong>24</strong> events</span>
        <span class="results-filters" id="activeFilters"></span>
      </div>
      <div class="sort-options">
        <label>Sort by:</label>
        <select class="sort-select">
          <option value="date">Event Date</option>
          <option value="price">Price</option>
          <option value="title">Title</option>
          <option value="popularity">Most Popular</option>
        </select>
      </div>
    </div>

    <!-- Events Grid (Same as Homepage) -->
    <div class="grid grid-3" id="eventsGrid">
      <!-- Event cards populated here -->
    </div>

    <!-- Load More Button -->
    <div class="load-more-section">
      <button class="btn btn-secondary btn-lg load-more-btn">Load More Events</button>
    </div>
  </div>
</div>
```

**Visual Style:**
- **Same event cards** as homepage with identical styling
- **Results header:** Light background with border
- **Load more:** Large secondary button with hover effects

---

## 🎨 **Additional CSS Classes Needed**

### **Browse Header Styles**
```css
.browse-header {
  background: var(--gradient-primary);
  color: var(--white);
  padding: var(--spacing-2xl) var(--spacing-lg);
  text-align: center;
  position: relative;
  overflow: hidden;
}

.page-title {
  font-size: var(--font-size-4xl);
  font-weight: 800;
  margin-bottom: var(--spacing-sm);
  text-shadow: 2px 2px 8px rgba(0, 0, 0, 0.3);
}

.page-subtitle {
  font-size: var(--font-size-xl);
  opacity: 0.95;
  margin-bottom: var(--spacing-xl);
}

.search-container {
  max-width: 600px;
  margin: 0 auto;
  position: relative;
  display: flex;
  gap: var(--spacing-sm);
}

.search-input {
  flex: 1;
  padding: 16px 20px;
  border: 2px solid rgba(255,255,255,0.3);
  border-radius: var(--radius-full);
  font-size: var(--font-size-lg);
  background: rgba(255,255,255,0.15);
  color: var(--white);
  backdrop-filter: blur(10px);
}

.search-input::placeholder {
  color: rgba(255,255,255,0.8);
}

.search-input:focus {
  border-color: var(--primary-gold);
  box-shadow: 0 0 0 3px rgba(255, 215, 0, 0.3);
}

.search-button {
  padding: 16px 24px;
  background: var(--gradient-gold);
  border: none;
  border-radius: var(--radius-full);
  color: var(--dark-gray);
  font-size: var(--font-size-lg);
  cursor: pointer;
  transition: all var(--transition-base);
}
```

### **Filters Section Styles**
```css
.filters-section {
  background: var(--white);
  box-shadow: var(--shadow-md);
  margin-bottom: var(--spacing-xl);
}

.quick-filters {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: var(--spacing-md);
}

.filter-chip {
  padding: 8px 16px;
  border: 2px solid var(--light-gray);
  border-radius: var(--radius-full);
  background: var(--white);
  color: var(--dark-gray);
  cursor: pointer;
  transition: all var(--transition-base);
}

.filter-chip.active,
.filter-chip:hover {
  background: var(--gradient-primary);
  color: var(--white);
  border-color: var(--primary-maroon);
}

.advanced-filters {
  border-top: 1px solid var(--light-gray);
  padding-top: var(--spacing-md);
}

.filters-panel {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
}

.filters-panel.open {
  max-height: 400px;
}

.filters-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.price-slider-container {
  position: relative;
  height: 40px;
}

.price-slider {
  position: absolute;
  width: 100%;
  height: 6px;
  background: var(--light-gray);
  border-radius: var(--radius-full);
  appearance: none;
}

.price-slider::-webkit-slider-thumb {
  appearance: none;
  width: 20px;
  height: 20px;
  background: var(--gradient-primary);
  border-radius: 50%;
  cursor: pointer;
}
```

### **Results Header Styles**
```css
.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md);
  background: var(--light-gray);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-xl);
}

.results-count {
  color: var(--dark-gray);
  font-weight: 600;
}

.sort-select {
  padding: 8px 12px;
  border: 2px solid var(--medium-gray);
  border-radius: var(--radius-md);
  background: var(--white);
}
```

---

## 🚀 **JavaScript Functionality Required**

### **Core Features to Implement:**
1. **Search functionality** - Real-time search as user types
2. **Filter toggling** - Show/hide advanced filters panel  
3. **Price range slider** - Dual-range slider with live updates
4. **Quick filter chips** - Toggle active states
5. **API integration** - Connect to your enhanced backend endpoints
6. **Results updating** - Dynamic grid updates without page reload
7. **Load more pagination** - Infinite scroll or load more button
8. **Active filter display** - Show which filters are currently applied

### **Key API Endpoints to Use:**
- `GET /api/events` - Main search and filter endpoint
- `GET /api/events/filter-options` - Populate dropdown options
- `POST /api/events/check-availability` - Ticket availability checking

---

## 📱 **Responsive Design**

### **Mobile Adaptations:**
- **Search bar:** Full width on mobile
- **Filters:** Stack vertically, collapsible by default
- **Event grid:** Single column on mobile
- **Quick filters:** Horizontal scroll on small screens

---

## 🎯 **User Experience Flow**

1. **Page Load:** Show all events with default sorting
2. **Search:** Real-time filtering as user types in search bar
3. **Quick Filters:** One-click common filters (Free, This Week, etc.)
4. **Advanced Filters:** Detailed filtering with apply/clear actions
5. **Results:** Live updates with result count and active filter display
6. **Sorting:** Dynamic reordering without losing filter state
7. **Load More:** Pagination for large result sets

---

## 🎨 **Visual Identity Consistency**

### **Maintained Elements from Homepage:**
- ✅ Same color scheme (maroons, golds, gradients)
- ✅ Same typography and font weights
- ✅ Same button styles and hover effects  
- ✅ Same card designs and animations
- ✅ Same navbar and footer
- ✅ Same shadow and border radius values

### **New Elements Specific to Browse Page:**
- 🆕 Search bar with backdrop blur
- 🆕 Filter chips and panels
- 🆕 Price range sliders
- 🆕 Results header and sorting
- 🆕 Advanced filter animations

---

## 🔧 **Implementation Priority**

### **Phase 1 - Basic Structure:**
1. Create `browse.html` with layout structure
2. Add basic search bar functionality
3. Implement event grid (reuse homepage code)

### **Phase 2 - Filtering:**
1. Add quick filter chips
2. Implement advanced filters panel
3. Connect to backend API endpoints

### **Phase 3 - Polish:**
1. Add price range sliders
2. Implement sorting and pagination
3. Add animations and micro-interactions

This design maintains your homepage's beautiful visual identity while creating a powerful, user-friendly browsing experience that connects seamlessly to your enhanced backend API!
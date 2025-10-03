# ConEvents Frontend - Design System Documentation

## 🎨 Overview

The ConEvents frontend is built with a consistent, Concordia-branded design system. All pages share a unified stylesheet (`styles.css`) for easy maintenance and consistent user experience.

## 🎯 Design Philosophy

- **Concordia Brand Identity**: Uses official Concordia colors (Maroon #912338, Purple #6B2C91)
- **Student-Focused**: Clean, modern interface designed for easy event discovery and ticketing
- **Responsive Design**: Mobile-first approach that works on all devices
- **Accessibility**: High contrast, readable fonts, and semantic HTML

## 📁 File Structure

```
frontend/
├── index.html          # Home page with event listings
├── login.html          # User login page
├── register.html       # User registration page
├── styles.css          # Shared design system stylesheet
└── README.md          # This documentation
```

## 🎨 Color Palette

### Primary Colors

- **Concordia Maroon**: `#912338` - Primary brand color
- **Concordia Purple**: `#6B2C91` - Accent color
- **Concordia Gold**: `#FFD700` - Highlight color
- **Concordia Blue**: `#0072CE` - Secondary accent

### Semantic Colors

- **Success**: `#28A745` (Green)
- **Danger**: `#DC3545` (Red)
- **Warning**: `#FFC107` (Yellow)
- **Info**: `#17A2B8` (Cyan)

### Neutral Colors

- **White**: `#FFFFFF`
- **Light Gray**: `#F8F9FA`
- **Medium Gray**: `#6C757D`
- **Dark Gray**: `#343A40`
- **Black**: `#000000`

## 🧩 Components

### Buttons

```html
<!-- Primary Button -->
<button class="btn btn-primary">Primary Action</button>

<!-- Secondary Button -->
<button class="btn btn-secondary">Secondary Action</button>

<!-- Accent Button -->
<button class="btn btn-accent">Accent Action</button>

<!-- Success Button -->
<button class="btn btn-success">Success Action</button>

<!-- Button Sizes -->
<button class="btn btn-primary btn-sm">Small</button>
<button class="btn btn-primary">Default</button>
<button class="btn btn-primary btn-lg">Large</button>

<!-- Full Width Button -->
<button class="btn btn-primary btn-block">Full Width</button>
```

### Forms

```html
<div class="form-group">
  <label class="form-label" for="input-id">Label</label>
  <input
    type="text"
    id="input-id"
    class="form-control"
    placeholder="Placeholder"
  />
  <small class="form-text">Helper text</small>
</div>
```

### Cards

```html
<div class="card">
  <div class="card-header">
    <h3 class="card-title">Card Title</h3>
    <p class="card-subtitle">Card subtitle</p>
  </div>
  <div class="card-body">
    <p>Card content goes here</p>
  </div>
  <div class="card-footer">
    <span>Footer left</span>
    <button class="btn btn-primary">Action</button>
  </div>
</div>
```

### Event Cards

```html
<div class="event-card">
  <div
    class="event-image"
    style="background: linear-gradient(135deg, #912338 0%, #6B2C91 100%);"
  >
    🎓
  </div>
  <div class="event-content">
    <span class="event-date">📅 Oct 15, 2025</span>
    <h3 class="event-title">Event Name</h3>
    <p class="event-description">Event description text</p>
    <div class="event-meta">
      <span class="event-meta-item">📍 Location</span>
      <span class="event-meta-item">⏰ Time</span>
      <span class="event-meta-item">👥 Capacity</span>
    </div>
    <div class="card-footer">
      <span class="event-price">$15.00</span>
      <button class="btn btn-primary">Get Tickets</button>
    </div>
  </div>
</div>
```

### Alerts

```html
<div class="alert alert-success">Success message</div>
<div class="alert alert-error">Error message</div>
<div class="alert alert-warning">Warning message</div>
<div class="alert alert-info">Info message</div>
```

### Navigation Bar

```html
<nav class="navbar">
  <div class="navbar-container">
    <a href="index.html" class="navbar-logo">🎫 ConEvents</a>
    <ul class="navbar-menu">
      <li><a href="index.html">Home</a></li>
      <li><a href="#events">Events</a></li>
      <li><a href="#about">About</a></li>
    </ul>
  </div>
</nav>
```

### Hero Section

```html
<div class="hero">
  <h1 class="hero-title">Main Title</h1>
  <p class="hero-subtitle">Subtitle text</p>
  <div class="hero-buttons">
    <a href="#" class="btn btn-primary btn-lg">Primary CTA</a>
    <a href="#" class="btn btn-secondary btn-lg">Secondary CTA</a>
  </div>
</div>
```

## 📐 Grid System

```html
<!-- 2 Column Grid -->
<div class="grid grid-2">
  <div>Column 1</div>
  <div>Column 2</div>
</div>

<!-- 3 Column Grid -->
<div class="grid grid-3">
  <div>Column 1</div>
  <div>Column 2</div>
  <div>Column 3</div>
</div>

<!-- 4 Column Grid -->
<div class="grid grid-4">
  <div>Column 1</div>
  <div>Column 2</div>
  <div>Column 3</div>
  <div>Column 4</div>
</div>
```

## 🔧 Utility Classes

### Spacing

```html
<!-- Margins -->
<div class="mt-1">Margin top small</div>
<div class="mt-2">Margin top medium</div>
<div class="mt-3">Margin top large</div>
<div class="mt-4">Margin top extra large</div>

<div class="mb-1">Margin bottom small</div>
<div class="mb-2">Margin bottom medium</div>
<div class="mb-3">Margin bottom large</div>
<div class="mb-4">Margin bottom extra large</div>

<!-- Padding -->
<div class="p-1">Padding small</div>
<div class="p-2">Padding medium</div>
<div class="p-3">Padding large</div>
<div class="p-4">Padding extra large</div>
```

### Flexbox

```html
<div class="d-flex justify-between align-center gap-2">
  <span>Item 1</span>
  <span>Item 2</span>
</div>
```

### Text Alignment

```html
<p class="text-center">Centered text</p>
<p class="text-left">Left aligned text</p>
<p class="text-right">Right aligned text</p>
```

### Text Colors

```html
<p class="text-white">White text</p>
<p class="text-muted">Muted text</p>
```

## 🎯 Page Templates

### Authentication Pages (Login/Register)

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Page Title - ConEvents</title>
    <link rel="stylesheet" href="styles.css" />
    <style>
      .page-wrapper {
        min-height: 100vh;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 20px;
      }
      .auth-container {
        background: white;
        padding: 40px;
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-lg);
        width: 100%;
        max-width: 450px;
      }
    </style>
  </head>
  <body>
    <div class="page-wrapper">
      <div class="auth-container">
        <!-- Content here -->
      </div>
    </div>
  </body>
</html>
```

### Main Pages (Home, Events, etc.)

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Page Title - ConEvents</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <!-- Navigation Bar -->
    <nav class="navbar">
      <!-- Nav content -->
    </nav>

    <!-- Main Content -->
    <div class="main-content">
      <div class="container">
        <!-- Page content -->
      </div>
    </div>

    <!-- Footer -->
    <footer class="footer">
      <!-- Footer content -->
    </footer>
  </body>
</html>
```

## 📱 Responsive Breakpoints

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

The grid system automatically adjusts to single column on mobile devices.

## 🚀 Getting Started

1. **Include the stylesheet** in your HTML:

   ```html
   <link rel="stylesheet" href="styles.css" />
   ```

2. **Use CSS variables** for custom styling:

   ```css
   .custom-element {
     color: var(--primary-maroon);
     padding: var(--spacing-md);
     border-radius: var(--radius-lg);
   }
   ```

3. **Follow component patterns** from this documentation for consistency

## 🔗 API Integration

All pages connect to the backend API at `http://localhost:3000`. Key endpoints:

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get user profile (requires auth)

### Authentication Flow

1. User logs in via `login.html`
2. Backend creates session and returns user data
3. Frontend stores user in `localStorage`
4. Protected pages check session validity via `/api/auth/profile`
5. User data displayed in navbar and protected pages

## 🎨 Customization

To customize the design system, edit the CSS variables in `styles.css`:

```css
:root {
  --primary-maroon: #912338;
  --primary-gold: #ffd700;
  --spacing-md: 16px;
  --radius-lg: 12px;
  /* ... other variables */
}
```

All components will automatically update to reflect the new values.

## 📝 Best Practices

1. **Use semantic HTML** - Proper heading hierarchy, form labels, etc.
2. **Use existing components** - Don't reinvent the wheel
3. **Follow naming conventions** - Use BEM-like naming for custom classes
4. **Mobile-first** - Design for mobile, enhance for desktop
5. **Accessibility** - Use ARIA labels, keyboard navigation, high contrast
6. **Performance** - Optimize images, minimize custom CSS

## 🐛 Common Issues

### CORS Errors

- Ensure backend server is running with CORS enabled
- Use Live Server or similar tool to serve frontend (not file://)

### Session Not Persisting

- Check `credentials: 'include'` in fetch requests
- Verify cookies are enabled in browser

### Styles Not Loading

- Verify `styles.css` path is correct
- Check for typos in class names
- Clear browser cache

## 📚 Resources

- [Concordia Brand Guidelines](https://www.concordia.ca)
- [MDN Web Docs](https://developer.mozilla.org)
- [CSS Variables Guide](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)

---

**Version**: 1.0  
**Last Updated**: October 2, 2025  
**Maintainer**: ConEvents Team

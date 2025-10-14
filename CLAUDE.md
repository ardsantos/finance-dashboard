# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development server with hot reload
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# JavaScript/JSX linting
npm run lint

# CSS/SCSS linting (includes Tailwind CSS)
npm run lint:css
```

## Architecture Overview

This is a React-based personal finance dashboard built with modern web technologies. The application follows a component-based architecture with clear separation of concerns.

### Tech Stack

- **React 19** with functional components and hooks
- **Vite** for fast development and optimized builds
- **React Router DOM** for client-side routing
- **Tailwind CSS** for styling with utility-first approach
- **Recharts** for data visualization
- **date-fns** for date manipulation
- **papaparse** for CSV data import

### Project Structure

```
src/
├── components/         # React components (named exports)
├── data/              # Static data and configurations
├── utils/             # Utility functions
├── App.jsx            # Main app with routing configuration
├── App.css            # Layout and component-specific styles
└── index.css          # Global styles
```

### Application Routing

The app uses React Router with the following routes:

- `/` and `/dashboard` - Main financial dashboard
- `/transactions` - Transaction history and management
- `/budget` - Budget planning and tracking
- `/import` - Data import functionality (CSV support via papaparse)

### Component Architecture

- **Named exports**: All components use named exports (e.g., `export const Header`)
- **Functional components**: Modern React with hooks throughout
- **Responsive design**: Mobile-first approach with Tailwind CSS
- **Card-based layout**: Consistent styling with shadows and spacing

### Data Architecture

- **Transaction categories**: Defined in `src/data/categories.js` with income/expense classifications
- **Utility functions**: Located in `src/utils/` for financial calculations and formatting
- **Configuration-driven**: Categories and other static data are centrally managed

### Styling Approach

- **Tailwind CSS**: Primary styling framework with Vite integration
- **Custom CSS**: Additional styles in `App.css` for layout specifics
- **Mobile responsive**: Navigation switches to vertical layout on small screens
- **Consistent theme**: Professional finance application color scheme

### Code Quality

- **ESLint**: JavaScript/React linting with hooks and refresh rules
- **Stylelint**: CSS linting with Tailwind configuration
- **Modern patterns**: ES6+ features, arrow functions, destructuring

### Current Implementation State

The application has a solid foundation with routing, styling, and basic structure in place. All main feature components (Dashboard, Transactions, Budget, Import) are currently placeholders ready for implementation. The project is configured for rapid development with proper tooling and modern React patterns.

### Other Rules

- Test tasks, lint and prettier after creating changes

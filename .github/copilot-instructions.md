# AI Agent Instructions for Corporate Portal

This guide helps AI coding agents understand key patterns and workflows in this corporate portal project.

## Project Overview

A Node.js/Express corporate portal for managing:
- Business trips
- Employee training and testing
- Equipment verification/metrology control

## Architecture & Patterns

### Service-Based Architecture
- Core business logic lives in `/services` directory
- Each domain has its own service (e.g., `tripService.js`, `verificationService.js`)
- Services handle data access and business rules
- Controllers (`/controllers`) focus on HTTP concerns and input validation

### Authentication & Security
- CSRF protection enabled by default (disabled in test env)
- Session-based auth with `express-session`
- Authentication middleware in `/middleware/authMiddleware.js`
- Sensitive routes require valid CSRF token via header or form field

### Database 
- SQLite with Knex.js ORM
- Migrations in `/migrations` handle schema changes
- Foreign key constraints enforced
- Configuration centralized in `/config/config.js`
- Test environment uses separate database

## Development Workflows

### Setup
```bash
npm install           # Install dependencies
npm run migrate:latest  # Run migrations
npm run dev          # Start dev server with hot reload
```

### Testing
```bash
npm test             # Run Jest tests (automatically uses test DB)
```

### Database Operations
```bash
npm run migrate:make <name>   # Create new migration
npm run migrate:latest       # Apply migrations
npm run migrate:rollback     # Rollback last migration
npm run db:reset            # Reset DB and rerun migrations
```

## Key Integration Points

1. Event System
   - Server-Sent Events via `/event-emitter.js`
   - Used for real-time notifications

2. File Uploads
   - Handled by Multer (`/config/multerConfig.js`)
   - Uploads stored in `/public/uploads/`

3. Translation
   - Middleware in `/middleware/translation.js`
   - Used across user-facing messages

## Common Patterns

### Error Handling
- Centralized error handler in `server.js`
- Structured error responses:
```javascript
{
  errors: [{ message: 'User-friendly error message' }]
}
```

### Validation
- Uses `express-validator`
- Validation middleware in `/middleware/validationMiddleware.js`
- Controllers should use validation chains before processing

### API Routes
- View routes under `/routes/viewRoutes.js`
- API routes under `/routes/apiRoutes.js`
- Domain-specific routes in separate files (e.g., `eds.routes.js`)

## Project Structure Conventions
- Frontend assets in `/public`
- Views (HTML templates) in `/views`
- CSS organized by module in `/public/css`
- JS organized by feature in `/public/js`
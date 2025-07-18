# MCC네트월드 접수 포털 (MCC Network World Reception Portal) - Replit.md

## Overview

This is a document management system built for MCC네트월드 telecommunications dealers to handle customer reception documents. The application features a React frontend with TypeScript, an Express.js backend, and uses better-sqlite3 for data persistence. It includes role-based authentication, file upload capabilities, and administrative functions.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: Zustand for authentication state, TanStack Query for server state
- **UI Framework**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **Build Tool**: Vite with development mode support

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **File Storage**: Local filesystem with multer for uploads
- **Authentication**: Session-based with bcrypt password hashing
- **Development**: Better SQLite3 fallback for development environments

### Data Storage
- **Primary Database**: PostgreSQL configured via Drizzle
- **File Storage**: Local filesystem organized by dealer ID
- **Session Storage**: In-memory sessions (production should use Redis or database)

## Key Components

### Authentication System
- Role-based access control (admin, dealer_admin, dealer_staff)
- Session-based authentication with secure password hashing
- Protected routes with AuthGuard component
- Automatic session validation and renewal

### Document Management
- File upload with validation (PDF, DOC, DOCX, images)
- Document status tracking (접수/보완필요/완료)
- Organized storage by dealer ID
- Search and filtering capabilities

### User Interface
- Responsive design with mobile-first approach
- Dark/light theme support via CSS custom properties
- Accessible components using Radix UI primitives
- Form validation with react-hook-form and Zod

### Administrative Features
- Dealer management (create, view dealers)
- User management within dealers
- Document status management
- Pricing table distribution

## Data Flow

1. **Authentication Flow**:
   - User submits credentials → Backend validates → Session created → Frontend stores session state
   - Protected routes check authentication status before rendering

2. **Document Upload Flow**:
   - User selects file → Frontend validates → Upload to server → File stored by dealer ID → Database record created

3. **Data Fetching**:
   - TanStack Query manages API calls → Automatic caching and background updates → Optimistic updates for mutations

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection
- **@tanstack/react-query**: Server state management
- **multer**: File upload handling
- **bcrypt**: Password hashing
- **zod**: Schema validation
- **date-fns**: Date formatting with Korean locale

### UI Dependencies
- **@radix-ui/***: Accessible UI primitives
- **lucide-react**: Icon library
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant handling

### Development Dependencies
- **vite**: Build tool and dev server
- **drizzle-kit**: Database schema management
- **tsx**: TypeScript execution for development

## Deployment Strategy

### Build Process
1. Frontend built with Vite → Static assets in `dist/public`
2. Backend bundled with esbuild → Single file in `dist/index.js`
3. Database migrations applied via `drizzle-kit push`

### Production Configuration
- Environment variables required: `DATABASE_URL`, `PORT`
- Static file serving from `dist/public`
- File uploads stored in `uploads/` directory
- Session security should be enhanced with proper session store

### Development vs Production
- Development uses Vite dev server with HMR
- Production serves static files directly from Express
- Database can fall back to SQLite in development

## Changelog
- July 04, 2025. Initial setup
- July 04, 2025. Added activation quantity tracking feature with monthly statistics (접수/개통/취소 counts)
- July 04, 2025. Fixed login authentication flow by updating auth/me endpoint and adding proper session validation
- July 04, 2025. Updated branding from "개통포털" to "MCC네트월드 접수 포털" with new logo
- July 04, 2025. Fixed SQLite RETURNING clause compatibility issues by replacing with separate INSERT/SELECT operations
- July 04, 2025. Resolved nested anchor tag HTML validation warnings in Sidebar component
- July 04, 2025. Updated branding with new MCC네트월드 logo and teal color scheme matching company identity
- July 18, 2025. Added worker name tracking system with database schema updates
- July 18, 2025. Implemented worker statistics in AdminPanel with performance rankings and monthly metrics
- July 18, 2025. Added admin-only access restriction to AdminPanel for enhanced security
- July 18, 2025. Created Downloads page for document templates (가입서류/변경서류) replacing pricing tables
- July 18, 2025. Fixed navigation routing by removing redundant statistics page and consolidating in AdminPanel
- July 18, 2025. Changed worker tracking system to store tracking: renamed workerName to storeName throughout system
- July 18, 2025. Made file uploads optional for document submission instead of required
- July 18, 2025. Updated database schema to support nullable file fields and store name tracking

## User Preferences

Preferred communication style: Simple, everyday language.
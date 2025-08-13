# MCC네트월드 접수 포털 (MCC Network World Reception Portal)

## Overview
This project is a document management system designed for MCC네트월드 telecommunications dealers. Its primary goal is to streamline the handling of customer reception documents, offering key capabilities such as role-based authentication, secure file uploads, comprehensive document tracking, and administrative functionalities. The system aims to significantly enhance efficiency in managing customer activations and related processes, providing a robust platform for document management within the telecommunications sector.

## Recent Changes (Aug 13, 2025)
- **Authentication System**: MCC0001 dealer login fully functional with proper session persistence
- **Schema Fixes**: Resolved all dealer table field mapping issues (username vs dealerId)
- **API Endpoints**: Eliminated duplicate /api/auth/me endpoints and 401 errors
- **Form Restoration COMPLETED**: Successfully restored SubmitApplication.tsx to original structure
  - ✓ Layout component (not DealerLayout) properly implemented
  - ✓ Complex useState formData management for all fields
  - ✓ Contact code search and automatic dealer name lookup
  - ✓ Duplicate check dialog with override functionality
  - ✓ File upload with drag-and-drop support
  - ✓ Carrier-specific dynamic field validation and display
  - ✓ Customer type selection (신규/번호이동) with conditional fields
  - ✓ Bundle information, desired number, previous carrier fields
  - ✓ Complete form validation and error handling
- **Current Status**: Form fully functional, minor LSP errors to be addressed next session

## User Preferences
Preferred communication style: Simple, everyday language.
Code preservation: Keep existing code and settings intact during modifications. Only modify specific requested changes without resetting or initializing other parts.

## System Architecture
### Frontend
- **Framework:** React 18 with TypeScript.
- **Routing:** Wouter for client-side routing.
- **State Management:** Zustand for authentication, TanStack Query for server state.
- **UI:** shadcn/ui components (built on Radix UI) with Tailwind CSS for styling.
- **Theming:** Dark/light theme support.
- **Build:** Vite for development and production builds.

### Backend
- **Framework:** Express.js with TypeScript.
- **Database:** PostgreSQL with Drizzle ORM (better-sqlite3 for development).
- **File Storage:** Local filesystem using Multer.
- **Authentication:** Session-based with bcrypt for password hashing.

### Key Features
- **Authentication:** Role-based access control (system admin, admin, sales manager, dealer staff) with secure session management and hierarchical permissions.
- **Document Management:** File upload with validation (PDF, DOC, DOCX, images), status tracking (e.g., pending, in progress, completed, cancelled), and search/filtering. Includes duplicate application checking with override.
- **User Interface:** Responsive design, accessible components, and form validation.
- **Administrative Functions:** Comprehensive account management, dealer management, document oversight, and carrier-specific field configurations. Includes contact code bulk upload via Excel.
- **Account Management:** Multi-tier user system with system admin (full access), admin (limited access), sales managers (team-based), and worker accounts.
- **Sales Team Management:** Team-based organizational structure with contact code mapping for sales managers.
- **Workflow:** Document assignment and locking for workers, "업무요청중" status for work-in-progress, and a disposal system with reason tracking.
- **Service Plan Management:** Comprehensive system for managing and selecting service plans, additional services, and cost information (registration fees, SIM fees, bundle options).
- **Analytics & Reporting:** Dashboard statistics (daily, monthly), carrier and worker performance analytics, and Excel export for activated and settlement documents.
- **Communication:** Real-time WebSocket-based chat system for dealer-worker communication on "진행중" documents.
- **Carrier Configuration:** Dynamic form fields in application submission based on selected carrier's requirements.

## External Dependencies
- **Database:** @neondatabase/serverless (for PostgreSQL).
- **State Management:** @tanstack/react-query.
- **File Upload:** multer.
- **Security:** bcrypt.
- **Validation:** zod.
- **Date Handling:** date-fns.
- **UI Primitives:** @radix-ui/*.
- **Icons:** lucide-react.
- **Styling:** tailwindcss, class-variance-authority.
- **Development Tools:** vite, drizzle-kit, tsx.
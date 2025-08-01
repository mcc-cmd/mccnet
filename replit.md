# MCC네트월드 접수 포털 (MCC Network World Reception Portal)

## Overview
This project is a document management system for MCC네트월드 telecommunications dealers. Its main purpose is to streamline the handling of customer reception documents, offering capabilities such as role-based authentication, secure file uploads, comprehensive document tracking, and administrative functionalities. The system aims to enhance efficiency in managing customer activations and related processes.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
### Frontend
- **Framework:** React 18 with TypeScript.
- **Routing:** Wouter for client-side routing.
- **State Management:** Zustand for authentication, TanStack Query for server state.
- **UI:** shadcn/ui components (built on Radix UI) with Tailwind CSS for styling.
- **Theming:** Dark/light theme support via CSS custom properties.
- **Build:** Vite for development and production builds.

### Backend
- **Framework:** Express.js with TypeScript.
- **Database:** PostgreSQL with Drizzle ORM (better-sqlite3 for development).
- **File Storage:** Local filesystem using Multer.
- **Authentication:** Session-based with bcrypt for password hashing.

### Key Features
- **Authentication:** Role-based access control (admin, dealer_admin, dealer_staff) with secure session management.
- **Document Management:** File upload with validation (PDF, DOC, DOCX, images), status tracking (대기, 진행중, 업무요청중, 개통완료, 취소, 보완필요, 기타완료, 폐기), and search/filtering. Includes duplicate application checking with override.
- **User Interface:** Responsive design, accessible components, and form validation (react-hook-form, Zod).
- **Administrative Functions:** Management of dealers, users, documents, and carrier-specific field configurations. Includes contact code bulk upload via Excel.
- **Workflow:** Document assignment and locking for workers, "업무요청중" status for work-in-progress, and a disposal system with reason tracking.
- **Service Plan Management:** Comprehensive system for managing and selecting service plans, additional services, and cost information (registration fees, SIM fees, bundle options).
- **Analytics & Reporting:** Dashboard statistics (daily, monthly), carrier and worker performance analytics with drill-down capabilities, and Excel export for activated and settlement documents.
- **Communication:** Real-time WebSocket-based chat system for dealer-worker communication on "진행중" documents.
- **Carrier Configuration:** Dynamic form fields in application submission based on selected carrier's requirements.

## External Dependencies
- **Database:** @neondatabase/serverless (for PostgreSQL).
- **State Management:** @tanstack/react-query.
- **File Upload:** multer.
- **Security:** bcrypt (for password hashing).
- **Validation:** zod.
- **Date Handling:** date-fns.
- **UI Primitives:** @radix-ui/*.
- **Icons:** lucide-react.
- **Styling:** tailwindcss, class-variance-authority.
- **Development Tools:** vite, drizzle-kit, tsx.
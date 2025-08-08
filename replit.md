# MCC네트월드 접수 포털 (MCC Network World Reception Portal)

## Overview
This project is a document management system for MCC네트월드 telecommunications dealers. Its main purpose is to streamline the handling of customer reception documents, offering capabilities such as role-based authentication, secure file uploads, comprehensive document tracking, and administrative functionalities. The system aims to enhance efficiency in managing customer activations and related processes.

## Recent Changes (January 2025)
- **2025-01-08**: Successfully implemented and debugged contact code force update functionality and activation processor display
  - Added "기존 접점코드 강제 업데이트" checkbox in AdminPanel contact code upload dialog
  - Enhanced backend API to process forceUpdate parameter with detailed logging
  - Fixed force update mechanism to properly update all existing contact codes regardless of changes
  - Resolved isActive field issue that was preventing contact codes from displaying in UI
  - Added isActive: true preservation during updates to maintain contact code visibility
  - Confirmed successful testing with sales manager changes (정선웅 → 박종열)
  - All 917 contact codes now display correctly and force update feature works as intended
  - Added activated_by_name database column to store actual activation processor names
  - Fixed activation processor display issue where "L)수정" was showing as "이다엘"
  - Modified API routes to prioritize stored activatedByName over dynamic user lookup
  - Updated document activation status handling to preserve correct processor names
- **2025-01-08**: Integrated Real Sales POS (실판매POS) field across contact code management system
  - Added realSalesPOS column to contact_codes table in SQLite database
  - Enhanced AdminPanel contact code management interface with realSalesPOS input/display fields
  - Updated Excel upload functionality to recognize and process realSalesPOS column data
  - Added realSalesPOS display column to settlements page for better tracking
  - Modified backend API routes to handle realSalesPOS field in contact code creation and updates
  - Fixed settlement unit price effective date issue causing 2만원 pricing to not display correctly
  - Confirmed proper settlement amount calculations with updated effective dates
- **2025-01-08**: Fixed admin dashboard statistics display issues
  - Implemented getCarrierStats and getWorkerStats functions with real database queries
  - Added date filtering functionality for carrier and worker statistics
  - Fixed TypeScript errors and improved conditional rendering in Dashboard.tsx
  - Enhanced error handling and empty state display for statistics sections
  - Confirmed proper data aggregation from completed activation documents
- **2025-01-07**: Fixed critical upload functionality issues and data persistence problems
  - Resolved form auto-initialization preventing user input preservation in SubmitApplication.tsx
  - Fixed activatedBy field tracking for proper worker identification in completion records
  - Enhanced CompletedActivations.tsx to display correct role information (개통처리자 vs 관리자)
  - Improved worker-specific dashboard filtering for daily activations and monthly status tracking
  - Added includeActivatedBy parameter to documents API for proper activation processor identification

## User Preferences
Preferred communication style: Simple, everyday language.
Code preservation: Keep existing code and settings intact during modifications. Only modify specific requested changes without resetting or initializing other parts.

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
- **Authentication:** Role-based access control (system admin, admin, sales manager, dealer staff) with secure session management and hierarchical permissions.
- **Document Management:** File upload with validation (PDF, DOC, DOCX, images), status tracking (대기, 진행중, 업무요청중, 개통완료, 취소, 보완필요, 기타완료, 폐기), and search/filtering. Includes duplicate application checking with override.
- **User Interface:** Responsive design, accessible components, and form validation (react-hook-form, Zod).
- **Administrative Functions:** Comprehensive account management with role-based permissions, dealer management, document oversight, and carrier-specific field configurations. Includes contact code bulk upload via Excel.
- **Account Management:** Multi-tier user system with system admin (full access), admin (limited access), sales managers (team-based), and worker accounts. Password change permissions and account deletion restricted to system admin only.
- **Sales Team Management:** Team-based organizational structure with DX 1팀, DX 2팀 and contact code mapping for sales managers.
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
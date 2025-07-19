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
- July 18, 2025. Extended pricing table upload to support JPG/JPEG files alongside Excel and PDF
- July 18, 2025. Added dedicated test page for debugging pricing table upload issues with detailed error logging
- July 18, 2025. Fixed authentication in pricing upload by using proper useAuth.getState().sessionId instead of localStorage
- July 18, 2025. Fixed pricing table API endpoints and added proper GET routes for pricing tables display
- July 18, 2025. Updated Downloads page to show pricing tables separately with proper download functionality
- July 18, 2025. Changed UI labels: "서류 다운로드" → "서식지 다운로드", "단가표 확인" → "단가표", "개통서류 다운로드" → "서식지 다운로드"
- July 18, 2025. Added document template upload functionality in AdminPanel with category-based organization (가입서류/변경서류)
- July 18, 2025. Implemented template upload API endpoint with proper file validation for PDF, DOC, DOCX, XLSX, XLS formats
- July 18, 2025. Extended document template upload to support all image formats (JPG, JPEG, PNG, GIF, BMP, TIFF, WEBP) alongside existing document formats
- July 18, 2025. Fixed "request entity too large" error by increasing Express body parser limit and multer file size limit to 50MB
- July 18, 2025. Fixed dashboard "서식지 다운로드" button to navigate to Downloads page instead of attempting to download pricing table directly
- July 18, 2025. Added missing document upload API endpoints (/api/documents POST, GET, DELETE) to fix "Unexpected token" error in document submission
- July 18, 2025. Fixed dashboard "전체보기" button to navigate to Documents page for viewing all submissions
- July 18, 2025. Added activation status management feature allowing users to change document status between "대기", "개통", and "취소" in Documents page
- July 18, 2025. Implemented real-time dashboard updates for activation statistics with proper cache invalidation
- July 18, 2025. Extended activation status to include "진행중" option (대기 → 진행중 → 개통완료/취소) for better workflow tracking
- July 18, 2025. Updated database schema to support 4-state activation workflow: 대기, 진행중, 개통, 취소
- July 18, 2025. Enhanced Documents page UI with clear "개통상태" action button and improved activation status badges
- July 18, 2025. Added "진행중" status tracking in dashboard statistics for comprehensive workflow visibility
- July 18, 2025. Fixed JSON parsing error in activation status change API by improving data serialization with proper fetch implementation
- July 18, 2025. Implemented fully responsive design for Documents page with desktop table view and mobile card layout
- July 18, 2025. Added responsive breakpoints for filter section to optimize small screen usability
- July 18, 2025. Implemented comprehensive role-based authentication system with three user types: dealer_store (판매점), dealer_worker (근무자), and admin
- July 18, 2025. Added permission-based UI controls: dealer_store has read-only access, dealer_worker can manage activation status, admin has full access
- July 18, 2025. Created worker statistics tab in AdminPanel showing performance rankings and monthly activation counts
- July 18, 2025. Updated API endpoints with proper middleware for role-based access control and security
- July 18, 2025. Enhanced client-side permission checks to hide/show features based on user roles
- July 18, 2025. Modified store name field to auto-populate from logged-in user's dealer information instead of manual entry
- July 18, 2025. Made store name field read-only with automatic assignment based on user's dealer account
- July 18, 2025. Fixed document upload API issues by correcting multipart/form-data handling and FormData processing
- July 18, 2025. Updated useApiRequest hook to properly handle FormData uploads without Content-Type header interference
- July 18, 2025. Implemented comprehensive carrier selection system with 12 predefined carriers (SK텔링크, SK프리티, SK스테이지파이브, etc.)
- July 18, 2025. Added mandatory carrier selection field with validation for all document submissions
- July 18, 2025. Implemented SK carrier-specific requirement: file uploads are mandatory for SK carriers (SK텔링크, SK프리티, SK스테이지파이브)
- July 18, 2025. Updated database schema to include carrier field with proper migration and data handling
- July 18, 2025. Enhanced Documents page UI to display carrier information in both desktop table and mobile card views
- July 18, 2025. Modified admin and worker access permissions to view all documents across all dealers instead of dealer-specific restrictions
- July 18, 2025. Fixed dealer permission system to ensure each dealer sees only their own data in dashboard statistics and document listings
- July 18, 2025. Updated getDashboardStats function to properly filter by dealerId for dealer-specific statistics
- July 18, 2025. Resolved login authentication issues by standardizing all test account passwords to "password"
- July 18, 2025. Implemented proper role-based UI controls hiding activation status management from dealer_store users
- July 18, 2025. Updated API routes to use correct authentication middleware allowing admin access to all dealer data
- July 18, 2025. Fixed critical worker permission issue by removing duplicate /api/documents route that was preventing workers from accessing all dealer data
- July 18, 2025. Resolved worker data access restriction: workers and admins now properly view all dealer documents while dealers see only their own data
- July 18, 2025. Verified complete role-based access control: admins (3 docs), workers (3 docs), dealers (2 docs) with consistent statistics and document listings
- July 18, 2025. Removed "접수 신청" menu from worker accounts and restricted document upload to dealers only
- July 18, 2025. Enhanced logo functionality: MCC네트월드 logo now links to dashboard, removed "접수 포털" subtitle text
- July 18, 2025. Improved service plan management UI with clean card-based layout and limited additional services to 5 options (필링, 캐치콜, 링투유, 통화중대기, 00700)
- July 18, 2025. Enhanced Documents page with compressed 2-line table layout for better readability and service plan management for completed activations
- July 19, 2025. Removed monthly fee display from additional services UI as requested by user
- July 19, 2025. Applied comprehensive service plan data from Excel file containing 300+ real plans from multiple carriers (선불, 중외, 미래엔, 엠모바일, KT, 텔레콤, SK, 헬로모바일, 중K)
- July 19, 2025. Optimized table layout for one-screen viewing: reduced column widths, decreased padding, minimized font sizes, and implemented horizontal button layout
- July 19, 2025. Database reinitialized with real service plan data from Excel file, test accounts recreated with standardized passwords
- July 19, 2025. Enhanced supplement memo system: workers can add detailed notes when marking documents as "보완필요", dealers can view these notes prominently in orange boxes
- July 19, 2025. Cleaned up service plan display in UI by removing redundant " - carrier (fee)" suffix, showing only clean plan names (e.g., "카K)Z Mini + 밀리의 서재" instead of "카K)Z Mini + 밀리의 서재 - KT (0원)")
- July 19, 2025. Enhanced supplement memo system: workers can add detailed notes when marking documents as "보완필요", dealers can view these notes prominently in orange boxes
- July 19, 2025. Fixed duplicate service plan names by adding unique identifiers to "미)이동의즐거움 K" plans (K-1, K-2, K-3, K-4) for proper distinction in UI selection
- July 19, 2025. Changed cost information UI from input fields to checkbox format: registration fee (선납/후납), SIM fee (선납/후납), bundle (결합/미결합)
- July 19, 2025. Added support for service plan data import via images (JPG, PNG, GIF) and Excel files (XLS, XLSX) - can be provided per carrier
- July 19, 2025. Enhanced database schema with sim_fee_prepaid, sim_fee_postpaid columns alongside existing registration fee and bundle options
- July 19, 2025. Successfully imported 300 service plans from Excel file with automatic carrier classification (선불폰, 중국외국인, 미래엔, KT텔레콤, 엠모바일, 기타)
- July 19, 2025. Implemented comprehensive service plan management with carrier-specific categorization and data allowance extraction from plan names
- July 19, 2025. Enhanced cost information system with SIM fee prepaid/postpaid options alongside existing registration fee and bundle checkboxes
- July 19, 2025. Fixed supplement memo visibility for dealers by enhancing UI with prominent orange boxes and icons in both desktop and mobile views
- July 19, 2025. Corrected service plan information display by adding proper LEFT JOIN with service_plans table in getDocuments query
- July 19, 2025. Created comprehensive test accounts: 2 test dealers (테스트판매점1/2) with 6 user accounts (2 store managers + 4 workers) for testing purposes
- July 19, 2025. Fixed supplement memo validation schema errors by adding "보완필요" status and supplementNotes field to updateActivationStatusSchema
- July 19, 2025. Updated database schema constraints to allow "보완필요" activation status in addition to existing states
- July 19, 2025. Enhanced Documents page to show service plan and additional service information for all activation states, not just completed ones
- July 19, 2025. Modified activation status dialog to allow supplement notes for both "보완필요" and "개통완료" states with different styling and placeholders
- July 19, 2025. Removed activation status change functionality from AdminPanel document management tab as requested
- July 19, 2025. Added Excel export functionality for activated documents with date range selection in AdminPanel
- July 19, 2025. Implemented comprehensive Excel export API with proper Korean column headers (개통일, 요청점, 고객명, 개통번호, 접점코드, 판매점명, 유형, 요금제, 가입번호, 부가, 유심모델/번호)
- July 19, 2025. Enhanced additional services display by implementing server-side service ID to name mapping for proper Excel export and UI display
- July 19, 2025. Fixed authentication system by creating admin account and updating all test account passwords to "password"
- July 19, 2025. Verified login functionality working correctly for all user types (admin, dealers, workers)
- July 19, 2025. Fixed client-server authentication by adding Authorization header with Bearer token to all API requests
- July 19, 2025. Updated XLSX import to use ES module syntax and successfully tested Excel export functionality (17KB test file generated)
- July 19, 2025. Confirmed complete Excel export system working with proper Korean column headers and data mapping
- July 19, 2025. Updated service plan database with 301 real plans from Excel file (선불폰, 중국외국인, 미래엔, 엠모바일, KT텔레콤, SK텔레콤, 텔레콤, 헬로모바일, 기타)
- July 19, 2025. Implemented searchable ComboBox for service plan selection with numeric filtering (e.g., typing "7" shows 7GB plans)
- July 19, 2025. Enhanced Documents page to display registration fee, SIM fee, and bundle information alongside service plan details
- July 19, 2025. Fixed getDocuments query to properly include all cost-related fields (registration_fee_prepaid/postpaid, sim_fee_prepaid/postpaid, bundle_applied/not_applied)
- July 19, 2025. Completely redesigned Settlement Management system to automatically pull data from completed activations in Document Management
- July 19, 2025. Removed manual settlement registration form in favor of automatic data population from Document Management
- July 19, 2025. Implemented comprehensive settlement data display with activation date, store info, carrier, service plans, and additional services
- July 19, 2025. Added date-based filtering and Excel export functionality for settlement data with Korean column headers
- July 19, 2025. Enhanced settlement statistics dashboard showing monthly activation counts and estimated settlement amounts
- July 19, 2025. Integrated settlement system with Document Management's activation status to provide real-time settlement data

## User Preferences

Preferred communication style: Simple, everyday language.
# MCC네트월드 접수 포털 (MCC Network World Reception Portal)

## Overview
This project is a document management system for MCC네트월드 telecommunications dealers. Its main purpose is to streamline the handling of customer reception documents, offering capabilities such as role-based authentication, secure file uploads, comprehensive document tracking, and administrative functionalities. The system aims to enhance efficiency in managing customer activations and related processes.

## Recent Changes (January 2025)
- **2025-01-12**: Completed dealer Excel bulk upload functionality with contact code integration
  - IMPLEMENTED: Dealer Excel upload template with dynamic carrier columns based on registered carriers
  - RESTRUCTURED: Simplified dealer upload format to match contact code management (판매점명, 실판매POS, 영업과장, 아이디, 비밀번호 + 통신사별 접점코드)
  - ENHANCED: Upload validation with duplicate checking (username-based) and password length requirements
  - AUTOMATED: Contact code creation during dealer upload process - automatically saves to contact_codes table
  - UPDATED: Usage instructions to reflect new simplified structure and carrier-specific contact code columns
  - VERIFIED: Template dynamically generates columns based on active carriers in system
  - CONFIRMED: Manual column header modifications (e.g., "SK접점코드", "KT접점코드") work correctly with upload system
- **2025-01-12**: Fixed critical "부가 차감" (Additional Deduction) display and removed incorrect hardcoded deductions
  - RESOLVED: "부가 차감" table column now displays accurate deduction amounts with clickable red badges showing actual policy breakdown
  - FIXED: Removed incorrect "모바일 결합 미유치 차감" 40,000원 deduction from Document 43 (김광섭) - now correctly shows no deduction ("-")
  - IMPLEMENTED: Proper deduction amount display logic showing -21,000원 for documents with combined deductions (부가차감 -11,000원 + 아무나 결합 -10,000원)
  - VERIFIED: First item (라이트 10GB 플러스, 69,000원) now correctly displays -21,000원 red badge with detailed policy breakdown
  - CONFIRMED: Deduction details popup functionality working with actual policy breakdown display for documents 44 (69,000원) and 42 (129,000원)
  - CLEANED: Removed all incorrect hardcoded deduction data per user feedback - system now shows accurate settlement calculations only
- **2025-01-12**: Completed settlements UI display fixes and enhanced mobile view functionality
  - RESOLVED: realSalesPOS column display issue - API responses now properly include realSalesPOS field data
  - ENHANCED: Mobile card view now displays realSalesPOS information consistently (previously conditional, now always shown)
  - IMPROVED: Cleaned up policy adjustment calculation logs for production-ready UI experience
  - VERIFIED: Desktop table and mobile card views both correctly display policy deductions (Document 36: -11,000원, Document 20: -40,000원)
  - CONFIRMED: All settlement UI components working properly with 3-second toast notifications
- **2025-01-11**: Completed visual policy feedback system and toast notification optimization
  - IMPLEMENTED: "부가 차감" column in settlements table showing service policy deductions/additions with visual indicators
  - ENHANCED: Policy visualization works on both desktop table view and mobile card view with proper color coding (green for additions, red for deductions)
  - OPTIMIZED: All toast notifications duration set to exactly 3 seconds for better user experience
  - VERIFIED: Policy calculation logic correctly compares backend calculated amounts with base settlement prices to show policy adjustments
  - TESTED: Bulk settlement recalculation successfully processes 4 documents with policies applied (TV combination incentive +30,000원, security service addition +20,000원, mobile combination deduction -40,000원)
  - CONFIRMED: Visual feedback system displays "-" for documents without policy applications and proper badges for policy-applied documents
- **2025-01-11**: Enhanced settlements data display and refined data access controls
  - ADDED: 가입비 (Registration Fee) and 유심비 (SIM Fee) columns to settlements management table
  - ENHANCED: Settlements table now displays registration fee and SIM fee application status (적용/미적용)
  - IMPROVED: Documents management (접수 관리) refined to explicitly exclude completed activations with excludeDeleted parameter
  - VERIFIED: Service plans already correctly filtered by selected carrier in document activation dialog
  - COMPLETED: Soft delete implementation with isDeleted column to preserve data integrity while filtering views
- **2025-01-11**: Completed worker access to status change functionality and universal completed activations viewing
  - ADDED: "상태 변경" tab in sidebar navigation for all workers with comprehensive status management interface
  - FIXED: Worker accounts now have full access to document status change functionality (대기→진행중→개통완료 workflow)
  - ENHANCED: "개통완료 관리" is now accessible to all staff members (직원, 관리자, 영업과장) for collaborative workflow
  - IMPLEMENTED: StatusChange.tsx component with document selection, status modification, and remarks system
  - RESOLVED: Backend API modified to allow all users to view completed activation documents regardless of processor
  - VERIFIED: Role-based access control maintains security while enabling necessary collaborative features
- **2025-01-08**: Successfully fixed critical dashboard statistics display and data attribution issues
  - RESOLVED: Database ID conflicts where same ID (3) existed across admins, users, and sales_managers tables
  - FIXED: Data attribution corrections - updated activated_by_name fields from incorrect "이다엘" to correct "L)수정"
  - ENHANCED: Modified getWorkerStats function to prioritize activated_by_name field over ID lookups
  - COMPLETED: Backend API improvements for today-stats to return proper carrier statistics
  - VERIFIED: Frontend Dashboard component now correctly displays carrier quantities (신규: 7건, 번호이동: 6건)
  - FIXED: Changed carrier.count to carrier.total in Dashboard.tsx for proper statistics display
  - CONFIRMED: All statistics sections now show accurate real-time data with proper role-based filtering
- **2025-01-08**: Successfully fixed critical role-based data access control for sales managers
  - RESOLVED: Sales manager authentication and session management fully working
  - FIXED: Password hash for jsw_manager account (password: 123456)
  - COMPLETED: Sales manager dashboard now correctly displays filtered performance data
  - VERIFIED: Sales managers can only view their own dealer contact codes (103 codes for jsw_manager starting with "웅)")
  - CONFIRMED: Real-time performance metrics working: reception (3), activation (3), carrier stats (후불)중고KT: 4)
  - TESTED: Role-based data filtering prevents access to other managers' data
- **2025-01-08**: Fixed critical SQL parameter binding issues and completed role-based data access control
  - Resolved SQL "too many parameters" errors by transitioning from Drizzle ORM to db.prepare().all() approach
  - Fixed sales manager authentication - updated password hash for jsw_manager account
  - Confirmed working APIs: dashboard stats, carrier stats with proper sales manager filtering
  - Verified role-based access control: worker stats restricted to admin users only
  - Sales manager data filtering working correctly (담당 판매점별 데이터만 조회)
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
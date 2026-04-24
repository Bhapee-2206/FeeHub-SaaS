# FeeHub SaaS - Project Documentation

FeeHub is a comprehensive, multi-tenant Software as a Service (SaaS) platform designed for educational institutions to manage student fees, courses, staff, and payments. It features a robust backend powered by Node.js and MongoDB, and a responsive frontend built with semantic HTML5 and modern CSS.

---

## 📂 Project Architecture

### 🛡️ Core Root Files
- **`package.json`**: Defines project dependencies, scripts (start, dev), and metadata.
- **`.gitignore`**: Ensures sensitive files like `node_modules` and `.env` are not tracked by Git.
- **`README.md`**: Basic project overview and setup instructions.
- **`PROJECT_SOURCE_RECORD.md`**: Internal record of source code changes and project history.

---

### ⚙️ Backend (`/backend`)
The backend follows a modular MVC-like pattern (Models, Routes, Controllers) for scalability.

#### 🚀 Entry Point
- **`server.js`**: The heart of the application. It initializes Express, connects to MongoDB, sets up security middleware (Helmet, CORS), defines API routes, and serves the static frontend files.

#### 🛠️ Configuration & Utilities
- **`config/db.js`**: Handles the connection logic to MongoDB Atlas.
- **`.env`**: Stores sensitive credentials (DB URI, JWT secret, Mailer config).
- **`utils/emailService.js`**: A custom-built mailing engine using Nodemailer (SMTP) with built-in logging for reliable communication.

#### 💾 Database Models (`/models`)
- **`user.js`**: Schema for platform users with roles: `SuperAdmin`, `InstitutionAdmin`, `Staff`, and `Student`.
- **`institution.js`**: Defines the "Tenant" entity (Name, Location, Active Status).
- **`student.js`**: Detailed student profiles linked to institutions and courses.
- **`course.js`**: Educational programs offered by institutions.
- **`FeeStructure.js`**: Defines fee components (Tuition, Library, etc.) for specific courses.
- **`Payment.js`**: Tracks all fee transactions, statuses, and receipt IDs.

#### 🛣️ API Routes (`/routes`)
- **`authRoutes.js`**: Endpoints for Login, Registration, and Password Resets.
- **`hqRoutes.js`**: Strict "HQ Clearance" routes for SuperAdmins to manage institutions (Suspend, Delete, Global Stats).
- **`institutionRoutes.js`**: CRUD operations for individual school/college settings.
- **`studentRoutes.js` / `courseRoutes.js`**: Management of student and academic data.
- **`paymentRoutes.js`**: Logic for recording fee payments and generating reports.
- **`dashboardRoutes.js`**: Aggregated statistics for Institution Admin dashboards.
- **`studentPortalRoutes.js`**: Specialized endpoints for the student-facing view.

#### 🛂 Middleware
- **`authMiddleware.js`**: Protects routes using JWT verification and role-based access control (RBAC).

#### 📜 Scripts
- **`seed.js`**: Populates the database with initial demo data.
- **`scripts/fresh-start.js`**: Wipes and re-initializes the platform for testing.
- **`scripts/reset-hq-admin.js`**: Recovers SuperAdmin access if credentials are lost.

---

### 🎨 Frontend (`/frontend`)
The frontend is built for speed and accessibility using Vanilla JS and rich CSS.

#### 📄 Core Pages (HTML)
- **`index.html`**: The public landing page.
- **`login.html` / `register.html`**: Authentication portals.
- **`hq-login.html`**: Private entry for SuperAdmins.
- **`dashboard.html`**: Main workspace for Institution Admins.
- **`hq-dashboard.html`**: Global management suite for SuperAdmins.
- **`student-dashboard.html`**: Personalized portal for students to view dues.
- **`superadmin.html`**: UI components for platform-level management.

#### 🧩 UI Components
- **`feehub-loader.css` / `feehub-loader.js`**: Implements global loading animations and UI feedback transitions.
- **`favicon.png`**: Brand identity icon.

#### 🧠 Logic Layer (`/views`)
- **`home.js`**: Handles dynamic landing page interactions.
- **`student.js`**: Complex logic for managing student lists, searching, and filtering.
- **`fees.js`**: Logic for fee structure assignment and calculations.
- **`staff.js`**: Management interface for institution staff accounts.

---

## 🔑 Access Control Roles
1.  **SuperAdmin (HQ)**: Can create/suspend institutions and view global platform revenue.
2.  **InstitutionAdmin**: Full control over their own institution's students, courses, and fees.
3.  **Staff**: Can manage day-to-day data entry and student records.
4.  **Student**: Can view their own fee structures, payment history, and profile.

---

## 🛠️ Tech Stack
- **Backend**: Node.js, Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Auth**: JWT (JSON Web Tokens) & BcryptJS
- **Email**: Nodemailer (SMTP)
- **Styling**: Vanilla CSS with Tailwind CSS (CDN-based)
- **Visualization**: Chart.js (for analytics)

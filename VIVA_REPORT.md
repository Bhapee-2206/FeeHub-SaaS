# 🎓 FeeHub SaaS: Comprehensive Viva & Project Report

This document provides a detailed technical breakdown of every file in the FeeHub SaaS project. It is designed for viva preparation, explaining the purpose, logic, and implementation details of the entire system.

---

## 🏛️ Project Architecture Overview
FeeHub is a **Multi-Tenant SaaS** platform.
- **Multi-Tenancy**: Multiple institutions (tenants) use the same software, but their data is isolated via `institutionId`.
- **Tech Stack**: 
    - **M**ongoDB (Database)
    - **E**xpress.js (Backend Framework)
    - **N**ode.js (Runtime)
    - **Vanilla JS/HTML/CSS** (Frontend)
- **Security**: JWT for Authentication, Bcrypt for Hashing, Helmet for HTTP headers.

---

## 📂 Root Directory Files
| File | Detailed Purpose | Key Logic/Viva Points |
| :--- | :--- | :--- |
| `package.json` | Project configuration and dependency manager. | Mentions `npm start` and `npm run dev`. Lists dependencies like `express`, `mongoose`, `jsonwebtoken`, `bcryptjs`. |
| `.gitignore` | Prevents sensitive files from being pushed to Git. | Critical for security; ignores `node_modules` and `.env`. |
| `README.md` | General overview for developers. | Provides setup steps and project goals. |
| `PROJECT_DETAILS.md` | Architectural summary. | Explains the modular structure and data flow. |

---

## ⚙️ Backend Logic (`/backend`)

### 🚀 Entry Point
#### `server.js`
- **Purpose**: Initializes the entire backend.
- **Logic**: 
    - Loads environment variables using `dotenv`.
    - Implements security middleware like `helmet()` and `cors()`.
    - Connects to MongoDB Atlas using Mongoose.
    - Mounts all API routes (Auth, Student, Payment, etc.).
    - Serves the frontend as static files.
    - **Viva Point**: It uses a "catch-all" route at the end to serve `login.html` for single-page application (SPA) behavior.

### 🛠️ Configuration & Utils
#### `config/db.js`
- **Purpose**: Database connection logic.
- **Logic**: Uses `mongoose.connect()` with the URI from `.env`. Logs success or failure to the console.

#### `utils/emailService.js`
- **Purpose**: Centralized email engine.
- **Logic**: 
    - Uses **Nodemailer** for SMTP transport (primary).
    - Features a **SendGrid Fallback** (optional) to bypass cloud-provider SMTP blocks.
    - Dynamically loads transporter to ensure environment variables are ready.
    - **Viva Point**: Why use a fallback? Because SMTP ports (25, 587) are often blocked by hosting providers like Render/AWS.

### 💾 Models (Mongoose Schemas)
- **`user.js`**: Defines users with roles (`SuperAdmin`, `InstitutionAdmin`, `Staff`). Stores hashed passwords.
- **`institution.js`**: The tenant record. Contains the institution's name, email, and `isActive` flag.
- **`student.js`**: Links a student to an institution. Tracks `totalFees` vs `paid` amount.
- **`course.js`**: Academic courses/departments within an institution.
- **`FeeStructure.js`**: Breaking down fees into components (e.g., Admission, Tuition, Library).
- **`Payment.js`**: Records every transaction. Stores `receiptNumber`, `paymentMethod`, and `fine`.

### 🛂 Controllers & Middleware
#### `controllers/authController.js`
- **Purpose**: Business logic for Identity Management.
- **Key Functions**:
    - `registerInstitution`: Creates both a new Institution and its first Admin in one transaction.
    - `loginUser`: Verifies email, compares hashed passwords using `bcrypt.compare()`, and issues a **JWT**.
    - `forgotPassword`: Generates a secure random token using `crypto`, hashes it, and emails a reset link.
    - `studentLogin`: Allows students to log in using their email and Roll Number.

#### `middleware/authMiddleware.js`
- **Purpose**: Security gatekeeper.
- **Logic**: Intercepts requests, extracts the **Bearer Token**, verifies it with `jwt.verify()`, and attaches the user object to `req.user`.

### 🛣️ Routes (API Endpoints)
- **`authRoutes.js`**: Connects `/api/auth` to the `authController` functions.
- **`hqRoutes.js`**: Platform-wide management. Allows SuperAdmins to view all tenants and suspend them.
- **`paymentRoutes.js`**: 
    - **Receipt Logic**: Generates unique receipt IDs (`FH-2026-101`).
    - **Email Logic**: Sends a professional HTML receipt to the student upon successful payment recording.
- **`studentRoutes.js`**: CRUD operations for student records.

---

## 🎨 Frontend Logic (`/frontend`)

### 📄 Main Pages
- **`index.html`**: Landing page with call-to-action buttons.
- **`login.html` / `register.html`**: Custom forms for authentication.
- **`dashboard.html`**: The main interface for institution admins. Features a sidebar, statistics cards, and dynamic tables.
- **`hq-dashboard.html`**: A "Command Center" for the platform owner to monitor all institutions.
- **`student-dashboard.html`**: A simplified portal for students to check their dues and payment history.

### 🧩 UI Logic
- **`feehub-loader.js/css`**: A sophisticated loading system that manages "Skeleton Screens" and page transitions to make the app feel fast.
- **`/views` folder**: Contains specific JS files (like `student.js`, `fees.js`) that handle API calls and DOM manipulation for their respective modules.

---

## 🛡️ Common Viva Questions & Answers

**Q1: What is JWT and why did you use it?**
> JWT (JSON Web Token) is a stateless authentication mechanism. We use it because the server doesn't need to store session data, making the platform scalable across multiple servers.

**Q2: How do you handle password security?**
> Passwords are never stored in plain text. We use `bcryptjs` to hash passwords with a salt of 10 rounds before saving them to MongoDB.

**Q3: How does the system handle multiple institutions?**
> This is a **Multi-Tenant** architecture. Every record (Student, Payment, Course) is tagged with an `institutionId`. The middleware and controllers ensure that an Admin can only see data belonging to their specific ID.

**Q4: How does the email system work?**
> We use `nodemailer` to send SMTP emails. The logic is abstracted into a service that can handle both standard SMTP (Gmail) and API-based delivery (SendGrid) as a fallback.

**Q5: What is the purpose of Mongoose?**
> Mongoose is an ODM (Object Data Modeling) library for MongoDB. It allows us to define strict schemas and provides helper methods for CRUD operations.

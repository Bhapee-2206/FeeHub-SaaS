# 🚀 FeeHub SaaS - Smart Fee Management System

![FeeHub Logo](feehub_logo_1775929448683.png)

**FeeHub** is a premium, multi-tenant SaaS platform designed for educational institutions to streamline fee collection, track payments, and manage student financial records with ease. Built with a focus on security, scalability, and user experience.

---

## 🛠️ Comprehensive Feature Suite

### 1. 🏢 Multi-Tenant Institution Management (HQ)
*   **Centralized Command Center**: Real-time tracking of platform-wide revenue, total enrollment, and active instances from a high-level SuperAdmin perspective.
*   **Instance Lifecycle Control**: Instantly provision, suspend, or reactivate institutional tenants to manage subscription states or compliance.
*   **Logical Data Isolation**: Each tenant's data (Students, Staff, Payments) is strictly partitioned at the logic layer for multi-tenant security.
*   **Nuclear Wipe Safety**: Administrative capability to securely erase all data associated with a specific tenant while maintaining system integrity.

### 2. 💰 Advanced Fee & Revenue Architecture
*   **Dynamic Fee Modeling**: Create granular fee structures mapped to specific Courses and Academic Batches for precise financial planning.
*   **Component-based Breakdown**: Define custom fee categories (Tuition, Lab, Library, Sports, etc.) within each model for transparent billing.
*   **Automated Balance Sync**: Modifying a fee structure automatically triggers a platform-wide recalculation of dues for all enrolled students in that batch.
*   **Total Debt Management**: Systemic tracking of "Total Fees" vs "Paid" with real-time "Net Balance" calculation for every student.

### 3. 🎓 Smart Student & Staff Administration
*   **Automated ID Generation**: Proprietary logic generates unique Student IDs based on enrollment patterns and contact data.
*   **Staff RBAC Management**: Manage institution staff with specific roles, allowing for delegated payment recording and student updates.
*   **Bulk Operations Engine**: High-performance bulk import/upsert system for managing thousands of records via localized API optimization.
*   **Lifecycle Monitoring**: Real-time audit of student admission status, course progress, and contact information.

### 4. 💳 Omni-channel Payment Operations
*   **Multi-Method Recording**: Log payments via Cash, UPI, Bank Transfer, or Online gateways with custom transaction ID tracking.
*   **Late Fee & Penalty Engine**: Apply discretionary or automated fines that track independently of core academic balances.
*   **Hybrid Receipting**: Support for both auto-generated digital receipt numbers and manual physical book references.
*   **Instant Ledger Settlement**: Payments are processed in real-time, removing manual reconciliation burdens for accountants.

### 5. 📨 Automated Communication Pipeline
*   **Branded HTML Receipts**: Professional email receipts featuring the institution's colors and branding delivered instantly upon payment.
*   **Accountability Summaries**: Transaction emails include a proactive "Current Dues" summary to keep students informed of their status.
*   **Resend Mastery**: One-click administrative ability to trigger manual receipt delivery if a student loses their copy.
*   **Smart Delivery Routing**: Native integration with SendGrid and Nodemailer ensuring high deliverability to inbox (bypassing spam).

### 6. 🎨 Premium User Experience (UX/UI)
*   **Nebula Engine Loader**: A sophisticated, glassmorphic page loader that handles asset initialization while providing a premium first impression.
*   **Midnight Aesthetic**: Dark-themed, high-contrast dashboard designed for professional usage and readability.
*   **Responsive Flow**: Fully optimized for desktop and mobile browsers, ensuring access from anywhere.
*   **Anti-Flash System**: Proprietary logic prevents FOUC (Flash of Unstyled Content) during heavy page loads.

---

## 🛠️ Tech Stack

### Frontend
-   **Structure**: Semantic HTML5
-   **Styling**: Custom CSS3 (Glassmorphism & Midnight Aesthetic)
-   **Logic**: Vanilla JavaScript (Async/Await API Integration)

### Backend
-   **Runtime**: Node.js (v18+)
-   **Framework**: Express.js
-   **Database**: MongoDB (Mongoose ODM)
-   **Mailing**: SendGrid / Nodemailer
-   **Security**: Helmet, CORS, JWT, BcryptJS

---

## 🚀 Getting Started

### Prerequisites
-   [Node.js](https://nodejs.org/) installed on your system.
-   [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account or local MongoDB instance.

### Installation

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd feehub-saas
    ```

2.  **Install dependencies**:
    ```bash
    # Install root dependencies
    npm install
    ```

3.  **Environment Setup**:
    Create a `.env` file in the `backend/` directory using `.env.example` as a template:
    ```env
    PORT=5000
    MONGO_URI=your_mongodb_uri
    JWT_SECRET=your_secret_key
    EMAIL_USER=your_sendgrid_email
    EMAIL_PASS=your_sendgrid_api_key
    ```

### Running the Application

**Development Mode:**
```bash
npm start
```
The server will start on `http://localhost:5000` (or your specified port). Since the backend serves the frontend statically, you can access the app directly via this URL.

**Seeding Data (Optional):**
To populate the database with initial data:
```bash
node backend/seed.js
```

---

## 👥 User Roles & Access
| Role | Access Level | Primary Task |
| :--- | :--- | :--- |
| **SuperAdmin** | Full System | System monitoring, institution management. |
| **HQ Admin** | Institutional | Staff management, manual fee updates. |
| **Student** | Personal Portal | Fee payment, receipt downloads. |

---

## 📁 Project Structure

```text
FeeHub-SaaS/
├── backend/                # Express.js Server
│   ├── config/             # DB & Mail Config
│   ├── controllers/        # Business Logic
│   ├── models/             # Mongoose Schemas
│   ├── routes/             # API Endpoints
│   ├── utils/              # Helper Functions
│   └── server.js           # Entry Point
├── frontend/               # Client-Side Application
│   ├── index.html          # Landing Page
│   ├── login.html          # Auth Pages
│   ├── dashboard.html      # User Dashboards
│   └── feehub-loader.js    # Global Loader/Common Logic
├── package.json            # Scripts & Root Dependencies
└── README.md               # Documentation
```

---

## 🛡️ Security Features
-   **Production Ready**: Confgured for deployment on platforms like Render.
-   **Sensitive Data Protection**: All sensitive endpoints require valid JWT tokens.
-   **Input Sanitization**: Body-parser limits and Content-Type validation.

---

## 📜 License
Distributed under the **ISC License**. See `package.json` for more information.

---
*Developed by Bhapee Studios 🚀*

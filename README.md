# 🚀 FeeHub SaaS - Smart Fee Management System

![FeeHub Logo](feehub_logo_1775929448683.png)

**FeeHub** is a premium, multi-tenant SaaS platform designed for educational institutions to streamline fee collection, track payments, and manage student financial records with ease. Built with a focus on security, scalability, and user experience.

---

## ✨ Key Features

-   **Multi-Role Dashboard**: Tailored experiences for SuperAdmins, Instituion HQs, and Students.
-   **Automated Fee Tracking**: Real-time monitoring of paid, pending, and overdue fees.
-   **Professional Receipts**: Automated email receipts powered by SendGrid and Nodemailer.
-   **Advanced Security**: JWT-based authentication, password hashing with Bcrypt, and production-grade security headers using Helmet.
-   **Global Search & Filters**: Efficiently manage thousands of student records and transactions.
-   **Dynamic Analytics**: Visual representation of collection trends and institutional performance.

![Dashboard Mockup](feehub_dashboard_mockup_1775929499892.png)

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

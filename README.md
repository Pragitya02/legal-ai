# Nyaya AI

> AI-powered legal assistance and secure legal document management platform.

Nyaya AI is a full-stack legal-tech platform designed to help citizens access legal information, manage legal cases and documents, connect with advocates, conduct consultations, and verify document integrity.

The platform combines **Artificial Intelligence, cybersecurity, blockchain-based document integrity, secure authentication, and administrative controls** into a unified legal-tech application.

---

## 🚀 Key Features

### 🤖 AI Legal Assistant

Nyaya AI provides AI-assisted legal support through a conversational interface.

Features include:

- AI-powered legal question assistance
- Context-aware conversations
- Legal information and guidance
- Document-related assistance
- Speech-to-text support
- AI-powered interaction workflows

> **Disclaimer:** Nyaya AI provides AI-assisted legal information and does not replace a qualified lawyer or professional legal advice.

---

### 📁 Case Management

Users can manage their legal cases through the platform.

Capabilities include:

- Create and manage cases
- Store case-related information
- Track case details
- Associate documents with cases
- Manage case-specific information securely

---

### 👨‍⚖️ Advocate Discovery

Citizens can discover advocates according to their requirements.

Features include:

- Advocate search
- Search by district/location
- Practice-area filtering
- Advocate profiles
- Professional information
- Court information
- Experience information
- Contact information with privacy protection
- Advocate consultation workflows

---

### 📅 Consultations & Meetings

The platform supports interaction between citizens and advocates.

Features include:

- Consultation requests
- Appointment management
- Meeting management
- Advocate/citizen participation validation
- Consultation-related workflows

---

## 🔐 Secure Document Management

Nyaya AI provides secure document management for legal files.

Features include:

- Document upload
- Document storage
- Document metadata
- Case-document association
- Document security controls
- Document access controls
- Document activity tracking
- Document integrity verification

---

## 🔏 Document Integrity Verification

Nyaya AI uses cryptographic hashing to help verify whether a document has been modified.

A document can be processed using a cryptographic hash such as **SHA-256**.

The system compares the current document hash with its previously registered integrity value.

This provides a mechanism for detecting changes to registered documents.

### Verification States

The blockchain verification workflow can return states including:

- `verified`
- `tampered`
- `not_registered`
- `blockchain_unavailable`

Example:

```text
Legal Document
      ↓
Generate SHA-256 Hash
      ↓
Register / Compare Integrity Hash
      ↓
Blockchain Verification
      ↓
Verification Result
```

---

## ⛓️ Blockchain-Based Document Integrity

Nyaya AI uses blockchain technology as an additional integrity layer for important legal documents.

Instead of storing the complete document directly on the blockchain, the system uses a cryptographic hash representing the document.

Conceptually:

```text
Legal Document
      ↓
SHA-256 Hash
      ↓
Blockchain Record
      ↓
Later Verification
      ↓
Hash Comparison
      ↓
Integrity Result
```

This provides a mechanism for detecting changes to a registered document.

> Blockchain anchoring is used for document integrity verification. It does not by itself constitute a legally valid digital signature or statutory certification.

---

## 🛡️ Cybersecurity

Security is a core part of the Nyaya AI architecture.

The platform includes multiple security mechanisms across authentication, authorization, sessions, API protection, and data access.

### Authentication

The system supports:

- Email/password authentication
- Advocate authentication
- Google authentication
- JWT-based authentication
- Access tokens
- Refresh tokens
- Secure session handling

### Password Security

Passwords are stored using secure password hashing rather than plaintext storage.

The backend uses **bcrypt** for password verification.

### Secure Cookies

Authentication tokens are handled using secure HTTP cookies.

The system uses:

- HttpOnly cookies
- Secure cookie configuration
- Access-token expiration
- Refresh-token storage mechanisms

Sensitive authentication tokens are not intentionally exposed to frontend JavaScript.

### CSRF Protection

The application includes CSRF protection for protected requests.

This provides an additional security layer for cookie-based authentication.

### Rate Limiting

Authentication-related APIs use rate limiting to reduce the risk of:

- Brute-force attacks
- Excessive authentication requests
- Automated abuse

### Security Headers

The backend uses security middleware such as Helmet to apply HTTP security headers.

### Authorization

Protected backend routes verify the authenticated user before allowing access to protected resources.

The system uses role-based authorization concepts for:

- Citizens
- Lawyers/Advocates
- Administrators

---

## 📝 Audit Trail

Nyaya AI includes an audit logging system for tracking important document-related activities.

The audit system can record information such as:

- User
- Entity type
- Entity ID
- Action
- Description
- IP address
- User agent
- Metadata
- Timestamp

The administrator can view audit information associated with individual users and advocates.

Example:

```text
User uploads document
        ↓
Document activity occurs
        ↓
Activity is recorded
        ↓
Administrator can review the audit history
```

---

## 👥 User Roles

Nyaya AI currently defines the following roles:

| Role | Description |
|------|-------------|
| `citizen` | Regular platform user |
| `lawyer` | Advocate/legal professional |
| `admin` | Administrative user |

Public registration does not allow users to directly assign themselves the `admin` role.

---

## 👨‍💼 Admin Portal

Nyaya AI includes a dedicated administrator portal.

### Admin Login

The administrative authentication flow uses:

```text
/adminlogin
     ↓
Admin authentication
     ↓
/admin
```

Unauthenticated access to protected administrator pages is redirected to the administrator login page.

### Admin Dashboard

The main administrator dashboard focuses on:

- Users
- Advocates

Administrators can select an individual user or advocate and inspect relevant information.

---

### 👤 User Administration

The administrator can access user-specific information through dedicated sections.

User management includes:

- Overview
- Profile
- Documents
- Activity
- Security
- Audit Trail

The audit trail is scoped to the selected user.

---

### 👨‍⚖️ Advocate Administration

Administrators can inspect advocate-specific information.

Advocate administration includes:

- Overview
- Professional Profile
- Documents
- Consultations
- Activity
- Security
- Audit Trail

The audit trail is scoped to the selected advocate.

---

# 🏗️ Technology Stack

## Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Three.js
- React Three Fiber

## Backend

- Node.js
- Express.js
- JavaScript

## Database

- MySQL

## AI / External Services

The project integrates external services for capabilities such as:

- AI processing
- Speech-to-text
- Email delivery
- Google authentication
- Translation-related services where enabled

## Blockchain

- Blockchain-based document integrity verification
- Cryptographic document hashing

## Deployment

| Component | Platform |
|-----------|----------|
| Frontend | Vercel |
| Backend | Render |
| Database | Railway |
| Domain | `nyayaai.online` |

---

# 🧩 System Architecture

High-level architecture:

```text
                    ┌──────────────────────┐
                    │      User / Admin    │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   React Frontend     │
                    │  Vite + TypeScript   │
                    └──────────┬───────────┘
                               │
                               │ HTTPS / API
                               ▼
                    ┌──────────────────────┐
                    │   Express Backend    │
                    │      Node.js         │
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
       ┌────────────┐   ┌─────────────┐  ┌──────────────┐
       │   MySQL    │   │ AI / APIs   │  │ Blockchain   │
       │  Database  │   │  Services   │  │  Integrity   │
       └────────────┘   └─────────────┘  └──────────────┘
```

---

# 🔒 Security Architecture

The application follows a layered security approach.

```text
                 HTTPS
                   │
                   ▼
          ┌─────────────────┐
          │ Security Headers│
          └────────┬────────┘
                   │
                   ▼
          ┌─────────────────┐
          │ Rate Limiting   │
          └────────┬────────┘
                   │
                   ▼
          ┌─────────────────┐
          │ Authentication  │
          └────────┬────────┘
                   │
                   ▼
          ┌─────────────────┐
          │ Authorization   │
          └────────┬────────┘
                   │
                   ▼
          ┌─────────────────┐
          │ CSRF Protection │
          └────────┬────────┘
                   │
                   ▼
          ┌─────────────────┐
          │ Resource Access │
          └────────┬────────┘
                   │
                   ▼
          ┌─────────────────┐
          │   Audit Logs    │
          └─────────────────┘
```

---

# 📂 Project Structure

The project follows a full-stack structure similar to:

```text
legal-ai/
│
├── backend/
│   ├── database/
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   └── server.js
│
├── src/
│   ├── components/
│   ├── context/
│   ├── lib/
│   ├── pages/
│   │   ├── admin/
│   │   ├── advocate/
│   │   └── ...
│   └── ...
│
├── public/
│
├── package.json
├── vite.config.ts
├── tsconfig.json
├── README.md
└── .gitignore
```

---

# 🔌 API Structure

The backend provides REST API endpoints for the major application modules.

Examples include:

```text
/api/auth
/api/admin
/api/documents
/api/cases
/api/meetings
/api/appointments
/api/advocates
```

Protected APIs require appropriate authentication and authorization.

---

# 👨‍💼 Admin API

Administrative APIs are protected by administrator authorization.

Examples include:

```text
GET  /api/admin/me

GET  /api/admin/users
GET  /api/admin/advocates

GET  /api/admin/users/:userId
GET  /api/admin/users/:userId/documents
GET  /api/admin/users/:userId/audit

GET  /api/admin/advocates/:advocateId
GET  /api/admin/advocates/:advocateId/documents
GET  /api/admin/advocates/:advocateId/consultations
GET  /api/admin/advocates/:advocateId/audit
```

Administrator authentication is required for protected administrator endpoints.

---

# ⛓️ Blockchain Verification API

Document integrity verification is exposed through the backend.

Example endpoint:

```text
POST /api/documents/:id/blockchain/verify
```

Possible responses include:

```text
verified
tampered
not_registered
blockchain_unavailable
```

---

# 🗄️ Database

Nyaya AI uses **MySQL** for persistent application data.

The database contains tables supporting areas such as:

- Users
- Documents
- Cases
- Meetings
- Appointments
- Advocate information
- Authentication/session data
- Document security
- Audit logs
- Other application modules

The `users` table supports the application roles:

```text
citizen
lawyer
admin
```

The audit system uses a dedicated:

```text
audit_logs
```

table.

---

# ⚙️ Environment Variables

The application uses environment variables for configuration and sensitive credentials.

Typical frontend configuration includes:

```env
VITE_API_URL=
```

Backend configuration may include:

```env
DB_HOST=
DB_USER=
DB_PASSWORD=
DB_NAME=

JWT_SECRET=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

RESEND_API_KEY=

GROQ_API_KEY=

SARVAM_API_KEY=
```

Actual environment values should **never be committed to Git**.

Use `.env` files locally and configure secrets through the deployment platform.

---

# 💻 Development

## Install Dependencies

```bash
npm install
```

If dependency resolution requires it:

```bash
npm install --legacy-peer-deps
```

## Start Frontend Development Server

```bash
npm run dev
```

## Build Frontend

```bash
npm run build
```

---

# 🚀 Deployment

The current deployment architecture separates the frontend, backend, and database.

```text
GitHub
   │
   ├──────────────► Vercel
   │                 │
   │                 ▼
   │             Frontend
   │
   └──────────────► Render
                     │
                     ▼
                  Backend
                     │
                     ▼
                  Railway
                     │
                     ▼
                   MySQL
```

Environment variables must be configured separately on the deployment platforms.

---

# 🌐 Production

Production domain:

```text
https://nyayaai.online
```

Administrative login:

```text
https://nyayaai.online/adminlogin
```

Administrative dashboard:

```text
https://nyayaai.online/admin
```

---

# 🔐 Security Principles

Nyaya AI follows several security principles:

1. Do not store plaintext passwords.
2. Do not expose authentication secrets to frontend code.
3. Use secure authentication cookies.
4. Validate authenticated users on protected backend routes.
5. Apply role-based authorization.
6. Protect authentication endpoints with rate limiting.
7. Use CSRF protection for cookie-based authentication.
8. Use security headers.
9. Keep database credentials in environment variables.
10. Do not commit `.env` files or API keys.
11. Record important document activities through audit logging.
12. Use cryptographic hashing for document integrity verification.
13. Separate administrative functionality from normal user workflows.
14. Avoid exposing sensitive credential information through administrator APIs.

---

# 🧪 Testing

Automated testing is part of the project's ongoing engineering improvements.

Areas intended for automated testing include:

- Authentication
- Authorization
- Admin access control
- Document ownership
- Document integrity verification
- Audit logging
- API security
- Role-based access control

Security-sensitive backend functionality should be validated through appropriate automated and manual tests before production use.

---

# 📊 Current Development Priorities

The project continues to improve its engineering quality in areas including:

- Automated security and API tests
- Repository cleanup
- Production logging
- Documentation
- Component maintainability
- Role-based access control
- Auditability
- Security hardening

These improvements are intended to make the platform easier to maintain, test, and scale.

---

# 🧠 Design Philosophy

Nyaya AI is designed around the principle of combining:

```text
Artificial Intelligence
        +
Secure Software Engineering
        +
Legal Workflows
        +
Document Integrity
        +
Blockchain Technology
        +
Administrative Oversight
```

The objective is to provide a technology platform that can support legal information workflows while maintaining strong attention to security, privacy, and document integrity.

---

# ⚠️ Legal & AI Disclaimer

Nyaya AI is a technology platform intended to provide AI-assisted legal information and digital legal workflows.

AI-generated responses may contain errors or incomplete information and should not be treated as a substitute for advice from a qualified legal professional.

Users should verify important legal information and consult an appropriately qualified advocate or legal professional where necessary.

Blockchain-based document verification provides an integrity mechanism and does not, by itself, establish legal validity, ownership, authorship, or the validity of a digital signature.

---

# 🤝 Contributing

Contributions and improvements should follow the project's existing architecture and security requirements.

Before submitting changes:

1. Review the existing implementation.
2. Avoid exposing secrets or credentials.
3. Preserve authentication and authorization controls.
4. Test affected functionality.
5. Keep changes focused.
6. Update documentation when necessary.

---

# 📜 License

License information for this project will be added according to the project's final distribution and ownership requirements.

---

# 👨‍💻 Project

**Nyaya AI**

AI-powered legal assistance and secure legal technology platform.

Built with:

```text
React
TypeScript
Vite
Tailwind CSS
Node.js
Express
MySQL
Artificial Intelligence
Blockchain
Cybersecurity
```

---

## ⭐ Project Focus

Nyaya AI focuses on building a secure and practical legal-tech ecosystem combining:

- AI-assisted legal information
- Citizen–advocate connectivity
- Case management
- Secure document management
- Document integrity verification
- Blockchain-based integrity records
- Audit trails
- Authentication and authorization
- Administrative oversight
- Cybersecurity-focused architecture
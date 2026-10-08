# ⚙️ UWU Smart Procurement System — Backend API

RESTful API backend for the UWU AI-Based Smart Procurement System, built with **Node.js**, **Express 5**, and **MongoDB (Mongoose)**.

---

## 🚀 Features

- **Multi-Tenant Architecture**: Tenant isolation with default `uwu-main` workspace.
- **Role-Based Access Control (RBAC)**: Fine-grained permission model covering 15 roles.
- **Workflow & Requisition Engine**: 45-step state machine with automated transitions and SLA alerts.
- **Tender & Bid Evaluation**: Digital bid encryption, bid box opening workflows, and automated TEC evaluation scoring.
- **AI & ML Subsystems**:
  - `ml-random-forest` market anomaly detection
  - `natural` NLP specification matching
  - Gemini AI and Flowise RAG assistant integrations
- **Audit Logging**: Immutable, tamper-evident action logging for institutional compliance.

---

## 🛠️ Tech Stack

- **Runtime**: Node.js v18+
- **Framework**: Express.js 5
- **Database**: MongoDB with Mongoose v9
- **Validation**: Zod
- **Authentication**: JWT (Access & Refresh Tokens), bcryptjs
- **File Ingestion**: Multer, `pdf-parse`, Cloudinary
- **Testing**: Jest, Supertest

---

## ⚙️ Environment Configuration

Copy `.env.example` to `.env` or configure at workspace root:

```bash
cp .env.example .env
```

Refer to `.env.example` for all configurable variables (MongoDB URI, JWT secrets, Redis URL, Gemini API keys, etc.).

---

## 🏃 Scripts

From this directory (`apps/api`):

```bash
# Start development server with Nodemon (http://localhost:5000)
npm run dev

# Start production server
npm start

# Run database seeder (seeds roles and demo accounts)
npm run seed

# Run automated tests
npm test
```

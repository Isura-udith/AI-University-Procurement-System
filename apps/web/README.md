# 🌐 UWU Smart Procurement System — Web Frontend

Frontend Single Page Application (SPA) for the UWU AI-Based Smart Procurement System, built with **React 19**, **Vite**, **Tailwind CSS v4**, and **Redux Toolkit**.

---

## 🚀 Features

- **Role-Based Workspaces**: Tailored dashboards and views for 15 RBAC roles (Super Admin, Bursar, VC, Dean, Supplies Division, Vendors, Auditors, etc.).
- **Strategic Planning & Requisitions**: Master Procurement Plan (MPP), Departmental Annual Procurement Plan (DAPP), and 45-stage procurement lifecycle tracking.
- **Tender Management & E-Bidding**: Digital bid submission portal, tender creation wizard, and live Bid Opening ceremony timeline.
- **AI Intelligence Hub**: Real-time market risk analysis, comparative bid evaluation, and AI explainability dashboards.
- **Document & Contract Management**: Digital contract generation, milestone tracking, and invoicing.

---

## 🛠️ Tech Stack

- **Framework**: React 19 (`react`, `react-dom`)
- **Build Tool**: Vite 8
- **State Management**: Redux Toolkit & React-Redux
- **Routing**: React Router v7
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`)
- **Forms & Validation**: React Hook Form, Yup
- **Charts & Data Visualization**: Recharts
- **Icons**: React Icons (`react-icons`)
- **HTTP Client**: Axios with token refresh interceptors

---

## ⚙️ Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Available variables:

```env
# Backend API Base URL
VITE_API_URL=http://localhost:5000/api/v1

# Flowise AI Chatbot Integration (Optional)
VITE_FLOWISE_CHATFLOW_ID=your_flowise_chatflow_id_here
VITE_FLOWISE_API_KEY=your_flowise_api_key_here
```

---

## 🏃 Scripts

From this directory (`apps/web`):

```bash
# Run local dev server with HMR (http://localhost:5173)
npm run dev

# Build production bundle to dist/
npm run build

# Run ESLint checks
npm run lint

# Preview production build locally
npm run preview
```

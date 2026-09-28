# Offline-First Data Synchronization System

A full-stack **offline-first data synchronization platform** that allows users to create and modify records even when the application is offline. Once the connection is restored, locally queued operations are automatically synchronized with the backend while handling duplicate requests, concurrent updates, and data conflicts.

The system uses **React + TypeScript** on the frontend and **FastAPI + MySQL + Redis** on the backend.

---

# 📖 Overview

The **Offline-First Data Synchronization System** is designed for applications where users need to continue working even when network connectivity is unavailable.

---

# ✨ Key Features

## 🔐 Authentication

- User registration
- User login
- JWT-based authentication
- Current-user information
- Secure password handling
- Token-based API authorization

## 👥 Role-Based Access Control

### User

Users can:

- View records
- Create records
- Update records
- Delete records
- Synchronize records
- View synchronization history
- View conflicts
- Manage their profile

### Admin

Administrators can additionally:

- View audit logs
- Inspect audit-log details
- Monitor system activity

---

# 🛠️ Technology Stack

## Backend

 Python 3.12 
 FastAPI 
 SQLAlchemy
 Alembic 
 Pydantic 
 JWT 
 AsyncMy 
 Redis
 Uvicorn 

## Frontend

React
TypeScript 
Vite 
Material UI 
Axios 
React Router 
IndexedDB 


---

# 🚀 Installation and Setup

## 1. Clone the Repository

```bash
git clone <repository-url>
cd Offline_Data_Sync_System
```

## 2. Start Docker Services

```bash
docker compose up -d
```

Check container status:

```bash
docker compose ps
```

## 3. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will normally be available at:

```text
http://localhost:5173
```

---

# 🔧 Environment Configuration

Create a `.env` file in the project root.


# 🌐 API Documentation

The FastAPI backend runs on:

```text
http://localhost:8000
```

Swagger UI:

```text
http://localhost:8000/docs
```

---


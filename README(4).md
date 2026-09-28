# Offline-First Data Synchronization System

A full-stack **offline-first data synchronization platform** that allows users to create and modify records even when the application is offline. Once the connection is restored, locally queued operations are automatically synchronized with the backend while handling duplicate requests, concurrent updates, and data conflicts.

The system uses **React + TypeScript** on the frontend and **FastAPI + MySQL + Redis** on the backend.

---

## 📌 Table of Contents

- [Overview](#-overview)
- [Objectives](#-objectives)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Offline Synchronization](#-offline-synchronization)
- [Conflict Resolution](#-conflict-resolution)
- [Authentication and Authorization](#-authentication-and-authorization)
- [Database Design](#-database-design)
- [Prerequisites](#-prerequisites)
- [Installation and Setup](#-installation-and-setup)
- [Environment Configuration](#-environment-configuration)
- [Database Migration](#-database-migration)
- [API Documentation](#-api-documentation)
- [Frontend Pages](#-frontend-pages)
- [Testing](#-testing)
- [Offline Testing](#-offline-testing)
- [Conflict Testing](#-conflict-testing)
- [MySQL Verification](#-mysql-verification)
- [Useful Docker Commands](#-useful-docker-commands)
- [Troubleshooting](#-troubleshooting)
- [Security Considerations](#-security-considerations)
- [Future Enhancements](#-future-enhancements)
- [Project Validation Checklist](#-project-validation-checklist)
- [Conclusion](#-conclusion)

---

# 📖 Overview

The **Offline-First Data Synchronization System** is designed for applications where users need to continue working even when network connectivity is unavailable.

Instead of blocking the user when the backend cannot be reached, the application stores changes locally using **IndexedDB**.

When connectivity is restored:

1. Pending operations are detected.
2. Operations are read from IndexedDB.
3. The frontend sends them to the synchronization API.
4. The backend validates and processes each operation.
5. MySQL is updated inside a transaction.
6. Conflicts are detected using record versions.
7. Conflicts are recorded for auditing.
8. Successfully synchronized operations are removed from the local queue.

---

# 🎯 Objectives

- Support application usage while offline.
- Store offline changes locally.
- Automatically synchronize changes when connectivity returns.
- Prevent duplicate synchronization requests.
- Detect concurrent updates.
- Handle synchronization conflicts.
- Maintain record versioning.
- Provide synchronization history.
- Provide conflict tracking.
- Maintain an audit trail.
- Implement authentication and role-based authorization.
- Provide a dashboard for synchronization statistics.
- Containerize the backend, MySQL, and Redis using Docker.

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

## 📱 Offline-First Functionality

The frontend uses **IndexedDB** to store:

- Local records
- Pending synchronization operations

Users can continue creating and modifying records without an active internet connection.

---

# 🏗️ System Architecture

```text
                    ┌──────────────────────┐
                    │      React App       │
                    └──────────┬───────────┘
                               │
                     Online / Offline
                               │
                 ┌─────────────┴─────────────┐
                 │                           │
              ONLINE                      OFFLINE
                 │                           │
                 ▼                           ▼
        ┌─────────────────┐        ┌─────────────────┐
        │    FastAPI      │        │    IndexedDB    │
        │     Backend     │        │ Local Records   │
        └────────┬────────┘        │  Sync Queue     │
                 │                 └────────┬────────┘
                 │                          │
                 │                     Connection
                 │                      Restored
                 │                          │
                 │                          ▼
                 │                 ┌─────────────────┐
                 │                 │ /api/sync/batch │
                 │                 └────────┬────────┘
                 │                          │
                 └──────────────┬───────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │     SyncService  │
                       └────────┬─────────┘
                                │
                    ┌───────────┼───────────┐
                    │           │           │
                    ▼           ▼           ▼
                 MySQL       Redis       Conflicts
                    │           │           │
                    └───────────┼───────────┘
                                │
                                ▼
                         Sync History
```

---

# 🛠️ Technology Stack

## Backend

| Technology | Purpose |
|---|---|
| Python 3.12 | Backend programming language |
| FastAPI | REST API framework |
| SQLAlchemy | ORM |
| Alembic | Database migrations |
| Pydantic | Data validation |
| JWT | Authentication |
| AsyncMy | Async MySQL driver |
| Redis | Synchronization coordination |
| Uvicorn | ASGI server |

## Frontend

| Technology | Purpose |
|---|---|
| React | UI framework |
| TypeScript | Type-safe development |
| Vite | Frontend build tool |
| Material UI | UI components |
| Axios | HTTP requests |
| React Router | Client-side routing |
| IndexedDB | Offline storage |

## Database and Infrastructure

| Technology | Purpose |
|---|---|
| MySQL 8.0 | Primary database |
| Redis 7 | Synchronization coordination |
| Docker | Containerization |
| Docker Compose | Multi-container orchestration |

---

# 📂 Project Structure

```text
Offline_Data_Sync_System/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes/
│   │   │       ├── auth.py
│   │   │       ├── users.py
│   │   │       ├── records.py
│   │   │       ├── sync.py
│   │   │       ├── conflicts.py
│   │   │       ├── dashboard.py
│   │   │       └── audit_logs.py
│   │   │
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   └── security.py
│   │   │
│   │   ├── db/
│   │   │   ├── database.py
│   │   │   └── models/
│   │   │
│   │   ├── schemas/
│   │   ├── services/
│   │   │   └── sync_service.py
│   │   └── main.py
│   │
│   ├── alembic/
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── types/
│   │   ├── utils/
│   │   ├── App.tsx
│   │   └── main.tsx
│   │
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── docker-compose.yml
├── .env
├── .env.example
└── README.md
```

---

# 🔄 Offline Synchronization

Each synchronization operation contains information such as:

```json
{
  "operation_id": "unique-operation-uuid",
  "record_id": "record-uuid",
  "operation_type": "UPDATE",
  "base_version": 1,
  "payload": {
    "title": "Updated Record",
    "description": "Updated description",
    "status": "IN_PROGRESS"
  }
}
```

| Field | Description |
|---|---|
| `operation_id` | Unique identifier for the synchronization operation |
| `record_id` | Identifier of the record being synchronized |
| `operation_type` | CREATE, UPDATE, or DELETE |
| `base_version` | Record version known by the client |
| `payload` | Data associated with the operation |

## Idempotency

The synchronization system uses a unique `operation_id` to prevent the same operation from being processed multiple times.

```text
Client
   │
   │ operation_id = ABC123
   ▼
Backend
   │
   ├── First request → Process
   │
   └── Duplicate request → Return existing result
```

## Redis Synchronization Lock

Redis is used for synchronization coordination.

A record-specific lock is created using a key similar to:

```text
sync:record:{record_id}
```

This helps prevent concurrent synchronization operations from modifying the same record at the same time.

---

# 🔀 Conflict Resolution

The project uses **optimistic concurrency control**.

Every record contains a `version` value.

Example:

```text
Server Record
Version = 1
```

The client reads the record:

```text
Client Version = 1
```

The client modifies the record while offline.

Meanwhile, another update changes the server record:

```text
Server Version = 2
```

When the offline client reconnects:

```text
Client Base Version = 1
Server Current Version = 2
```

The versions do not match.

Therefore:

```text
CONFLICT DETECTED
```

The configured conflict strategy is:

```text
SERVER_WINS
```

The conflict is recorded with:

- Client version
- Server version
- Client payload
- Server payload
- Resolution
- Conflict status

Example:

```text
Client Version  : 1
Server Version  : 2
Resolution      : SERVER_WINS
Status          : RESOLVED
```

---

# 🔒 Authentication and Authorization

The application uses JWT-based authentication.

Protected APIs require a valid access token.

Role-based access is used to restrict administrator-only functionality such as audit logs.

---

# 🗃️ Database Design

The project uses **MySQL 8.0**.

Main tables include:

```text
users
records
local_sync_operations
sync_history
conflicts
audit_logs
```

## Users

Stores application users and authentication information.

```text
id
username
email
password
role
is_active
```

## Records

Stores business records.

```text
id
title
description
status
version
created_by
created_at
updated_at
deleted_at
```

The `version` column is used for optimistic concurrency control.

## Local Sync Operations

Stores synchronization operations associated with local/offline processing.

Supported operations:

```text
CREATE
UPDATE
DELETE
```

## Sync History

Stores synchronization results.

Possible statuses:

```text
SUCCESS
CONFLICT
FAILED
```

## Conflicts

Stores synchronization conflicts including:

```text
record_id
client_version
server_version
client_payload
server_payload
resolution
status
created_at
```

## Audit Logs

Stores important application activities:

```text
user_id
action
entity
entity_id
details
created_at
```

---

# ⚙️ Prerequisites

Make sure the following are installed:

- Python 3.12+
- Node.js
- npm
- Docker Desktop
- MySQL Workbench
- Git

Docker Desktop should be running before starting the backend services.

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

Expected services:

```text
offline_sync_backend
offline_sync_mysql
offline_sync_redis
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

Example:

```env
APP_NAME=Offline-First Data Synchronization System
APP_ENV=development
DEBUG=true

BACKEND_PORT=8000

DATABASE_URL=mysql+asyncmy://offline_user:YOUR_PASSWORD@localhost:3307/offline_db

REDIS_PORT=6380
REDIS_URL=redis://localhost:6380/0

JWT_SECRET_KEY=change_this_to_a_long_random_secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

CORS_ORIGINS=http://localhost:5173

MYSQL_ROOT_PASSWORD=root_password_change_me
MYSQL_DATABASE=offline_db
MYSQL_USER=offline_user
MYSQL_PASSWORD=YOUR_PASSWORD
MYSQL_PORT=3307
```

> Never commit real passwords, JWT secrets, or other sensitive credentials to Git.

---

# 🔄 Database Migration

Run Alembic migrations from the backend container:

```bash
docker compose exec backend alembic upgrade head
```

Check the current migration:

```bash
docker compose exec backend alembic current
```

---

# 🌐 API Documentation

The FastAPI backend runs on:

```text
http://localhost:8000
```

Swagger UI:

```text
http://localhost:8000/docs
```

OpenAPI specification:

```text
http://localhost:8000/openapi.json
```

---

# 📡 API Endpoints

## Authentication

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
```

## Users / Profile

```text
GET /api/users/me
PUT /api/users/me
```

## Records

```text
GET    /api/records
POST   /api/records
GET    /api/records/{record_id}
PUT    /api/records/{record_id}
DELETE /api/records/{record_id}
```

Records support:

- Search
- Filtering
- Pagination
- Sorting
- Versioning
- Soft deletion

## Synchronization

```text
POST /api/sync/batch
GET  /api/sync/history
GET  /api/sync/conflicts
```

## Conflicts

```text
GET /api/sync/conflicts
GET /api/sync/conflicts/{conflict_id}
```

## Dashboard

```text
GET /api/dashboard/summary
```

## Audit Logs

```text
GET /api/audit-logs
GET /api/audit-logs/{audit_log_id}
```

Audit-log endpoints are restricted to administrators.

Supported filters include:

```text
page
page_size
action
entity
sort_by
sort_order
```

---

# 📊 Frontend Pages

| Page | Purpose |
|---|---|
| Login | User authentication |
| Register | New user registration |
| Dashboard | Application and synchronization statistics |
| Records | Create, update, delete, search, filter, sort and paginate records |
| Sync History | View synchronization operations |
| Conflicts | View synchronization conflicts and resolutions |
| Profile | View and update user profile |
| Audit Logs | Admin-only audit activity |

---

# 🧪 Testing

The application can be tested using:

- Swagger UI
- Frontend UI
- MySQL Workbench
- Browser offline mode
- Docker logs

## Basic Testing Flow

### 1. Register

Open:

```text
http://localhost:5173/register
```

Create a user.

### 2. Login

Login using the registered credentials.

### 3. Create a Record

Navigate to **Records** and create a business-related record.

Example:

```text
Title:
ABC Traders - Payment Follow-up

Description:
Customer requested a call tomorrow regarding pending invoice payment.

Status:
PENDING
```

### 4. Verify the Record

Confirm that the record appears in the Records page and verify the corresponding row in MySQL.

---

# 📴 Offline Testing

1. Open the application.
2. Navigate to **Records**.
3. Open Developer Tools using `F12`.
4. Open the **Network** tab.
5. Enable browser offline mode.
6. Create or update a record.
7. Verify that the operation remains pending.
8. Turn the network back online.
9. Allow automatic synchronization to complete.
10. Open **Sync History**.
11. Verify that the operation shows `SUCCESS`.

---

# ⚔️ Conflict Testing

A conflict can be created by modifying the same record from two different versions.

## Step 1 — Initial Record

Create:

```text
XYZ Enterprises - Client Follow-up
```

Example:

```text
Description:
Client requested a quotation for annual software subscription.

Status:
PENDING
```

Assume:

```text
Version = 1
```

## Step 2 — Go Offline

Enable browser offline mode.

Update:

```text
Status:
IN_PROGRESS
```

Description:

```text
Client confirmed that the quotation can be discussed tomorrow.
```

The operation is stored locally.

## Step 3 — Change the Server Record

While the client is offline, update the same record from another active session/API request:

```text
Status:
COMPLETED
```

Description:

```text
Client accepted the quotation and confirmed the order.
```

The server version becomes:

```text
Version = 2
```

## Step 4 — Reconnect

Turn the browser back online.

The frontend sends:

```text
base_version = 1
```

But the server currently has:

```text
version = 2
```

Therefore:

```text
CONFLICT
```

## Step 5 — Conflict Resolution

The configured strategy is:

```text
SERVER_WINS
```

The conflict is stored as:

```text
Resolution: SERVER_WINS
Status: RESOLVED
```

The result can be viewed from:

- Conflicts
- Sync History
- MySQL Workbench

---

# 🗄️ MySQL Verification

Connect to MySQL Workbench:

```text
Host: 127.0.0.1
Port: 3307
Database: offline_db
Username: offline_user
```

## Check Tables

```sql
SHOW TABLES;
```

## Check Users

```sql
SELECT
    id,
    username,
    email,
    role,
    is_active
FROM users;
```

## Check Records

```sql
SELECT
    id,
    title,
    status,
    version,
    created_by,
    created_at,
    updated_at
FROM records
WHERE deleted_at IS NULL
ORDER BY updated_at DESC;
```

## Check Sync History

```sql
SELECT
    id,
    operation_id,
    record_id,
    operation_type,
    status,
    client_version,
    server_version,
    created_at
FROM sync_history
ORDER BY created_at DESC;
```

## Check Conflicts

```sql
SELECT
    id,
    record_id,
    client_version,
    server_version,
    resolution,
    status,
    created_at
FROM conflicts
ORDER BY created_at DESC;
```

## Check Audit Logs

```sql
SELECT
    id,
    user_id,
    action,
    entity,
    entity_id,
    created_at
FROM audit_logs
ORDER BY created_at DESC;
```

---

# 🐳 Useful Docker Commands

Start services:

```bash
docker compose up -d
```

Stop services:

```bash
docker compose down
```

Restart services:

```bash
docker compose restart
```

View running containers:

```bash
docker compose ps
```

View backend logs:

```bash
docker compose logs backend
```

Follow backend logs:

```bash
docker compose logs -f backend
```

View MySQL logs:

```bash
docker compose logs mysql
```

View Redis logs:

```bash
docker compose logs redis
```

Rebuild containers:

```bash
docker compose up -d --build
```

---

# 🐞 Troubleshooting

## Backend is not accessible

Check:

```bash
docker compose ps
```

Then inspect:

```bash
docker compose logs backend
```

## MySQL connection problem

Verify:

```text
Host: 127.0.0.1
Port: 3307
```

Also check that the MySQL container is healthy.

## Redis connection problem

Check:

```bash
docker compose logs redis
```

Verify the local Redis port:

```text
6380
```

## Frontend cannot connect to backend

Verify:

```text
http://localhost:8000/docs
```

Also verify:

```env
CORS_ORIGINS=http://localhost:5173
```

## Dashboard returns 401

A `401 Unauthorized` response generally means the authentication token is missing or expired.

Log out and log in again, then refresh the dashboard.

## Sync is not happening

Check:

1. Browser network status.
2. IndexedDB pending operations.
3. Authentication token.
4. Backend container.
5. Redis container.
6. `/api/sync/batch` request.
7. Sync History page.

Backend logs:

```bash
docker compose logs -f backend
```

---

# 🔐 Security Considerations

The application implements:

- JWT authentication
- Password validation
- Role-based authorization
- Protected API endpoints
- User ownership checks
- Admin-only audit-log access
- Environment-based configuration
- Transaction-based synchronization
- Optimistic concurrency control
- Idempotent synchronization operations

For production deployments, additionally consider:

- HTTPS
- Strong randomly generated JWT secrets
- Secret management
- Restricted database access
- Restricted Redis access
- Production CORS configuration
- Rate limiting
- Secure token storage

---

# 🚀 Future Enhancements

Possible future improvements include:

- Manual conflict resolution
- Additional conflict strategies
- Field-level conflict resolution
- Background sync workers
- Push notifications
- WebSocket-based synchronization status
- Advanced audit-log analytics
- Export synchronization history
- Retry policies for failed operations
- Better offline cache management
- Service Worker support
- Progressive Web App support
- Automated integration testing
- CI/CD pipeline
- Production monitoring

---

# 📸 Recommended Screenshots

## Swagger

```text
01-swagger-register.png
02-swagger-login.png
03-swagger-current-user.png
04-swagger-create-record.png
05-swagger-get-records.png
06-swagger-record-search.png
07-swagger-record-sorting.png
08-swagger-update-record.png
09-swagger-sync-success.png
10-swagger-sync-history.png
11-swagger-conflicts-empty.png
12-swagger-dashboard.png
13-swagger-profile.png
14-swagger-audit-logs.png
15-swagger-audit-detail.png
```

## MySQL

```text
01-mysql-database-connection.png
02-mysql-tables.png
03-mysql-users.png
04-mysql-records.png
05-mysql-sync-history.png
06-mysql-conflict-resolution.png
07-mysql-audit-logs.png
```

## Frontend

```text
login.png
register.png
dashboard.png
records.png
offline-record.png
sync-history.png
conflicts.png
profile.png
audit-logs.png
```

---

# 📋 Project Validation Checklist

## Backend

- [x] FastAPI application
- [x] JWT authentication
- [x] Role-based authorization
- [x] SQLAlchemy ORM
- [x] Alembic migrations
- [x] MySQL integration
- [x] Redis integration
- [x] Records CRUD
- [x] Search
- [x] Filtering
- [x] Pagination
- [x] Sorting
- [x] Synchronization API
- [x] Idempotency
- [x] Optimistic concurrency
- [x] Conflict detection
- [x] Conflict resolution
- [x] Sync history
- [x] Audit logs
- [x] Dashboard

## Frontend

- [x] React
- [x] TypeScript
- [x] Vite
- [x] Material UI
- [x] Axios
- [x] React Router
- [x] IndexedDB
- [x] Online/offline detection
- [x] Local synchronization queue
- [x] Automatic synchronization
- [x] Records management
- [x] Dashboard
- [x] Sync history
- [x] Conflict management
- [x] Profile management
- [x] Admin audit logs

## Infrastructure

- [x] Docker
- [x] Docker Compose
- [x] MySQL container
- [x] Redis container
- [x] Backend container
- [x] Environment configuration
- [x] Health checks

---

# 🏁 Conclusion

The **Offline-First Data Synchronization System** demonstrates how a modern full-stack application can continue operating when network connectivity is unavailable while maintaining consistency when connectivity is restored.

The project combines:

```text
React
   +
IndexedDB
   +
FastAPI
   +
SQLAlchemy
   +
MySQL
   +
Redis
   +
JWT
   +
Docker
```

The synchronization mechanism provides:

```text
Offline Data Storage
        ↓
Local Sync Queue
        ↓
Automatic Synchronization
        ↓
Idempotency
        ↓
Optimistic Concurrency
        ↓
Conflict Detection
        ↓
SERVER_WINS Resolution
        ↓
Sync History + Audit Logs
```

This architecture provides a strong foundation for applications that require reliable offline functionality, synchronization, and data consistency.

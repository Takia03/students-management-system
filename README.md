# Student Management System

A full-stack student management application built with a NestJS backend and a Next.js frontend. The project supports user authentication, student CRUD operations, search and pagination, Excel import, profile management, and password reset flows.

## Overview

This repository contains two main apps:

- Backend: NestJS API for student and user management
- Frontend: Next.js + React interface for the application

The system is designed for managing student records in a modern web application with secure authentication and administrative workflows.

## Tech Stack

- Backend: NestJS, TypeScript, PostgreSQL, JWT, bcrypt, Nodemailer
- Frontend: Next.js, React, MUI
- Database: PostgreSQL
- API: REST

## Features

- Secure login and registration
- JWT-based authentication and authorization
- Student creation, editing, deletion, and viewing
- Search and filtering with pagination
- Excel import and preview workflow for bulk student uploads
- Email-based password reset flow
- User profile management and gallery image support
- CORS-enabled API for local frontend integration

## Project Structure

```text
students-management-system/
├── backend/                  # NestJS API
│   ├── src/                  # Application source code
│   ├── sql/migrations/      # PostgreSQL migration scripts
│   ├── test/                 # End-to-end tests
│   ├── package.json          # Backend scripts and dependencies
│   └── README.md             # Backend-specific notes
├── frontend/                 # Next.js application
│   ├── src/                  # Frontend source code
│   ├── public/               # Static assets
│   ├── package.json          # Frontend scripts and dependencies
│   └── README.md            # Frontend-specific notes
├── .gitignore
└── README.md                 # Project overview
```

## Requirements

Before running the project, make sure you have:

- Node.js 20+ recommended
- npm
- PostgreSQL running locally or in a remote environment
- An SMTP provider or mail test setup for password reset and welcome emails

## Environment Setup

Create a `.env` file inside the `backend` folder and add the required variables:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/students_db
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN_SECONDS=3600
PORT=3000

SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email-user
SMTP_PASS=your-email-password
SMTP_FROM=no-reply@example.com
APP_LOGIN_URL=http://localhost:5173/login
FRONTEND_RESET_URL=http://localhost:5173
```

The application expects PostgreSQL to be available and the database schema to be initialized via the SQL migrations in `backend/sql/migrations`.

## Running the Project

### 1) Install backend dependencies

```bash
cd backend
npm install
```

### 2) Start the backend

```bash
cd backend
npm run start:dev
```

The API will run on:

- http://localhost:3000

### 3) Install frontend dependencies

```bash
cd frontend
npm install
```

### 4) Start the frontend

```bash
cd frontend
npm run dev
```

The app will be available at:

- http://localhost:5173

## Useful Backend Scripts

```bash
cd backend
npm run build
npm run start
npm run start:dev
npm run test
npm run test:e2e
```

## Useful Frontend Scripts

```bash
cd frontend
npm run dev
npm run build
npm run lint
npm run start
```

## Notes

- The backend CORS configuration allows requests from `http://localhost:5173`.
- Student import routes support Excel uploads and preview before confirmation.
- Email features depend on valid SMTP configuration and login/reset URLs.
- The backend uses migration SQL files to manage database changes over time.

## Contributing

To contribute to the project:

1. Create a feature branch.
2. Make the required changes.
3. Run the relevant test and build checks.
4. Open a pull request with a clear summary of the work done.

## License

This project does not currently declare a repository-wide license in the root README. Please check the package or project conventions in your environment before publishing or redistributing it externally.

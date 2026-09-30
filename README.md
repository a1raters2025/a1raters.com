# A1 Raters

A1 Raters is a web platform for managing rating and evaluation work. Raters complete tasks and submit reports, clients review reporting data, and administrators manage users, tasks, invoices, and training content.

## Contents

- [Features](#features)
- [Roles and account approval](#roles-and-account-approval)
- [Technology](#technology)
- [Repository layout](#repository-layout)
- [Requirements](#requirements)
- [Local setup](#local-setup)
- [Configuration](#configuration)
- [Run the application](#run-the-application)
- [API overview](#api-overview)
- [Build and deployment](#build-and-deployment)
- [Troubleshooting](#troubleshooting)

## Features

- Rater task lists, task evaluation, reports, report history, training, and leaderboard views.
- Client dashboard and report summaries, with client-only API access.
- Admin workflows for user approval, task management, data import, training content, and settings.
- User profiles, notifications, invoices, and test history.
- Email/password authentication, optional Google sign-in, JWT access tokens, and refresh-token cookies.
- Role-protected backend routes and account approval for new Rater and Client registrations.

## Roles and account approval

The platform has three account roles:

| Role | Access |
| --- | --- |
| Rater (`user`) | Rating tasks, reports, training, profile, and related rater tools. |
| Client (`client`) | Client dashboard and client reporting endpoints. |
| Administrator (`admin`) | User, task, report, invoice, and platform management. |

New Rater and Client registrations are saved as pending review records. They cannot sign in or access protected APIs until an administrator approves them from **Admin > User Management**. New Google registrations follow the same approval process. Email verification, when configured, is separate from administrator approval. Existing database users and administrator accounts default to approved.

Administrator registration is protected by `ADMIN_REGISTRATION_PASSCODE`. Keep that value private and only provide it to trusted administrators.

## Technology

- Frontend: React 19, TypeScript, Vite 8, Tailwind CSS 4, Framer Motion, and Lucide icons.
- Backend: Node.js, Express 5, MongoDB, and Mongoose.
- Authentication: JWT access and refresh tokens, bcrypt password hashing, and optional Google Identity Services.
- Integrations: Nodemailer for verification email and Cloudinary for uploaded files.

## Repository layout

```text
backend/
	config/         Email and Cloudinary configuration
	controllers/    API request handlers
	middlewares/    Authentication, role checks, and upload handling
	models/         Mongoose schemas
	routes/         Express API routes
	utils/          Database, JWT, and socket helpers
	server.js       Express and Socket.IO entry point
frontend/
	public/         Static assets
	src/components/ Application pages and UI components
	src/services/   API and authentication clients
	src/design/     Design tokens
```

The frontend and backend are separate npm projects and are installed and run from their own directories.

## Requirements

- Node.js 22.12 or newer and npm.
- A reachable MongoDB instance, local or hosted.
- SMTP credentials for email verification; optional Google OAuth and Cloudinary credentials for those integrations.

## Local setup

1. Install dependencies in both applications:

	 ```bash
	 cd backend
	 npm ci
	 cd ../frontend
	 npm ci
	 ```

2. Create `backend/.env` using the variables in [Configuration](#configuration). Use real secrets locally and do not commit this file.

3. Start the backend and frontend in separate terminals. See [Run the application](#run-the-application).

The frontend defaults to `http://localhost:5000/api/v1` for its API. The backend defaults to the development client origin `http://localhost:5173` when `CLIENT_URL` is not set.

## Configuration

### Backend

Create `backend/.env`:

```dotenv
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173
API_BASE_URL=http://localhost:5000/api/v1

# Keep this variable spelling exact; it is used by the current backend code.
MONGODB_URl=mongodb://127.0.0.1:27017/ai_raters

JWT_SECRET=replace-with-a-long-random-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
ADMIN_REGISTRATION_PASSCODE=replace-with-a-private-passcode

# Optional Google sign-in. Use the same OAuth client ID in the frontend.
GOOGLE_CLIENT_ID=

# Optional email verification configuration.
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=
EMAIL_PASS=

# Optional Cloudinary uploads.
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

`PORT`, `MONGODB_URl`, and the JWT values are required for normal operation. Set `CLIENT_URL` to the browser origin hosting the frontend and `API_BASE_URL` to the publicly reachable API base URL used in verification links. In production, use a strong private JWT secret, configure HTTPS and production credentials, and restrict database and Cloudinary access appropriately.

For Google sign-in, configure `GOOGLE_CLIENT_ID` on the backend and `VITE_GOOGLE_CLIENT_ID` for the frontend. Both values must identify the same Google OAuth client. Without them, password-based registration and login remain available.

SMTP settings are required to deliver verification messages for password-based registrations. Unverified accounts cannot sign in; if email delivery fails, configure SMTP and use the resend action on the login screen. Cloudinary settings are needed for file uploads. Google sign-in verifies the email address through Google, but new Google accounts still require administrator approval.

### Frontend

The default API base URL is `http://localhost:5000/api/v1`. To override it, pass `VITE_API_URL` to the Vite process that runs or builds the frontend. For example, in PowerShell from `frontend/`:

```powershell
$env:VITE_API_URL = "http://localhost:5000/api/v1"
$env:VITE_GOOGLE_CLIENT_ID = "your-google-oauth-client-id"
npm run dev
```

On macOS or Linux, use `export VITE_API_URL=...` and `export VITE_GOOGLE_CLIENT_ID=...` before running the Vite command. `VITE_API_URL` is embedded at build time; set it before `npm run build` for a deployed frontend.

## Run the application

Start the backend in its own terminal:

```bash
cd backend
npm start
```

The backend listens on `PORT` (default example: `5000`). It connects to MongoDB during startup. The health endpoint is available at `http://localhost:5000/api/v1/health`.

Start the frontend in another terminal:

```bash
cd frontend
npm run dev
```

Vite prints the local URL, usually `http://localhost:5173`. Open that URL in a browser. Keep both processes running while using the application.

## API overview

The API base path is `/api/v1`. Unless noted as public, endpoints require an access token in the `Authorization: Bearer <token>` header. Administrator and client endpoints additionally enforce their respective role. The refresh-token endpoint uses an HTTP-only cookie.

| Group | Representative routes | Access |
| --- | --- | --- |
| Health | `GET /health` | Public process health check. |
| Users and authentication | `POST /user/register`, `POST /user/login`, `POST /user/google`, `POST /user/resend-verification`, `GET /user/verify-email/:token`, `GET /user/countries`, `GET /user/profile`, `POST /user/refresh-token` | Registration, login, verification, resend, and countries are public; profile requires authentication. Password-based accounts must verify email, and new non-admin registrations also require administrator approval. |
| Administrator accounts | `POST /user/admin/register` | Public route protected by `ADMIN_REGISTRATION_PASSCODE`. |
| User administration | `GET /user/users`, `PATCH /user/users/:id/approval` | Administrator. |
| Tasks | `GET /tasks`, `GET /tasks/categories`, `GET /tasks/proxies`, `GET /tasks/ratings`, `POST /tasks`, `POST /tasks/bulk`, `PATCH /tasks/:id`, `DELETE /tasks/:id` | Authentication required; task creation, bulk import, edits, and deletion require an administrator. |
| Reports | `GET /reports`, `POST /reports`, `GET /reports/email/:email`, `GET /reports/rater/:raterName`, `GET /reports/summary`, `GET /reports/monthly-stats` | Authentication required; all reports and summary routes require an administrator, except report submission and scoped report reads. |
| Invoices | `GET /invoices`, `POST /invoices`, `GET /invoices/pending`, `PATCH /invoices/:id/status` | Authentication required; listing pending invoices and changing invoice status require an administrator. |
| Client | `GET /client/dashboard`, `GET /client/summary`, `GET /client/search`, `GET /client/email/:email` | Client or administrator. |
| Test history | `GET /test-history`, `POST /test-history`, `GET /test-history/stats`, `GET /test-history/leaderboard` | Authentication required; reading another user's history requires an administrator. |
| Files and training | `POST /files/upload`, `GET /files/training` | Upload requires an administrator; training files require authentication. |

For the complete request and response contracts, see the route and controller modules in `backend/routes/` and `backend/controllers/`.

## Build and deployment

Build and lint the frontend from `frontend/`:

```bash
npm run build
npm run lint
```

The production frontend bundle is written to `frontend/dist/`. `npm run preview` serves that bundle locally for a production-build check.

The backend's `npm start` script runs `nodemon server.js`, which is convenient for development. For deployment, run the Node server under the hosting provider's process manager, provide all required environment variables, and expose it over HTTPS. Set the frontend API URL to the deployed API base URL and set backend `CLIENT_URL` to the deployed frontend origin so CORS allows it.

There is currently no root-level npm workspace or automated backend test script. Install, lint, and build each application from its own directory.

## Troubleshooting

- **`ERR_CONNECTION_REFUSED` for port 5000:** Start the backend with `cd backend && npm start`; confirm `PORT` and `VITE_API_URL` point to the same API host and port.
- **CORS errors:** Set `CLIENT_URL` to the exact frontend origin, including scheme and port, then restart the backend.
- **MongoDB connection errors:** Check that MongoDB is running and that `MONGODB_URl` contains the correct connection string and database access credentials.
- **Google sign-in is unavailable:** Set matching `GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID` values and ensure the OAuth client permits the frontend origin.
- **A new account cannot sign in:** Rater and Client accounts must be approved by an administrator in User Management. Email verification does not replace approval.
- **Country list does not load:** The backend fetches country data from an external service; check backend connectivity to that service as well as the API server.
# a1raters.com
# a1raters.com
# a1raters.com
# a1raters.com

# RosterIQ

RosterIQ is a lightweight Smart Roster Management System for planning monthly employee coverage across brands and processes. It combines a vanilla HTML/CSS/JavaScript dashboard with a Node.js and Express API.

## Features

- Employee, pod, brand, process, rule, and assignment APIs
- Fictional demo employees and employee-to-brand/process assignments
- Monthly roster generation using active rules and stored assignments
- Weekly-off and active-employee constraints
- Coverage gap and roster conflict reporting
- Dashboard roster display, validation, filters, and CSV export
- Local browser storage for selected dashboard settings and leave/holiday/override UI data

## Tech stack

- Frontend: HTML, CSS, vanilla JavaScript
- Backend: Node.js 18+, Express 4
- Temporary backend storage: in-memory arrays
- Frontend hosting: Vercel
- Backend hosting: Render

## Project layout

```text
index.html
app.js
styles.css
config.js
scripts/build-frontend.js
server/
  package.json
  src/server.js
  src/routes/
```

## Local setup

### Backend

In PowerShell:

```powershell
cd server
Copy-Item ..\.env.example .env
npm install
npm run dev
```

The API starts at `http://localhost:5000`. The health check is `http://localhost:5000/`.

### Frontend

In a second terminal, from the project root:

```powershell
python -m http.server 8000
```

Open `http://localhost:8000`. The checked-in `config.js` points the frontend to `http://localhost:5000/api`.

To build the static Vercel output locally:

```powershell
npm run build
```

The build writes only frontend files to `dist/`. Without a build environment variable it uses the localhost API URL.

## Environment variables

| Variable | Used by | Purpose |
|---|---|---|
| `PORT` | Backend | HTTP port. Defaults to `5000` locally; Render supplies its port. |
| `NODE_ENV` | Backend | Set to `production` on Render to disable development CORS origins. |
| `FRONTEND_URL` | Backend | Allowed frontend origin(s), without a path. Multiple origins may be comma-separated. |
| `ROSTERIQ_API_BASE_URL` | Frontend build | Absolute API base URL, including `/api`, e.g. `https://rosteriq-api.onrender.com/api`. |

`.env.example` contains non-secret development values. Copy it to `server/.env` for local backend development. Do not commit `.env` files. Set `ROSTERIQ_API_BASE_URL` in Vercel's project environment settings; the build generates `dist/config.js` from it and requires it on Vercel.

## API endpoints

All API endpoints are relative to `http://localhost:5000` locally (or the deployed backend URL). JSON request bodies should use `Content-Type: application/json`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | Backend health check |
| GET, POST | `/api/employees` | List or create employees |
| GET, PUT, DELETE | `/api/employees/:id` | Read, update, or delete an employee |
| GET, POST | `/api/pods` | List or create pods |
| GET, PUT, DELETE | `/api/pods/:id` | Read, update, or delete a pod |
| GET, POST | `/api/processes` | List or create processes |
| GET, PUT, DELETE | `/api/processes/:id` | Read, update, or delete a process |
| GET, POST | `/api/brands` | List or create brands |
| GET, PUT, DELETE | `/api/brands/:id` | Read, update, or delete a brand |
| GET, POST | `/api/rules` | List or create roster rules |
| GET, PUT, DELETE | `/api/rules/:id` | Read, update, or delete a rule |
| GET, POST | `/api/assignments` | List or create employee-brand-process assignments |
| DELETE | `/api/assignments/:id` | Delete an assignment |
| GET | `/api/rosters` | List generated rosters |
| POST | `/api/rosters/generate` | Generate and store a monthly roster |
| POST | `/api/rosters/validate` | Validate the latest generated roster |

Examples:

Create a roster for November 2026:

```json
{
  "month": 11,
  "year": 2026
}
```

Create a rule:

```json
{
  "brandId": "brand-1",
  "processId": "process-1",
  "minimumStaff": 2,
  "workingDays": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  "isActive": true
}
```

Create an assignment:

```json
{
  "employeeId": "1",
  "brandId": "brand-1",
  "processId": "process-1"
}
```

Employee create/update requests use `name`, `pod`, and `weeklyOff`; `active` may be included when updating. Pod, brand, and process create/update requests use `name`.

## Roster generation and validation

- Generation accepts a numeric `month` (1-12) and four-digit `year`.
- The generator uses active employees, stored assignments, and active rules. An employee can cover at most one shift per date and cannot be scheduled on their weekly off.
- Each active rule defines a brand/process pair, minimum staffing, and working days. Inactive rules are not scheduled.
- If no rules exist, a demo default is used: minimum one employee, Monday-Friday, for each brand/process pair.
- If no assignments are supplied in the generation request, the stored assignments are used.
- Each shift reports required and assigned staff, status, and any staffing gap. Generated rosters are held in memory; generating again for the same month replaces that month's stored roster.
- `POST /api/rosters/validate` compares the latest roster with current employees, stored assignments, and current rules. It reports severity, dates, uncovered shifts, minimum staffing violations, inactive or weekly-off employees, double shifts, and missing assignments.

## Conflict detection

Generation avoids assigning the same employee to multiple shifts on one date and reports coverage gaps when it cannot meet a shift's staffing minimum. Validation independently checks the stored roster against current data, so employee or assignment changes can surface new conflicts without regenerating first. Regenerate after changes to create a schedule using the updated data.

## Deployment

### Render backend

1. Create a Render **Web Service** connected to this repository.
2. Set **Root Directory** to `server`.
3. Use **Build Command** `npm install` and **Start Command** `npm start`.
4. Add environment variables:
   - `NODE_ENV` = `production`
   - `FRONTEND_URL` = your Vercel origin, such as `https://rosteriq.vercel.app` (no path)
5. Deploy. Render sets `PORT`; the server listens on that port and binds to `0.0.0.0`.
6. Confirm the service health check responds at `/`.

### Vercel frontend

1. Create a Vercel project connected to this repository, using the repository root as the project root.
2. Set the Vercel environment variable `ROSTERIQ_API_BASE_URL` to the Render URL ending in `/api`, e.g. `https://rosteriq-api.onrender.com/api`.
3. Use the configured build command `npm run build` and output directory `dist` (also defined in `vercel.json`).
4. Deploy the frontend.
5. Set the Render `FRONTEND_URL` to the deployed Vercel origin and redeploy/restart the backend. For preview deployments, add allowed preview origins as a comma-separated list.

Deploy the backend first if possible, then configure the frontend with its URL. After deploying both, test the frontend's data loading, roster generation, and validation.

## Limitations and future improvements

- Backend data is in memory and resets when the Render service restarts or redeploys. The demo employee, assignment, pod, brand, and process seeds are recreated; generated rosters and API-created data are not persistent.
- There is no authentication or authorization. Add access control before exposing management APIs publicly.
- Leave, holiday, and daily override controls are browser-side data and are not currently inputs to backend roster generation.
- The generator is a simple greedy scheduler, not an optimization solver. More complex availability, fairness, and shift preferences need additional models and tests.
- Future improvements include database persistence, authenticated roles, server-side leave/holiday APIs, richer reporting, and automated end-to-end tests.

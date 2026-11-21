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

## Design Decisions & Approach

### 1. How did I model employees, brands, processes, pods, and their relationships?

I modelled the system using separate entities for Employees, Pods, Brands, Processes, Assignments and Rules. This separation makes the system easier to manage and extend.

- **Employees:** Store employee information such as name, pod, weekly off and active status.
- **Pods:** Organize employees into operational teams.
- **Brands:** Represent the clients or brands for which operational work is performed.
- **Processes:** Represent different workflows, such as CS, ACC, Retention and NDR.
- **Assignments:** Connect employees with the brands and processes they are eligible to handle.
- **Rules:** Define operational requirements and roster-related constraints.

I used separate entities rather than combining everything into one structure so that employee details, brand requirements and staffing assignments can be managed independently.

### 2. How does the system generate a roster and determine whether it satisfies the required constraints?

The roster generation process uses employee availability, weekly offs, assignments and configured staffing requirements to generate employee allocations.

The system considers whether an employee is active, eligible for the required brand and process, and available on the required day. After roster generation, validation is used to identify scheduling issues and coverage gaps.

This approach helps reduce manual scheduling effort while ensuring that the generated roster can be reviewed for constraint violations.

### 3. How did I handle single-resource brands and brands with multiple employees?

I handled staffing through configurable assignments and staffing requirements rather than assuming that every brand has the same number of employees.

For single-resource brands, the assigned employee may handle multiple processes for that brand. For brands requiring multiple employees, staffing can be distributed among eligible employees according to the configured assignments and requirements.

This makes the system flexible enough to represent different operational staffing structures.

### 4. What happens when an employee manages all processes for a brand but is unavailable on a required working day?

If a dedicated employee is unavailable due to a weekly off or other availability constraint, the system should identify the resulting coverage gap during roster validation.

If no eligible replacement is available, the gap cannot be considered resolved simply by generating the roster. It needs to be highlighted for review and staffing adjustment.

This is particularly important for single-resource brands because they have a higher risk of coverage gaps.

### 5. How does the system handle conflicting requirements or insufficient staffing?

The system uses roster validation to identify conflicts such as insufficient staffing, unavailable employees and scheduling issues.

Instead of silently treating an incomplete roster as valid, these issues should be surfaced so that the roster can be reviewed and corrected.

The system supports the idea that operational requirements should not be ignored just to complete roster generation. Conflicts require either a staffing adjustment or a human decision.

### 6. Which parts did I automate, and which did I leave under human control? Why?

I automated employee and assignment management, roster generation and roster validation to reduce repetitive manual work and make scheduling more organized.

I kept final roster review, conflict resolution and operational decisions under human control. This is important because staffing decisions can affect business coverage, employee availability and operational priorities.

Automation can suggest and organize allocations, but a manager should retain control over exceptional situations.

### 7. If the company doubled its team and brand count, what would I change?

If the team and brand count doubled, I would move from the current lightweight data storage approach to a persistent database with a structured schema, indexing and stronger data integrity constraints.

I would also improve the roster generation algorithm to handle larger scheduling workloads efficiently, add more automated tests, and introduce role-based access control.

The system could also benefit from a more modular architecture, better reporting, audit history and improved scalability of the validation process.

### 8. If I had one additional week, what would I improve first?

My first priority would be improving the roster generation algorithm and its conflict-resolution capabilities, especially for single-resource brands and employees shared across multiple brands and processes.

I would also focus on:

- More comprehensive roster validation and edge-case handling.
- Persistent database storage instead of in-memory storage.
- Better conflict explanations and suggestions for alternative allocations.
- Automated testing of roster generation and staffing constraints.
- UI improvements for editing, reviewing and managing generated rosters.

These improvements would make the system more reliable, scalable and useful for real operational roster planning.

# Approach Note – RosterIQ (Smart Roster Management System)

## 1. Solution Overview

RosterIQ is a Smart Roster Management System designed to simplify workforce scheduling across multiple employees, pods, brands and operational processes. The main goal is to reduce manual roster planning, improve staffing visibility and identify scheduling conflicts.

The application provides a centralized platform to manage employee records, pods, brands, processes, staffing assignments and roster rules, along with generating and validating monthly rosters.

## 2. Architecture

The project follows a client-server architecture.

- **Frontend:** Built using HTML, CSS and JavaScript. It provides an interactive dashboard to manage employees, pods, brands, processes, assignments, rules and rosters.
- **Backend:** Built using Node.js and Express.js. It provides REST API endpoints to manage data and handle roster-related operations.
- **Data Management:** The backend currently uses in-memory data storage for managing records and demonstrating the system's functionality.
- **Deployment:** The frontend is deployed on Vercel and the backend API is deployed on Render.

The frontend communicates with the backend through REST APIs to retrieve and update information.

## 3. Data Modelling and Key Decisions

The system uses separate entities for employees, pods, brands, processes, assignments and rules.

- Employees are associated with pods and have availability information such as weekly offs and active status.
- Brands represent the clients or operational units requiring staffing.
- Processes represent different operational functions such as CS, ACC, Retention and NDR.
- Assignments define which employees are eligible to work on specific brands and processes.
- Rules define staffing requirements and roster constraints.

I kept these entities separate to make the system easier to manage, maintain and extend as staffing requirements change.

## 4. Roster Generation and Validation

The roster generation functionality uses employee availability, weekly offs, assignments and staffing requirements to organize employee schedules.

Roster validation helps identify scheduling problems such as coverage gaps, employee availability conflicts and insufficient staffing. This helps managers review generated schedules before finalizing them.

## 5. Handling Different Staffing Structures

The system supports different staffing arrangements through employee assignments and configurable requirements.

Some brands may require one dedicated employee to handle multiple processes, while others may require multiple employees sharing responsibilities. The system is designed to represent these different staffing structures without requiring the same staffing arrangement for every brand.

## 6. Automation and Human Control

Employee management, assignment management, roster generation and validation are handled through the application to reduce repetitive manual work.

However, final roster review and conflict resolution remain under human control. This is important because operational requirements, employee availability and business priorities may require managerial decisions that cannot always be handled automatically.

## 7. Scalability and Future Improvements

If the number of employees and brands increases, I would introduce a persistent database, improve the scheduling algorithm, add role-based access control, implement more automated tests and improve reporting.

With additional development time, I would prioritize improved conflict resolution, persistent storage, better roster editing capabilities, more detailed validation and automated testing for complex staffing scenarios.



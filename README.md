# Student Information Management System

A three-tier cloud application for CA2.

## Required architecture
- Frontend: Netlify (HTML, CSS, JavaScript)
- Backend: Render (Node.js + Express REST API)
- Database: MongoDB Atlas

## Features
- Add student records
- View all students
- Search by student ID, name, email, or department
- Edit student details
- Delete student records
- Input validation and success/error messages
- Responsive user interface

## 1. Prerequisites
Install Node.js LTS and Git. Create accounts on MongoDB Atlas, Render, Netlify, and GitHub.

## 2. Configure MongoDB Atlas
1. Create a MongoDB Atlas project and a free cluster if available.
2. Create a database user and password.
3. In Network Access, allow your current IP for local testing. For Render, configure an appropriate access rule for your deployment; do not leave broad access enabled longer than needed.
4. Copy the MongoDB connection string from Connect → Drivers.
5. The application uses database `studentDB` and collection `students`.

## 3. Run backend locally
Open a terminal in `backend/`:

```bash
npm install
```

Copy `.env.example` to `.env`, then edit `.env`:

```env
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@YOUR_CLUSTER/studentDB?retryWrites=true&w=majority
PORT=5000
FRONTEND_URL=http://localhost:5500
```

Use your actual Atlas connection string. URL-encode special characters in the database password if needed. Do not commit `.env`.

Start the API:

```bash
npm run dev
```

Open http://localhost:5000/api/health. It should return JSON with `ok: true`.

### Run the frontend locally
Use VS Code Live Server on `frontend/index.html` (port 5500), or run any local static server. In `frontend/app.js`, the default API URL is `http://localhost:5000`. If you use a different port/server, update the URL or set `window.API_BASE_URL` before `app.js` is loaded.

For local frontend access, set `FRONTEND_URL` in the backend `.env` to the exact origin, for example `http://127.0.0.1:5500` or `http://localhost:5500`. These are different origins.

## 4. Test the API
- `GET /api/health`
- `GET /api/students`
- `POST /api/students`
- `GET /api/students/:id` (MongoDB document ID)
- `PUT /api/students/:id`
- `DELETE /api/students/:id`

Example POST body:

```json
{
  "studentId": "ST101",
  "name": "Rahul Sharma",
  "email": "rahul@example.com",
  "department": "Computer Engineering",
  "semester": 7
}
```

## 5. Deploy backend to Render
1. Push this project to GitHub.
2. In Render, create **New → Web Service** and connect the repository.
3. Set **Root Directory** to `backend`.
4. Build Command: `npm install`
5. Start Command: `npm start`
6. Add environment variables:
   - `MONGODB_URI` = your Atlas connection string
   - `FRONTEND_URL` = your deployed Netlify origin (e.g. `https://your-site-name.netlify.app`)
   - `NODE_ENV` = `production`
   - `PORT` is usually supplied by Render; the app supports it automatically.
7. Deploy and test `https://YOUR-RENDER-SERVICE.onrender.com/api/health`.

## 6. Deploy frontend to Netlify
1. In Netlify, choose **Add new site → Import an existing project** and connect the same GitHub repository, OR manually deploy the `frontend/` folder.
2. If connecting the repository, set the **Base directory** to `frontend` and leave the build command empty; publish directory is `.`.
3. After deployment, copy the exact Netlify URL.
4. Update the Render `FRONTEND_URL` environment variable to that exact origin, then redeploy/restart the service.
5. In `frontend/app.js`, replace the production API URL placeholder in `API_BASE_URL` with your Render service URL (without a trailing slash), then redeploy the frontend.

**Important:** Because the frontend needs the Render URL, deploy the backend first, set its URL in `frontend/app.js`, then deploy the frontend. Update Render's `FRONTEND_URL` once Netlify gives you its final URL.

## 7. Demonstration checklist
- Show Netlify frontend URL.
- Add a student and show success message.
- Show the new record in the list and MongoDB Atlas.
- Search for the student.
- Edit the student's details.
- Delete the student.
- Show the Render `/api/health` endpoint.
- Explain the flow: Browser → Netlify frontend → Render REST API → MongoDB Atlas.

## Security notes
- Never commit `.env` or database credentials.
- The starter project does not include login/authentication; keep it as a classroom demo and do not store sensitive personal information.
- CORS restricts browser access to the configured frontend origin, but CORS is not authentication and does not prevent direct API requests.
- Use a least-privilege MongoDB database user and review Atlas network access settings.

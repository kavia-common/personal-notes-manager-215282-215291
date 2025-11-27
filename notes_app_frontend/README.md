# Ocean Notes – React Frontend

Modern, lightweight notes UI built with React and vanilla CSS using the Ocean Professional theme.

## Features
- Notes CRUD (list, create, edit, delete)
- Optimistic UI for create/update/delete
- Simple search filter
- Backend health indicator
- Environment configurable API base URL

## Backend API
The app integrates with a Flask backend exposing:
- `GET /health`
- `GET /api/notes`
- `POST /api/notes`
- `GET /api/notes/{note_id}`
- `PUT /api/notes/{note_id}`
- `DELETE /api/notes/{note_id}`

Preview defaults: backend on port 3001, frontend on port 3000.

## Environment Variables
Configure the backend URL via one of:
- `REACT_APP_API_BASE`
- `REACT_APP_BACKEND_URL`

`REACT_APP_API_BASE` takes precedence if both are set.

Example:
```
REACT_APP_API_BASE=http://localhost:3001
```

See `.env.example` for a template.

## Scripts

- `npm start` – Run dev server at http://localhost:3000
- `npm test` – Run tests
- `npm run build` – Production build

## Notes
- Ensure the backend has CORS enabled to accept requests from the frontend origin (http://localhost:3000 during development).
- All API calls use `fetch` with `credentials: 'include'` for CORS compatibility if cookies are later introduced.

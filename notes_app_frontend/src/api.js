//
// Simple API client for Notes backend
//

const getBaseUrl = () => {
  // PUBLIC_INTERFACE
  // Prefer REACT_APP_API_BASE, fallback to REACT_APP_BACKEND_URL, and default to localhost:3001
  const fromEnv = process.env.REACT_APP_API_BASE || process.env.REACT_APP_BACKEND_URL;
  const fallback = 'http://localhost:3001';
  // Ensure no trailing slash
  const base = (fromEnv || fallback).replace(/\/+$/, '');
  return base;
};

const jsonHeaders = {
  'Content-Type': 'application/json',
};

// PUBLIC_INTERFACE
export async function fetchHealth() {
  /** Check backend health. Returns { status: "ok" } on success. */
  const res = await fetch(`${getBaseUrl()}/health`, { credentials: 'include' });
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json();
}

// PUBLIC_INTERFACE
export async function listNotes(signal) {
  /** List all notes: returns Note[] */
  const res = await fetch(`${getBaseUrl()}/api/notes`, {
    method: 'GET',
    credentials: 'include',
    signal,
    headers: {
      Accept: 'application/json',
    },
  });
  if (!res.ok) throw new Error(`Failed to list notes: ${res.status}`);
  return res.json();
}

// PUBLIC_INTERFACE
export async function createNote(data) {
  /** Create a new note.
   * data: { title: string, content: string }
   * returns created Note (with id)
   */
  const res = await fetch(`${getBaseUrl()}/api/notes`, {
    method: 'POST',
    credentials: 'include',
    headers: jsonHeaders,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const msg = await safeErrorMessage(res);
    throw new Error(`Failed to create note: ${msg}`);
  }
  return res.json();
}

// PUBLIC_INTERFACE
export async function updateNote(id, data) {
  /** Update note by id.
   * data: { title?: string, content?: string }
   * returns updated Note
   */
  const res = await fetch(`${getBaseUrl()}/api/notes/${id}`, {
    method: 'PUT',
    credentials: 'include',
    headers: jsonHeaders,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const msg = await safeErrorMessage(res);
    throw new Error(`Failed to update note: ${msg}`);
  }
  return res.json();
}

// PUBLIC_INTERFACE
export async function deleteNote(id) {
  /** Delete note by id. Returns true if success. */
  const res = await fetch(`${getBaseUrl()}/api/notes/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok && res.status !== 204) {
    const msg = await safeErrorMessage(res);
    throw new Error(`Failed to delete note: ${msg}`);
  }
  return true;
}

async function safeErrorMessage(res) {
  try {
    const data = await res.json();
    return data?.detail || data?.message || `${res.status} ${res.statusText}`;
  } catch {
    return `${res.status} ${res.statusText}`;
  }
}

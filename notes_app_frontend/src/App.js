import React, { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import { fetchHealth, listNotes, createNote, updateNote, deleteNote } from './api';

// PUBLIC_INTERFACE
export default function App() {
  /** Notes App entry. Renders header, list, and editor. */
  const [health, setHealth] = useState({ status: 'unknown' });
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [saving, setSaving] = useState(false);

  const abortRef = useRef(null);

  useEffect(() => {
    // initial health check
    fetchHealth()
      .then((h) => setHealth(h))
      .catch(() => setHealth({ status: 'down' }));
  }, []);

  useEffect(() => {
    // load notes
    loadNotes();
    // cleanup on unmount to abort
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // PUBLIC_INTERFACE
  const loadNotes = async () => {
    /** Load notes with cancellation support. */
    setLoading(true);
    setError('');
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const data = await listNotes(ctrl.signal);
      setNotes(Array.isArray(data) ? data.sort((a, b) => b.id - a.id) : []);
    } catch (e) {
      setError(e.message || 'Failed to fetch notes');
    } finally {
      setLoading(false);
    }
  };

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedId) || null,
    [notes, selectedId]
  );

  // PUBLIC_INTERFACE
  const handleCreate = async (payload) => {
    /** Create with optimistic UI push to list and select new. */
    setSaving(true);
    setError('');
    // basic validation
    if (!payload.title?.trim()) {
      setSaving(false);
      setError('Title is required');
      return;
    }
    const optimistic = {
      id: Math.max(0, ...notes.map((n) => n.id || 0)) + 1_000_000, // temp id
      title: payload.title,
      content: payload.content || '',
      optimistic: true,
    };
    setNotes((prev) => [optimistic, ...prev]);
    try {
      const created = await createNote({ title: payload.title, content: payload.content || '' });
      // replace optimistic with actual
      setNotes((prev) =>
        prev.map((n) => (n.id === optimistic.id ? created : n))
      );
      setSelectedId(created.id);
    } catch (e) {
      // rollback
      setNotes((prev) => prev.filter((n) => n.id !== optimistic.id));
      setError(e.message || 'Failed to create note');
    } finally {
      setSaving(false);
    }
  };

  // PUBLIC_INTERFACE
  const handleUpdate = async (id, payload) => {
    /** Update with optimistic patch */
    setSaving(true);
    setError('');
    if (!payload.title?.trim()) {
      setSaving(false);
      setError('Title is required');
      return;
    }
    const prev = notes;
    const patched = prev.map((n) => (n.id === id ? { ...n, ...payload } : n));
    setNotes(patched);
    try {
      const updated = await updateNote(id, payload);
      setNotes((cur) => cur.map((n) => (n.id === id ? updated : n)));
    } catch (e) {
      setNotes(prev);
      setError(e.message || 'Failed to update note');
    } finally {
      setSaving(false);
    }
  };

  // PUBLIC_INTERFACE
  const handleDelete = async (id) => {
    /** Delete with optimistic removal */
    setError('');
    const prev = notes;
    setNotes(prev.filter((n) => n.id !== id));
    if (selectedId === id) setSelectedId(null);
    try {
      await deleteNote(id);
    } catch (e) {
      setNotes(prev);
      setError(e.message || 'Failed to delete note');
    }
  };

  const filteredNotes = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(
      (n) =>
        n.title?.toLowerCase().includes(q) ||
        n.content?.toLowerCase().includes(q)
    );
  }, [notes, filter]);

  return (
    <div className="app-shell">
      <header className="header" role="banner">
        <div className="header-inner">
          <div className="brand" aria-label="Notes App">
            <div className="brand-badge" aria-hidden>✦</div>
            <div className="brand-title">Ocean Notes</div>
          </div>
          <div className={`health ${health?.status === 'ok' ? 'ok' : 'bad'}`} aria-live="polite">
            {health?.status === 'ok' ? 'Backend connected' : 'Backend unavailable'}
          </div>
        </div>
      </header>

      <main className="container" role="main">
        <section className="panel" aria-labelledby="list-title">
          <div className="panel-header">
            <div className="panel-title" id="list-title">Your Notes</div>
            <div className="toolbar">
              <input
                className="input"
                style={{ width: 220 }}
                placeholder="Search notes…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                aria-label="Search notes"
              />
              <div className="spacer" />
              <button
                className="btn"
                onClick={() => setSelectedId(null)}
                title="Create a new note"
              >
                + New Note
              </button>
              <button className="btn secondary" onClick={loadNotes} disabled={loading}>
                {loading ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>
          <div className="panel-body">
            {error ? (
              <div role="alert" style={{ color: 'var(--error)', marginBottom: 12 }}>
                {error}
              </div>
            ) : null}
            {loading && notes.length === 0 ? (
              <div className="empty">Loading notes…</div>
            ) : filteredNotes.length === 0 ? (
              <div className="empty">No notes found.</div>
            ) : (
              <div className="notes-list">
                {filteredNotes.map((n) => (
                  <article key={n.id} className="note-item" aria-label={`Note ${n.title || 'Untitled'}`}>
                    <div className="note-title">
                      {n.title || 'Untitled'}
                      {n.optimistic ? (
                        <span style={{ marginLeft: 6, fontSize: 12, color: 'var(--muted)' }}>(saving…)</span>
                      ) : null}
                    </div>
                    <div className="note-content">
                      {(n.content && n.content.length > 180)
                        ? `${n.content.slice(0, 180)}…`
                        : (n.content || 'No content')}
                    </div>
                    <div className="note-actions">
                      <button className="btn secondary" onClick={() => setSelectedId(n.id)}>
                        Edit
                      </button>
                      <button
                        className="btn danger"
                        onClick={() => handleDelete(n.id)}
                        aria-label={`Delete note ${n.title || n.id}`}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="panel" aria-labelledby="editor-title">
          <div className="panel-header">
            <div className="panel-title" id="editor-title">
              {selectedNote ? 'Edit Note' : 'Create Note'}
            </div>
          </div>
          <div className="panel-body">
            <NoteForm
              key={selectedNote ? selectedNote.id : 'new'}
              initial={selectedNote || { title: '', content: '' }}
              onCancel={() => setSelectedId(null)}
              onSubmit={async (values) => {
                if (selectedNote) {
                  await handleUpdate(selectedNote.id, values);
                } else {
                  await handleCreate(values);
                }
              }}
              saving={saving}
            />
          </div>
        </section>
      </main>

      <footer className="footer">
        Ocean Professional UI • uses REACT_APP_API_BASE or REACT_APP_BACKEND_URL for backend base URL
      </footer>
    </div>
  );
}

/**
 * PUBLIC_INTERFACE
 * NoteForm component handles creation and editing of notes with basic validation.
 * Props:
 *  - initial: { title: string, content: string }
 *  - onSubmit: (values) => Promise<void>
 *  - onCancel: () => void
 *  - saving: boolean
 */
function NoteForm({ initial, onSubmit, onCancel, saving }) {
  const [title, setTitle] = useState(initial.title || '');
  const [content, setContent] = useState(initial.content || '');
  const [localError, setLocalError] = useState('');

  const isEdit = !!initial?.id;

  const submit = async (e) => {
    e.preventDefault();
    setLocalError('');
    if (!title.trim()) {
      setLocalError('Title is required');
      return;
    }
    await onSubmit({ title: title.trim(), content });
    // if creating, clear the form
    if (!isEdit) {
      setTitle('');
      setContent('');
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      {localError ? (
        <div role="alert" style={{ color: 'var(--error)', marginBottom: 12 }}>
          {localError}
        </div>
      ) : null}
      <div className="field">
        <label className="label" htmlFor="title">Title</label>
        <input
          id="title"
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter a descriptive title"
          required
          maxLength={200}
        />
      </div>
      <div className="field">
        <label className="label" htmlFor="content">Content</label>
        <textarea
          id="content"
          className="textarea"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your note here…"
        />
      </div>
      <div className="toolbar">
        <button className="btn" type="submit" disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Note'}
        </button>
        <button className="btn secondary" type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
}

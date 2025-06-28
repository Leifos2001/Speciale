"use client"

import { useUser } from "./user-context"
import { useEffect, useState } from "react"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_BASE_URL) {
  console.warn("API_BASE_URL is not defined. Check NEXT_PUBLIC_API_URL in environment variables.");
}


export const getApiUrl = () => {
  if (!API_BASE_URL) {
    throw new Error("API_BASE_URL is not defined. Please check your environment variables.");
  }
  return API_BASE_URL;
};

interface Note {
  id: string
  title: string
  description: string
  color: string
  image?: string
  todoList: Array<{ text: string; checked: boolean }>
  showDescription: boolean
  showList: boolean
  isChecked: boolean
  lastClicked?: string
  created_at?: string
  user: string
}

export function useApi() {
  const { currentUser } = useUser()
  const [notes, setNotes] = useState<Note[]>([])
  const [checkedNotes, setCheckedNotes] = useState<Note[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parseTodoList = (todoList: any) => {

    if (!todoList) return [];

    if (Array.isArray(todoList)) {
      return todoList.map(item => ({
        text: String(item.text || ''),
        checked: Boolean(item.checked),
        completedAt: item.completedAt || undefined
      }));
    }

    if (typeof todoList === 'string') {
      try {
        const parsed = JSON.parse(todoList);
        if (Array.isArray(parsed)) {
          return parsed.map(item => ({
            text: String(item.text || ''),
            checked: Boolean(item.checked),
            completedAt: item.completedAt || undefined
          }));
        }
      } catch (e) {
        console.error('Failed to parse todoList:', e);
      }
    }

    return [];
  };


  useEffect(() => {
    const fetchNotes = async () => {
      if (!currentUser) return;

      setIsLoading(true);
      setError(null);

      try {
        const [notesRes, checkedRes] = await Promise.all([
          fetch(`${getApiUrl()}/notes/${currentUser}`),
          fetch(`${getApiUrl()}/checked-notes/${currentUser}`),
        ]);

        if (!notesRes.ok || !checkedRes.ok) {
          throw new Error("Failed to fetch notes");
        }

        const notesData: Note[] = await notesRes.json();
        const checkedData: Note[] = await checkedRes.json();

        const parsedNotes = notesData.map(note => ({
          ...note,
          todoList: parseTodoList(note.todoList),
          showList: Array.isArray(note.todoList) && note.todoList.length > 0
        }));

        const parsedCheckedNotes = checkedData.map(note => ({
          ...note,
          todoList: parseTodoList(note.todoList),
          showList: Array.isArray(note.todoList) && note.todoList.length > 0
        }));

        setNotes(parsedNotes);
        setCheckedNotes(parsedCheckedNotes);
      } catch (err) {
        console.error("Error fetching notes:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
        setNotes([]);
        setCheckedNotes([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotes();
  }, [currentUser]);

  const createNote = async (note: Omit<Note, "id" | "created_at">) => {
    try {
      console.log("Creating note for user:", note.user)
      const response = await fetch(`${getApiUrl()}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(note),
      })
      if (!response.ok) {
        const text = await response.text()
        console.error("Failed to create note:", text)
        throw new Error("Failed to create note")
      }
      const created: Note = await response.json()
      setNotes(prev => [created, ...prev])
      return created
    } catch (err) {
      console.error("Error creating note:", err)
      throw err
    }
  }

  const createCheckedNote = async (note: Omit<Note, "id" | "created_at">) => {
    try {
      console.log("Creating checked note for user:", note.user)
      const response = await fetch(`${getApiUrl()}/checked-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(note),
      })
      if (!response.ok) {
        const text = await response.text()
        console.error("Failed to create checked note:", text)
        throw new Error("Failed to create checked note")
      }
      const created: Note = await response.json()
      setCheckedNotes(prev => [created, ...prev])
      return created
    } catch (err) {
      console.error("Error creating checked note:", err)
      throw err
    }
  }

  const updateNote = async (id: string, updates: Partial<Omit<Note, "id" | "created_at">>) => {
    const userId = currentUser
    try {
      const payload = { ...updates, user: userId }
      console.log('Updating note:', payload)
      const response = await fetch(`${getApiUrl()}/notes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!response.ok) throw new Error("Failed to update note")
      const updated: Note = await response.json()
      setNotes(prev => prev.map(note => note.id === id ? updated : note))
      return updated
    } catch (err) {
      console.error("Error updating note:", err)
      throw err
    }
  }

  const updateCheckedNote = async (id: string, updates: Partial<Omit<Note, "id" | "created_at">>) => {
    const userId = currentUser
    try {
      const payload = { ...updates, user: userId }
      const response = await fetch(`${getApiUrl()}/checked-notes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!response.ok) throw new Error("Failed to update checked note")
      const updated: Note = await response.json()
      setCheckedNotes(prev => prev.map(note => note.id === id ? updated : note))
      return updated
    } catch (err) {
      console.error("Error updating checked note:", err)
      throw err
    }
  }

  // fjern en note
  const deleteNote = async (id: string) => {
    try {
      const response = await fetch(`${getApiUrl()}/notes/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: currentUser })
      })
      if (!response.ok) throw new Error("Failed to delete note")
      setNotes(prev => prev.filter(note => note.id !== id))
    } catch (err) {
      console.error("Error deleting note:", err)
      throw err
    }
  }

  // fjern en afkryset note
  const deleteCheckedNote = async (id: string) => {
    try {
      const response = await fetch(`${getApiUrl()}/checked-notes/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: currentUser })
      })
      if (!response.ok) throw new Error("Failed to delete checked note")
      setCheckedNotes(prev => prev.filter(note => note.id !== id))
    } catch (err) {
      console.error("Error deleting checked note:", err)
      throw err
    }
  }

  // tjek en note
  const checkNote = async (id: string) => {
    try {
      const note = notes.find(n => n.id === id)
      if (!note) throw new Error("Note not found")

      const response = await fetch(`${getApiUrl()}/notes/${id}/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...note, isChecked: true }),
      })
      if (!response.ok) throw new Error("Failed to check note")

      const checkedNote = await response.json()
      setCheckedNotes(prev => [checkedNote, ...prev])
      setNotes(prev => prev.filter(n => n.id !== id))
      return checkedNote
    } catch (err) {
      console.error("Error checking note:", err)
      throw err
    }
  }

  // fjern afkrydsningen af en note
  const uncheckNote = async (id: string) => {
    try {
      const note = checkedNotes.find(n => n.id === id)
      if (!note) throw new Error("Note not found")

      const response = await fetch(`${getApiUrl()}/checked-notes/${id}/uncheck`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...note, isChecked: false }),
      })
      if (!response.ok) throw new Error("Failed to uncheck note")

      const uncheckedNote = await response.json()
      setNotes(prev => [uncheckedNote, ...prev])
      setCheckedNotes(prev => prev.filter(n => n.id !== id))
      return uncheckedNote
    } catch (err) {
      console.error("Error unchecking note:", err)
      throw err
    }
  }

  return {
    notes,
    checkedNotes,
    isLoading,
    error,
    createNote,
    createCheckedNote,
    updateNote,
    updateCheckedNote,
    deleteNote,
    deleteCheckedNote,
    checkNote,
    uncheckNote
  }
}
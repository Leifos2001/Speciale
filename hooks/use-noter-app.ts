"use client"

import { useState, useCallback, useTransition, useMemo, useEffect } from "react"
import { useApi, getApiUrl } from "../lib/api"
import { useUser } from "../lib/user-context"
import { Note } from "../lib/api"

const sortNotesByLastClicked = (notes: Note[]) => {
  return [...notes].sort((a, b) => {
    // Hvis begge noter har tidsstempler, sorter efter tidsstempel
    if (a.lastClicked && b.lastClicked) {
      return new Date(b.lastClicked).getTime() - new Date(a.lastClicked).getTime()
    }
    // Hvis kun en note har tidsstempel, sæt den uden tidsstempel først
    if (a.lastClicked && !b.lastClicked) return 1
    if (!a.lastClicked && b.lastClicked) return -1
    // Hvis ingen har tidsstempel, behold original rækkefølge
    return 0
  })
}

export function useNoterApp() {
  const { currentUser } = useUser()
  const {
    notes: apiNotes,
    checkedNotes: apiCheckedNotes,
    createNote,
    updateNote,
    deleteNote,
    checkNote,
    uncheckNote,
    updateCheckedNote,
    deleteCheckedNote
  } = useApi();
  const [showNewNote, setShowNewNote] = useState(false)
  const [showCheckedNotes, setShowCheckedNotes] = useState(false)
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [checkedNotes, setCheckedNotes] = useState<Note[]>([])
  const sortedNotes = useMemo(() => sortNotesByLastClicked(notes), [notes])
  const [noteSource, setNoteSource] = useState<"notes" | "checked">("notes")
  const [isPending, startTransition] = useTransition()

  // Opdater lokale noter, når API noter ændres
  useEffect(() => {
    setNotes(apiNotes);
    setCheckedNotes(apiCheckedNotes);
  }, [apiNotes, apiCheckedNotes]);

  const handleCreateNote = useCallback((note: Note) => {
    // Opdater lokal state umiddelbart
    setNotes(prevNotes => [note, ...prevNotes]);

    // Send til server i baggrunden
    createNote(note).catch(err => {
      console.error('Error creating note:', err);
      // Hvis der er en fejl, fjern noten fra lokal state
      setNotes(prevNotes => prevNotes.filter(n => n.id !== note.id));
    });
  }, [createNote]);

  const handleCheckChange = useCallback((id: string, checked: boolean) => {
    try {
      // Først tjek, om noten er i de almindelige noter
      const note = notes.find(n => n.id === id);
      if (note) {
        if (checked) {
          // Brug den eksisterende checkNote funktion
          checkNote(id).catch(err => {
            console.error('Error checking note:', err);
          });
        }
      } else {
        // Hvis ikke fundet i almindelige noter, tjek i afkrydsede noter
        const checkedNote = checkedNotes.find(n => n.id === id);
        if (checkedNote) {
          if (!checked) {
            // Brug den eksisterende uncheckNote funktion
            uncheckNote(id).catch(err => {
              console.error('Error unchecking note:', err);
            });
          }
        } else {
          // Hvis noten ikke findes i nogen liste, er det måske en ny note
          // Prøv at finde den i API noter
          const apiNote = apiNotes.find(n => n.id === id);
          if (apiNote) {
            if (checked) {
              checkNote(id).catch(err => {
                console.error('Error checking new note:', err);
              });
            }
          } else {
            // Hvis noten ikke findes overhovedet, er det måske en ny note, som ikke er gemt endnu
            // Vi kan stadig tjekke den
            if (checked) {
              checkNote(id).catch(err => {
                console.error('Error checking new note:', err);
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in handleCheckChange:', error);
    }
  }, [notes, checkedNotes, apiNotes, checkNote, uncheckNote]);

  const handleUpdateTodoList = useCallback(
    (id: string, newList: Array<{ text: string; checked: boolean }>) => {
      const note = notes.find(n => n.id === id) || checkedNotes.find(n => n.id === id);
      if (note) {
        const isCheckedNote = checkedNotes.some(n => n.id === id);

        // Brug den eksisterende update funktion
        const updateFunction = isCheckedNote ? updateCheckedNote : updateNote;

        // Sørg for, at newList er gyldig
        const validList = Array.isArray(newList) ? newList : [];

        // Opdater lokal state
        if (isCheckedNote) {
          setCheckedNotes(prev => prev.map(n =>
            n.id === id ? { ...n, todoList: validList, showList: validList.length > 0 } : n
          ));
        } else {
          setNotes(prev => prev.map(n =>
            n.id === id ? { ...n, todoList: validList, showList: validList.length > 0 } : n
          ));
        }

        // Opdater den valgte note, hvis den ændres
        if (selectedNote?.id === id) {
          setSelectedNote(prev => prev ? { ...prev, todoList: validList, showList: validList.length > 0 } : null);
        }

        updateFunction(id, {
          ...note,
          todoList: validList,
          showList: validList.length > 0,
          user: currentUser.id
        }).catch(err => {
          console.error('Error updating todo list:', err);
        });
      }
    },
    [notes, checkedNotes, currentUser.id, updateNote, updateCheckedNote, selectedNote]
  );

  const handleDeleteNote = useCallback((id: string) => {
    // Tjek, om noten er i afkrydsede noter
    const isCheckedNote = checkedNotes.some(note => note.id === id);

    // Brug den eksisterende delete funktion
    const deleteFunction = isCheckedNote ? deleteCheckedNote : deleteNote;

    deleteFunction(id).catch(err => {
      console.error('Error deleting note:', err);
    });

    // Fjern den valgte note, hvis den slettes
    if (selectedNote?.id === id) {
      setSelectedNote(null);
      setNoteSource("notes");
    }
  }, [checkedNotes, selectedNote, deleteNote, deleteCheckedNote]);

  const handleEditNote = useCallback((updatedNote: Note) => {
    // Tjek, om noten er i afkrydsede noter
    const isCheckedNote = checkedNotes.some(note => note.id === updatedNote.id);

    // Brug den eksisterende update funktion
    const updateFunction = isCheckedNote ? updateCheckedNote : updateNote;

    // Sørg for, at todoList altid er et array og inkluderer alle nødvendige felter
    const noteWithTodoList = {
      ...updatedNote,
      todoList: Array.isArray(updatedNote.todoList) ? updatedNote.todoList :
        typeof updatedNote.todoList === 'string' ? JSON.parse(updatedNote.todoList) : [],
      showList: Array.isArray(updatedNote.todoList) && updatedNote.todoList.length > 0 ? true : false,
      showDescription: updatedNote.description.trim() !== "" ? updatedNote.showDescription : false,
      user: currentUser.id,
      lastClicked: new Date().toISOString()
    };

    // Opdater lokal state
    if (isCheckedNote) {
      setCheckedNotes(prev => prev.map(note =>
        note.id === updatedNote.id ? noteWithTodoList : note
      ));
    } else {
      setNotes(prev => prev.map(note =>
        note.id === updatedNote.id ? noteWithTodoList : note
      ));
    }

    // Opdater den valgte note, hvis den ændres
    if (selectedNote?.id === updatedNote.id) {
      setSelectedNote(noteWithTodoList);
    }

    // Send opdatering til server
    updateFunction(updatedNote.id, noteWithTodoList).catch(err => {
      console.error('Error updating note:', err);
      // Fortryd lokal state, hvis der er en fejl
      if (isCheckedNote) {
        setCheckedNotes(prev => prev.map(note =>
          note.id === updatedNote.id ? updatedNote : note
        ));
      } else {
        setNotes(prev => prev.map(note =>
          note.id === updatedNote.id ? updatedNote : note
        ));
      }
    });
  }, [checkedNotes, currentUser.id, updateNote, updateCheckedNote, selectedNote]);

  const toggleNewNote = useCallback(() => setShowNewNote((prev) => !prev), [])
  const toggleCheckedNotes = useCallback(() => setShowCheckedNotes((prev) => !prev), [])

  const selectNote = (note: Note, source: "notes" | "checked") => {
    // Sørg for, at todoList er håndteret korrekt
    const todoList = Array.isArray(note.todoList) ? note.todoList :
      typeof note.todoList === 'string' ? JSON.parse(note.todoList) : [];

    // Opdater lastClicked tidsstempel og sørg for, at todoList bevares
    const updatedNote = {
      ...note,
      todoList,
      showList: todoList.length > 0,
      lastClicked: new Date().toISOString()
    };

    // Opdater noten i databasen
    handleEditNote(updatedNote);

    // Sæt den valgte note
    setSelectedNote(updatedNote);
    setNoteSource(source);
  }

  const clearSelectedNote = () => {
    setSelectedNote(null)
    setNoteSource("notes")
  }

  return {
    notes,
    checkedNotes,
    selectedNote,
    noteSource,
    showNewNote,
    showCheckedNotes,
    setNotes,
    setCheckedNotes,
    setSelectedNote,
    setNoteSource,
    setShowNewNote,
    setShowCheckedNotes,
    selectNote,
    clearSelectedNote,
    isPending,
    handleCreateNote,
    handleCheckChange,
    handleUpdateTodoList,
    handleDeleteNote,
    handleEditNote,
    toggleNewNote,
    toggleCheckedNotes,
  }
}


"use client"

import { Menu, Plus, Check, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NoteCard } from "./components/note-card"
import { NewNote } from "./components/new-note"
import { NoteDetail } from "./components/note-detail"
import { CheckedNotes } from "./components/checked-notes"
import { LoginScreen } from "./components/login-screen"
import { useNoterApp } from "./hooks/use-noter-app"
import Image from "next/image"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useState, useEffect, useCallback } from "react"
import { useApi, getApiUrl } from "./lib/api"
import { UserProvider, useUser } from "./lib/user-context"
import { ToastProvider } from "@/components/ui/toast"
import { Toaster } from "sonner"
import { useToast } from "@/components/ui/use-toast"

// ID generator
function generateId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}

// Udvidet bruger-type
interface UserType {
  id: string
  name: string
  initials: string
}

interface TodoItem {
  text: string;
  checked: boolean;
  completedAt?: string;
}

interface Note {
  id: string;
  user: string;
  title: string;
  description: string;
  color: string;
  image?: string;
  todoList: TodoItem[];
  showDescription: boolean;
  showList: boolean;
  isChecked: boolean;
  lastClicked?: Date;
}

interface NoteInput {
  title: string;
  description: string;
  color: string;
  image?: string;
  todoList: TodoItem[];
  showDescription: boolean;
  showList: boolean;
  user: string;
}

function NoterAppContent() {
  const { toast } = useToast()
  // Standardbruger ("Mine noter") – denne bruger har id "1"
  const [currentUser, setCurrentUser] = useState<UserType>({
    id: "1",
    name: "Fagperson",
    initials: "FP",
  })

  const { setCurrentUser: setUserContext } = useUser()

  // Hardkodet liste med brugere
  const [users, setUsers] = useState<UserType[]>([
    {
      id: "2",
      name: "Ane",
      initials: "A",
    },
    {
      id: "3",
      name: "Simon",
      initials: "S",
    },
  ])

  // State for login-screen visning
  const [showLoginScreen, setShowLoginScreen] = useState(false)

  // State for share message
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  // Sæt global styling til at skjule scrollbaren
  useEffect(() => {
    const style = document.createElement("style")
    style.textContent = `
      * {
        -ms-overflow-style: none !important;
        scrollbar-width: none !important;
      }
      *::-webkit-scrollbar {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
      }
    `
    document.head.appendChild(style)
    return () => {
      document.head.removeChild(style)
    }
  }, [])

  // Hentes fra hooks
  const {
    showNewNote,
    showCheckedNotes,
    selectedNote,
    notes,
    checkedNotes,
    noteSource,
    isPending,
    handleCreateNote,
    handleCheckChange,
    handleUpdateTodoList,
    handleDeleteNote,
    handleEditNote,
    toggleNewNote,
    toggleCheckedNotes,
    selectNote,
    clearSelectedNote: originalClearSelectedNote,
    setNotes,
    setCheckedNotes,
    setSelectedNote,
    setNoteSource,
  } = useNoterApp();

  const { createNote } = useApi();

  // Filtrer noter – her kan du f.eks. i hooken lave filteret, så kun noter med det aktuelle user id hentes
  const uncheckedNotes = notes.filter((note) => !note.isChecked)

  // Funktion til at hente noter for den aktuelle bruger
  const fetchNotes = async () => {
    try {
      const apiUrl = getApiUrl();
      // hent alle noter og afkrysete noter
      const [notesResponse, checkedNotesResponse] = await Promise.all([
        fetch(`${apiUrl}/notes/${currentUser.id}`),
        fetch(`${apiUrl}/checked-notes/${currentUser.id}`)
      ]);

      if (!notesResponse.ok || !checkedNotesResponse.ok) {
        throw new Error('Failed to fetch notes');
      }

      const notesData = await notesResponse.json();
      const checkedNotesData = await checkedNotesResponse.json();

      console.log('Fetched notes for user:', currentUser.id, notesData);
      console.log('Fetched checked notes for user:', currentUser.id, checkedNotesData);

      // Konverter data til Note objekter med alle påkrævede felter
      const notesWithDefaults = notesData.map((note: any): Note => ({
        ...note,
        user: currentUser.id,
        todoList: (() => {
          if (!note.todoList) return [];
          if (Array.isArray(note.todoList)) return note.todoList;
          try {
            const parsed = JSON.parse(note.todoList);
            return Array.isArray(parsed) ? parsed : [];
          } catch (e) {
            console.error('Failed to parse todoList:', e);
            return [];
          }
        })(),
        showDescription: note.showDescription ?? true,
        showList: note.showList ?? true,
        isChecked: note.isChecked ?? false,
        lastClicked: note.lastClicked ? new Date(note.lastClicked) : undefined
      }));

      const checkedNotesWithDefaults = checkedNotesData.map((note: any): Note => ({
        ...note,
        user: currentUser.id,
        todoList: (() => {
          if (!note.todoList) return [];
          if (Array.isArray(note.todoList)) return note.todoList;
          try {
            const parsed = JSON.parse(note.todoList);
            return Array.isArray(parsed) ? parsed : [];
          } catch (e) {
            console.error('Failed to parse todoList:', e);
            return [];
          }
        })(),
        showDescription: note.showDescription ?? true,
        showList: note.showList ?? true,
        isChecked: true,
        lastClicked: note.lastClicked ? new Date(note.lastClicked) : undefined
      }));

      // sorter noter: "Ny" først, derefter efter lastClicked i faldende rækkefølge
      const sortNotes = (notes: Note[]) => {
        return [...notes].sort((a, b) => {
          if (!a.lastClicked && !b.lastClicked) return 0;
          if (!a.lastClicked) return -1;
          if (!b.lastClicked) return 1;
          return new Date(b.lastClicked).getTime() - new Date(a.lastClicked).getTime();
        });
      };

      // opdater notes state med de sorterede noter
      setNotes(sortNotes(notesWithDefaults));
      setCheckedNotes(sortNotes(checkedNotesWithDefaults));
    } catch (error) {
      console.error('Error fetching notes:', error);
      setNotes([]);
      setCheckedNotes([]);
    }
  };


  const clearSelectedNote = () => {
    originalClearSelectedNote();
    fetchNotes(); // Hent noter igen når man går tilbage
  };

  // Brug useEffect til at hente noter når brugeren skifter
  useEffect(() => {
    fetchNotes();
  }, [currentUser.id]);

  // Funktion til at skifte bruger
  const switchUser = (user: UserType) => {
    setUserContext(user.id)
    setCurrentUser(user)
    clearSelectedNote()
    if (showCheckedNotes) {
      toggleCheckedNotes()
    }
    setNotes([])
    setCheckedNotes([])
    fetchNotes()
  }

  // Funktion til at kopiere eller dele en note
  const handleCopyNote = useCallback((note: Note, targetUserId?: string) => {
    const newNote: Note = {
      ...note,
      id: generateId(),
      user: targetUserId || currentUser.id, // Brug targetUserId hvis den er angivet (deling), ellers brug currentUser.id (kopiering)
      isChecked: false,
      showDescription: true,
      showList: true,
      todoList: note.todoList || [],
      lastClicked: undefined
    };

    // Hvis vi deler noten med en anden bruger
    if (targetUserId) {
      createNote(newNote).then(() => {
        // Vis besked om at noten er delt
        const sharedUserName = users.find(u => u.id === targetUserId)?.name;
        setTimeout(() => {
          setShareMessage(`Nu har du delt noten med ${sharedUserName}`);
          // Ryd besked efter 2 sekunder
          setTimeout(() => setShareMessage(null), 2000);
        }, 1000);
      }).catch(error => {
        console.error('Error sharing note:', error);
        toast({
          title: "Fejl",
          description: "Der opstod en fejl ved deling af noten",
          variant: "destructive"
        });
      });
    } else {
      // Hvis vi kopierer noten til den nuværende bruger
      handleCreateNote(newNote);
    }
  }, [currentUser.id, handleCreateNote, createNote, users, toast]);

  // Funktion til at dele en note med en specifik bruger
  const handleShareNote = useCallback((note: Note, targetUserId: string) => {
    handleCopyNote(note, targetUserId);
  }, [handleCopyNote]);

  // Funktioner til at håndtere login-skærm
  const openLoginScreen = () => {
    setShowLoginScreen(true)
  }
  const closeLoginScreen = () => {
    setShowLoginScreen(false)
  }
  const handleLogin = () => {
    setShowLoginScreen(false)
  }

  // Hvis login-skærmen skal vises, returneres den i stedet for hovedindholdet
  if (showLoginScreen) {
    return <LoginScreen onClose={closeLoginScreen} onLogin={handleLogin} />
  }

  // Hvis checked-noter skal vises, returneres CheckedNotes-komponenten
  if (showCheckedNotes) {
    return (
      <>
        <CheckedNotes
          notes={checkedNotes}
          onBack={toggleCheckedNotes}
          onNoteClick={(note) => selectNote(note, "checked")}
          onCheckChange={handleCheckChange}
          currentUser={currentUser}
        />
        {/* Note Detail View for checked notes */}
        {selectedNote && noteSource === "checked" && (
          <NoteDetail
            note={selectedNote}
            onBack={clearSelectedNote}
            onEdit={handleEditNote}
            onUpdateTodoList={(newList) => handleUpdateTodoList(selectedNote.id, newList)}
            onDelete={() => handleDeleteNote(selectedNote.id)}
            noteSource={noteSource}
            currentUser={currentUser}
            onCopyNote={handleCopyNote}
            onShareNote={handleShareNote}
          />
        )}
      </>
    )
  }

  // Hovedlayout
  return (
    <div className="min-h-screen flex flex-col bg-white hide-scrollbar overflow-hidden">
      {/* Share Message */}
      {shareMessage && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white border border-gray-200 shadow-lg rounded-lg p-4 z-50">
          {shareMessage}
        </div>
      )}

      {/* Header */}
      <header className="bg-[#3C8C50] text-white p-4 flex items-center sticky top-0 z-10">
        <Button variant="ghost" size="icon" className="text-white" onClick={openLoginScreen}>
          <Menu className="h-6 w-6" />
        </Button>
        <div className="flex-1 flex items-center justify-center gap-2">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/icons8-inscription-50-o0MspY0deH8HRfk9CwBcz2Sf1YGQQg.png"
            alt="Note search icon"
            width={24}
            height={24}
            className="invert brightness-0"
          />
          <span className="text-xl font-medium">Noter</span>
        </div>

        {/* User dropdown menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 rounded-full bg-[#4B9E61] text-white text-sm p-0 hover:bg-[#5aad70] flex items-center justify-center"
            >
              {currentUser.id === "1" ? <User className="h-4 w-4" /> : currentUser.initials}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48" sideOffset={5} forceMount style={{ zIndex: 100 }}>
            <DropdownMenuItem
              onClick={() => {
                // Skift til standardbruger ("Mine noter") – id "1"
                const defaultUser: UserType = { id: "1", name: "Fagperson", initials: "FP" }
                switchUser(defaultUser)
              }}
            >
              <User className="mr-2 h-4 w-4" />
              <span>Mine noter</span>
            </DropdownMenuItem>

            {/* Divider */}
            <div className="h-px bg-gray-200 my-1" />

            {/* Brugerliste */}
            {users.map((user) => (
              <DropdownMenuItem key={user.id} onClick={() => switchUser(user)}>
                <div className="flex items-center justify-between w-full">
                  <span>{user.name}</span>
                  <span className="w-6 h-6 rounded-full bg-[#3C8C50] text-white text-xs flex items-center justify-center">
                    {user.initials}
                  </span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 space-y-4 pb-24 hide-scrollbar overflow-y-auto">
        {Array.isArray(uncheckedNotes) ? uncheckedNotes.map((note: Note) => (
          <NoteCard
            key={note.id}
            title={note.title || ''}
            imageUrl={note.image || ''}
            color={note.color || '#3C8C50'}
            isChecked={note.isChecked || false}
            onCheckChange={(checked) => handleCheckChange(note.id, checked)}
            onClick={() => selectNote(note, "main")}
            lastClicked={note.lastClicked ? new Date(note.lastClicked) : undefined}
          />
        )) : null}
      </main>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex justify-between">
        <Button
          size="icon"
          className="h-12 w-12 rounded-full bg-[#3C8C50] hover:bg-[#4B9E61] text-white shadow-lg"
          onClick={toggleCheckedNotes}
        >
          <Check className="h-6 w-6" />
        </Button>
        <Button
          size="icon"
          className="h-12 w-12 rounded-full bg-[#3C8C50] hover:bg-[#4B9E61] text-white shadow-lg"
          onClick={toggleNewNote}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      {/* New Note Modal */}
      {showNewNote && (
        <NewNote
          onClose={toggleNewNote}
          onCreateNote={(noteData) => {
            console.log('NewNote onCreateNote called');
            const newNote = {
              ...noteData,
              id: generateId(),
              user: currentUser.id,
              isChecked: false,
              showDescription: true,
              showList: true,
              todoList: noteData.todoList || [],
              lastClicked: undefined // Set to undefined to show "Ny"
            };
            handleCreateNote(newNote);
            console.log('handleCreateNote called');
            fetchNotes(); // Fetch updated notes
            toggleNewNote(); // Close the modal
            console.log('toggleNewNote called');
          }}
        />
      )}

      {/* Note Detail View for unchecked notes */}
      {selectedNote && noteSource === "main" && (
        <NoteDetail
          note={selectedNote}
          onBack={clearSelectedNote}
          onEdit={handleEditNote}
          onUpdateTodoList={(newList) => handleUpdateTodoList(selectedNote.id, newList)}
          onDelete={() => handleDeleteNote(selectedNote.id)}
          noteSource={noteSource}
          currentUser={currentUser}
          onCopyNote={handleCopyNote}
          onShareNote={handleShareNote}
        />
      )}

      {/* Loading-indikator */}
      {isPending && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded-lg">Loading...</div>
        </div>
      )}
    </div>
  )
}

export default function NoterApp() {
  return (
    <UserProvider>
      <NoterAppContent />
      <Toaster position="top-center" />
    </UserProvider>
  )
}

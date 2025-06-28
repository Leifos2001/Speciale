"use client"

import {
  ArrowLeft,
  MoreHorizontal,
  Trash,
  Share,
  Volume2,
  MoreVertical,
  User,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Copy,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import Image from "next/image"
import { useState, useEffect, useRef } from "react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { EditNote } from "./edit-note"
import { Note } from "../hooks/use-noter-app"
import { useToast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { toast } from "sonner"
import { getApiUrl } from "@/lib/api"

// Bruger type for at sikre konsistens med hovedside
interface UserType {
  id: string
  name: string
  initials: string
}

const speakText = (text: string) => {
  if ("speechSynthesis" in window) {
    // Stop alle igangs værende tale
    window.speechSynthesis.cancel()

    // Opret en ny tale-instans
    const utterance = new SpeechSynthesisUtterance(text)

    // Sæt dansk som sprog (hvis tilgængeligt)
    utterance.lang = "da-DK"

    // Start tale
    window.speechSynthesis.speak(utterance)
  } else {
    console.log("Din browser understøtter ikke tekst til tale.")
  }
}

interface TodoItem {
  text: string
  checked: boolean
  completedAt?: string
}

interface NoteDetailProps {
  note: Note
  onBack: () => void
  onEdit: (updatedNote: Note) => void
  onUpdateTodoList: (newList: Array<TodoItem>) => void
  onDelete: () => void
  noteSource: "notes" | "checked"
  currentUser: { id: string; name: string; initials: string }
  onCopyNote: (note: Note) => void
  onShareNote: (note: Note, targetUserId: string) => void
}

export function NoteDetail({
  note,
  onBack,
  onEdit,
  onUpdateTodoList,
  onDelete,
  noteSource,
  currentUser,
  onCopyNote,
  onShareNote,
}: NoteDetailProps) {
  // Sørg for, at todoList altid er et array
  const [localTodoList, setLocalTodoList] = useState<Array<TodoItem>>(() => {
    if (!note.todoList) return [];
    if (Array.isArray(note.todoList)) return note.todoList;
    if (typeof note.todoList === 'string') {
      try {
        const parsed = JSON.parse(note.todoList);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.error('Failed to parse todoList:', e);
        return [];
      }
    }
    return [];
  });

  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [showEditNote, setShowEditNote] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [showCompletedItems, setShowCompletedItems] = useState(true)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [updatedNote, setUpdatedNote] = useState(note)
  const { toast } = useToast()

  // Tilføj brugerliste
  const users = [
    { id: "2", name: "Ane", initials: "A" },
    { id: "3", name: "Simon", initials: "S" },
  ]

  useEffect(() => {
    // Opdater localTodoList, når note ændres
    if (!note.todoList) {
      setLocalTodoList([]);
    } else if (Array.isArray(note.todoList)) {
      setLocalTodoList(note.todoList);
    } else if (typeof note.todoList === 'string') {
      try {
        const parsed = JSON.parse(note.todoList);
        setLocalTodoList(Array.isArray(parsed) ? parsed : []);
      } catch (e) {
        console.error('Failed to parse todoList:', e);
        setLocalTodoList([]);
      }
    } else {
      setLocalTodoList([]);
    }
    setUpdatedNote(note);
  }, [note]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px"
    }

    // Anvend scrollbar skjult til alle elementer, når komponenten sættes op
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
  }, [updatedNote.description])

  const formatCompletionTime = (date: Date) => {
    const day = date.getDate().toString().padStart(2, "0")
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    const year = date.getFullYear().toString().slice(2)
    const hours = date.getHours().toString().padStart(2, "0")
    const minutes = date.getMinutes().toString().padStart(2, "0")

    return `${day}-${month}-${year} kl ${hours}:${minutes}`
  }

  const handleCheckChange = (index: number, checked: boolean) => {
    const newList = [...localTodoList]
    newList[index] = {
      ...newList[index],
      checked,
      completedAt: checked ? formatCompletionTime(new Date()) : undefined,
    }

    setLocalTodoList(newList)
    onUpdateTodoList(newList)
  }

  const handleEditNote = (editedNote: Partial<Note>) => {
    const updatedNote: Note = {
      ...note,
      ...editedNote,
      user: currentUser.id,
      isChecked: note.isChecked || false
    }
    onEdit(updatedNote)
    setUpdatedNote(updatedNote)
    // Luk redigeringsvisningen
    setShowEditNote(false)
  }

  const deleteCheckedItems = () => {
    const newList = localTodoList.filter((item) => !item.checked)
    setLocalTodoList(newList)
    onUpdateTodoList(newList)
  }

  const deleteAllItems = () => {
    setLocalTodoList([])
    onUpdateTodoList([])
  }

  const copyNote = () => {
    if (onCopyNote) {
      const copiedNote: Note = {
        ...updatedNote,
        id: Date.now().toString(),
        title: updatedNote.title + " (kopi)",
        user: currentUser.id,
        isChecked: false
      }
      onCopyNote(copiedNote)
      onBack()
    }
  }

  const restartList = () => {
    const newList = localTodoList.map((item) => ({
      ...item,
      checked: false,
      completedAt: undefined,
    }))
    setLocalTodoList(newList)
    onUpdateTodoList(newList)
  }

  const toggleCompletedItems = () => {
    setShowCompletedItems((prev) => !prev)
  }

  const activeItems = localTodoList.filter((item) => !item.checked)
  const completedItems = localTodoList.filter((item) => item.checked)

  const handleShareNote = (targetUser: { id: string; name: string }) => {
    if (onShareNote) {
      // Opret en identisk kopi af noten, kun ændrer bruger og ID
      const sharedNote = {
        ...updatedNote,
        id: Date.now().toString(),
        user: targetUser.id,
        isChecked: false,
        lastClicked: new Date(),
        title: updatedNote.title,
        description: updatedNote.description,
        color: updatedNote.color,
        image: updatedNote.image,
        todoList: updatedNote.todoList || [],
        showDescription: updatedNote.showDescription,
        showList: updatedNote.showList
      }

      // Opret den delte note
      onShareNote(sharedNote, targetUser.id)

      // Opdater den nuværende note for at sikre, at den forbliver synlig
      const updatedCurrentNote = {
        ...updatedNote,
        lastClicked: new Date()
      }
      onEdit(updatedCurrentNote)

      // Luk delingsmenuen og vend tilbage til hovedskærmen
      setShowShareMenu(false)
      onBack()

      // Vis notifikation efter at have vendt tilbage til hovedskærmen
      setTimeout(() => {
        toast("Note delt", {
          description: `Nu er noten delt med ${targetUser.name}`,
          duration: 2000,
        })
      }, 100)
    }
  }

  if (!note) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col hide-scrollbar">
      {showEditNote ? (
        <EditNote note={updatedNote} onClose={() => setShowEditNote(false)} onSaveNote={handleEditNote} />
      ) : showShareMenu ? (
        <div className="fixed inset-0 bg-white z-50 flex flex-col hide-scrollbar">
          <header className="bg-[#3C8C50] text-white p-4 flex items-center">
            <Button variant="ghost" size="icon" className="text-white" onClick={() => setShowShareMenu(false)}>
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <span className="text-xl font-medium flex-1 text-center">Del note</span>
          </header>
          <main className="flex-1 p-4 hide-scrollbar">
            <div className="space-y-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                  onClick={() => handleShareNote(user)}
                >
                  <span className="font-medium">{user.name}</span>
                  <div className="w-8 h-8 rounded-full bg-[#3C8C50] text-white flex items-center justify-center">
                    {user.initials}
                  </div>
                </div>
              ))}
            </div>
          </main>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between p-4" style={{ backgroundColor: updatedNote.color }}>
            <Button variant="ghost" size="icon" onClick={onBack} className="text-white hover:bg-white/20">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <span className="text-white font-medium">{updatedNote.title}</span>
            <div className="w-8 h-8" /> {/* Empty div to maintain spacing */}
          </div>

          <main className="flex-1 overflow-y-auto pb-24">
            {updatedNote.image && (
              <div className="w-full relative" style={{ height: '200px' }}>
                <Image
                  src={`${getApiUrl()}${updatedNote.image}`}
                  alt={updatedNote.title}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            )}

            <div className="p-4">
              {updatedNote.showDescription && updatedNote.description && updatedNote.description.trim() !== "" ? (
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-gray-800 mb-2">Beskrivelse</h2>
                  <div className="relative">
                    <textarea
                      ref={textareaRef}
                      value={updatedNote.description === null || updatedNote.description === undefined ? "" : updatedNote.description}
                      readOnly
                      className="w-full p-2 bg-gray-50 rounded-lg resize-none focus:outline-none"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute bottom-2 right-2 h-6 w-6 p-0 text-gray-400"
                      onClick={() => speakText(updatedNote.description === null || updatedNote.description === undefined ? "" : updatedNote.description)}
                    >
                      <Volume2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : null}

              {/* Todo liste */}
              {note.showList && localTodoList.length > 0 && (
                <div className="space-y-4 hide-scrollbar">
                  <div className="flex items-center">
                    <h2 className="text-lg font-semibold text-gray-800">Min liste</h2>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-gray-500 h-8 w-8 p-0 ml-1 hover:bg-gray-100">
                          <MoreVertical className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem
                          onSelect={restartList}
                          disabled={completedItems.length === 0}
                          className="cursor-pointer"
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          <span>Genstart listen</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={deleteCheckedItems}
                          disabled={completedItems.length === 0}
                          className="cursor-pointer"
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          <span>Slet overstreget punkter</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={deleteAllItems}
                          disabled={localTodoList.length === 0}
                          className="cursor-pointer text-red-600"
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          <span>Slet alle punkter</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Aktive (unchecked) punkter */}
                  <div className="space-y-2 hide-scrollbar">
                    {activeItems.map((item, index) => {
                      const originalIndex = localTodoList.findIndex((i) => i === item)
                      return (
                        <div
                          key={`active-${originalIndex}`}
                          className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleCheckChange(originalIndex, !item.checked)}
                        >
                          <Checkbox
                            checked={item.checked}
                            onCheckedChange={(checked) => handleCheckChange(originalIndex, checked as boolean)}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded-[2px] border-[#3C8C50] border-2 data-[state=checked]:bg-[#3C8C50] data-[state=checked]:text-white"
                          />
                          <div className="flex-grow flex items-center gap-2">
                            <span>{item.text}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 p-0 text-gray-400"
                              onClick={(e) => {
                                e.stopPropagation()
                                speakText(item.text)
                              }}
                            >
                              <Volume2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Afsluttede punkter sektion */}
                  {completedItems.length > 0 && (
                    <>
                      <div className="mt-6 mb-2 flex items-center cursor-pointer" onClick={toggleCompletedItems}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-0 h-6 w-6 mr-2 text-gray-500 hover:bg-transparent hover:text-gray-700"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleCompletedItems()
                          }}
                        >
                          {showCompletedItems ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </Button>
                        <h3 className="text-sm font-medium text-gray-500">Fuldført ({completedItems.length})</h3>
                      </div>

                      {showCompletedItems && (
                        <div className="space-y-2 hide-scrollbar">
                          {completedItems.map((item, index) => {
                            const originalIndex = localTodoList.findIndex((i) => i === item)
                            return (
                              <div
                                key={`completed-${originalIndex}`}
                                className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => handleCheckChange(originalIndex, !item.checked)}
                              >
                                <Checkbox
                                  checked={item.checked}
                                  onCheckedChange={(checked) => handleCheckChange(originalIndex, checked as boolean)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="rounded-[2px] border-[#3C8C50] border-2 data-[state=checked]:bg-[#3C8C50] data-[state=checked]:text-white"
                                />
                                <div className="flex-grow flex items-center gap-2">
                                  <span className="line-through text-gray-500">{item.text}</span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 p-0 text-gray-400"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      speakText(item.text)
                                    }}
                                  >
                                    <Volume2 className="h-4 w-4" />
                                  </Button>
                                  {item.completedAt && <span className="text-xs text-gray-400">{item.completedAt}</span>}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </main>

          {/* Bund Navigation */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex justify-between items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  className="h-12 w-12 rounded-full text-white shadow-lg"
                  style={{
                    backgroundColor: updatedNote.color,
                    '--hover-bg': `${updatedNote.color}dd`
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = `${updatedNote.color}dd`)}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = updatedNote.color)}
                >
                  <MoreHorizontal className="h-6 w-6" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  onClick={() => setShowDeleteConfirmation(true)}
                  className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                >
                  <Trash className="h-4 w-4" />
                  <span>Slet note</span>
                </DropdownMenuItem>
                {currentUser.id === "1" && (
                  <DropdownMenuItem
                    onClick={() => setShowShareMenu(true)}
                    className="flex items-center gap-2 text-gray-700 hover:text-gray-900 hover:bg-gray-50 cursor-pointer"
                  >
                    <Share className="h-4 w-4" />
                    <span>Del note</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={copyNote}
                  className="flex items-center gap-2 text-gray-700 hover:text-gray-900 hover:bg-gray-50 cursor-pointer"
                >
                  <Copy className="h-4 w-4" />
                  <span>Kopier note</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              className="h-12 px-16 rounded-full text-white shadow-lg flex-1 max-w-[calc(100%-80px)]"
              style={{
                backgroundColor: updatedNote.color,
                '--hover-bg': `${updatedNote.color}dd`
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = `${updatedNote.color}dd`)}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = updatedNote.color)}
              onClick={() => setShowEditNote(true)}
            >
              Rediger
            </Button>
          </div>

          {/* Slet bekræftelsesmodal */}
          {showDeleteConfirmation && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200]">
              <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full mx-4">
                <h2 className="text-xl font-bold mb-4">Er du sikker på du vil slette denne note?</h2>
                <div className="flex justify-end space-x-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirmation(false)}
                    className="min-w-[80px]"
                  >
                    Tilbage
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      onDelete()
                      setShowDeleteConfirmation(false)
                      onBack()
                    }}
                    className="min-w-[80px] bg-red-600 hover:bg-red-700"
                  >
                    Slet
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <Toaster />
    </div>
  )
}


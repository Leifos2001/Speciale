"use client"

import { ArrowLeft, User, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NoteCard } from "./note-card"
import { useState, useMemo, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { motion, AnimatePresence } from "framer-motion"

interface UserType {
  id: string
  name: string
  initials: string
}

interface CheckedNotesProps {
  notes: Array<{
    id: string
    title: string
    description: string
    color: string
    image?: string
    lastClicked?: Date
    isChecked: boolean
  }>
  onBack: () => void
  onNoteClick: (note: any) => void
  // For at sikre, at state-ændringen (fjernelse eller opdatering) ikke sker med det samme
  onCheckChange: (id: string, checked: boolean) => void
  currentUser: UserType
}

const calculateSimilarity = (title: string, query: string): number => {
  if (!query) return 0
  const titleLower = title.toLowerCase()
  const queryLower = query.toLowerCase()
  if (titleLower === queryLower) return 1
  if (titleLower.includes(queryLower)) return 0.8
  const queryWords = queryLower.split(/\s+/)
  const matchedWords = queryWords.filter((word) => titleLower.includes(word))
  if (matchedWords.length > 0) {
    return 0.5 * (matchedWords.length / queryWords.length)
  }
  let matchCount = 0
  for (let i = 0; i < queryLower.length; i++) {
    if (titleLower.includes(queryLower[i])) {
      matchCount++
    }
  }
  return matchCount > 0 ? 0.2 * (matchCount / queryLower.length) : 0
}

export function CheckedNotes({ notes, onBack, onNoteClick, onCheckChange, currentUser }: CheckedNotesProps) {
  const [searchQuery, setSearchQuery] = useState("")

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

  const filteredAndSortedNotes = useMemo(() => {
    if (!searchQuery.trim()) {
      return notes
    }
    const notesWithScores = notes.map((note) => ({
      note,
      score: calculateSimilarity(note.title, searchQuery),
    }))
    const matchingNotes = notesWithScores.filter((item) => item.score > 0)
    matchingNotes.sort((a, b) => b.score - a.score)
    return matchingNotes.map((item) => item.note)
  }, [notes, searchQuery])

  return (
    <div className="min-h-screen flex flex-col bg-white hide-scrollbar overflow-hidden">
      {/* Header */}
      <header className="bg-[#3C8C50] text-white p-4 flex items-center sticky top-0 z-10">
        <Button variant="ghost" size="icon" className="text-white" onClick={onBack}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div className="flex-1 flex items-center justify-center gap-2">
          <span className="text-xl font-medium">Gamle noter</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-[#4B9E61] text-white text-sm flex items-center justify-center">
          {currentUser.id === "1" ? <User className="h-4 w-4" /> : currentUser.initials}
        </div>
      </header>

      {/* Search Bar */}
      <div className="p-4 bg-white sticky top-16 z-5 border-b hide-scrollbar">
        <div className="relative hide-scrollbar">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Søg efter noter..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-gray-50 w-full hide-scrollbar"
          />
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 space-y-4 hide-scrollbar overflow-y-auto pb-24">
        <AnimatePresence>
          {filteredAndSortedNotes.length > 0 ? (
            filteredAndSortedNotes.map((note) => (
              <motion.div
                key={note.id}
                layout
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <NoteCard
                  title={note.title}
                  imageUrl={note.image || ""}
                  color={note.color}
                  isChecked={true}
                  onCheckChange={(checked) => {
                    if (!checked) {
                      setTimeout(() => onCheckChange(note.id, checked), 500)
                    } else {
                      onCheckChange(note.id, checked)
                    }
                  }}
                  onClick={() => onNoteClick(note)}
                  lastClicked={note.lastClicked}
                  animationContext="checked"
                />
              </motion.div>
            ))
          ) : searchQuery.trim() ? (
            <div className="text-center py-8 text-gray-500">Ingen noter matcher din søgning</div>
          ) : (
            <div className="text-center py-8 text-gray-500">Ingen gamle noter at vise</div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

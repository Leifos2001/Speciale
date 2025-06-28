"use client"

import React, { useState, useRef, useEffect } from "react"
import { X, Plus, Upload, Trash2, Volume2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { getApiUrl } from "@/lib/api"

interface TodoItem {
  text: string
  checked: boolean
  completedAt?: string
}

interface NewNoteProps {
  onClose: () => void
  onCreateNote: (note: {
    title: string
    description: string
    color: string
    image?: string
    todoList: Array<TodoItem>
    showDescription: boolean
    showList: boolean
    // user_id: user.id
  }) => void
}

const speakText = (text: string) => {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = "da-DK"
    window.speechSynthesis.speak(utterance)
  } else {
    console.log("Your browser does not support speech synthesis")
  }
}

export function NewNote({ onClose, onCreateNote }: NewNoteProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [showDescription, setShowDescription] = useState(true)
  const [showList, setShowList] = useState(true)
  const [selectedColor, setSelectedColor] = useState("#3C8C50")
  const [colorSelected, setColorSelected] = useState(true)
  const [imageUrl, setImageUrl] = useState<string>("")
  const [todoList, setTodoList] = useState<Array<TodoItem>>([])
  const [newTodoItem, setNewTodoItem] = useState("")
  const [showTitleError, setShowTitleError] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)
  const defaultAppColor = "#3C8C50"
  const displayColor = colorSelected ? selectedColor : defaultAppColor

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

  useEffect(() => {
    if (showTitleError && titleRef.current) {
      titleRef.current.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [showTitleError])

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value
    setTitle(newTitle)
    if (newTitle.trim() && showTitleError) {
      setShowTitleError(false)
    }
  }

  const colors = ["#3C8C50", "#DB5461", "#663053", "#8AA29E", "#3D5467", "#73BB44", "#CFCB4D", "#C08122"]

  const handleCreateNote = () => {
    if (!title.trim()) {
      setShowTitleError(true)
      return
    }

    console.log('Creating note...')
    const noteData = {
      title,
      description,
      color: selectedColor,
      image: imageUrl,
      todoList,
      showDescription: description.trim() !== "" ? showDescription : false,
      showList: todoList.length > 0 ? showList : false,
    }
    console.log('Calling onCreateNote...')
    onCreateNote(noteData)
    console.log('Note creation complete')
  }

  const handleColorSelect = (color: string) => {
    setSelectedColor(color)
    setColorSelected(true)
  }

  const addTodoItem = () => {
    if (newTodoItem.trim()) {
      setTodoList([{ text: newTodoItem, checked: false }, ...todoList])
      setNewTodoItem("")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      addTodoItem()
    }
  }

  const removeTodoItem = (index: number) => {
    const newList = [...todoList]
    newList.splice(index, 1)
    setTodoList(newList)
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      try {
        const formData = new FormData()
        formData.append('image', file)

        const response = await fetch(`${getApiUrl()}/upload`, {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          throw new Error('Failed to upload image')
        }

        const data = await response.json()
        setImageUrl(data.imageUrl)
      } catch (error) {
        console.error('Error uploading image:', error)
      }
    }
  }

  const handleRemoveImage = () => {
    setImageUrl("")
  }

  const handleCheckChange = (index: number, checked: boolean) => {
    const newList = [...todoList]
    newList[index] = {
      ...newList[index],
      checked,
      completedAt: checked
        ? new Date().toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" })
        : undefined,
    }
    setTodoList(newList)
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 bg-white z-50 flex flex-col hide-scrollbar"
      >
        {/* Header */}
        <header className="text-white p-4 flex items-center sticky top-0 z-10" style={{ backgroundColor: displayColor }}>
          <Button variant="ghost" size="icon" className="text-white" onClick={onClose}>
            <X className="h-8 w-8 stroke-2" />
          </Button>
          <span className="text-xl font-medium flex-1 text-center">Ny note</span>
        </header>

        {/* Form */}
        <div className="flex-1 p-4 space-y-6 overflow-y-auto hide-scrollbar">
          <div className="space-y-2 hide-scrollbar" ref={titleRef}>
            <Label className="text-sm font-medium">Titel</Label>
            <div className="flex items-center">
              <Input
                placeholder="Skriv en titel"
                value={title}
                onChange={handleTitleChange}
                className={`bg-gray-50 hide-scrollbar ${showTitleError ? "border-red-500 focus-visible:ring-red-500" : ""}`}
              />
              <Button variant="ghost" size="icon" className="ml-2 text-gray-500" onClick={() => speakText(title)}>
                <Volume2 className="h-5 w-5" />
              </Button>
            </div>
            {showTitleError && (
              <div className="flex items-center text-red-500 mt-1 animate-in fade-in slide-in-from-top-1 duration-300">
                <AlertCircle className="h-4 w-4 mr-1" />
                <span className="text-sm">Husk at skrive en titel på noten :D</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Beskrivelse</Label>
            <Switch checked={showDescription} onCheckedChange={setShowDescription} />
          </div>

          {showDescription && (
            <div className="relative">
              <Textarea
                placeholder="Skriv en beskrivelse"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-gray-50 min-h-[100px] hide-scrollbar pr-10"
                style={{ scrollbarWidth: "none" }}
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 text-gray-500"
                onClick={() => speakText(description)}
              >
                <Volume2 className="h-5 w-5" />
              </Button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Liste</Label>
            <Switch checked={showList} onCheckedChange={setShowList} />
          </div>

          {showList && (
            <div className="space-y-2 hide-scrollbar">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Tast her..."
                  value={newTodoItem}
                  onChange={(e) => setNewTodoItem(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="bg-gray-50 flex-grow hide-scrollbar"
                />
                <Button
                  variant="custom"
                  size="icon"
                  onClick={addTodoItem}
                  style={{ backgroundColor: displayColor }}
                  className="text-white rounded-lg hover:opacity-90"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
              <div className="space-y-2 hide-scrollbar">
                {todoList.map((item, index) => (
                  <div key={index} className="flex items-center gap-3 bg-gray-100 p-2 rounded-[5px]">
                    <Checkbox
                      checked={item.checked}
                      onCheckedChange={(checked) => handleCheckChange(index, checked as boolean)}
                      className="rounded-[2px] border-2 data-[state=checked]:text-white"
                      style={{
                        borderColor: displayColor,
                        backgroundColor: item.checked ? displayColor : "transparent",
                      }}
                    />
                    <div className="flex-grow flex items-center">
                      <span className={item.checked ? "line-through text-gray-500" : ""}>{item.text}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 p-0 text-gray-400 ml-1"
                        onClick={() => speakText(item.text)}
                      >
                        <Volume2 className="h-4 w-4" />
                      </Button>
                      {item.checked && item.completedAt && (
                        <span className="ml-2 text-xs text-gray-400">{item.completedAt}</span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                      onClick={() => removeTodoItem(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-center gap-2 py-4">
            {colors.map((color) => (
              <button
                key={color}
                className={`w-8 h-8 rounded-full ${selectedColor === color ? "ring-2 ring-offset-2" : ""}`}
                style={{ backgroundColor: color, ringColor: displayColor }}
                onClick={() => handleColorSelect(color)}
              />
            ))}
          </div>

          <div className="relative">
            {imageUrl ? (
              <div className="relative w-full h-64">
                <Image
                  src={`${getApiUrl()}${imageUrl}`}
                  alt="Selected"
                  fill
                  className="object-cover rounded-lg"
                />
                <Button variant="destructive" size="sm" className="absolute top-2 right-2" onClick={handleRemoveImage}>
                  Remove
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full h-64 border-dashed border-2 flex flex-col items-center justify-center"
                style={{ color: displayColor, borderColor: displayColor }}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 mb-2" />
                <span>Tilføj billede</span>
              </Button>
            )}
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
          </div>

          <Button
            className="w-full text-white"
            onClick={handleCreateNote}
            style={{ backgroundColor: displayColor, "--hover-bg": `${displayColor}dd` }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = `${displayColor}dd`)}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = displayColor)}
          >
            Opret note
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

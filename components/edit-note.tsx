"use client"

import type React from "react"

import { X, Plus, Upload, Trash2, Volume2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import { getApiUrl } from "@/lib/api"

interface TodoItem {
  text: string
  checked: boolean
  completedAt?: string
}

interface EditNoteProps {
  note: {
    id: string
    title: string
    description: string
    color: string
    image?: string
    todoList: Array<TodoItem>
    showDescription: boolean
    showList: boolean
  }
  onClose: () => void
  onSaveNote: (updatedNote: {
    id: string
    title: string
    description: string
    color: string
    image?: string
    todoList: Array<TodoItem>
    showDescription: boolean
    showList: boolean
  }) => void
}

// Tekst-til-tale function
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
    console.log("Your browser does not support speech synthesis")
  }
}

export function EditNote({ note, onClose, onSaveNote }: EditNoteProps) {
  const [title, setTitle] = useState(note.title)
  const [description, setDescription] = useState(note.showDescription ? note.description : "")
  const [showDescription, setShowDescription] = useState(note.showDescription)
  const [showList, setShowList] = useState(note.showList)
  const [selectedColor, setSelectedColor] = useState(note.color)
  const [imageUrl, setImageUrl] = useState<string>(note.image || "")
  const [todoList, setTodoList] = useState<Array<TodoItem>>(() => {
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
  const [newTodoItem, setNewTodoItem] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
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
  }, [])

  useEffect(() => {
    // Opdater todoList, når note ændres
    if (!note.todoList) {
      setTodoList([]);
    } else if (Array.isArray(note.todoList)) {
      setTodoList(note.todoList);
    } else if (typeof note.todoList === 'string') {
      try {
        const parsed = JSON.parse(note.todoList);
        setTodoList(Array.isArray(parsed) ? parsed : []);
      } catch (e) {
        console.error('Failed to parse todoList:', e);
        setTodoList([]);
      }
    } else {
      setTodoList([]);
    }
  }, [note.todoList]);

  // Farve valgmuligheder til noter
  const colors = ["#3C8C50", "#DB5461", "#663053", "#8AA29E", "#3D5467", "#73BB44", "#CFCB4D", "#C08122"]

  // Formatér tidspunkt for afsluttede opgaver
  const formatCompletionTime = (date: Date) => {
    const day = date.getDate().toString().padStart(2, "0")
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    const year = date.getFullYear().toString().slice(2)
    const hours = date.getHours().toString().padStart(2, "0")
    const minutes = date.getMinutes().toString().padStart(2, "0")

    return `${day}-${month}-${year} kl ${hours}:${minutes}`
  }

  // Gem ændringer
  const handleSave = () => {
    const updatedNote = {
      ...note,
      title,
      description,
      color: selectedColor,
      image: imageUrl,
      todoList,
      showDescription: description.trim() !== "" ? showDescription : false,
      showList: todoList.length > 0 ? showList : false,
    };

    onSaveNote(updatedNote);
    onClose();
  }

  // Tilføj en opgave til listen
  const addTodoItem = () => {
    if (newTodoItem.trim()) {
      setTodoList([{ text: newTodoItem, checked: false }, ...todoList])
      setNewTodoItem("")
    }
  }

  // Tilføj en opgave til listen, når Enter trykkes
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault() // Prevent form submission
      addTodoItem()
    }
  }

  // Fjern en opgave fra listen
  const removeTodoItem = (index: number) => {
    const newList = [...todoList]
    newList.splice(index, 1)
    setTodoList(newList)
  }

  // Ændr status for en opgave
  const handleCheckChange = (index: number, checked: boolean) => {
    const newList = [...todoList]
    newList[index] = {
      ...newList[index],
      checked,
      completedAt: checked ? formatCompletionTime(new Date()) : undefined,
    }
    setTodoList(newList)
  }

  // Upload billede
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

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col hide-scrollbar">
      {/* Header - Nu bruger selectedColor for baggrund */}
      <header className="text-white p-4 flex items-center sticky top-0 z-10" style={{ backgroundColor: selectedColor }}>
        <Button variant="ghost" size="icon" className="text-white" onClick={onClose}>
          <X className="h-8 w-8 stroke-2" />
        </Button>
        <span className="text-xl font-medium flex-1 text-center">Redigere note</span>
      </header>

      {/* Form */}
      <div className="flex-1 p-4 space-y-6 overflow-y-auto hide-scrollbar">
        {/* Titel */}
        <div className="space-y-2 hide-scrollbar">
          <Label className="text-sm font-medium">Titel</Label>
          <div className="flex items-center">
            <Input
              placeholder="Skriv en titel"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-gray-50 hide-scrollbar"
            />
            <Button variant="ghost" size="icon" className="ml-2 text-gray-500" onClick={() => speakText(title)}>
              <Volume2 className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Beskrivelse Toggle */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Beskrivelse</Label>
          <Switch checked={showDescription} onCheckedChange={setShowDescription} />
        </div>

        {/* Beskrivelse Input */}
        {showDescription && (
          <div className="relative">
            <Textarea
              placeholder="Skriv en beskrivelse"
              value={description === null || description === undefined ? "" : description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-gray-50 min-h-[100px] hide-scrollbar pr-10"
              style={{ scrollbarWidth: "none" }}
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 text-gray-500"
              onClick={() => speakText(description === null || description === undefined ? "" : description)}
            >
              <Volume2 className="h-5 w-5" />
            </Button>
          </div>
        )}

        {/* Liste Toggle */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Liste</Label>
          <Switch checked={showList} onCheckedChange={setShowList} />
        </div>

        {/* Liste Input */}
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
                style={{ backgroundColor: selectedColor }}
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
                    className="rounded-[2px] border-2 data-[state=checked]:text-white flex-shrink-0"
                    style={{
                      borderColor: selectedColor,
                      backgroundColor: item.checked ? selectedColor : "transparent",
                    }}
                  />
                  <div className="flex-grow flex items-center min-w-0">
                    <span className={`${item.checked ? "line-through text-gray-500" : ""} truncate`}>{item.text}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 p-0 text-gray-400 ml-1 flex-shrink-0"
                      onClick={() => speakText(item.text)}
                    >
                      <Volume2 className="h-4 w-4" />
                    </Button>
                    {item.checked && item.completedAt && (
                      <span className="ml-2 text-xs text-gray-400 flex-shrink-0">{item.completedAt}</span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 p-0 text-gray-400 hover:text-red-500 flex-shrink-0"
                    onClick={() => removeTodoItem(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Farve valgmuligheder */}
        <div className="flex justify-center gap-2 py-4">
          {colors.map((color) => (
            <button
              key={color}
              className={`w-8 h-8 rounded-full ${selectedColor === color ? "ring-2 ring-offset-2" : ""}`}
              style={{
                backgroundColor: color,
                ringColor: selectedColor, // Brug den valgte farve
              }}
              onClick={() => setSelectedColor(color)}
            />
          ))}
        </div>

        {/* Billede Upload */}
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
              style={{ color: selectedColor, borderColor: selectedColor }}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 mb-2" />
              <span>Tilføj billede</span>
            </Button>
          )}
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
        </div>

        {/* Save Button - Now using selectedColor for background */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-[100]">
          <Button
            className="w-full text-white"
            onClick={handleSave}
            style={{
              backgroundColor: selectedColor,
              "--hover-bg": `${selectedColor}dd`,
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = `${selectedColor}dd`)}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = selectedColor)}
          >
            Gem ændringer
          </Button>
        </div>
      </div>
    </div>
  )
}


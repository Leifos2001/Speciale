"use server"

import { revalidatePath } from "next/cache"

export async function createNote(note: {
  title: string
  description: string
  color: string
  image?: string
  todoList: Array<{ text: string; checked: boolean }>
}) {
  console.log("Creating note:", note)
  revalidatePath("/")
}

export async function updateNote(
  id: string,
  updatedNote: {
    title: string
    description: string
    color: string
    image?: string
    todoList: Array<{ text: string; checked: boolean }>
  },
) {
  console.log("Updating note:", id, updatedNote)
  revalidatePath("/")
}

export async function deleteNote(id: string) {
  console.log("Deleting note:", id)
  revalidatePath("/")
}

export async function toggleNoteCheck(id: string, isChecked: boolean) {
  console.log("Toggling note check:", id, isChecked)
  revalidatePath("/")
}


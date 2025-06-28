"use client"

import { createContext, useContext, useState, ReactNode, useEffect } from "react"

// Valid users
export const VALID_USERS = ["1", "2", "3"] as const
export type UserType = typeof VALID_USERS[number]

interface UserContextType {
  currentUser: UserType
  setCurrentUser: (user: UserType) => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

// Hent initial bruger fra localStorage eller standard til "1"
const getInitialUser = (): UserType => {
  if (typeof window !== "undefined") {
    const savedUser = localStorage.getItem("currentUser")
    return VALID_USERS.includes(savedUser as UserType) ? (savedUser as UserType) : "1"
  }
  return "1"
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserType>(getInitialUser)

  // Gem bruger til localStorage, når den ændres
  useEffect(() => {
    localStorage.setItem("currentUser", currentUser)
  }, [currentUser])

  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider")
  }
  return context
}
"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface LoginScreenProps {
  onClose: () => void
  onLogin: () => void
}

// Login-skærm
export function LoginScreen({ onClose, onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  // Login-funktion hardcoded værdier
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (username === "fagperson" && password === "123456") {
      setError("")
      onLogin()
    } else {
      setError("Forkert brugernavn eller kode")
    }
  }

  return (
    <div className="fixed inset-0 bg-[#3C8C50] z-50 flex flex-col">
      {/* Tom header - ingen X-knap eller tekst */}
      <header className="text-white p-4">{/* Header er tom nu */}</header>

      {/* Login Formular */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-md bg-white rounded-xl p-8 shadow-lg">
          <h2 className="text-2xl font-bold text-center text-[#3C8C50] mb-8">
            Log ind med din
            <br />
            PlaNet-konto
          </h2>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-gray-700">
                Brugernavn
              </Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Indtast dit brugernavn"
                className="w-full p-3 border border-gray-300 rounded-md"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700">
                Kodeord
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Indtast dit kodeord"
                className="w-full p-3 border border-gray-300 rounded-md"
              />
            </div>

            {error && (
              <div className="text-red-500 text-sm text-center">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full py-3 bg-[#3C8C50] hover:bg-[#2A7A3E] text-white font-medium rounded-md transition-colors"
            >
              Log ind
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}


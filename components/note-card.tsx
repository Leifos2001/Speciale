"use client"

import React, { useState } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Volume2 } from "lucide-react"
import Image from "next/image"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { motion } from "framer-motion"
import { getApiUrl } from "@/lib/api"

// Funktion til at få browseren til at læse teksten højt
const speakText = (text: string, e: React.MouseEvent) => {
  e.stopPropagation() // Forhindrer at kortets onClick bliver trigget

  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = "da-DK"
    window.speechSynthesis.speak(utterance)
  } else {
      console.log("Din browser understøtter ikke tekst til tale.")
  }
}

interface NoteCardProps {
  title: string
  imageUrl?: string
  color: string
  isChecked?: boolean
  onCheckChange: (checked: boolean) => void
  onClick?: () => void
  lastClicked?: string
  animationContext?: "front" | "checked"
}

export function NoteCard({
  title,
  imageUrl,
  color,
  isChecked = false,
  onCheckChange,
  onClick,
  lastClicked,
  animationContext = "front",
}: NoteCardProps) {
  const [isExiting, setIsExiting] = useState(false);

  const hasImage = !!imageUrl
  const shouldTruncate = title.length > 30

  // Formatér tidspunkt til "DD-MM-YY kl. HH:mm"
  const formatTimestamp = (date: Date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}-${month}-${year} kl. ${hours}:${minutes}`;
  };

  // Definér variants baseret på animationContext
  const variants = {
    front: {
      active: { x: 0, opacity: 1, scale: 1 },
      checked: { x: 200, opacity: 0, scale: 0.8 },
    },
    checked: {
      checked: { x: 0, opacity: 1, scale: 1 },
      unchecked: { x: 200, opacity: 0, scale: 0.8 },
    },
  }

  // Vælg, hvilken variant der skal anvendes, alt efter konteksten
  const currentVariant = animationContext === "front"
    ? isChecked ? "checked" : "active"
    : isChecked ? "checked" : "unchecked"

  const handleCheckChange = (checked: boolean) => {
    if (checked) {
      // Start exit animation, når krydset tjekkes
      setIsExiting(true);
      // Vent på animationen er færdig, før onCheckChange kaldes
      setTimeout(() => {
        onCheckChange(checked);
      }, 300); // Match dette med animationens varighed
    } else {
      // For unchecking, kalder umiddelbart
      onCheckChange(checked);
    }
  };

  return (
    <motion.div
      layout
      variants={variants[animationContext]}
      animate={animationContext === "checked" ? currentVariant : { opacity: 1, y: 0 }}
      initial={false}
      exit={animationContext === "checked" ? "unchecked" : { opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className={`relative ${isExiting ? 'pointer-events-none' : ''}`}
    >
      <div className="text-xs text-gray-600 mb-0.5">
        {lastClicked ? formatTimestamp(new Date(lastClicked)) : "Ny"}
      </div>
      <div className="flex">
        {/* Hovedcontainer */}
        <div
          className="flex-grow rounded-xl overflow-hidden cursor-pointer relative"
          onClick={onClick}
          style={{ minHeight: "100px" }}
        >
          <div className="w-full h-full py-4" style={{ backgroundColor: color }}>
            {/* Titelsektion */}
            <div className={`${hasImage ? "w-[50%] pl-6 pr-2" : "w-full px-6"}`}>
              <div className="flex flex-col">
                <div className="flex items-start justify-between">
                  <div className="flex-grow pr-2 min-w-0">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <h3 className="text-white text-xl font-medium break-words line-clamp-3 sm:line-clamp-2">
                            {shouldTruncate ? `${title.substring(0, 30)}...` : title}
                          </h3>
                        </TooltipTrigger>
                        {shouldTruncate && (
                          <TooltipContent>
                            <p>{title}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white opacity-80 hover:opacity-100 flex-shrink-0 h-8 w-8 p-0 mt-1"
                    onClick={(e) => speakText(title, e)}
                  >
                    <Volume2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
            {/* Billedsektion */}
            {hasImage && (
              <div className="absolute inset-y-0 right-0 w-[50%] overflow-hidden">
                <div className="relative h-full w-full">
                  <Image
                    src={`${getApiUrl()}${imageUrl}`}
                    alt={title}
                    fill
                    className="object-cover opacity-80"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Checkbox */}
        <div className="ml-4 mr-2 flex items-center justify-center" style={{ width: "24px" }}>
          <Checkbox
            checked={isChecked}
            onCheckedChange={handleCheckChange}
            onClick={(e) => e.stopPropagation()}
            className="h-6 w-6 rounded-[2px] border-[#3C8C50] border-2 data-[state=checked]:bg-[#3C8C50] data-[state=checked]:text-white"
          />
        </div>
      </div>
    </motion.div>
  )
}

"use client";

import * as React from "react"
import { LuTriangleAlert, LuCircleCheck, LuCircleHelp, LuTrash2, LuLogOut, LuSave } from "react-icons/lu"
import { cn } from "@/lib/utils"
import { Modal } from "./modal"
import { Button } from "./button"

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: "danger" | "warning" | "success" | "info"
  isLoading?: boolean
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "info",
  isLoading = false
}: ConfirmModalProps) {
  
  const getIcon = () => {
    switch (variant) {
      case "danger": return <LuTrash2 className="size-6 text-rose-600" />
      case "warning": return <LuTriangleAlert className="size-6 text-amber-600" />
      case "success": return <LuCircleCheck className="size-6 text-emerald-600" />
      case "info": 
      default: return <LuCircleHelp className="size-6 text-primary" />
    }
  }

  const getVariantStyles = () => {
    switch (variant) {
      case "danger": return "bg-rose-50 border-rose-100"
      case "warning": return "bg-amber-50 border-amber-100"
      case "success": return "bg-emerald-50 border-emerald-100"
      case "info":
      default: return "bg-primary/5 border-primary/10"
    }
  }

  const getButtonStyles = () => {
    switch (variant) {
      case "danger": return "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200"
      case "warning": return "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200"
      case "success": return "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200"
      case "info":
      default: return "bg-primary hover:bg-primary/90 text-white shadow-primary/20"
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} className="max-w-md">
      <div className="flex flex-col items-center text-center space-y-4 py-2">
        {/* Icon Header */}
        <div className={cn(
          "size-14 rounded-2xl flex items-center justify-center border-2 mb-2",
          getVariantStyles()
        )}>
          {getIcon()}
        </div>

        {/* Text Content */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-500 leading-relaxed max-w-xs mx-auto">
            {description}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 rounded-xl h-12 font-bold order-2 sm:order-1"
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            onClick={onConfirm}
            className={cn(
              "flex-1 rounded-xl h-12 font-black shadow-lg transition-all hover:scale-[1.02] order-1 sm:order-2",
              getButtonStyles()
            )}
            loading={isLoading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

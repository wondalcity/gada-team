"use client"

import { cn } from "@/lib/utils"

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: "danger" | "warning" | "default"
  loading?: boolean
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "확인",
  cancelLabel = "취소",
  variant = "default",
  loading = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-4">
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-6 shadow-card-xl">
        <h3 className="mb-2 text-base font-semibold text-neutral-900">{title}</h3>
        <p className="mb-6 text-sm text-neutral-500">{description}</p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-md border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              "flex-1 rounded-md px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 transition-colors",
              variant === "danger"  ? "bg-danger-500 hover:bg-danger-700" :
              variant === "warning" ? "bg-warning-500 hover:bg-warning-700" :
                                      "bg-primary-500 hover:bg-primary-600"
            )}
          >
            {loading ? "처리중..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

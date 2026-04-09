"use client";

interface DeleteRestoreActionsProps {
  isDeleted: boolean;
  onDelete: () => void;
  onRestore: () => void;
  loading?: boolean;
}

export function DeleteRestoreActions({
  isDeleted,
  onDelete,
  onRestore,
  loading = false,
}: DeleteRestoreActionsProps) {
  if (isDeleted) {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-neutral-100 text-neutral-400 border border-neutral-200">
          삭제됨
        </span>
        <button
          onClick={onRestore}
          disabled={loading}
          className="text-green-600 hover:text-green-700 text-sm font-medium disabled:opacity-50 transition-colors"
        >
          복원
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={onDelete}
      disabled={loading}
      className="text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50 transition-colors"
    >
      삭제
    </button>
  );
}

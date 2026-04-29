"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Send, AlertCircle, ClipboardSignature, CheckCircle2 } from "lucide-react";
import { chatApi, ChatMessageItem } from "@/lib/chat-api";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
}

function isSameDay(a: string, b: string): boolean {
  return formatDate(a) === formatDate(b);
}

// ─── Contract Message Card ─────────────────────────────────────────────────────

function ContractMessageCard({ msg }: { msg: ChatMessageItem }) {
  const t = useT();
  return (
    <div className={cn("flex", msg.isMine ? "justify-end" : "justify-start")}>
      <div className="max-w-[80%] space-y-0.5">
        <div className={cn(
          "rounded-2xl p-4 space-y-2",
          msg.isMine
            ? "rounded-tr-sm bg-primary-500"
            : "rounded-tl-sm border border-primary-200 bg-primary-50"
        )}>
          <div className="flex items-center gap-2">
            <ClipboardSignature className={cn("h-4 w-4", msg.isMine ? "text-white/80" : "text-primary-500")} />
            <p className={cn("text-sm font-bold", msg.isMine ? "text-white" : "text-primary-900")}>
              {t("employer.chatContractSent")}
            </p>
          </div>
          <p className={cn("text-xs leading-relaxed", msg.isMine ? "text-white/80" : "text-primary-700")}>
            {msg.content}
          </p>
          {msg.isMine && (
            <p className="text-xs text-white/60 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {t("employer.chatWaitingSign")}
            </p>
          )}
        </div>
        <p className={cn("text-[10px] text-neutral-400", msg.isMine ? "text-right" : "text-left")}>
          {formatTime(msg.createdAt)}
        </p>
      </div>
    </div>
  );
}

// ─── Message Bubble ────────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: ChatMessageItem }) {
  if (msg.messageType === "CONTRACT") {
    return <ContractMessageCard msg={msg} />;
  }
  return (
    <div className={cn("flex", msg.isMine ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[72%] space-y-0.5")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            msg.isMine
              ? "rounded-tr-sm bg-primary-500 text-white"
              : "rounded-tl-sm bg-white border border-neutral-200 text-neutral-800"
          )}
        >
          {msg.content}
        </div>
        <p className={cn("text-[10px] text-neutral-400", msg.isMine ? "text-right" : "text-left")}>
          {formatTime(msg.createdAt)}
        </p>
      </div>
    </div>
  );
}

// ─── Date Divider ─────────────────────────────────────────────────────────────

function DateDivider({ date }: { date: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-1 border-t border-neutral-200" />
      <span className="text-xs text-neutral-400">{formatDate(date)}</span>
      <div className="flex-1 border-t border-neutral-200" />
    </div>
  );
}

// ─── Chat Room Content ────────────────────────────────────────────────────────

function ChatRoomContent({ roomPublicId }: { roomPublicId: string }) {
  const t = useT();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [input, setInput] = React.useState("");
  const bottomRef = React.useRef<HTMLDivElement>(null);

  // Fetch messages with polling
  const { data, isLoading, isError } = useQuery({
    queryKey: ["employer-chat-messages", roomPublicId],
    queryFn: () => chatApi.getMessages(roomPublicId, 0, 100),
    refetchInterval: 5000,
  });

  const messages = React.useMemo(() => {
    const list = [...(data?.content ?? [])];
    return list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [data]);

  // Scroll to bottom when messages arrive
  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const sendMutation = useMutation({
    mutationFn: (content: string) => chatApi.sendMessage(roomPublicId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employer-chat-messages", roomPublicId] });
      queryClient.invalidateQueries({ queryKey: ["employer-chats"] });
    },
  });

  function handleSend() {
    const text = input.trim();
    if (!text || sendMutation.isPending) return;
    setInput("");
    sendMutation.mutate(text);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center px-4">
        <AlertCircle className="h-10 w-10 text-neutral-300" />
        <p className="text-sm text-neutral-500">{t("employer.chatLoadFailed")}</p>
      </div>
    );
  }

  return (
    <>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm text-neutral-400">{t("employer.chatRoomEmpty")}</p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <React.Fragment key={msg.publicId}>
            {(idx === 0 || !isSameDay(messages[idx - 1].createdAt, msg.createdAt)) && (
              <DateDivider date={msg.createdAt} />
            )}
            <MessageBubble msg={msg} />
          </React.Fragment>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-neutral-200 bg-white px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("employer.chatInputPlaceholder")}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all max-h-32"
            style={{ overflowY: input.split("\n").length > 3 ? "auto" : "hidden" }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sendMutation.isPending}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-40 transition-all active:scale-95"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EmployerChatRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = useT();
  const { id } = React.use(params);

  const { data: room } = useQuery({
    queryKey: ["employer-chat-room", id],
    queryFn: () => chatApi.getRoom(id),
    retry: false,
  });

  return (
    <div className="flex flex-col rounded-xl border border-neutral-100 bg-neutral-50 shadow-card-md overflow-hidden" style={{ height: "calc(100vh - 10rem)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-neutral-200 bg-white px-4 py-3 flex-shrink-0">
        <Link
          href="/employer/chats"
          className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-neutral-100 transition-colors"
        >
          <ChevronLeft className="h-5 w-5 text-neutral-600" />
        </Link>
        <div>
          <h1 className="text-sm font-bold text-neutral-950">
            {room?.teamName ?? t("employer.chatTitle")}
          </h1>
          {room?.teamName && (
            <p className="text-xs text-neutral-400">{t("employer.chatWith")}</p>
          )}
        </div>
      </div>

      <ChatRoomContent roomPublicId={id} />
    </div>
  );
}

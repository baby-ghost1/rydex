"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useSession } from "next-auth/react";
import { Loader2, Send, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/client-api";
import { initials, timeAgo, cn } from "@rydex/shared/utils";

export interface ChatMessage {
  _id: string;
  sender: string | { _id: string; name: string; image?: string; role?: string };
  text: string;
  createdAt: string;
}

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export default function ChatDrawer({
  open,
  onClose,
  bookingId,
  counterpartName,
  messages,
  onMessageSent,
}: {
  open: boolean;
  onClose: () => void;
  bookingId: string;
  counterpartName: string;
  messages: ChatMessage[];
  onMessageSent: (message: ChatMessage) => void;
}) {
  const { data: session } = useSession();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [pending, setPending] = useState<ChatMessage[]>([]);
  const pendingIdRef = useRef(0);
  const allMessages = [...messages, ...pending];
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    inputRef.current?.focus();

    fetch(`/api/bookings/${bookingId}/suggestions`)
      .then((res) => res.json())
      .then((data) => setSuggestions(data.suggestions || []))
      .catch(() => setSuggestions([]));

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(focusableSelector),
      ).filter((element) => element.getClientRects().length > 0);

      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
      previousFocus?.focus();
    };
  }, [open, bookingId]);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
      });
    }
  }, [messages.length, pending.length, open, reduceMotion]);

  async function send(value?: string) {
    const content = (value ?? text).trim();
    if (!content || sending) return;
    pendingIdRef.current += 1;
    const optimistic: ChatMessage = {
      _id: `pending-${pendingIdRef.current}`,
      sender: {
        _id: session?.user?.id || "",
        name: session?.user?.name || "You",
        image: session?.user?.image || "",
        role: session?.user?.role,
      },
      text: content,
      createdAt: new Date().toISOString(),
    };
    setPending((current) => [...current, optimistic]);
    setText("");
    setSending(true);
    try {
      const data = await api<{ message: ChatMessage }>(
        `/api/bookings/${bookingId}/messages`,
        {
          method: "POST",
          json: { text: content },
        },
      );
      setPending((current) => current.filter((item) => item._id !== optimistic._id));
      onMessageSent(data.message);
    } catch (error) {
      setPending((current) => current.filter((item) => item._id !== optimistic._id));
      setText(content);
      toast.error(
        error instanceof Error ? error.message : "Message could not be sent.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] bg-ink/50 backdrop-blur-sm"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.aside
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ride-chat-title"
            initial={reduceMotion ? false : { x: "100%" }}
            animate={{ x: 0 }}
            exit={reduceMotion ? undefined : { x: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 330 }}
            className="surface-default absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-line bg-surface text-fg shadow-2xl sm:rounded-l-[28px]"
          >
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink text-xs font-bold text-white"
                  aria-hidden="true"
                >
                  {initials(counterpartName)}
                </div>
                <div className="min-w-0">
                  <p
                    id="ride-chat-title"
                    className="truncate text-sm font-bold text-fg"
                  >
                    {counterpartName || "Ride chat"}
                  </p>
                  <p className="flex items-center gap-1.5 text-xs text-success">
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-success"
                      aria-hidden="true"
                    />
                    Ride chat
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close chat"
                className="icon-button shrink-0 border border-line bg-surface text-fg-muted hover:bg-surface-muted hover:text-fg"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto bg-surface-muted px-4 py-5">
              {allMessages.length === 0 && (
                <div className="mx-auto mt-10 max-w-[260px] text-center">
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-line bg-surface shadow-sm">
                    <Send
                      className="h-5 w-5 text-fg-subtle"
                      aria-hidden="true"
                    />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-fg">
                    Start the conversation
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-fg-muted">
                    Coordinate pickup, share gate details or ask your{" "}
                    {counterpartName ? "ride partner" : "rider"} a question.
                  </p>
                </div>
              )}

              {allMessages.map((message) => {
                const senderId =
                  typeof message.sender === "string"
                    ? message.sender
                    : message.sender?._id;
                const mine = senderId === session?.user?.id;

                return (
                  <div
                    key={message._id}
                    className={cn("flex", mine ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm",
                        mine
                          ? "rounded-br-md bg-ink text-white"
                          : "rounded-bl-md border border-line bg-surface text-fg",
                      )}
                    >
                      {!mine && (
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">
                          {typeof message.sender === "object"
                            ? message.sender?.name
                            : "RYDEX"}
                        </p>
                      )}
                      <p className="whitespace-pre-wrap">{message.text}</p>
                      <p
                        className={cn(
                          "mt-1 text-[10px]",
                          mine ? "text-fg-inverse-muted" : "text-fg-subtle",
                        )}
                      >
                        {timeAgo(message.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {suggestions.length > 0 && (
              <div className="border-t border-line bg-surface px-4 pb-1 pt-3">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  Smart replies
                </p>
                <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => send(suggestion)}
                      className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-line-strong bg-surface px-3.5 text-xs text-fg-muted transition hover:border-fg-subtle hover:bg-surface-muted hover:text-fg active:scale-[0.98]"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form
              onSubmit={(event) => {
                event.preventDefault();
                send();
              }}
              className="flex items-end gap-2 border-t border-line bg-surface p-4"
            >
              <label htmlFor="ride-chat-message" className="sr-only">
                Message {counterpartName || "ride partner"}
              </label>
              <textarea
                id="ride-chat-message"
                ref={inputRef}
                rows={1}
                value={text}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    send();
                  }
                }}
                placeholder="Write a message…"
                maxLength={1000}
                className="input max-h-28 min-h-11 flex-1 resize-none rounded-2xl"
              />
              <button
                type="submit"
                disabled={!text.trim() || sending}
                aria-label="Send message"
                aria-busy={sending}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ink text-white transition hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-45"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Send className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </form>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot, User } from "lucide-react";

const DEPT_COLORS: Record<string, string> = {
  command:     "text-purple-400",
  sales:       "text-blue-400",
  marketing:   "text-pink-400",
  analytics:   "text-cyan-400",
  engineering: "text-green-400",
  operations:  "text-orange-400",
  finance:     "text-yellow-400",
  research:    "text-indigo-400",
};

interface Agent {
  id: string;
  name: string;
  department: string;
  description: string;
  model: string;
}

interface Message {
  role: "user" | "agent";
  agentName?: string;
  content: string;
  runId?: string;
  ts: Date;
}

export default function CommandPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Fetch available agents from API on mount
  useEffect(() => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const secret = process.env.NEXT_PUBLIC_DASHBOARD_SECRET;
    if (secret) headers["Authorization"] = `Bearer ${secret}`;

    fetch("/api/command", { headers })
      .then((r) => r.json())
      .then((data: { agents?: Agent[] }) => {
        const list = data.agents ?? [];
        setAgents(list);
        if (list.length > 0) setSelectedAgent(list[0]);
      })
      .catch(console.error)
      .finally(() => setLoadingAgents(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!message.trim() || loading || !selectedAgent) return;

    const userMsg: Message = { role: "user", content: message.trim(), ts: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setMessage("");
    setLoading(true);

    try {
      const reqHeaders: Record<string, string> = { "Content-Type": "application/json" };
      const secret = process.env.NEXT_PUBLIC_DASHBOARD_SECRET;
      if (secret) reqHeaders["Authorization"] = `Bearer ${secret}`;

      const res = await fetch("/api/command", {
        method: "POST",
        headers: reqHeaders,
        body: JSON.stringify({ agentName: selectedAgent.id, message: userMsg.content }),
      });

      const data = await res.json() as {
        ok: boolean;
        queued?: boolean;
        runId?: string;
        message?: string;
        output?: { summary: string };
        error?: string;
      };

      const content = data.queued
        ? `⚡ Kjøres i bakgrunnen — sjekk kjøringer-siden for resultat.\n\n_run/${data.runId?.slice(-8)}_`
        : data.ok && data.output?.summary
          ? data.output.summary
          : (data.error ?? "Noe gikk galt.");

      const agentMsg: Message = {
        role: "agent",
        agentName: selectedAgent.name,
        content,
        runId: data.runId,
        ts: new Date(),
      };

      setMessages((prev) => [...prev, agentMsg]);
    } catch {
      setMessages((prev) => [...prev, {
        role: "agent",
        agentName: selectedAgent.name,
        content: "Klarte ikke koble til agenten. Sjekk Vercel-loggene.",
        ts: new Date(),
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  const agentColor = selectedAgent ? (DEPT_COLORS[selectedAgent.department] ?? "text-fg-muted") : "text-fg-muted";

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <h1 className="text-lg font-semibold">Kommando</h1>
        <p className="text-sm text-fg-muted">Snakk direkte med agentene dine</p>
      </div>

      {/* Agent selector */}
      <div className="border-b border-border px-6 py-3 flex gap-2 overflow-x-auto">
        {loadingAgents ? (
          <div className="flex items-center gap-2 text-sm text-fg-muted py-1">
            <Loader2 className="size-3 animate-spin" /> Laster agenter...
          </div>
        ) : (
          agents.map((agent) => {
            const color = DEPT_COLORS[agent.department] ?? "text-fg-muted";
            return (
              <button
                key={agent.id}
                onClick={() => { setSelectedAgent(agent); setMessages([]); }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  selectedAgent?.id === agent.id
                    ? "bg-bg-elevated text-fg border border-border"
                    : "text-fg-muted hover:text-fg hover:bg-bg-surface"
                }`}
              >
                <span className={color}>●</span>
                {agent.name}
                <span className="text-fg-subtle text-xs">{agent.department}</span>
              </button>
            );
          })
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && selectedAgent && (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
            <div className={`text-4xl ${agentColor}`}>●</div>
            <div>
              <div className="font-semibold text-fg">{selectedAgent.name} er klar</div>
              <div className="text-sm text-fg-muted mt-1">{selectedAgent.description || selectedAgent.department}</div>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "agent" && (
              <div className={`size-8 rounded-full bg-bg-elevated border border-border flex items-center justify-center shrink-0 ${agentColor}`}>
                <Bot className="size-4" />
              </div>
            )}
            <div className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${
              msg.role === "user"
                ? "bg-accent text-white"
                : "bg-bg-elevated border border-border text-fg"
            }`}>
              {msg.role === "agent" && (
                <div className={`text-xs font-medium mb-1.5 ${agentColor}`}>{msg.agentName}</div>
              )}
              <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
              <div className="text-xs mt-2 opacity-50">
                {msg.ts.toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" })}
                {msg.runId && <span className="ml-2">· run/{msg.runId.slice(-8)}</span>}
              </div>
            </div>
            {msg.role === "user" && (
              <div className="size-8 rounded-full bg-bg-elevated border border-border flex items-center justify-center shrink-0">
                <User className="size-4" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className={`size-8 rounded-full bg-bg-elevated border border-border flex items-center justify-center ${agentColor}`}>
              <Bot className="size-4" />
            </div>
            <div className="bg-bg-elevated border border-border rounded-xl px-4 py-3 flex items-center gap-2">
              <Loader2 className="size-4 animate-spin text-fg-muted" />
              <span className="text-sm text-fg-muted">{selectedAgent?.name ?? "Agent"} tenker...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border px-6 py-4">
        <div className="flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Snakk med ${selectedAgent?.name ?? "en agent"}...`}
            rows={1}
            className="flex-1 resize-none bg-bg-surface border border-border rounded-xl px-4 py-3 text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:border-accent transition-colors min-h-[48px] max-h-[160px]"
            style={{ height: "auto" }}
            onInput={(e) => {
              const t = e.currentTarget;
              t.style.height = "auto";
              t.style.height = `${Math.min(t.scrollHeight, 160)}px`;
            }}
          />
          <button
            onClick={() => void send()}
            disabled={!message.trim() || loading || !selectedAgent}
            className="size-12 rounded-xl bg-accent hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0"
          >
            {loading ? (
              <Loader2 className="size-4 text-white animate-spin" />
            ) : (
              <Send className="size-4 text-white" />
            )}
          </button>
        </div>
        <p className="text-xs text-fg-subtle mt-2">Enter for å sende · Shift+Enter for ny linje</p>
      </div>
    </div>
  );
}

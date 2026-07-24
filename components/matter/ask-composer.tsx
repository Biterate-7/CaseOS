"use client";

import {
  CornerDownLeft,
  FileText,
  Loader2,
  Lock,
  RotateCw,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRef, useState, useTransition } from "react";

import { ResearchProgress } from "@/components/matter/research-progress";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { askQuestion } from "@/lib/actions/ai";
import {
  countLabel,
  knowledgeModeDescription,
  knowledgeModeLabel,
  type KnowledgeMode,
} from "@/lib/format";
import { cn } from "@/lib/utils";

const MODE_ICON: Record<KnowledgeMode, typeof FileText> = {
  DOCUMENT_ONLY: FileText,
  DOCUMENT_PLUS_AI: Sparkles,
};

/**
 * Enhanced Research knowledge-mode selector. A segmented control rather than
 * a dropdown: both options stay visible, so the existence of the stricter
 * default is itself communicated. The description line spells out exactly
 * what the selected mode permits before anything is asked.
 */
function KnowledgeModeSelector({
  mode,
  onChange,
  disabled,
}: {
  mode: KnowledgeMode;
  onChange: (mode: KnowledgeMode) => void;
  disabled: boolean;
}) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="sr-only">Knowledge mode</legend>
      <div
        role="radiogroup"
        aria-label="Knowledge mode"
        className="flex w-fit items-center gap-0.5 rounded-lg border bg-muted/60 p-0.5"
      >
        {(["DOCUMENT_ONLY", "DOCUMENT_PLUS_AI"] as const).map((option) => {
          const Icon = MODE_ICON[option];
          const selected = mode === option;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(option)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium",
                "transition-[background-color,color,box-shadow] duration-150 outline-none",
                "focus-visible:ring-3 focus-visible:ring-ring/50",
                selected
                  ? option === "DOCUMENT_PLUS_AI"
                    ? "bg-card text-ai-context shadow-xs ring-1 ring-ai-context-border"
                    : "bg-card text-foreground shadow-xs ring-1 ring-border"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-3 shrink-0" />
              {knowledgeModeLabel[option]}
            </button>
          );
        })}
      </div>
      <p className="text-[0.6875rem] leading-snug text-muted-foreground">
        {knowledgeModeDescription[mode]}
      </p>
    </fieldset>
  );
}

/**
 * Query input. Not a chat box: the affordance is "ask this project a
 * question", and the scope of what can be answered is stated on the control
 * itself rather than discovered by getting a refusal.
 */
function AskComposer({
  matterId,
  readyDocumentCount,
}: {
  matterId: string;
  readyDocumentCount: number;
}) {
  const [error, setError] = useState<{ message: string; retryable: boolean } | null>(null);
  const [mode, setMode] = useState<KnowledgeMode>("DOCUMENT_ONLY");
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const reduceMotion = useReducedMotion();

  const grounded = readyDocumentCount > 0;
  const disabled = isPending || !grounded;

  // Transient provider failures already got three automatic attempts server
  // side. Offering a manual retry is still worth it: capacity blips often
  // clear in the seconds it takes to read the message.
  const RETRYABLE = new Set(["OVERLOADED", "RATE_LIMITED", "TIMEOUT", "NETWORK", "SERVER", "EMPTY"]);

  function run(question: string) {
    const formData = new FormData();
    formData.set("question", question);
    formData.set("knowledgeMode", mode);

    setError(null);
    startTransition(async () => {
      const result = await askQuestion(matterId, formData);
      if (result.ok) {
        // Only cleared on success — a failed request keeps the question in
        // the box so nothing has to be retyped.
        formRef.current?.reset();
      } else {
        setError({ message: result.error, retryable: RETRYABLE.has(result.code) });
      }
    });
  }

  function handleSubmit(formData: FormData) {
    run(String(formData.get("question") ?? ""));
  }

  return (
    <div className="flex flex-col gap-3">
      <form ref={formRef} action={handleSubmit} className="flex flex-col gap-2">
        <KnowledgeModeSelector
          mode={mode}
          onChange={setMode}
          disabled={disabled}
        />
        <div
          className={cn(
            "rounded-xl border bg-card shadow-xs transition-[border-color,box-shadow] duration-200",
            "focus-within:border-ring focus-within:shadow-sm",
            disabled && "opacity-70"
          )}
        >
          <Textarea
            ref={textareaRef}
            name="question"
            rows={3}
            required
            disabled={disabled}
            placeholder={
              grounded
                ? "Ask what the documents in this project say…"
                : "Upload a document first — answers are grounded only in this project's sources."
            }
            className="resize-none border-0 bg-transparent p-3 text-sm shadow-none focus-visible:ring-0"
            onKeyDown={(e) => {
              // Enter submits, Shift+Enter for a newline. Faster for the
              // repeated-query workflow this panel is built around.
              if (e.key === "Enter" && !e.shiftKey && !disabled) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
          />

          <div className="flex items-center justify-between gap-3 border-t px-3 py-2">
            <p className="inline-flex items-center gap-1.5 text-[0.6875rem] leading-tight text-muted-foreground">
              <Lock className="size-3 shrink-0" />
              {!grounded ? (
                <>No indexed documents in this project yet</>
              ) : mode === "DOCUMENT_ONLY" ? (
                <>
                  Answers use only this project&apos;s{" "}
                  {countLabel(readyDocumentCount, "indexed document")}
                </>
              ) : (
                <>
                  Grounded in {countLabel(readyDocumentCount, "indexed document")},
                  plus labelled AI context
                </>
              )}
            </p>

            <Button type="submit" size="sm" disabled={disabled}>
              {isPending ? (
                <>
                  <Loader2 className="size-3 animate-spin" />
                  Researching…
                </>
              ) : (
                <>
                  Ask
                  <CornerDownLeft className="size-3" />
                </>
              )}
            </Button>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="flex flex-col gap-2 rounded-lg border border-rejected-border bg-rejected-surface/50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="flex items-start gap-1.5 text-xs leading-relaxed text-rejected">
              <TriangleAlert className="mt-px size-3.5 shrink-0" />
              {error.message}
            </p>
            {error.retryable && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => run(textareaRef.current?.value ?? "")}
                className="shrink-0"
              >
                <RotateCw className="size-3.5" />
                Try again
              </Button>
            )}
          </div>
        )}
      </form>

      <AnimatePresence>
        {isPending && (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
          >
            <ResearchProgress />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export { AskComposer };

"use client";

import {
  CornerDownLeft,
  FileText,
  Globe,
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
  DOCUMENT_PLUS_EXTERNAL: Globe,
};

// The accent a mode wears when selected — matches how its content is rendered
// in the answer (violet AI context, indigo external), so the control previews
// what you'll get. Document-only stays neutral: it adds no new provenance.
const MODE_SELECTED_CLASS: Record<KnowledgeMode, string> = {
  DOCUMENT_ONLY: "bg-surface-highest text-foreground shadow-sm ring-1 ring-border",
  DOCUMENT_PLUS_AI:
    "bg-ai-context-surface text-ai-context shadow-sm ring-1 ring-ai-context-border",
  DOCUMENT_PLUS_EXTERNAL:
    "bg-external-surface text-external shadow-sm ring-1 ring-external-border",
};

const MODE_OPTIONS = [
  "DOCUMENT_ONLY",
  "DOCUMENT_PLUS_AI",
  "DOCUMENT_PLUS_EXTERNAL",
] as const;

/**
 * Knowledge-mode selector. A segmented control rather than a dropdown: every
 * option stays visible, so the existence of the stricter default is itself
 * communicated. The description line spells out exactly what the selected mode
 * permits before anything is asked.
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
    <fieldset className="flex flex-col gap-2.5">
      <legend className="sr-only">Knowledge mode</legend>
      <div
        role="radiogroup"
        aria-label="Knowledge mode"
        className="flex w-fit flex-wrap items-center gap-1 rounded-xl bg-surface-lowest/70 p-1 ring-1 ring-border"
      >
        {MODE_OPTIONS.map((option) => {
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
                "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-label-sm",
                "transition-[background-color,color,box-shadow] duration-150 outline-none",
                "focus-visible:ring-3 focus-visible:ring-ring/50",
                "disabled:pointer-events-none disabled:opacity-50",
                selected
                  ? MODE_SELECTED_CLASS[option]
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-3.5 shrink-0" />
              {knowledgeModeLabel[option]}
            </button>
          );
        })}
      </div>
      <p className="text-body-sm leading-snug text-muted-foreground">
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
    <div className="flex flex-col gap-4">
      <form ref={formRef} action={handleSubmit} className="flex flex-col gap-4">
        <KnowledgeModeSelector
          mode={mode}
          onChange={setMode}
          disabled={disabled}
        />
        <div
          className={cn(
            "overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border transition-[box-shadow,--tw-ring-color] duration-250 ease-(--ease-liquid)",
            "focus-within:shadow-lg focus-within:ring-primary/40",
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
            className="resize-none rounded-none border-0 bg-transparent p-5 text-sm shadow-none focus-visible:bg-transparent focus-visible:ring-0"
            onKeyDown={(e) => {
              // Enter submits, Shift+Enter for a newline. Faster for the
              // repeated-query workflow this panel is built around.
              if (e.key === "Enter" && !e.shiftKey && !disabled) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
          />

          <div className="flex items-center justify-between gap-3 border-t border-border bg-surface-lowest/40 px-5 py-3">
            <p className="inline-flex items-center gap-2 font-mono text-meta-xs leading-tight text-muted-foreground">
              <Lock className="size-3.5 shrink-0" />
              {!grounded ? (
                <>No indexed documents in this project yet</>
              ) : mode === "DOCUMENT_ONLY" ? (
                <>
                  Answers use only this project&apos;s{" "}
                  {countLabel(readyDocumentCount, "indexed document")}
                </>
              ) : mode === "DOCUMENT_PLUS_AI" ? (
                <>
                  Grounded in {countLabel(readyDocumentCount, "indexed document")},
                  plus labelled AI context
                </>
              ) : (
                <>
                  Grounded in {countLabel(readyDocumentCount, "indexed document")},
                  plus verified external sources when needed
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
            className="flex flex-col gap-3 rounded-xl border border-rejected-border bg-rejected-surface/50 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="flex items-start gap-2.5 text-body-sm leading-relaxed text-rejected">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
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

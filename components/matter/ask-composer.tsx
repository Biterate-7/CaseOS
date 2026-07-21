"use client";

import { CornerDownLeft, Lock } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRef, useState, useTransition } from "react";

import { ResearchProgress } from "@/components/matter/research-progress";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { askQuestion } from "@/lib/actions/ai";
import { countLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

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
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const reduceMotion = useReducedMotion();

  const grounded = readyDocumentCount > 0;
  const disabled = isPending || !grounded;

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await askQuestion(matterId, formData);
      if (!result.ok) setError(result.error);
      else formRef.current?.reset();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <form ref={formRef} action={handleSubmit} className="flex flex-col gap-2">
        <div
          className={cn(
            "rounded-xl border bg-card shadow-xs transition-[border-color,box-shadow] duration-200",
            "focus-within:border-ring focus-within:shadow-sm",
            disabled && "opacity-70"
          )}
        >
          <Textarea
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
              {grounded ? (
                <>
                  Answers use only this project&apos;s{" "}
                  {countLabel(readyDocumentCount, "indexed document")}
                </>
              ) : (
                <>No indexed documents in this project yet</>
              )}
            </p>

            <Button type="submit" size="sm" disabled={disabled}>
              {isPending ? "Researching…" : "Ask"}
              {!isPending && <CornerDownLeft className="size-3" />}
            </Button>
          </div>
        </div>

        {error && (
          <p role="alert" className="text-xs text-rejected">
            {error}
          </p>
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

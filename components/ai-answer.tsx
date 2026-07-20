import { Fragment } from "react";

/**
 * Renders an AI answer, converting [Sn] citation markers into superscript
 * badges. Pure rendering — safe as a server component.
 */
export function AiAnswer({ answer }: { answer: string }) {
  const parts = answer.split(/(\[S\d+\])/g);
  return (
    <p className="whitespace-pre-wrap text-sm leading-relaxed">
      {parts.map((part, i) => {
        const marker = part.match(/^\[S(\d+)\]$/);
        if (!marker) return <Fragment key={i}>{part}</Fragment>;
        return (
          <sup
            key={i}
            className="mx-0.5 inline-flex items-center rounded bg-primary/10 px-1 font-mono text-[0.65rem] font-semibold text-primary"
            title={`Cited source S${marker[1]}`}
          >
            S{marker[1]}
          </sup>
        );
      })}
    </p>
  );
}

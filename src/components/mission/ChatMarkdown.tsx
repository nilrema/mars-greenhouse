import { Fragment } from 'react';

function renderInline(text: string) {
  const segments = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean);

  return segments.map((segment, index) => {
    if (segment.startsWith('**') && segment.endsWith('**')) {
      return <strong key={`${segment}-${index}`} className="font-semibold text-foreground">{segment.slice(2, -2)}</strong>;
    }

    if (segment.startsWith('`') && segment.endsWith('`')) {
      return (
        <code
          key={`${segment}-${index}`}
          className="rounded-md bg-slate-950/10 px-1.5 py-0.5 font-mono text-[0.92em] text-emerald-900"
        >
          {segment.slice(1, -1)}
        </code>
      );
    }

    return <Fragment key={`${segment}-${index}`}>{segment}</Fragment>;
  });
}

export function ChatMarkdown({ content }: { content: string }) {
  const blocks = content
    .trim()
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <div className="space-y-3 text-[13px] leading-6">
      {blocks.map((block, index) => {
        const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
        if (lines.length === 0) {
          return null;
        }

        const firstLine = lines[0];
        if (firstLine.startsWith('### ')) {
          return (
            <h4 key={index} className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-800/80">
              {renderInline(firstLine.slice(4))}
            </h4>
          );
        }

        if (firstLine.startsWith('## ')) {
          return (
            <h3 key={index} className="text-sm font-semibold text-foreground">
              {renderInline(firstLine.slice(3))}
            </h3>
          );
        }

        if (lines.every((line) => /^[-*]\s+/.test(line))) {
          return (
            <ul key={index} className="space-y-2">
              {lines.map((line, itemIndex) => (
                <li key={itemIndex} className="flex gap-2 text-[13px] leading-6 text-foreground/90">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-emerald-700/70" />
                  <span>{renderInline(line.replace(/^[-*]\s+/, ''))}</span>
                </li>
              ))}
            </ul>
          );
        }

        if (lines.every((line) => /^\d+\.\s+/.test(line))) {
          return (
            <ol key={index} className="space-y-2">
              {lines.map((line, itemIndex) => {
                const match = line.match(/^(\d+)\.\s+(.*)$/);
                const ordinal = match?.[1] ?? `${itemIndex + 1}`;
                const body = match?.[2] ?? line;
                return (
                  <li key={itemIndex} className="grid grid-cols-[1.6rem_1fr] gap-2 text-[13px] leading-6 text-foreground/90">
                    <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border border-emerald-900/10 bg-emerald-900/5 text-[11px] font-semibold text-emerald-900/80">
                      {ordinal}
                    </span>
                    <span>{renderInline(body)}</span>
                  </li>
                );
              })}
            </ol>
          );
        }

        return (
          <p key={index} className="text-[13px] leading-6 text-foreground/88">
            {lines.map((line, lineIndex) => (
              <Fragment key={lineIndex}>
                {lineIndex > 0 ? <br /> : null}
                {renderInline(line)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

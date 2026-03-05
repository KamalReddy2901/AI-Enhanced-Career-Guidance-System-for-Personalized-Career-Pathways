/**
 * Lightweight markdown-to-JSX renderer for AI chat responses.
 * Handles: **bold**, *italic*, bullet lists (- / • / *), numbered lists, headings (###), and line breaks.
 */
export function renderMarkdown(text: string): JSX.Element {
  if (!text) return <></>;

  const lines = text.split('\n');
  const elements: JSX.Element[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Heading (### or ##)
    if (/^#{1,3}\s+/.test(line)) {
      const content = line.replace(/^#{1,3}\s+/, '');
      elements.push(
        <p key={i} className="font-semibold text-black mt-3 mb-1" style={{ fontSize: '0.92rem' }}>
          {renderInline(content)}
        </p>
      );
      continue;
    }

    // Bullet list item (- or • or *)
    if (/^[\s]*[-•*]\s+/.test(line)) {
      const content = line.replace(/^[\s]*[-•*]\s+/, '');
      elements.push(
        <div key={i} className="flex gap-2 ml-1 my-0.5">
          <span className="text-black/30 mt-0.5 shrink-0">•</span>
          <span>{renderInline(content)}</span>
        </div>
      );
      continue;
    }

    // Numbered list item
    if (/^[\s]*\d+[.)]\s+/.test(line)) {
      const num = line.match(/^[\s]*(\d+)[.)]\s+/)?.[1] || '';
      const content = line.replace(/^[\s]*\d+[.)]\s+/, '');
      elements.push(
        <div key={i} className="flex gap-2 ml-1 my-0.5">
          <span className="text-black/40 shrink-0 font-mono" style={{ fontSize: '0.78rem' }}>{num}.</span>
          <span>{renderInline(content)}</span>
        </div>
      );
      continue;
    }

    // Empty line = paragraph break
    if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />);
      continue;
    }

    // Regular line
    elements.push(
      <p key={i} className="my-0.5">
        {renderInline(line)}
      </p>
    );
  }

  return <>{elements}</>;
}

/** Render inline markdown: **bold**, *italic*, `code` */
function renderInline(text: string): (string | JSX.Element)[] {
  const parts: (string | JSX.Element)[] = [];
  // Match **bold**, *italic*, `code`
  const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)/g;
  let lastIndex = 0;
  let match;
  let keyIdx = 0;

  while ((match = regex.exec(text)) !== null) {
    // Text before match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      // **bold**
      parts.push(<strong key={keyIdx++} className="font-semibold text-black">{match[2]}</strong>);
    } else if (match[4]) {
      // *italic*
      parts.push(<em key={keyIdx++}>{match[4]}</em>);
    } else if (match[6]) {
      // `code`
      parts.push(
        <code key={keyIdx++} className="bg-black/8 px-1.5 py-0.5 text-black/70 font-[JetBrains_Mono]" style={{ fontSize: '0.82em' }}>
          {match[6]}
        </code>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

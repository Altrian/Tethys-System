/**
 * Parses dialogue text with speaker names and lore tags.
 * Automatically:
 *  - Uses <p> for simple dialogue lines
 *  - Uses <div> for complex lines or stage directions
 *  - Extracts stage directions in parentheses () or brackets []
 *  - Converts <te href=ID>...</te> to <span class="lore-link">
 */
export function formatDialogueText(rawText) {
  const fragment = document.createDocumentFragment();
  if (typeof rawText !== 'string') return fragment;

  const lines = rawText.split(/\\n|\n/g);
  const linePattern = /^([A-Z][A-Za-z0-9_’' -]+):\s*(.*)$/;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = linePattern.exec(trimmed);
    let speaker = null;
    let dialogue = trimmed;

    if (match) {
      speaker = match[1];
      dialogue = match[2];
    }

    // --- Detect stage directions ---
    const stageDirPattern = /(\([^\)]+\)|\[[^\]]+\])/g;
    let lastIndex = 0;
    let stageMatch;

    while ((stageMatch = stageDirPattern.exec(dialogue)) !== null) {
      // --- Add dialogue text before stage direction ---
      if (stageMatch.index > lastIndex) {
        const textPart = dialogue.slice(lastIndex, stageMatch.index).trim();
        if (textPart) {
          const p = document.createElement('p');
          p.className = 'dialogue-line';
          if (speaker) p.dataset.speaker = speaker;
          p.append(formatGameTextToNodes(textPart));
          fragment.append(p);
        }
      }

      // --- Add the stage direction as a separate div ---
      const stageDiv = document.createElement('div');
      stageDiv.className = 'stage-direction';
      stageDiv.textContent = stageMatch[1];
      fragment.append(stageDiv);

      lastIndex = stageMatch.index + stageMatch[1].length;
    }

    // --- Add remaining dialogue after the last stage direction ---
    const remaining = dialogue.slice(lastIndex).trim();
    if (remaining) {
      const p = document.createElement('p');
      p.className = 'dialogue-line';
      if (speaker) p.dataset.speaker = speaker;
      p.append(formatGameTextToNodes(remaining));
      fragment.append(p);
    }
  }

  return fragment;
}

/**
 * Converts <te href=ID>...</te> into <span class="lore-link"> safely.
 */
function formatGameTextToNodes(rawText) {
  const fragment = document.createDocumentFragment();
  const regex = /<te\s+href=(\d+)>(.*?)<\/te>/gi;

  let lastIndex = 0;
  let match;

  while ((match = regex.exec(rawText)) !== null) {
    const [fullMatch, id, innerText] = match;

    if (match.index > lastIndex) {
      fragment.append(document.createTextNode(rawText.slice(lastIndex, match.index)));
    }

    const span = document.createElement('span');
    span.className = 'lore-link';
    span.dataset.id = id;
    span.role = 'link';
    span.tabIndex = 0;
    span.textContent = innerText;
    fragment.append(span);

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < rawText.length) {
    fragment.append(document.createTextNode(rawText.slice(lastIndex)));
  }

  return fragment;
}

function isSeparatorRow(row: string): boolean {
  const cells = row
    .split("|")
    .map((cell) => cell.trim())
    .filter(Boolean);

  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function normalizeSingleLinePipeTables(markdown: string): string {
  return markdown.replace(/(?:^|\n)([^\n]*\|[^\n]*\|\s*\|[-:|\s]{6,}\|[^\n]*)/g, (match) => {
    const leadingNewline = match.startsWith("\n") ? "\n" : "";
    const content = match.trim();
    const separatorMatch = content.match(/\|\s*\|[-:|\s]{6,}\|/);

    if (!separatorMatch || separatorMatch.index == null) return match;

    const header = content.slice(0, separatorMatch.index).trim();
    const rest = content.slice(separatorMatch.index + 1).trim();
    const headerCells = header
      .split("|")
      .map((cell) => cell.trim())
      .filter(Boolean);
    const cells = rest
      .split("|")
      .map((cell) => cell.trim())
      .filter(Boolean);

    if (headerCells.length < 2 || cells.length < headerCells.length * 2) return match;

    const separatorCells = cells.slice(0, headerCells.length);
    if (!isSeparatorRow(`| ${separatorCells.join(" | ")} |`)) return match;

    const bodyCells = cells.slice(headerCells.length);
    const rowCount = Math.floor(bodyCells.length / headerCells.length);
    if (rowCount === 0) return match;

    const rows = [`| ${headerCells.join(" | ")} |`, `| ${separatorCells.join(" | ")} |`];
    for (let index = 0; index < rowCount; index++) {
      const rowCells = bodyCells.slice(
        index * headerCells.length,
        (index + 1) * headerCells.length,
      );
      rows.push(`| ${rowCells.join(" | ")} |`);
    }

    return `${leadingNewline}${rows.join("\n")}`;
  });
}

export function normalizeMarkdown(markdown: string): string {
  return normalizeSingleLinePipeTables(markdown);
}

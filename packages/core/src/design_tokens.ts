import { readFileSync } from 'fs';
import { resolve } from 'path';

export interface DesignTokens {
  colors: {
    background: string;
    surface: string;
    text: string;
    'text-muted': string;
    border: string;
    link: string;
    'nav-link': string;
    'nav-link-secondary': string;
    'placeholder-text': string;
  };
  typography: {
    'font-family': string;
    'line-height': string;
  };
  layout: {
    'max-width': string;
    padding: string;
    'nav-padding': string;
    'footer-margin-top': string;
  };
  buttons: {
    background: string;
    text: string;
    'border-radius': string;
    padding: string;
    'font-weight': string;
    'hover-background': string;
    'secondary-background': string;
    'secondary-text': string;
    'secondary-border': string;
  };
  forms: {
    'input-background': string;
    'input-border': string;
    'input-text': string;
    'input-radius': string;
    'input-padding': string;
    'label-color': string;
  };
  cards: {
    background: string;
    border: string;
    'border-radius': string;
    padding: string;
  };
}

export const DEFAULT_TOKENS: DesignTokens = {
  colors: {
    background: '#0f172a',
    surface: '#1e293b',
    text: '#e2e8f0',
    'text-muted': '#94a3b8',
    border: '#475569',
    link: '#60a5fa',
    'nav-link': '#93c5fd',
    'nav-link-secondary': '#cbd5e1',
    'placeholder-text': '#64748b',
  },
  typography: {
    'font-family': 'Arial, sans-serif',
    'line-height': '1.6',
  },
  layout: {
    'max-width': '800px',
    padding: '24px',
    'nav-padding': '12px 24px',
    'footer-margin-top': '48px',
  },
  buttons: {
    background: '#2563eb',
    text: '#ffffff',
    'border-radius': '6px',
    padding: '10px 20px',
    'font-weight': 'bold',
    'hover-background': '#1d4ed8',
    'secondary-background': 'transparent',
    'secondary-text': '#60a5fa',
    'secondary-border': '#60a5fa',
  },
  forms: {
    'input-background': '#1e293b',
    'input-border': '#475569',
    'input-text': '#e2e8f0',
    'input-radius': '4px',
    'input-padding': '8px 12px',
    'label-color': '#94a3b8',
  },
  cards: {
    background: '#1e293b',
    border: '#475569',
    'border-radius': '8px',
    padding: '20px',
  },
};

/**
 * Parse a DESIGN.md string into a flat section→key→value map.
 * Only `## section` headers and `- key: value` lines are recognized.
 */
export function parseDesignMarkdown(
  markdown: string,
): Record<string, Record<string, string>> {
  const sections: Record<string, Record<string, string>> = {};
  let current: string | null = null;

  for (const line of markdown.split('\n')) {
    const sectionMatch = line.match(/^##\s+(\S+)/);
    if (sectionMatch) {
      current = sectionMatch[1].toLowerCase();
      sections[current] = sections[current] ?? {};
      continue;
    }
    if (current) {
      const kvMatch = line.match(/^-\s+([^:]+):\s*(.+)$/);
      if (kvMatch) {
        sections[current][kvMatch[1].trim()] = kvMatch[2].trim();
      }
    }
  }
  return sections;
}

/**
 * Resolve design tokens using the three-tier lookup:
 *   1. payload.designMarkdown (if provided)
 *   2. DESIGN.md at repo root (if readable)
 *   3. built-in DEFAULT_TOKENS
 */
export function resolveTokens(designMarkdown?: string): DesignTokens {
  let raw: Record<string, Record<string, string>> = {};

  if (designMarkdown) {
    raw = parseDesignMarkdown(designMarkdown);
  } else {
    try {
      const repoRoot = resolve(__dirname, '..', '..', '..');
      const content = readFileSync(resolve(repoRoot, 'DESIGN.md'), 'utf-8');
      raw = parseDesignMarkdown(content);
    } catch {
      // No file found — fall through to defaults
    }
  }

  // Merge parsed values over defaults (section by section, key by key)
  const merged: DesignTokens = JSON.parse(JSON.stringify(DEFAULT_TOKENS));
  for (const section of Object.keys(merged) as Array<keyof DesignTokens>) {
    const overrides = raw[section];
    if (overrides) {
      for (const key of Object.keys(merged[section])) {
        if (overrides[key] !== undefined) {
          (merged[section] as Record<string, string>)[key] = overrides[key];
        }
      }
    }
  }
  return merged;
}

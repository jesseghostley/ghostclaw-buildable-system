# Design Tokens

Stitch generates this file. GhostClaw reads it at build time.
Only `## section` headers and `- key: value` lines are parsed.
Everything else (prose, blank lines, comments) is ignored.

## colors
- background: #0f172a
- surface: #1e293b
- text: #e2e8f0
- text-muted: #94a3b8
- border: #475569
- link: #60a5fa
- nav-link: #93c5fd
- nav-link-secondary: #cbd5e1
- placeholder-text: #64748b

## typography
- font-family: Arial, sans-serif
- line-height: 1.6

## layout
- max-width: 800px
- padding: 24px
- nav-padding: 12px 24px
- footer-margin-top: 48px

## buttons
- background: #2563eb
- text: #ffffff
- border-radius: 6px
- padding: 10px 20px
- font-weight: bold
- hover-background: #1d4ed8
- secondary-background: transparent
- secondary-text: #60a5fa
- secondary-border: #60a5fa

## forms
- input-background: #1e293b
- input-border: #475569
- input-text: #e2e8f0
- input-radius: 4px
- input-padding: 8px 12px
- label-color: #94a3b8

## cards
- background: #1e293b
- border: #475569
- border-radius: 8px
- padding: 20px

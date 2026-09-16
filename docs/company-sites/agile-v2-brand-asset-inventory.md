# Agile V2 Brand Asset Inventory

## Purpose

Preserve the recognizable parts of the existing Agile brand while rebuilding the flagship site as the AI Website & Growth System reference implementation.

This inventory records source assets and design cues only. It does **not** approve blindly copying files from the current WordPress installs into V2. Source files must be verified clean before promotion because `agilecontractormarketing.com` has a confirmed compromise/spam history and `agilemarketingsystems.com` recently required integrity repair.

## Primary brand property

`agilemarketingsystems.com` is the preferred brand source for the V2 company identity.

Current public brand cues worth preserving:

- company name: Agile Marketing Systems
- strong growth-oriented language
- recurring “Grow Your Business” theme
- recognizable Agile Marketing Systems wordmark/logo
- established favicon/brand mark
- innovation/agility positioning

The existing generic agency copy should not be carried forward as-is. The V2 offer remains:

> AI Website & Growth Systems for Contractors

## Identified AMS logo sources

Current WordPress media references observed publicly:

- `https://agilemarketingsystems.com/wp-content/uploads/2023/02/Agile-Marketing-Systems-e1680264690766-300x74.png`
- `https://agilemarketingsystems.com/wp-content/uploads/2023/02/Agile-Marketing-Systems-e1680264690766-768x190.png`
- `https://agilemarketingsystems.com/wp-content/uploads/2023/02/Agile-Marketing-Systems-e1680264690766-1024x253.png`
- `https://agilemarketingsystems.com/wp-content/uploads/2023/02/Agile-Marketing-Systems-e1680264690766-1536x380.png`

Current favicon/media reference observed publicly:

- `https://agilemarketingsystems.com/wp-content/uploads/2023/01/Agile-Marketing-Systems-Fevicon-1024x1024.png`

### Promotion rule

Do not hotlink these WordPress files in the final V2 site.

Before V2 use:

1. obtain/download the original asset from the trusted AMS source
2. inspect the file type and dimensions
3. confirm it is a normal image asset and contains no unexpected payload
4. rename it to a stable V2 asset path
5. place the verified clean copy inside the V2/EmDash asset bundle
6. use the bundled V2 asset, not the WordPress URL

Suggested final asset names:

- `/assets/brand/agile-marketing-systems-logo.png`
- `/assets/brand/agile-marketing-systems-mark.png`

## Agile Contractor Marketing assets

`agilecontractormarketing.com` contains useful historical contractor-market proof and customer/logo imagery, including public media references for contractor brands and project-app/result imagery.

Examples observed include:

- Jacobs Garage Door Repair logo
- All Garage Doors and Gates logo
- Mojo Garage Doors logo
- contractor branding/phone imagery
- historical result imagery

These may be useful later as verified proof/history, but **none should be automatically imported** from the compromised ACM WordPress installation.

For each ACM proof asset, require:

- verification that the underlying customer/project is legitimate
- permission/continued right to display where applicable
- clean source file verification
- accurate context for the claim being shown
- no reuse of hacked/spam pages or contaminated metadata

## V2 visual direction

The structural preview intentionally uses a neutral presentation layer. The branded V2 pass should add recognizable Agile identity without reverting to the old generic agency-site presentation.

Recommended visual principles:

- preserve the existing wordmark/brand mark
- keep the site bright, clean and high-contrast
- use strong large typography and clear system diagrams/cards
- make “growth system” the visual organizing concept
- favor product/system proof over decorative agency imagery
- use contractor project photography and system screenshots where proof is verified
- keep the component system portable for EmDash/AWF generation

## Header direction

Desktop header target:

- verified Agile logo at left
- System
- AI Websites
- Local SEO
- Projects
- Case Studies
- Contractors
- About
- `See What We’d Build` CTA

Mobile header target:

- verified Agile brand mark/wordmark
- compact navigation trigger
- persistent primary CTA only where it does not crowd the viewport

## Proof design rules

The old sites contain both legitimate marketing history and compromised material. V2 should use a stricter proof model.

Allowed only when verified:

- customer logos
- project photos
- quantified results
- testimonial quotes
- rankings/lead improvements
- before/after screenshots

If proof is unavailable, the relevant component remains hidden rather than substituting generic logos, stock claims or invented metrics.

## Current implementation implication

The current `render_emdash_homepage` skill should remain content/config driven, but the next branded pass should support a small explicit `brand` object rather than hard-coded styles.

Suggested contract:

```json
{
  "brand": {
    "name": "Agile Marketing Systems",
    "logoSrc": "/assets/brand/agile-marketing-systems-logo.png",
    "logoAlt": "Agile Marketing Systems",
    "markSrc": "/assets/brand/agile-marketing-systems-mark.png",
    "theme": {
      "text": "#10202e",
      "background": "#ffffff",
      "surface": "#f5f7f8",
      "accent": "verified-from-brand-asset"
    }
  }
}
```

Do not finalize an accent color by guessing. Derive it from the verified brand asset or explicitly choose a refreshed brand palette during design review.

## Next build action

1. add `brand` support to the component/fixture contract
2. keep logo fields optional until the verified files are bundled
3. implement the final navigation/header component
4. add a footer component with company/legal/ownership language
5. then layer verified logo/assets into preview

This keeps the runtime functional before asset verification while creating the correct path for the branded flagship site.

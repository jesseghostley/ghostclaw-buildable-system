# GhostClaw Documentation Structure Brief

## Purpose

GhostClaw is designed as a modular AI operating system and ecosystem platform capable of orchestrating agents, launching autonomous companies, and distributing capabilities through a marketplace.

As the system grows, the documentation must remain:

- understandable for developers
- navigable for contributors
- interpretable by AI agents
- scalable as the ecosystem expands

To achieve this, GhostClaw documentation follows the same structural philosophy used by large systems such as:

- Kubernetes
- Linux
- Stripe
- Terraform
- OpenAI SDKs

These systems organize documentation into clear conceptual layers, separating architecture, execution behavior, ecosystem usage, and reference material.

## Why large systems use this structure

Large technical systems organize documentation into layers because each audience approaches the system differently.

| Audience | What they need |
| --- | --- |
| Architects | Understand system design |
| Developers | Understand runtime behavior |
| Operators | Understand how systems interact |
| Ecosystem builders | Understand expansion and integrations |
| Contributors | Understand definitions and terminology |

Without layered documentation, users must search through unrelated files to understand the system.

## Current repository layout (actual)

All GhostClaw system documents currently live in a single folder:

```text
docs/ghostclaw-system/
```

The sections below represent a **logical structure** (conceptual grouping), not separate physical subdirectories.

## Logical structure

### Architecture

The Architecture layer explains how GhostClaw is designed at a conceptual and structural level.

- [ghostclaw_system_map.md](./ghostclaw_system_map.md)
- [ghostclaw_master_control_system.md](./ghostclaw_master_control_system.md)
- [ghostclaw_infrastructure_blueprint.md](./ghostclaw_infrastructure_blueprint.md)
- [ghostclaw_archetype_framework.md](./ghostclaw_archetype_framework.md)
- [ghostclaw_canonical_identity.md](./ghostclaw_canonical_identity.md)
- [ghostclaw_system_architecture.md](./ghostclaw_system_architecture.md)
- [ghostclaw_system_layers.md](./ghostclaw_system_layers.md)

This layer answers questions such as:

- What is GhostClaw?
- How are system components connected?
- What are the architectural principles?

### Runtime

The Runtime layer describes how GhostClaw behaves during execution.

- [ghostclaw_runtime_execution_spec.md](./ghostclaw_runtime_execution_spec.md)
- [ghostclaw_runtime_signals.md](./ghostclaw_runtime_signals.md)
- [ghostclaw_planner_actions.md](./ghostclaw_planner_actions.md)
- [ghostclaw_agent_registry.md](./ghostclaw_agent_registry.md)
- [ghostclaw_skill_registry.md](./ghostclaw_skill_registry.md)

This layer answers questions such as:

- How do agents execute tasks?
- What signals trigger system actions?
- How are skills registered and used?
- How does the planner coordinate agents?

### Ecosystem

The Ecosystem layer describes how GhostClaw expands beyond the core runtime.

- [ghostclaw_company_factory.md](./ghostclaw_company_factory.md)
- [ghostclaw_ecosystem_growth_engine.md](./ghostclaw_ecosystem_growth_engine.md)
- [ghostclaw_marketplace_schema.md](./ghostclaw_marketplace_schema.md)
- [ghostclaw_ghost_mart_launch_catalog.md](./ghostclaw_ghost_mart_launch_catalog.md)

This layer answers questions such as:

- How are autonomous companies created?
- How does GhostClaw grow its ecosystem?
- How are capabilities distributed through Ghost Mart?

### Reference

The Reference layer provides canonical definitions used across the system.

- [ghostclaw_system_glossary.md](./ghostclaw_system_glossary.md)
- [ghostclaw_naming_and_origin.md](./ghostclaw_naming_and_origin.md)

This layer helps ensure consistency in terminology, core concepts, and naming conventions.

## Benefits of this structure

Organizing GhostClaw documentation into layered sections provides several advantages:

1. **Scalability**
   As GhostClaw grows to include more agents, skills, and companies, documentation remains organized and navigable.

2. **Developer clarity**
   New contributors can read architecture first, then runtime behavior.

3. **AI readability**
   A clear hierarchy improves machine interpretation for AI-assisted workflows.

4. **Ecosystem expansion**
   Separating ecosystem materials from runtime materials makes the platform easier to extend.

5. **Professional system documentation**
   This organization aligns with common documentation practices used by major infrastructure platforms.

## Long-term vision

As GhostClaw evolves, this structure will support growth of:

- autonomous agents
- reusable skills
- digital company blueprints
- distributed marketplaces
- AI-driven infrastructure

The documentation becomes a living manual for the GhostClaw operating system.
 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/docs/ghostclaw-system/README.md b/docs/ghostclaw-system/README.md
index 454a3889ba0b59f74112d4d19405bab7176895cf..479a4f358b7bfa32f206afec2d1dd86000db2a8f 100644
--- a/docs/ghostclaw-system/README.md
+++ b/docs/ghostclaw-system/README.md
@@ -1,213 +1,182 @@
-GhostClaw Documentation Structure Brief
-Purpose
+# GhostClaw Documentation Structure Brief
+
+## Purpose
 
 GhostClaw is designed as a modular AI operating system and ecosystem platform capable of orchestrating agents, launching autonomous companies, and distributing capabilities through a marketplace.
 
 As the system grows, the documentation must remain:
 
-understandable for developers
-
-navigable for contributors
-
-interpretable by AI agents
-
-scalable as the ecosystem expands
+- understandable for developers
+- navigable for contributors
+- interpretable by AI agents
+- scalable as the ecosystem expands
 
 To achieve this, GhostClaw documentation follows the same structural philosophy used by large systems such as:
 
-Kubernetes
-
-Linux
-
-Stripe
-
-Terraform
-
-OpenAI SDKs
+- Kubernetes
+- Linux
+- Stripe
+- Terraform
+- OpenAI SDKs
 
 These systems organize documentation into clear conceptual layers, separating architecture, execution behavior, ecosystem usage, and reference material.
 
 This approach prevents documentation from becoming a flat list of files and instead creates a logical operating system manual.
 
-Why Large Systems Use This Structure
+## Why large systems use this structure
 
 Large technical systems organize documentation into layers because each audience approaches the system differently.
 
-Audience	What they need
-Architects	Understand system design
-Developers	Understand runtime behavior
-Operators	Understand how systems interact
-Ecosystem builders	Understand expansion and integrations
-Contributors	Understand definitions and terminology
+| Audience | What they need |
+| --- | --- |
+| Architects | Understand system design |
+| Developers | Understand runtime behavior |
+| Operators | Understand how systems interact |
+| Ecosystem builders | Understand expansion and integrations |
+| Contributors | Understand definitions and terminology |
 
 Without layered documentation, users must search through unrelated files to understand the system.
 
 Projects like Kubernetes and Stripe solve this by separating documentation into categories such as:
 
-architecture
-
-runtime behavior
-
-integrations
-
-ecosystem
-
-reference material
+- architecture
+- runtime behavior
+- integrations
+- ecosystem
+- reference material
 
 GhostClaw follows the same approach.
 
-GhostClaw Documentation Structure
+## GhostClaw documentation structure
 
-The GhostClaw system documentation is organized into four core sections.
+The GhostClaw system documentation is organized into four core sections:
 
-docs
-└ ghostclaw-system
-   ├ architecture
-   ├ runtime
-   ├ ecosystem
-   └ reference
+```text
+docs/
+└── ghostclaw-system/
+    ├── architecture/
+    ├── runtime/
+    ├── ecosystem/
+    └── reference/
+```
 
 Each section represents a different layer of understanding.
 
-Architecture
+## Architecture
 
 The Architecture section explains how GhostClaw is designed at a conceptual and structural level.
 
 These documents describe the system’s major components and how they relate to one another.
 
-Files:
-
-architecture
-├ ghostclaw_system_map.md
-├ ghostclaw_master_control_system.md
-├ ghostclaw_infrastructure_blueprint.md
-├ ghostclaw_archetype_framework.md
-└ ghostclaw_canonical_identity.md
+```text
+architecture/
+├── ghostclaw_system_map.md
+├── ghostclaw_master_control_system.md
+├── ghostclaw_infrastructure_blueprint.md
+├── ghostclaw_archetype_framework.md
+└── ghostclaw_canonical_identity.md
+```
 
 This layer answers questions such as:
 
-What is GhostClaw?
-
-How are the system components connected?
-
-What are the guiding principles of the architecture?
+- What is GhostClaw?
+- How are the system components connected?
+- What are the guiding principles of the architecture?
 
 This section is equivalent to the system design documentation used in large infrastructure platforms.
 
-Runtime
+## Runtime
 
 The Runtime section describes how GhostClaw behaves during execution.
 
 This layer defines the operational rules that govern agents, signals, and workflows.
 
-Files:
-
-runtime
-├ ghostclaw_runtime_execution_spec.md
-├ ghostclaw_runtime_signals.md
-├ ghostclaw_planner_actions.md
-├ ghostclaw_agent_registry.md
-└ ghostclaw_skill_registry.md
+```text
+runtime/
+├── ghostclaw_runtime_execution_spec.md
+├── ghostclaw_runtime_signals.md
+├── ghostclaw_planner_actions.md
+├── ghostclaw_agent_registry.md
+└── ghostclaw_skill_registry.md
+```
 
 This layer answers questions such as:
 
-How do agents execute tasks?
-
-What signals trigger system actions?
-
-How are skills registered and used?
-
-How does the planner coordinate agents?
+- How do agents execute tasks?
+- What signals trigger system actions?
+- How are skills registered and used?
+- How does the planner coordinate agents?
 
 In large platforms like Kubernetes, this layer corresponds to control loops, scheduling logic, and runtime behavior.
 
-Ecosystem
+## Ecosystem
 
 The Ecosystem section describes how GhostClaw expands beyond the core system.
 
 GhostClaw is not only a runtime engine but also a platform for launching companies, automation systems, and marketplaces.
 
-Files:
-
-ecosystem
-├ ghostclaw_company_factory.md
-├ ghostclaw_ecosystem_growth_engine.md
-├ ghostclaw_marketplace_schema.md
-└ ghostclaw_ghost_mart_launch_catalog.md
+```text
+ecosystem/
+├── ghostclaw_company_factory.md
+├── ghostclaw_ecosystem_growth_engine.md
+├── ghostclaw_marketplace_schema.md
+└── ghostclaw_ghost_mart_launch_catalog.md
+```
 
 This section answers questions such as:
 
-How are autonomous companies created?
-
-How does GhostClaw grow its ecosystem?
-
-How are capabilities distributed through Ghost Mart?
+- How are autonomous companies created?
+- How does GhostClaw grow its ecosystem?
+- How are capabilities distributed through Ghost Mart?
 
 This layer represents the economic and expansion model of the platform.
 
-Reference
+## Reference
 
 The Reference section provides canonical definitions used across the system.
 
-Files:
-
-reference
-└ ghostclaw_system_glossary.md
+```text
+reference/
+└── ghostclaw_system_glossary.md
+```
 
 This section ensures consistency across documentation by defining:
 
-system terminology
-
-core concepts
-
-naming conventions
+- system terminology
+- core concepts
+- naming conventions
 
 Large projects use this layer to prevent terminology drift and inconsistent language.
 
-Benefits of This Structure
-
-Organizing GhostClaw documentation into layered sections provides several advantages.
-
-1. Scalability
-
-As GhostClaw grows to include more agents, skills, and companies, the documentation remains organized and navigable.
+## Benefits of this structure
 
-2. Developer Clarity
+Organizing GhostClaw documentation into layered sections provides several advantages:
 
-New contributors can understand the system quickly by reading the architecture layer before diving into runtime details.
+1. **Scalability**
+   As GhostClaw grows to include more agents, skills, and companies, the documentation remains organized and navigable.
 
-3. AI Readability
+2. **Developer clarity**
+   New contributors can understand the system quickly by reading the architecture layer before diving into runtime details.
 
-Since GhostClaw is an AI-driven system, the documentation must also be interpretable by AI agents that may analyze the repository.
+3. **AI readability**
+   Since GhostClaw is an AI-driven system, the documentation must also be interpretable by AI agents that may analyze the repository. A structured hierarchy improves machine readability.
 
-A structured hierarchy improves machine readability.
+4. **Ecosystem expansion**
+   GhostClaw aims to support autonomous digital businesses. Separating ecosystem documentation from runtime documentation makes the system easier to extend.
 
-4. Ecosystem Expansion
+5. **Professional system documentation**
+   This structure aligns GhostClaw with industry-standard documentation practices used by major infrastructure platforms. It helps position GhostClaw as a serious open system rather than a collection of disconnected notes.
 
-GhostClaw aims to support autonomous digital businesses.
-
-Separating ecosystem documentation from runtime documentation makes the system easier to extend.
-
-5. Professional System Documentation
-
-This structure aligns GhostClaw with industry-standard documentation practices used by major infrastructure platforms.
-
-It helps position GhostClaw as a serious open system rather than a collection of disconnected notes.
-
-Long-Term Vision
+## Long-term vision
 
 As GhostClaw evolves, the documentation structure will support the growth of:
 
-autonomous agents
-
-reusable skills
-
-digital company blueprints
-
-distributed marketplaces
-
-AI-driven infrastructure
+- autonomous agents
+- reusable skills
+- digital company blueprints
+- distributed marketplaces
+- AI-driven infrastructure
 
 The documentation itself becomes a living manual for the GhostClaw operating system.
 
-By following the same structural principles used by large technical platforms, GhostClaw can scale both technically and organizationally while remaining understandable to developers, contributors, and AI systems alike.
\ No newline at end of file
+By following the same structural principles used by large technical platforms, GhostClaw can scale both technically and organizationally while remaining understandable to developers, contributors, and AI systems alike.
 
EOF
)

<!--
Sync Impact Report:
- Version change: Initial Template → 1.0.0
- New constitution created with 5 core principles focused on static website development
- Added principles:
  * I. Minimal Dependencies (replaces PRINCIPLE_1)
  * II. Mobile-First Responsive Design (replaces PRINCIPLE_2) 
  * III. Accessibility Standards (replaces PRINCIPLE_3, marked NON-NEGOTIABLE)
  * IV. Performance-First Implementation (replaces PRINCIPLE_4)
  * V. Progressive Enhancement (replaces PRINCIPLE_5)
- Added sections:
  * Performance Standards (replaces SECTION_2)
  * Accessibility & UX Standards (replaces SECTION_3)
- Templates requiring updates:
  ✅ constitution.md - created/updated
  ✅ plan-template.md - Constitution Check section updated with new gates
  ✅ spec-template.md - no updates needed (generic structure)
  ✅ tasks-template.md - no updates needed (task-focused, constitution-agnostic)
  ✅ command prompts - already properly reference constitution file
- Follow-up TODOs: None - all placeholders filled, all templates updated
-->

# Multiagent Constitution

## Core Principles

### I. Minimal Dependencies
Every feature must prioritize native browser capabilities over external libraries. Dependencies are justified only when they provide essential functionality that cannot be reasonably implemented with vanilla HTML, CSS, and JavaScript. Each dependency must be evaluated for bundle size impact, maintenance overhead, and long-term sustainability.

**Rationale**: Reduces attack surface, improves load times, ensures long-term maintainability, and decreases complexity.

### II. Mobile-First Responsive Design
All interfaces must be designed mobile-first with progressive enhancement for larger screens. Responsive breakpoints must be tested across device categories (mobile, tablet, desktop). Touch targets must meet minimum size requirements (44px minimum). Navigation and interactions must work seamlessly across all viewport sizes.

**Rationale**: Mobile traffic dominates web usage; mobile-first ensures core functionality works on constrained devices.

### III. Accessibility Standards (NON-NEGOTIABLE)
All features must meet WCAG 2.1 AA standards as a minimum requirement. This includes semantic HTML, proper ARIA labels, keyboard navigation support, screen reader compatibility, and adequate color contrast ratios. Accessibility testing with assistive technologies is mandatory before feature completion.

**Rationale**: Digital inclusion is a fundamental right; accessible design benefits all users, not just those with disabilities.

### IV. Performance-First Implementation
Every feature must be evaluated for performance impact. Core Web Vitals (LCP, FID, CLS) must meet Google's "Good" thresholds. Assets must be optimized for size and delivery. Critical rendering path must be prioritized. Performance budgets are enforced through automated testing.

**Rationale**: Performance directly impacts user experience, accessibility, and search engine rankings.

### V. Progressive Enhancement
Core functionality must work without JavaScript. Enhanced experiences are layered on top of a solid HTML/CSS foundation. Features must degrade gracefully when JavaScript fails or is disabled. Critical user paths must remain functional across all enhancement levels.

**Rationale**: Ensures reliability, improves accessibility, and provides fallbacks for network or device limitations.

## Performance Standards

All deliverables must meet the following performance criteria:
- First Contentful Paint (FCP) < 2.5 seconds
- Largest Contentful Paint (LCP) < 2.5 seconds
- Cumulative Layout Shift (CLS) < 0.1
- First Input Delay (FID) < 100 milliseconds
- Total bundle size < 200KB gzipped for critical path
- Images optimized with appropriate formats (WebP/AVIF with fallbacks)

## Accessibility & UX Standards

User experience consistency requirements:
- Consistent visual hierarchy and typography scaling
- Uniform interaction patterns across features
- Predictable navigation and information architecture
- Error states and loading indicators for all async operations
- Form validation with clear, actionable feedback
- Focus management for dynamic content and single-page applications

## Governance

This constitution supersedes all other development practices and guidelines. All feature specifications, implementation plans, and code reviews must verify compliance with these principles. Any deviation requires explicit justification and documentation of alternative approaches considered.

Amendments to this constitution require:
1. Documentation of the proposed change and rationale
2. Impact assessment on existing features and templates
3. Update of dependent artifacts and templates
4. Version increment following semantic versioning

All development decisions must prioritize user experience and accessibility over developer convenience or implementation shortcuts.

**Version**: 1.0.0 | **Ratified**: 2025-09-23 | **Last Amended**: 2025-09-23
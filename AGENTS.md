<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project rules

- Understand the relevant code before editing. Preserve unrelated user changes.
- Add meaningful unit tests for product behavior and run the relevant checks before committing or pushing. Run `npm test` before a push unless the user explicitly asks to skip it.
- Use Jest and Testing Library for React components; use Jest for utilities and API logic.
- Do not create a git tag or release unless the user explicitly asks. When creating one, first align `package.json` version with the tag, commit and push, then create the tag.
- Keep user-facing text in Hebrew when the feature is in Hebrew; keep code and comments clear and professional.

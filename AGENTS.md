<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Testing Rules

- **Every feature must include unit tests.** When implementing any new feature or fixing a bug, write unit tests covering the core logic and edge cases.
- **Run the full test suite after every change** (`npm test`) and confirm all tests pass before pushing.
- Test files go in `__tests__/` next to the code they test, or in a top-level `__tests__/` directory — follow the existing pattern in the repo.
- Use Jest + `@testing-library/react` for React components, and plain Jest for utility/API logic.

# Required Multi-Agent Delivery Flow

For every implementation, bug fix, refactor, or other code change, use this flow before pushing:

1. **Planner** — inspect the relevant code and produce a scoped implementation plan, including affected files, risks, and tests.
2. **Implementer** — make only the approved, scoped code and test changes. Preserve any unrelated user changes.
3. **Independent verifier** — review the resulting diff and run the focused checks plus the full `npm test` suite. The verifier must confirm the change meets the request and has not introduced a regression.
4. **Push gate** — commit and push to `main` only after the verifier approves and all required checks pass. If the verifier finds an issue or a check fails, return to implementation and repeat verification.

The coordinating agent must keep the roles independent: the verifier does not author the implementation it approves. For read-only questions, explanations, and status updates, use this workflow only when code changes are requested.

# Release Rules

- **Before creating any git tag / release**, update `package.json` `"version"` to match the tag version.
- The footer shows `NEXT_PUBLIC_APP_VERSION` which is baked in at build time from `package.json`. Railway production deploys only on tag pushes — a plain push to `main` does NOT update the production footer.
- Flow: update `package.json` version → commit → push → then create the tag.

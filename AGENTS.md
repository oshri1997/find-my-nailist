<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Testing Rules

- **Every feature must include unit tests.** When implementing any new feature or fixing a bug, write unit tests covering the core logic and edge cases.
- **Run the full test suite after every change** (`npm test`) and confirm all tests pass before pushing.
- Test files go in `__tests__/` next to the code they test, or in a top-level `__tests__/` directory — follow the existing pattern in the repo.
- Use Jest + `@testing-library/react` for React components, and plain Jest for utility/API logic.

# Release Rules

- **Before creating any git tag / release**, update `package.json` `"version"` to match the tag version.
- The footer shows `NEXT_PUBLIC_APP_VERSION` which is baked in at build time from `package.json`. Railway production deploys only on tag pushes — a plain push to `main` does NOT update the production footer.
- Flow: update `package.json` version → commit → push → then create the tag.

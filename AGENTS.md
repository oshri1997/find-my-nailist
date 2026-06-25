<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Release Rules

- **Before creating any git tag / release**, update `package.json` `"version"` to match the tag version.
- The footer shows `NEXT_PUBLIC_APP_VERSION` which is baked in at build time from `package.json`. Railway production deploys only on tag pushes — a plain push to `main` does NOT update the production footer.
- Flow: update `package.json` version → commit → push → then create the tag.

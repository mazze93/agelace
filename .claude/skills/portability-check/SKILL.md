---
name: portability-check
description: Verify agelace runs on a stock Windows + Docker Desktop machine — multi-arch build, amd64 smoke test under emulation in OrbStack, line endings, host data folder, launchers. Use before shipping to the friend or after changing the Dockerfile, compose file, launchers, or data layer.
---

Report each check as PASS / FAIL / SKIPPED (with the reason). Never mark a check PASS without running it.

1. **Line endings.** Run `git ls-files --eol` and flag any non-`.cmd`/`.bat` file showing `w/crlf` or `i/crlf`. Also flag any `.cmd`/`.bat` file that is *not* CRLF in the working tree.
2. **No OrbStack leakage.** Run `grep -rn 'orb.local\|/Users/\|~/' compose*.yaml Dockerfile* start-agelace.* stop-agelace.* 2>/dev/null`. Every hit is a FAIL unless it's a comment.
3. **Multi-arch build.** Run `docker buildx build --platform linux/amd64,linux/arm64 .`. Then build the amd64 image separately and load it (`--platform linux/amd64 --load -t agelace:amd64-test`).
4. **amd64 smoke test (what the friend's PC runs).** Run the amd64 image with a fresh temp data dir mounted the same way compose mounts it. Hit the health endpoint, create one story element through the real API/UI path, and confirm it lands as a file in the host data dir. Restart the container and confirm it's still there. Tear down afterwards.
5. **Launchers.** Check that `start-agelace.sh`/`.cmd` and `stop-agelace.sh`/`.cmd` all exist and call the same compose invocation. Read the `.cmd` logic line by line. It can't be executed here, so say so in the report.
6. **Least-technical path.** Walk the README/launcher flow as someone who has only Docker Desktop installed. List any step that needs Node, git, a terminal, or editing a file.

End with a list of what still needs a real Windows machine to verify. Don't claim Windows parity from emulation alone.

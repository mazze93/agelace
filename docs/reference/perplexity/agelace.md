<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# build this in a container so that it is shippable and syste os-agnostic

Yes—the app should be shipped as a **self-contained Docker container** so it runs the same on macOS, Linux, and Windows with Docker/Podman, while keeping all story data local and independent of paid AI automation.

I started the build, but this session is not granted write access to your `🚀 PROJECTS` directory, so I could not create the containerized project there. The machine also did not report a Docker installation, so a local image build/run test cannot be completed until Docker Desktop or an equivalent runtime is available.[^1][^2]

## Planned deliverable

The containerized app will include:

- **React + TypeScript + Vite** interface.
- **Nginx production image** serving a static, fast, low-resource app.
- **Dockerfile**, `compose.yaml`, health check, and `.dockerignore`.
- Local project state in browser storage, with **JSON backup/import** and **Markdown export** for Obsidian or Scrivener.
- Core app views: Home, World, Characters, Plot, Drafting, Feedback, Review, and Prompt Lab.
- Explicit **Canon / Proposed / Question** statuses, so AI suggestions never silently become story truth.
- Manual “Copy AI handoff” actions—no Computer tasks, API keys, background agents, or additional cost.


## Container usage

Once the project folder is writable and Docker is installed, the intended launch flow is:

```sh
docker compose up --build
```

Then open:

```text
http://localhost:8080
```

The app itself will be OS-agnostic; only the container runtime needs to exist on the host.

## One decision needed

Please set the active workspace to the folder where you want this created—ideally `🚀 PROJECTS/creative-workspace`—and I’ll build the complete runnable container project there, validate the production bundle, and provide the exact launch and backup commands.

<div align="center">⁂</div>


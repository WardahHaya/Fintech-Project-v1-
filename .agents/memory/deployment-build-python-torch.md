---
name: Deployment build for Python + sentence-transformers
description: Why the publish build fails with externally-managed-environment, and the required build command shape
---

# Deployment (publish) build command for this FastAPI + sentence-transformers app

The publish/build phase runs in an environment where `python3 -m pip install` resolves to the
immutable system Python and fails with `error: externally-managed-environment`
(it tries to modify `/nix/store`). The dev workflow works because it calls plain `pip`,
which is the project-local `.pythonlibs` pip wrapper.

**Rule:** the deployment `build` command must use plain `pip` (NOT `python3 -m pip`).

**Why also pre-install CPU torch:** `requirements.txt` has no `torch` line — torch comes in
transitively via `sentence-transformers`. Without forcing the CPU index first, pip resolves the
default (CUDA) torch wheel, which is multi-GB and slow/fragile to install during publish.

**Working build command (autoscale):**
`bash -c "pip install torch --index-url https://download.pytorch.org/whl/cpu --no-cache-dir && pip install -r requirements.txt --no-cache-dir && cd frontend && npm ci && npm run build"`

**Autoscale startup-probe caveat:** the app loads an embedding model at startup. Autoscale promotes
only after `GET /` returns 200 within the probe timeout. If a future publish fails at the *promote*
step (not build), suspect slow model-loading startup — consider Reserved VM, or making model load lazy.

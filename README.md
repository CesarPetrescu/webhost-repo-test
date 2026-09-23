# webhost-repo-test

Test fixture for the PhotonSpark web-hosting platform. Branch `main` is a minimal
full-stack app used as a deployment canary: a static frontend, a tiny backend
image and a PostgreSQL migration. Branch `isolation-probe` holds a build that
checks, from inside the build sandbox, that no platform credential or internal
service is reachable. Nothing here is secret.

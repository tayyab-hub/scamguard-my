# Deployment entry point: apply checked-in Alembic revisions before starting Uvicorn. A failed
# migration prevents serving an application against an incompatible schema.

"""Apply additive migrations, then run the single-instance production API."""

import os
import subprocess
import sys

import uvicorn


# Run migrations with the current Python environment, then replace this process with the API
# server. PORT defaults to the hosting value; trusting all forwarded addresses assumes access
# through a trusted proxy boundary.
def main() -> None:
    subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], check=True)
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", "10000")),
        proxy_headers=True,
        forwarded_allow_ips="*",
    )


if __name__ == "__main__":
    main()

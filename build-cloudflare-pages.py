#!/usr/bin/env python3
"""Build only manifest-verified public assets for Cloudflare Pages.

Cloudflare Pages:
  Build command: python3 build-cloudflare-pages.py
  Output directory: _site
No private repository metadata or development files are included.
"""
import hashlib
import json
import os
import shutil
from pathlib import Path
from urllib.parse import urlsplit

root = Path(__file__).resolve().parent
output = root / "_site"
if output.is_symlink():
    raise SystemExit("Refusing to follow an output-directory symlink")
if output.exists():
    shutil.rmtree(output)

manifest = json.loads((root / "release-manifest.json").read_text(encoding="utf-8"))
if set(manifest) != {"version", "files"}:
    raise SystemExit("Unexpected public release manifest fields")
entries = manifest["files"]
if not isinstance(entries, list) or len(entries) > 20000:
    raise SystemExit("Invalid Pages file manifest")
seen = set()
output.mkdir()
for entry in entries:
    path = Path(entry["path"])
    if (path.is_absolute() or ".." in path.parts or
            not path.parts or entry["path"] in seen):
        raise SystemExit(f"Invalid public path: {path}")
    seen.add(entry["path"])
    source = root / path
    if not source.is_file() or source.is_symlink():
        raise SystemExit(f"Missing or symlinked public file: {path}")
    data = source.read_bytes()
    if (len(data) != entry["bytes"] or
            hashlib.sha256(data).hexdigest() != entry["sha256"]):
        raise SystemExit(f"Public release hash mismatch: {path}")
    if len(data) > 25 * 1024 * 1024:
        raise SystemExit(f"File exceeds Pages 25 MiB limit: {path}")
    # The public build script and README are GitHub/release metadata, not web assets.
    if entry["path"] in {"build-cloudflare-pages.py", "README.md"}:
        continue
    target = output / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
shutil.copyfile(root / "release-manifest.json", output / "release-manifest.json")

# Cloudflare sets CF_PAGES_URL. On preview hosts, use the stable project hostname.
# This does not hardcode the development Pages domain or any private reference.
deployment = os.environ.get("PUBLIC_SITE_URL") or os.environ.get("CF_PAGES_URL")
if deployment:
    parsed = urlsplit(deployment)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        raise SystemExit("A valid HTTPS deployment URL is required")
    host = parsed.hostname
    if not os.environ.get("PUBLIC_SITE_URL") and host.endswith(".pages.dev"):
        parts = host.split(".")
        if len(parts) >= 4:
            host = ".".join(parts[-3:])
    canonical = (os.environ.get("PUBLIC_SITE_URL") or f"https://{host}").rstrip("/") + "/"
    page = output / "index.html"
    source_url = "https://eltnegcellist.github.io/Memory_moments_roulette/"
    html = page.read_text(encoding="utf-8")
    if html.count(source_url) != 3:
        raise SystemExit("Unexpected OGP URL references in index.html")
    page.write_text(html.replace(source_url, canonical), encoding="utf-8")
    print(f"OGP canonical site: {canonical}")
elif os.environ.get("CF_PAGES"):
    raise SystemExit("Cloudflare build is missing CF_PAGES_URL")
print(f"Validated {len(entries)} public files; generated _site")

#!/usr/bin/env python3
"""Resume a bounded GS SHOP reference-image cache without changing the catalog.

Run with a Python that has Pillow installed. Defaults are relative to this file's
repository, so invoking this script from another working directory is safe.
--dry-run reads the plan only; --retry-errors retries prior transient errors.
Missing and invalid responses remain recorded instead of receiving fake images.
"""

from __future__ import annotations

import argparse
from collections import Counter, deque
from concurrent.futures import FIRST_COMPLETED, ThreadPoolExecutor, wait
import csv
from datetime import datetime, timezone
import fcntl
import hashlib
from io import BytesIO
import json
import os
from pathlib import Path
import signal
import socket
import tempfile
import threading
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
import warnings

from PIL import Image, UnidentifiedImageError


REPO = Path(__file__).resolve().parents[1]
FIELDS = [
    "prd_id", "view_name", "cate1_nm", "cate2_nm", "cate3_nm", "cate4_nm",
    "brand_name", "discprice", "domain",
]
STATUSES = {"available", "missing", "invalid", "error"}
EXTENSIONS = {"JPEG": ".jpg", "PNG": ".png", "WEBP": ".webp", "GIF": ".gif", "AVIF": ".avif"}
MAX_BYTES = 5 * 1024 * 1024
MAX_PIXELS = 16_000_000
REQUEST_TIMEOUT = 20
MAX_ATTEMPTS = 3


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def atomic_bytes(path: Path, content: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, name = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=path.parent)
    try:
        with os.fdopen(descriptor, "wb") as stream:
            stream.write(content)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(name, path)
    finally:
        if os.path.exists(name):
            os.unlink(name)


def read_product_ids(path: Path) -> list[str]:
    with path.open(encoding="utf-8-sig", newline="") as stream:
        reader = csv.DictReader(stream)
        if reader.fieldnames != FIELDS:
            raise ValueError("Catalog header must retain the original nine columns in order")
        ids: list[str] = []
        seen: set[str] = set()
        for row_number, row in enumerate(reader, 2):
            product_id = row.get("prd_id", "")
            if not product_id or not product_id.isascii() or not product_id.isdigit():
                raise ValueError(f"Invalid product ID at catalog row {row_number}")
            if product_id in seen:
                raise ValueError(f"Duplicate product ID at catalog row {row_number}")
            if None in row or any(value is None for value in row.values()):
                raise ValueError(f"Malformed catalog row {row_number}")
            seen.add(product_id)
            ids.append(product_id)
    return ids


def ordered_ids(ids: list[str], queue_path: Path) -> list[str]:
    if not queue_path.exists():
        return ids
    queue = json.loads(queue_path.read_text(encoding="utf-8"))
    if not isinstance(queue, list):
        raise ValueError("Generation queue must be a list")
    known = set(ids)
    priority: dict[str, None] = {}
    for group in queue:
        if not isinstance(group, dict) or not isinstance(group.get("referenceProductIds", []), list):
            raise ValueError("Malformed generation queue")
        for product_id in group.get("referenceProductIds", []):
            if isinstance(product_id, str) and product_id in known:
                priority[product_id] = None
    return list(priority) + [product_id for product_id in ids if product_id not in priority]


def load_products(status_path: Path, ids: list[str]) -> dict:
    if not status_path.exists():
        return {}
    document = json.loads(status_path.read_text(encoding="utf-8"))
    if not isinstance(document, dict) or document.get("version") != 1 or not isinstance(document.get("products"), dict):
        raise ValueError("Unsupported reference status file; refusing to overwrite it")
    known = set(ids)
    products = {key: value for key, value in document["products"].items() if key in known}
    if any(not isinstance(value, dict) or value.get("status") not in STATUSES for value in products.values()):
        raise ValueError("Invalid product status; refusing to overwrite it")
    return products


def cache_matches(record: dict, cache_dir: Path, product_id: str) -> bool:
    if record.get("status") != "available":
        return False
    try:
        path = Path(record["localPath"]).resolve()
        # Do not hash or trust unrelated local paths from a modified status file.
        if path.parent != cache_dir.resolve() or path.stem != product_id or path.suffix not in EXTENSIONS.values():
            return False
        if not path.is_file() or path.stat().st_size > MAX_BYTES:
            return False
        return hashlib.sha256(path.read_bytes()).hexdigest() == record.get("sha256")
    except (OSError, KeyError, TypeError, ValueError):
        return False


def counts_for(products: dict, total: int) -> dict:
    counts = Counter(record["status"] for record in products.values())
    return {
        "total": total,
        **{status: counts[status] for status in ("available", "missing", "invalid", "error")},
        "pending": total - len(products),
    }


def checkpoint(path: Path, products: dict, total: int) -> dict:
    counts = counts_for(products, total)
    payload = {"version": 1, "products": products, "counts": counts, "updatedAt": now()}
    atomic_bytes(path, (json.dumps(payload, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))
    return counts


class RateLimiter:
    """At most four request starts in every rolling second, including retries."""

    def __init__(self, stop: threading.Event):
        self.lock = threading.Lock()
        self.starts: deque[float] = deque()
        self.stop = stop

    def acquire(self) -> bool:
        while not self.stop.is_set():
            with self.lock:
                current = time.monotonic()
                while self.starts and current - self.starts[0] >= 1.0:
                    self.starts.popleft()
                if len(self.starts) < 4:
                    self.starts.append(current)
                    return True
                delay = max(0.001, 1.0 - (current - self.starts[0]))
            self.stop.wait(delay)
        return False


def image_metadata(content: bytes) -> tuple[str, int, int]:
    """Validate actual image content rather than trusting URL or Content-Type."""
    if not content or len(content) > MAX_BYTES:
        raise ValueError("empty_or_oversized_image")
    with warnings.catch_warnings():
        warnings.simplefilter("error", Image.DecompressionBombWarning)
        with Image.open(BytesIO(content)) as image:
            extension = EXTENSIONS.get(image.format or "")
            width, height = image.size
            if extension is None:
                raise ValueError("unsupported_image_format")
            if min(width, height) < 16 or max(width, height) > 8192 or width * height > MAX_PIXELS:
                raise ValueError("invalid_image_dimensions")
            image.verify()
        # verify() alone does not decode JPEG image data, so also check decoding.
        with Image.open(BytesIO(content)) as image:
            image.load()
    return extension, width, height


def fetch_product(product_id: str, cache_dir: Path, limiter: RateLimiter, stop: threading.Event) -> dict:
    url = f"https://asset.m-gs.kr/prod/{product_id}/1/550"
    base = {"url": url, "localPath": None, "width": None, "height": None, "sha256": None}
    failure = "request_failed"
    for attempt in range(MAX_ATTEMPTS):
        if not limiter.acquire():
            return {**base, "status": "error", "error": "interrupted"}
        retry_delay = min(2 ** attempt, 8)
        try:
            request = Request(url, headers={"User-Agent": "GScene-reference-cache/1.0", "Accept": "image/*"})
            with urlopen(request, timeout=REQUEST_TIMEOUT) as response:
                content_length = response.headers.get("Content-Length")
                if content_length and content_length.isdigit() and int(content_length) > MAX_BYTES:
                    return {**base, "status": "invalid", "error": "image_exceeds_5mb"}
                # A bound on total read time also prevents a slowly trickling server
                # from keeping a connection alive indefinitely via socket resets.
                deadline = time.monotonic() + REQUEST_TIMEOUT
                chunks: list[bytes] = []
                length = 0
                while length <= MAX_BYTES:
                    if stop.is_set():
                        return {**base, "status": "error", "error": "interrupted"}
                    if time.monotonic() > deadline:
                        raise TimeoutError()
                    chunk = response.read(min(65536, MAX_BYTES + 1 - length))
                    if not chunk:
                        break
                    chunks.append(chunk)
                    length += len(chunk)
                content = b"".join(chunks)
            if len(content) > MAX_BYTES:
                return {**base, "status": "invalid", "error": "image_exceeds_5mb"}
            try:
                extension, width, height = image_metadata(content)
            except (ValueError, OSError, UnidentifiedImageError, Image.DecompressionBombError, Image.DecompressionBombWarning):
                return {**base, "status": "invalid", "error": "not_a_valid_supported_image"}
            destination = cache_dir / f"{product_id}{extension}"
            atomic_bytes(destination, content)
            return {
                **base, "status": "available", "localPath": str(destination.resolve()),
                "width": width, "height": height, "sha256": hashlib.sha256(content).hexdigest(),
            }
        except HTTPError as error:
            status = error.code
            retry_after = error.headers.get("Retry-After", "") if error.headers else ""
            error.close()
            if status in (404, 410):
                return {**base, "status": "missing", "error": f"http_{status}"}
            if status != 429 and not 500 <= status <= 599:
                return {**base, "status": "error", "error": f"http_{status}"}
            failure = f"http_{status}"
            if retry_after.isdigit():
                retry_delay = min(max(retry_delay, int(retry_after)), 30)
        except (TimeoutError, socket.timeout):
            failure = "timeout"
        except URLError as error:
            failure = "timeout" if isinstance(error.reason, (TimeoutError, socket.timeout)) else "network_error"
        except OSError:
            # Avoid putting exception text, server body, or local secrets in status.
            failure = "io_error"
        if attempt + 1 < MAX_ATTEMPTS and stop.wait(retry_delay):
            return {**base, "status": "error", "error": "interrupted"}
    return {**base, "status": "error", "error": failure}


def positive_number(value: str) -> int:
    number = int(value)
    if number <= 0:
        raise argparse.ArgumentTypeError("must be greater than zero")
    return number


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--catalog", type=Path, default=REPO / "data/catalog/products.csv")
    parser.add_argument("--queue", type=Path, default=REPO / "data/game-assets/generated/generation-queue.json")
    parser.add_argument("--status", type=Path, default=REPO / "data/game-assets/overnight/reference-status.json")
    parser.add_argument("--cache-dir", type=Path, default=REPO.parent / "work/overnight/reference-images")
    parser.add_argument("--limit", type=positive_number, help="Maximum products to fetch this run, excluding valid cache hits")
    parser.add_argument("--workers", type=int, choices=range(1, 5), default=4)
    parser.add_argument("--retry-errors", action="store_true", help="Retry prior error records; missing/invalid remain unchanged")
    parser.add_argument("--dry-run", action="store_true", help="Inspect plan without network access or writing any files")
    args = parser.parse_args(argv)
    args.status = args.status.resolve()
    args.cache_dir = args.cache_dir.resolve()
    stop = threading.Event()
    lock_stream = None
    try:
        if not args.dry_run:
            args.status.parent.mkdir(parents=True, exist_ok=True)
            # A stable lock file prevents two writers to the same status/cache.
            # Keep the file after releasing flock to avoid an unlink/acquire race.
            lock_stream = args.status.with_suffix(".lock").open("a+")
            try:
                fcntl.flock(lock_stream, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError:
                print("Another reference-cache worker is already running.", flush=True)
                return 2
            lock_stream.seek(0)
            lock_stream.truncate()
            lock_stream.write(str(os.getpid()) + "\n")
            lock_stream.flush()
        ids = read_product_ids(args.catalog)
        products = load_products(args.status, ids)
        plan: list[str] = []
        reused = 0
        for product_id in ordered_ids(ids, args.queue):
            record = products.get(product_id)
            if record and cache_matches(record, args.cache_dir, product_id):
                reused += 1
                continue
            if record and record["status"] == "available":
                # An absent or altered cache file must not stay advertised as ready,
                # including when --limit defers its replacement to a later run.
                del products[product_id]
            if record and record["status"] != "available":
                if not (args.retry_errors and record["status"] == "error"):
                    continue
            plan.append(product_id)
        if args.limit:
            plan = plan[:args.limit]
        print(json.dumps({"event": "plan", "total": len(ids), "cached": reused, "scheduled": len(plan), "dryRun": args.dry_run}), flush=True)
        if args.dry_run:
            print(json.dumps({"firstProductIds": plan[:10], "cacheDirectory": str(args.cache_dir), "statusFile": str(args.status)}), flush=True)
            return 0
        for signum in (signal.SIGINT, signal.SIGTERM):
            signal.signal(signum, lambda _signal, _frame: stop.set())
        limiter = RateLimiter(stop)
        completed = 0
        iterator = iter(plan)
        checkpoint(args.status, products, len(ids))
        with ThreadPoolExecutor(max_workers=args.workers) as executor:
            pending: dict = {}

            def submit_next() -> bool:
                if stop.is_set():
                    return False
                product_id = next(iterator, None)
                if product_id is None:
                    return False
                future = executor.submit(fetch_product, product_id, args.cache_dir, limiter, stop)
                pending[future] = product_id
                return True

            for _ in range(args.workers):
                submit_next()
            while pending:
                finished, _ = wait(pending, timeout=1, return_when=FIRST_COMPLETED)
                for future in finished:
                    product_id = pending.pop(future)
                    try:
                        record = future.result()
                    except Exception:
                        record = {
                            "status": "error", "url": f"https://asset.m-gs.kr/prod/{product_id}/1/550",
                            "localPath": None, "width": None, "height": None, "sha256": None,
                            "error": "unexpected_worker_error",
                        }
                    # Interrupted work is left pending for a regular resume run.
                    if record.get("error") != "interrupted":
                        products[product_id] = record
                        completed += 1
                    if completed and completed % 25 == 0:
                        counts = checkpoint(args.status, products, len(ids))
                        print(json.dumps({"event": "progress", "completedThisRun": completed, "counts": counts}), flush=True)
                    submit_next()
        counts = checkpoint(args.status, products, len(ids))
        print(json.dumps({"event": "interrupted" if stop.is_set() else "finished", "completedThisRun": completed, "counts": counts}), flush=True)
        return 130 if stop.is_set() else 0
    except (OSError, ValueError, csv.Error, json.JSONDecodeError):
        print("Reference cache stopped: invalid input or local I/O failure. Existing catalog and images were retained.", flush=True)
        return 1
    finally:
        if lock_stream is not None:
            lock_stream.close()


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""Prepare private recommendation indexes by streaming the five CSV dumps.

No third-party dependencies. Counts describe a three-day activity log, never the
current cart or owned inventory. Only the supplied product catalogue is joined.
"""
from __future__ import annotations

import argparse
import csv
from collections import Counter, defaultdict
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from functools import lru_cache
import hashlib
import itertools
import json
import math
from pathlib import Path
import shutil
import sys
import tempfile
import time

PRODUCT_COLUMNS = (
    "prd_id", "view_name", "cate1_nm", "cate2_nm", "cate3_nm", "cate4_nm",
    "brand_name", "discprice", "domain",
)
ACTIVITY_COLUMNS = ("prd_id", "userid", "dt", "dh")
REQUIRED_COLUMNS = {
    "product.csv": PRODUCT_COLUMNS,
    "user_item_view.csv": ACTIVITY_COLUMNS,
    "user_item_order.csv": (*ACTIVITY_COLUMNS, "ordernum", "ordqty"),
    "user_item_cart.csv": ACTIVITY_COLUMNS,
    "user_item_rating.csv": ("prd_id", "dt", "dh", "rating"),
}
DOMAINS = ("fashion", "living", "food", "beauty")
COUNT_CAP = 3
MAX_USER_ITEMS = 30
MAX_NEIGHBORS = 30
MIN_SUPPORT = 2
SUPPORT_SHRINKAGE = 3
ANONYMOUS_VALUES = frozenset(("", "null", "undefined", "none", "nan"))


class PreparationError(ValueError):
    """Public errors contain aggregate/file information, never raw identifiers."""

    def __init__(self, message, summary=None):
        super().__init__(message)
        self.summary = summary or {}


def new_stats():
    return {key: 0 for key in (
        "rows", "matchedRows", "usableRows", "anonymousRows", "invalidRows",
        "outOfCatalogRows", "invalidDateRows", "invalidPriceRows", "duplicateRows",
        "nonPositiveOrderRows", "invalidQuantityRows", "invalidRatingRows",
    )} | {"missingColumns": []}


def inspect_headers(data_dir, summary):
    headers = {}
    for name, required in REQUIRED_COLUMNS.items():
        stats = summary["files"][name] = new_stats()
        try:
            with (data_dir / name).open(encoding="utf-8-sig", newline="") as stream:
                header = next(csv.reader(stream), [])
        except (OSError, UnicodeError, csv.Error):
            raise PreparationError(f"Cannot read {name}", summary) from None
        header = [value.strip() for value in header]
        stats["missingColumns"] = sorted(set(required) - set(header))
        if stats["missingColumns"] or len(set(header)) != len(header):
            raise PreparationError(f"Invalid CSV header: {name}", summary)
        headers[name] = {column: index for index, column in enumerate(header)}
    return headers


def csv_rows(data_dir, name, columns, stats):
    try:
        with (data_dir / name).open(encoding="utf-8-sig", newline="") as stream:
            reader = csv.reader(stream, strict=True)
            next(reader)
            for row in reader:
                stats["rows"] += 1
                if len(row) != len(columns):
                    stats["invalidRows"] += 1
                    continue
                yield row
    except (OSError, UnicodeError, csv.Error):
        # Do not include the exception: malformed source text can contain IDs.
        raise PreparationError(f"Cannot parse {name}") from None


@lru_cache(maxsize=4096)
def valid_hour(day, hour):
    if len(day) != 8 or len(hour) != 10 or not day.isascii() or not hour.isascii():
        return False
    if not day.isdigit() or not hour.isdigit() or hour[:8] != day:
        return False
    try:
        datetime.strptime(hour, "%Y%m%d%H")
    except ValueError:
        return False
    return True


def number(value):
    try:
        result = float(value)
    except (TypeError, ValueError, OverflowError):
        return None
    return result if math.isfinite(result) else None


def product_price(value):
    """Keep whole KRW exact and safe for the JavaScript API consumer."""
    try:
        price = Decimal(value)
    except (InvalidOperation, ValueError):
        return None
    if not price.is_finite() or price < 0 or price > 2**53 - 1 or price != price.to_integral_value():
        return None
    return int(price)


def load_products(data_dir, headers, summary):
    stats = summary["files"]["product.csv"]
    columns = headers["product.csv"]
    products = {}
    for row in csv_rows(data_dir, "product.csv", columns, stats):
        product = {key: row[columns[key]].strip() for key in PRODUCT_COLUMNS}
        price = product_price(product["discprice"])
        if price is None:
            stats["invalidPriceRows"] += 1
            stats["invalidRows"] += 1
            continue
        if not product["prd_id"] or not product["view_name"] or product["domain"] not in DOMAINS:
            stats["invalidRows"] += 1
            continue
        if product["prd_id"] in products:
            stats["duplicateRows"] += 1
            continue
        product["discprice"] = price
        products[product["prd_id"]] = product
        stats["matchedRows"] += 1
        stats["usableRows"] += 1
    if not products:
        raise PreparationError("No valid products in product.csv", summary)
    summary["products"] = len(products)
    summary["domains"] = dict(Counter(product["domain"] for product in products.values()))
    return products


def load_activity(data_dir, headers, summary, products, days):
    users = {}
    order_keys = set()
    for name, field in (("user_item_order.csv", 2), ("user_item_cart.csv", 1), ("user_item_view.csv", 0)):
        stats = summary["files"][name]
        columns = headers[name]
        pi, ui, di, hi = (columns[key] for key in ACTIVITY_COLUMNS)
        oi = columns.get("ordernum")
        qi = columns.get("ordqty")
        for row in csv_rows(data_dir, name, columns, stats):
            product_id = row[pi].strip()
            user_id = row[ui].strip()
            day, hour = row[di].strip(), row[hi].strip()
            anonymous = user_id.lower() in ANONYMOUS_VALUES
            if anonymous:
                stats["anonymousRows"] += 1
            known = product_id in products
            stats["matchedRows" if known else "outOfCatalogRows"] += 1
            valid = valid_hour(day, hour)
            if valid:
                days.add(day)
            else:
                stats["invalidDateRows"] += 1
                stats["invalidRows"] += 1
            if not valid or not known or anonymous:
                continue
            if field == 2:
                quantity = number(row[qi].strip())
                order_id = row[oi].strip()
                if quantity is None or not quantity.is_integer() or not order_id or order_id.lower() in ANONYMOUS_VALUES:
                    stats["invalidQuantityRows"] += 1
                    stats["invalidRows"] += 1
                    continue
                if quantity <= 0:
                    stats["nonPositiveOrderRows"] += 1
                    continue
                order_key = (order_id, product_id)
                if order_key in order_keys:
                    stats["duplicateRows"] += 1
                    # Preserve the latest log timestamp without counting again.
                    previous = users.get(user_id, {}).get(product_id)
                    if previous is not None:
                        previous[3] = max(previous[3], hour)
                    continue
                order_keys.add(order_key)
            history = users.setdefault(user_id, {})
            item = history.get(product_id)
            if item is None:
                item = history[product_id] = [0, 0, 0, hour]
            item[field] = min(COUNT_CAP, item[field] + 1)
            item[3] = max(item[3], hour)
            stats["usableRows"] += 1
        # This is aggregate-only progress; do not print any source rows/IDs.
        print(json.dumps({"completed": name, "rows": stats["rows"], "matchedRows": stats["matchedRows"], "users": len(users)}), flush=True)
    return users


def load_popularity(data_dir, headers, summary, products, days):
    name = "user_item_rating.csv"
    stats = summary["files"][name]
    columns = headers[name]
    pi, di, hi, ri = (columns[key] for key in ("prd_id", "dt", "dh", "rating"))
    hourly = {}
    for row in csv_rows(data_dir, name, columns, stats):
        product_id = row[pi].strip()
        day, hour = row[di].strip(), row[hi].strip()
        known = product_id in products
        stats["matchedRows" if known else "outOfCatalogRows"] += 1
        valid = valid_hour(day, hour)
        if valid:
            days.add(day)
        else:
            stats["invalidDateRows"] += 1
            stats["invalidRows"] += 1
        if not valid or not known:
            continue
        rating = number(row[ri].strip())
        if rating is None or rating < 0:
            stats["invalidRatingRows"] += 1
            stats["invalidRows"] += 1
            continue
        key = (product_id, hour)
        if key in hourly:
            stats["duplicateRows"] += 1
            hourly[key] = max(hourly[key], rating)
        else:
            hourly[key] = rating
            stats["usableRows"] += 1
    popularity = dict.fromkeys(products, 0.0)
    for (product_id, _), rating in hourly.items():
        popularity[product_id] += rating
    print(json.dumps({"completed": name, "rows": stats["rows"], "matchedRows": stats["matchedRows"], "hourlyScores": len(hourly)}), flush=True)
    return {product_id: round(value, 6) for product_id, value in popularity.items()}


def item_weight(item):
    return item[0] + 3 * item[1] + 5 * item[2]


def build_neighbors(products, users, summary):
    norms = defaultdict(float)
    pairs = {}
    product_ids = sorted(products)
    product_indexes = {product_id: index for index, product_id in enumerate(product_ids)}
    dimension = len(product_ids)
    truncated = 0
    for history in users.values():
        domains = defaultdict(list)
        for product_id, item in history.items():
            domains[products[product_id]["domain"]].append((product_id, item))
        for entries in domains.values():
            entries.sort(key=lambda entry: (bool(entry[1][1] or entry[1][2]), item_weight(entry[1]), entry[1][3], entry[0]), reverse=True)
            truncated += max(0, len(entries) - MAX_USER_ITEMS)
            entries = entries[:MAX_USER_ITEMS]
            vector_length = math.sqrt(sum(item_weight(item) ** 2 for _, item in entries))
            vector = sorted((product_indexes[product_id], item_weight(item) / vector_length) for product_id, item in entries)
            for index, weight in vector:
                norms[index] += weight * weight
            for (left, left_weight), (right, right_weight) in itertools.combinations(vector, 2):
                # Integer pair keys use considerably less memory than raw string tuples.
                key = left * dimension + right
                pair = pairs.get(key)
                if pair is None:
                    pairs[key] = [left_weight * right_weight, 1]
                else:
                    pair[0] += left_weight * right_weight
                    pair[1] += 1
    candidates = defaultdict(list)
    supported_pairs = 0
    for key, (dot, support) in pairs.items():
        if support < MIN_SUPPORT:
            continue
        left, right = divmod(key, dimension)
        score = min(1.0, dot / math.sqrt(norms[left] * norms[right])) * support / (support + SUPPORT_SHRINKAGE)
        score = round(score, 8)
        if score <= 0:
            continue
        supported_pairs += 1
        candidates[left].append({"productId": product_ids[right], "score": score, "support": support})
        candidates[right].append({"productId": product_ids[left], "score": score, "support": support})
    neighbors = {}
    for index, entries in candidates.items():
        entries.sort(key=lambda entry: (-entry["score"], -entry["support"], entry["productId"]))
        neighbors[product_ids[index]] = entries[:MAX_NEIGHBORS]
    summary["neighborCoverage"] = {
        "productsWithNeighbors": len(neighbors), "products": len(products),
        "observedPairs": len(pairs), "supportedPairs": supported_pairs,
        "truncatedUserDomainItems": truncated,
        "minDistinctUsers": MIN_SUPPORT, "maxItemsPerUserDomain": MAX_USER_ITEMS,
        "maxNeighbors": MAX_NEIGHBORS,
        "weights": {"view": 1, "cart": 3, "order": 5},
        "formula": "cosine of per-user normalized weights * support / (support + 3)",
    }
    return neighbors


def json_write(path, value):
    with path.open("w", encoding="utf-8") as stream:
        json.dump(value, stream, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
        stream.write("\n")


def write_users(stage, users, products, neighbors, summary):
    shards = defaultdict(dict)
    samples = {}
    sample_ranks = {}
    strong_users = Counter()
    for user_id, history in users.items():
        shard = hashlib.sha256(user_id.encode("utf-8")).hexdigest()[:2]
        items = [{"productId": product_id, "viewCount": item[0], "cartCount": item[1], "orderCount": item[2], "lastAt": item[3]}
                 for product_id, item in sorted(history.items(), key=lambda entry: (-int(entry[1][3]), entry[0]))]
        shards[shard][user_id] = {"items": items}
        domain_items = defaultdict(list)
        for product_id, item in history.items():
            if item[1] or item[2]:
                domain_items[products[product_id]["domain"]].append((product_id, item))
        for domain, entries in domain_items.items():
            strong_users[domain] += 1
            # Prefer inspectable users with several strong seeds and unseen neighbors.
            unseen = {neighbor["productId"] for product_id, _ in entries for neighbor in neighbors.get(product_id, []) if neighbor["productId"] not in history}
            rank = (min(len(unseen), 12), min(len(entries), 5), sum(item_weight(item) for _, item in entries), max(item[3] for _, item in entries))
            if domain not in sample_ranks or rank > sample_ranks[domain]:
                samples[domain] = user_id
                sample_ranks[domain] = rank
    (stage / "users").mkdir()
    for index in range(256):
        shard = f"{index:02x}"
        json_write(stage / "users" / f"{shard}.json", shards.get(shard, {}))
    json_write(stage / "samples.json", samples)
    summary["users"] = len(users)
    summary["usersWithOrderOrCartByDomain"] = dict(strong_users)
    summary["sampleDomains"] = sorted(samples)
    summary["activityItems"] = sum(len(history) for history in users.values())


def publish(stage, output_dir):
    """Prepare completely before replacement, and restore old output on failure."""
    if output_dir.is_symlink() or (output_dir.exists() and not output_dir.is_dir()):
        raise PreparationError("Output must be a directory, not a file or symlink")
    backup = None
    try:
        if output_dir.exists():
            backup = Path(tempfile.mkdtemp(prefix=f".{output_dir.name.lstrip('.')}-previous-", dir=output_dir.parent))
            backup.rmdir()
            output_dir.rename(backup)
        stage.rename(output_dir)
    except BaseException:
        if backup is not None and backup.exists() and not output_dir.exists():
            backup.rename(output_dir)
        raise
    if backup is not None:
        shutil.rmtree(backup)


def prepare(data_dir, output_dir):
    started = time.monotonic()
    data_dir, output_dir = Path(data_dir).resolve(), Path(output_dir).absolute()
    if output_dir == data_dir or data_dir in output_dir.parents:
        raise PreparationError("Output directory must be outside the raw data directory")
    summary = {"files": {}, "products": 0, "users": 0, "domains": {}}
    headers = inspect_headers(data_dir, summary)
    products = load_products(data_dir, headers, summary)
    days = set()
    users = load_activity(data_dir, headers, summary, products, days)
    popularity = load_popularity(data_dir, headers, summary, products, days)
    neighbors = build_neighbors(products, users, summary)
    output_dir.parent.mkdir(parents=True, exist_ok=True)
    stage = Path(tempfile.mkdtemp(prefix=f".{output_dir.name.lstrip('.')}-staging-", dir=output_dir.parent))
    try:
        write_users(stage, users, products, neighbors, summary)
        summary["elapsedSeconds"] = round(time.monotonic() - started, 2)
        summary["windowDays"] = len(days)
        summary["notes"] = [
            "Activity is historical; it does not identify the current cart or owned inventory.",
            "Popularity is max rating per product/hour, then summed across the observed window; not personal ratings.",
            "Coverage metrics do not measure recommendation relevance or conversion.",
            "Only non-anonymous userid values joined to valid catalog products are aggregated.",
        ]
        result = {"version": 1, "builtAt": datetime.now(timezone.utc).isoformat(),
                  "window": {"from": min(days) if days else "", "to": max(days) if days else ""},
                  "products": sorted(products.values(), key=lambda product: product["prd_id"]),
                  "popularity": popularity, "neighbors": neighbors, "summary": summary}
        # Catalog is the completion marker and is written after all user shards.
        json_write(stage / "catalog.json", result)
        publish(stage, output_dir)
    finally:
        if stage.exists():
            shutil.rmtree(stage)
    return summary


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-dir", type=Path, default=Path("data"))
    parser.add_argument("--output-dir", type=Path, default=Path(".recommendation"))
    args = parser.parse_args(argv)
    try:
        summary = prepare(args.data_dir, args.output_dir)
    except PreparationError as error:
        print(json.dumps({"error": str(error), "summary": error.summary}, ensure_ascii=False), file=sys.stderr)
        return 1
    except (OSError, ValueError):
        # Avoid a traceback exposing values from private dumps.
        print(json.dumps({"error": "Preparation failed; existing valid output was preserved."}), file=sys.stderr)
        return 1
    print(json.dumps({"complete": True, "summary": summary}, ensure_ascii=False), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

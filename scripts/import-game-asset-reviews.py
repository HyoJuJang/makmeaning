#!/usr/bin/env python3
"""Validate photo reviews and optionally import them; default mode never writes.

Examples:
  python3 scripts/import-game-asset-reviews.py data/game-assets/overnight/reviews/*.json
  python3 scripts/import-game-asset-reviews.py REVIEW.json --apply
  python3 scripts/import-game-asset-reviews.py --expand-identical-images --apply

Only literal SHA-256 identity of locally rechecked source-image bytes can extend
an already reviewed asset mapping. Product names and category similarity never
establish image equivalence. The original nine-column catalog is read-only.
"""

from __future__ import annotations

import argparse
from collections import defaultdict
import copy
import csv
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile


REPO = Path(__file__).resolve().parents[1]
FIELDS = ["prd_id", "view_name", "cate1_nm", "cate2_nm", "cate3_nm", "cate4_nm", "brand_name", "discprice", "domain"]
IDENTIFIER = re.compile(r"^[a-z][a-z0-9_-]*$")
SHA256 = re.compile(r"^[0-9a-f]{64}$")
ATTRIBUTES = ("familyId", "color", "pattern")
UNKNOWN_COLORS = {"unspecified", "unknown", "neutral", "generic"}
UNKNOWN_PATTERNS = {"unspecified", "unknown", "generic"}


class InvalidInput(ValueError):
    pass


def ensure(condition: bool, message: str) -> None:
    if not condition:
        raise InvalidInput(message)


def unique_strings(value, label: str, *, nonempty: bool = False) -> list[str]:
    ensure(isinstance(value, list) and (not nonempty or bool(value)), f"{label}: expected string list")
    ensure(all(isinstance(item, str) and item.strip() for item in value), f"{label}: invalid text")
    return list(dict.fromkeys(value))


def merge_text(*lists: list[str]) -> list[str]:
    return list(dict.fromkeys(item for items in lists for item in items))


def read_json(path: Path, fallback=None):
    if not path.exists() and fallback is not None:
        return copy.deepcopy(fallback)
    def unique_object(pairs):
        result = {}
        for key, value in pairs:
            ensure(key not in result, f"Duplicate JSON key in {path.name}: {key}")
            result[key] = value
        return result
    return json.loads(path.read_text(encoding="utf-8-sig"), object_pairs_hook=unique_object)


def read_catalog(path: Path) -> dict:
    with path.open(encoding="utf-8-sig", newline="") as stream:
        reader = csv.DictReader(stream)
        ensure(reader.fieldnames == FIELDS, "Catalog must retain its original nine columns")
        products = {}
        for row in reader:
            product_id = row.get("prd_id")
            ensure(isinstance(product_id, str) and product_id.isascii() and product_id.isdigit(), "Invalid catalog product ID")
            ensure(product_id not in products, f"Duplicate catalog product ID: {product_id}")
            ensure(None not in row and all(value is not None for value in row.values()), f"Malformed catalog row: {product_id}")
            products[product_id] = row
    return products


def load_classifier(repo: Path, products: dict, node: str) -> tuple[dict, dict]:
    # Import the repository's live family definitions and rules rather than
    # trusting a possibly stale generated CSV or duplicating rules in Python.
    code = """
      import fs from 'node:fs';
      import { pathToFileURL } from 'node:url';
      const { FAMILIES, classifyProduct } = await import(pathToFileURL(process.argv[1]).href);
      const rows = JSON.parse(fs.readFileSync(0, 'utf8'));
      process.stdout.write(JSON.stringify({ families: FAMILIES,
        products: rows.map(row => ({ prd_id: row.prd_id, ...classifyProduct(row) })) }));
    """
    result = subprocess.run(
        [node, "--input-type=module", "-e", code, str(repo / "scripts/lib/game-asset-rules.mjs")],
        input=json.dumps(list(products.values()), ensure_ascii=False), capture_output=True,
        text=True, timeout=60, check=False,
    )
    ensure(result.returncode == 0, "Could not load repository classification rules with Node")
    payload = json.loads(result.stdout)
    return payload["families"], {record.pop("prd_id"): record for record in payload["products"]}


def validate_classification(record: dict, product_id: str, products: dict, families: dict) -> None:
    ensure(product_id in products, f"Unknown product ID: {product_id}")
    ensure(isinstance(record, dict), f"Invalid classification: {product_id}")
    ensure(isinstance(record.get("familyId"), str), f"Invalid family ID: {product_id}")
    family = families.get(record["familyId"])
    ensure(family and family["domain"] == products[product_id]["domain"], f"Family/domain mismatch: {product_id}")
    for field in ("color", "pattern"):
        ensure(isinstance(record.get(field), str) and IDENTIFIER.fullmatch(record[field]), f"Invalid {field}: {product_id}")


def validate_overrides(raw: list, products: dict, families: dict) -> dict:
    ensure(isinstance(raw, list), "Product overrides must be an array")
    overrides = {}
    for record in raw:
        ensure(isinstance(record, dict), "Malformed product override")
        product_id = record.get("prd_id")
        ensure(isinstance(product_id, str) and product_id in products, f"Unknown override product ID: {product_id}")
        ensure(product_id not in overrides, f"Duplicate override product ID: {product_id}")
        ensure(not any(field in record for field in FIELDS if field != "prd_id"), f"Override cannot edit catalog columns: {product_id}")
        validate_classification(record, product_id, products, families)
        ensure(record.get("mappingStatus") in {"classified", "needs_review"}, f"Invalid override mapping status: {product_id}")
        unique_strings(record.get("evidence"), f"Evidence for {product_id}", nonempty=True)
        unique_strings(record.get("reasons", []), f"Reasons for {product_id}")
        overrides[product_id] = copy.deepcopy(record)
    return overrides


def validate_manifest(manifest: dict, products: dict, families: dict) -> dict:
    ensure(isinstance(manifest, dict) and isinstance(manifest.get("assets"), list), "Invalid asset manifest")
    assets = {}
    for asset in manifest["assets"]:
        ensure(isinstance(asset, dict) and isinstance(asset.get("id"), str), "Invalid manifest asset")
        asset_id = asset["id"]
        ensure(asset_id not in assets, f"Duplicate asset ID: {asset_id}")
        ensure(isinstance(asset.get("familyId"), str) and asset["familyId"] in families and families[asset["familyId"]]["domain"] == asset.get("domain"), f"Invalid asset family/domain: {asset_id}")
        for field in ("color", "pattern"):
            ensure(isinstance(asset.get(field), str) and IDENTIFIER.fullmatch(asset[field]), f"Invalid asset {field}: {asset_id}")
        if "approvedProductIds" in asset:
            ids = asset["approvedProductIds"]
            ensure(isinstance(ids, list) and all(isinstance(product_id, str) for product_id in ids), f"Invalid asset approved IDs: {asset_id}")
            ensure(len(set(ids)) == len(ids), f"Duplicate approved product ID: {asset_id}")
            ensure(all(product_id in products and products[product_id]["domain"] == asset["domain"] for product_id in ids), f"Unknown or cross-domain approved product: {asset_id}")
        assets[asset_id] = asset
    return assets


def validate_jobs(jobs: list, products: dict, families: dict, assets: dict) -> dict:
    registered = defaultdict(list)
    for job in jobs:
        ensure(isinstance(job, dict), "Malformed generation job")
        if job.get("status") != "registered":
            continue
        ids = job.get("approvedProductIds")
        ensure(isinstance(ids, list) and ids and all(isinstance(item, str) for item in ids) and len(ids) == len(set(ids)), "Registered job needs unique approved IDs")
        asset_id = job.get("assetId")
        ensure(isinstance(asset_id, str) and asset_id in assets and assets[asset_id].get("status") == "ready", f"Registered job asset missing: {asset_id}")
        for product_id in ids:
            ensure(isinstance(product_id, str), "Registered job product IDs must be strings")
            validate_classification(job, product_id, products, families)
            ensure(job.get("domain") == products[product_id]["domain"], f"Registered job domain conflict: {product_id}")
            ensure(all(job.get(field) == assets[asset_id].get(field) for field in ATTRIBUTES), f"Registered job metadata differs from manifest: {product_id}")
            registered[product_id].append(job)
    return registered


def asset_matches(asset: dict, classification: dict, product: dict, *, explicit: bool = False) -> bool:
    if asset.get("status") != "ready" or asset["domain"] != product["domain"] or asset["familyId"] != classification["familyId"]:
        return False
    if explicit:
        return asset["color"] == classification["color"] and asset["pattern"] == classification["pattern"]
    return (asset.get("colorPolicy") == "generic" or asset["color"] == classification["color"]) and (asset["pattern"] == "generic" or asset["pattern"] == classification["pattern"])


def photo_verified(product_id: str, current: dict, overrides: dict) -> bool:
    if current.get("mappingStatus") != "classified":
        return False
    if product_id in overrides:
        return bool(overrides[product_id].get("evidence"))
    return current.get("attributes", {}).get("referenceVerified") is True


def checked_asset_file(asset: dict, repo: Path) -> bool:
    try:
        relative = Path(asset["sourcePath"])
        source = (repo / relative).resolve()
        if relative.is_absolute() or not source.is_relative_to((repo / "app/assets/game-items").resolve()):
            return False
        content = source.read_bytes()
        return content.startswith(b"\x89PNG\r\n\x1a\n") and hashlib.sha256(content).hexdigest() == asset.get("sha256")
    except (OSError, KeyError, TypeError):
        return False


def checked_reference_hashes(references: dict, products: dict, cache_dir: Path) -> tuple[dict, list]:
    ensure(isinstance(references, dict) and references.get("version") == 1 and isinstance(references.get("products"), dict), "Reference status must use version 1 products/sha256 schema")
    result, held = {}, []
    for product_id, reference in references["products"].items():
        ensure(product_id in products, f"Unknown reference product ID: {product_id}")
        ensure(isinstance(reference, dict), f"Invalid reference record: {product_id}")
        if reference.get("status") != "available":
            continue
        sha = reference.get("sha256")
        try:
            path = Path(reference["localPath"]).resolve()
            valid = isinstance(sha, str) and SHA256.fullmatch(sha) and path.parent == cache_dir.resolve() and path.stem == product_id
            valid = valid and path.is_file() and path.stat().st_size <= 5 * 1024 * 1024
            valid = valid and hashlib.sha256(path.read_bytes()).hexdigest() == sha
        except (OSError, KeyError, TypeError):
            valid = False
        if valid:
            result[product_id] = sha
        else:
            held.append({"prd_id": product_id, "reason": "available 원본 파일의 경로 또는 SHA-256 검증 실패"})
    return result, held


def plan_import(*, products: dict, families: dict, base: dict, manifest: dict,
                raw_overrides: list, reviews: list, jobs: list, repo: Path,
                references: dict | None = None, expand: bool = False,
                cache_dir: Path | None = None) -> dict:
    """Pure plan: only local reads; mutation is confined to deep-copied values."""
    output_manifest = copy.deepcopy(manifest)
    assets = validate_manifest(output_manifest, products, families)
    overrides = validate_overrides(raw_overrides, products, families)
    original_overrides = copy.deepcopy(overrides)
    ensure(set(base) == set(products), "Base classification does not cover the catalog exactly")
    for product_id, classification in base.items():
        validate_classification(classification, product_id, products, families)
    registered = validate_jobs(jobs, products, families, assets)
    conflicts, held, actions = [], [], []
    checked_files = {}

    def file_ready(asset):
        if asset["id"] not in checked_files:
            checked_files[asset["id"]] = checked_asset_file(asset, repo)
        return checked_files[asset["id"]]

    def current(product_id):
        return overrides.get(product_id, base[product_id])

    # Existing generic legacy assets must not silently absorb newly imported
    # reviewed-but-unassigned products. Keep only previously photo-verified IDs.
    frozen = []
    for asset in assets.values():
        if "approvedProductIds" not in asset:
            asset["approvedProductIds"] = [
                product_id for product_id, product in products.items()
                if photo_verified(product_id, current(product_id), overrides)
                and asset_matches(asset, current(product_id), product)
            ]
            frozen.append({"assetId": asset["id"], "retainedIds": len(asset["approvedProductIds"])})

    seen, explicit_unresolved = set(), set()
    reviewed_count = unresolved_count = 0
    for review in reviews:
        ensure(isinstance(review, dict) and isinstance(review.get("reviewed"), list) and isinstance(review.get("unresolved"), list), "Review requires reviewed and unresolved arrays")
        for category in ("reviewed", "unresolved"):
            for record in review[category]:
                ensure(isinstance(record, dict), "Malformed review row")
                product_id = record.get("prd_id")
                ensure(isinstance(product_id, str) and product_id in products, f"Unknown review product ID: {product_id}")
                ensure(product_id not in seen, f"Duplicate review product ID: {product_id}")
                seen.add(product_id)
                if "domain" in record:
                    ensure(record["domain"] == products[product_id]["domain"], f"Review domain mismatch: {product_id}")
                old = current(product_id)
                if category == "reviewed":
                    reviewed_count += 1
                    validate_classification(record, product_id, products, families)
                    evidence = unique_strings(record.get("evidence"), f"Review evidence for {product_id}", nonempty=True)
                    compatible_id = record.get("compatibleAssetId")
                    ensure(compatible_id is None or isinstance(compatible_id, str), f"Invalid compatibleAssetId: {product_id}")
                    group = record.get("groupSuggestion")
                    ensure(group is None or isinstance(group, str) and bool(IDENTIFIER.fullmatch(group)), f"Invalid groupSuggestion: {product_id}")
                    proposed = {"prd_id": product_id, **{key: record[key] for key in ATTRIBUTES},
                        "mappingStatus": "classified", "evidence": merge_text(old.get("evidence", []), evidence), "reasons": []}
                    if group is not None:
                        proposed["groupSuggestion"] = group
                    if compatible_id is not None:
                        ensure(compatible_id in assets, f"Unknown compatible asset: {product_id}: {compatible_id}")
                        ensure(asset_matches(assets[compatible_id], proposed, products[product_id], explicit=True), f"Compatible asset domain/family/color/pattern mismatch: {product_id}")
                        ensure(file_ready(assets[compatible_id]), f"Compatible asset PNG missing or changed: {compatible_id}")
                else:
                    unresolved_count += 1
                    explicit_unresolved.add(product_id)
                    reason = record.get("reason")
                    ensure(isinstance(reason, str) and reason.strip(), f"Unresolved review needs a reason: {product_id}")
                    compatible_id = None
                    # Preserve family/color/pattern, even if this review only
                    # tells us that the current photo cannot settle an option.
                    proposed = {"prd_id": product_id, **{key: old[key] for key in ATTRIBUTES},
                        "mappingStatus": "needs_review", "evidence": merge_text(old.get("evidence", []), [f"사진 검수 보류: {reason}"]),
                        "reasons": merge_text(old.get("reasons", []), [reason])}

                product_conflicts = []
                for job in registered.get(product_id, []):
                    if proposed["mappingStatus"] != "classified" or any(proposed[key] != job[key] for key in ATTRIBUTES) or compatible_id not in (None, job["assetId"]):
                        product_conflicts.append(f"registered job {job.get('key', job['assetId'])}와 검수 결과 충돌")
                # Also protect a previously approved ready asset even if its
                # historical job file is no longer present.
                old_assets = [asset for asset in assets.values() if product_id in asset["approvedProductIds"] and asset_matches(asset, old, products[product_id])]
                if old_assets and (proposed["mappingStatus"] != old.get("mappingStatus") or any(proposed[key] != old[key] for key in ATTRIBUTES)):
                    product_conflicts.append("기존 ready 에셋 연결의 형태/색상/패턴/검수 상태와 충돌")
                if compatible_id and any(asset["id"] != compatible_id for asset in old_assets):
                    product_conflicts.append("기존 ready 에셋과 다른 에셋을 중복 지정")
                if product_conflicts:
                    conflicts.append({"prd_id": product_id, "reasons": product_conflicts})
                    continue
                # Retain additional metadata and existing evidence on an
                # otherwise identical registered mapping.
                if product_id in overrides:
                    proposed = {**overrides[product_id], **proposed}
                overrides[product_id] = proposed
                if compatible_id and product_id not in assets[compatible_id]["approvedProductIds"]:
                    assets[compatible_id]["approvedProductIds"].append(product_id)
                actions.append({"prd_id": product_id, "action": category, "assetId": compatible_id})

    expanded = []
    if expand and not conflicts:
        ensure(references is not None, "Identical-image expansion requires reference-status.json")
        hashes, invalid_files = checked_reference_hashes(references, products, cache_dir or repo.parent / "work/overnight/reference-images")
        held.extend(invalid_files)
        groups = defaultdict(list)
        for product_id, sha in hashes.items():
            groups[sha].append(product_id)
        for sha, members in groups.items():
            if len(members) < 2:
                continue
            seeds = []
            for product_id in members:
                classification = current(product_id)
                if not photo_verified(product_id, classification, overrides):
                    continue
                options = [asset for asset in assets.values() if product_id in asset["approvedProductIds"] and asset_matches(asset, classification, products[product_id]) and file_ready(asset)]
                if len(options) > 1:
                    held.append({"prd_id": product_id, "reason": "검수 시드에 여러 ready 에셋이 있어 확장 제외"})
                elif len(options) == 1:
                    seeds.append((product_id, classification, options[0]))
            if not seeds:
                continue
            for product_id in members:
                old = current(product_id)
                if product_id in explicit_unresolved or product_id in overrides and old["mappingStatus"] == "needs_review":
                    held.append({"prd_id": product_id, "reason": "명시적인 사진 검수 보류 상태이므로 자동 확장 제외"})
                    continue
                candidates = {}
                for seed_id, seed, asset in seeds:
                    if product_id == seed_id or products[product_id]["domain"] != products[seed_id]["domain"] or old["familyId"] != seed["familyId"]:
                        continue
                    if old["color"] not in UNKNOWN_COLORS and seed["color"] not in UNKNOWN_COLORS and old["color"] != seed["color"]:
                        continue
                    if old["pattern"] not in UNKNOWN_PATTERNS and seed["pattern"] not in UNKNOWN_PATTERNS and old["pattern"] != seed["pattern"]:
                        continue
                    proposed = {"familyId": seed["familyId"],
                        "color": old["color"] if seed["color"] in UNKNOWN_COLORS else seed["color"],
                        "pattern": old["pattern"] if seed["pattern"] in UNKNOWN_PATTERNS else seed["pattern"]}
                    if not asset_matches(asset, proposed, products[product_id]):
                        continue
                    key = (asset["id"], *(proposed[field] for field in ATTRIBUTES))
                    candidates.setdefault(key, (seed_id, proposed, asset))
                if not candidates:
                    continue
                if len(candidates) > 1:
                    held.append({"prd_id": product_id, "reason": "동일 사진에 서로 다른 ready 에셋/속성 후보가 있어 연결 보류"})
                    continue
                seed_id, proposed, asset = next(iter(candidates.values()))
                existing_ready = [candidate for candidate in assets.values() if product_id in candidate["approvedProductIds"] and asset_matches(candidate, old, products[product_id])]
                if any(candidate["id"] != asset["id"] for candidate in existing_ready):
                    held.append({"prd_id": product_id, "reason": "이미 연결된 ready 에셋과 동일 이미지 확장 후보가 충돌"})
                    continue
                if any(any(job[field] != proposed[field] for field in ATTRIBUTES) or job["assetId"] != asset["id"] for job in registered.get(product_id, [])):
                    held.append({"prd_id": product_id, "reason": "registered job 연결과 동일 이미지 확장 후보가 충돌"})
                    continue
                if existing_ready and photo_verified(product_id, old, overrides):
                    continue
                evidence = f"검수 완료 상품 {seed_id}와 원본 이미지 파일 SHA-256 완전 일치: {sha}. 동일 사진의 시각 검수 결과 재사용; 상품명/카테고리 유사성으로 추정하지 않음."
                overrides[product_id] = {**overrides.get(product_id, {}), "prd_id": product_id, **proposed,
                    "mappingStatus": "classified", "evidence": merge_text(old.get("evidence", []), [evidence]), "reasons": [],
                    "identicalImageSourcePrdId": seed_id, "referenceSha256": sha}
                if product_id not in asset["approvedProductIds"]:
                    asset["approvedProductIds"].append(product_id)
                expanded.append({"prd_id": product_id, "sourcePrdId": seed_id, "assetId": asset["id"], "sha256": sha})

    changed_ids = [product_id for product_id in overrides if original_overrides.get(product_id) != overrides[product_id]]
    return {
        "manifest": output_manifest, "overrides": list(overrides.values()),
        "summary": {
            "reviewed": reviewed_count, "unresolved": unresolved_count,
            "changedOverrides": len(changed_ids), "changedProductIds": changed_ids,
            "expandedMappings": len(expanded), "expansions": expanded,
            "frozenLegacyAssets": frozen, "conflicts": conflicts,
            "heldCount": len(held), "held": held[:50],
            "manifestChanged": output_manifest != manifest,
            "catalogUnchanged": True,
        },
    }


def fingerprint(path: Path) -> str | None:
    return hashlib.sha256(path.read_bytes()).hexdigest() if path.exists() else None


def registered_job_snapshot(directory: Path, jobs: dict | None = None) -> dict:
    # Only registered jobs are consumed by validate_jobs/plan_import. Keep their
    # full records and membership guarded, including newly registered files,
    # while allowing unrelated image-generation checkpoints to advance.
    if jobs is None:
        jobs = {path: read_json(path) for path in sorted(directory.glob("*.json"))}
    ensure(all(isinstance(job, dict) for job in jobs.values()), "Malformed generation job")
    return {str(path): job for path, job in jobs.items() if job.get("status") == "registered"}


def stage_json(path: Path, payload) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, name = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=path.parent)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as stream:
            json.dump(payload, stream, ensure_ascii=False, indent=2)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
    except BaseException:
        Path(name).unlink(missing_ok=True)
        raise
    return Path(name)


def apply_plan(plan: dict, *, manifest_path: Path, overrides_path: Path, snapshots: dict,
               job_snapshot: tuple[Path, dict] | None = None) -> None:
    def inputs_unchanged():
        return (all(fingerprint(path) == original for path, original in snapshots.items())
                and (job_snapshot is None or registered_job_snapshot(job_snapshot[0]) == job_snapshot[1]))

    ensure(not plan["summary"]["conflicts"], "Conflicting reviews: no files were written")
    ensure(inputs_unchanged(), "Input changed during review planning; rerun instead of overwriting concurrent work")
    staged = []
    try:
        for path, payload in ((manifest_path, plan["manifest"]), (overrides_path, plan["overrides"])):
            staged.append((path, stage_json(path, payload)))
        ensure(inputs_unchanged(), "Input changed before save; staged files discarded")
        # Each JSON file is atomically replaced. A process interruption between
        # the two replacements is retryable; this is not a multi-file database
        # transaction. Do not register new assets concurrently with --apply.
        for path, temporary in staged:
            os.replace(temporary, path)
    finally:
        for _, temporary in staged:
            temporary.unlink(missing_ok=True)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("reviews", nargs="*", type=Path)
    parser.add_argument("--repository", type=Path, default=REPO)
    parser.add_argument("--node", default=shutil.which("node") or "node")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--apply", action="store_true", help="Write validated overrides/manifest only when no review conflicts exist")
    mode.add_argument("--dry-run", action="store_true", help="Read-only preview (default)")
    parser.add_argument("--expand-identical-images", action="store_true")
    args = parser.parse_args(argv)
    if not args.reviews and not args.expand_identical_images:
        parser.error("Supply review files or --expand-identical-images")
    repo = args.repository.resolve()
    catalog_path = repo / "data/catalog/products.csv"
    manifest_path = repo / "data/game-assets/manifest.json"
    overrides_path = repo / "data/game-assets/product-overrides.json"
    lock_stream = None
    try:
        if args.apply:
            lock_path = repo / "data/game-assets/.review-import.lock"
            lock_path.parent.mkdir(parents=True, exist_ok=True)
            lock_stream = lock_path.open("a+")
            try:
                fcntl.flock(lock_stream, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError:
                raise InvalidInput("Another review importer is already running")
        jobs_directory = repo / "data/game-assets/overnight/jobs"
        jobs = {path: read_json(path) for path in sorted(jobs_directory.glob("*.json"))}
        job_snapshot = (jobs_directory, registered_job_snapshot(jobs_directory, jobs))
        snapshots = {path: fingerprint(path) for path in [catalog_path, manifest_path, overrides_path, *args.reviews]}
        products = read_catalog(catalog_path)
        families, base = load_classifier(repo, products, args.node)
        plan = plan_import(
            products=products, families=families, base=base,
            manifest=read_json(manifest_path), raw_overrides=read_json(overrides_path, []),
            reviews=[read_json(path) for path in args.reviews], jobs=list(jobs.values()), repo=repo,
            references=read_json(repo / "data/game-assets/overnight/reference-status.json") if args.expand_identical_images else None,
            expand=args.expand_identical_images,
        )
        report = {"mode": "apply" if args.apply else "dry-run", **plan["summary"], "written": False}
        if args.apply and not report["conflicts"]:
            apply_plan(plan, manifest_path=manifest_path, overrides_path=overrides_path, snapshots=snapshots,
                       job_snapshot=job_snapshot)
            report["written"] = True
        print(json.dumps(report, ensure_ascii=False, indent=2), flush=True)
        return 2 if report["conflicts"] else 0
    except (InvalidInput, OSError, ValueError, KeyError, subprocess.TimeoutExpired) as error:
        print(json.dumps({"mode": "apply" if args.apply else "dry-run", "written": False, "error": str(error)}, ensure_ascii=False), flush=True)
        return 2
    finally:
        if lock_stream is not None:
            lock_stream.close()


if __name__ == "__main__":
    raise SystemExit(main())

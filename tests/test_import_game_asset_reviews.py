"""Local fixtures only: no network requests and no repository catalog mutations."""
import base64
import copy
import csv
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from contextlib import redirect_stdout
from unittest.mock import patch


SPEC = importlib.util.spec_from_file_location(
    "import_game_asset_reviews", Path(__file__).resolve().parents[1] / "scripts/import-game-asset-reviews.py"
)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)
PNG = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD2sAAAAASUVORK5CYII=")


class ReviewImportTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.repo = Path(self.temp.name) / "repository"
        self.repo.mkdir()
        self.cache = self.repo.parent / "work/overnight/reference-images"
        self.cache.mkdir(parents=True)
        self.families = {"mug": {"domain": "living"}, "table": {"domain": "living"}, "serum": {"domain": "beauty"}}
        self.products = {product_id: dict.fromkeys(MODULE.FIELDS, "") | {"prd_id": product_id, "domain": "living", "view_name": "fixture"}
                         for product_id in ["101", "102", "103", "104"]}
        self.base = {product_id: {"familyId": "mug", "color": "unspecified", "pattern": "unspecified",
            "mappingStatus": "classified", "evidence": ["상품 분류에 의한 후보"], "reasons": [], "attributes": {}}
            for product_id in self.products}
        self.asset = {"id": "mug--white", "familyId": "mug", "domain": "living", "color": "white", "pattern": "solid",
            "status": "ready", "colorPolicy": "exact", "approvedProductIds": ["101"],
            "sourcePath": "app/assets/game-items/v1/living/mug/white.png", "sha256": hashlib.sha256(PNG).hexdigest()}
        asset_path = self.repo / self.asset["sourcePath"]
        asset_path.parent.mkdir(parents=True)
        asset_path.write_bytes(PNG)
        self.manifest = {"version": "v1", "assets": [self.asset]}
        self.overrides = [self.override("101")]
        self.jobs = []
        self.references = {"version": 1, "products": {}}
        for product_id in self.products:
            path = self.cache / f"{product_id}.png"
            path.write_bytes(PNG)
            self.references["products"][product_id] = {"status": "available", "localPath": str(path), "sha256": hashlib.sha256(PNG).hexdigest()}

    def override(self, product_id, **extra):
        return {"prd_id": product_id, "familyId": "mug", "color": "white", "pattern": "solid", "mappingStatus": "classified",
                "evidence": ["사진에서 흰 도자기 머그 확인"], "reasons": [], **extra}

    def reviewed(self, product_id, **extra):
        return {"prd_id": product_id, "familyId": "mug", "color": "white", "pattern": "solid",
                "evidence": ["실제 상품 사진에서 흰 원통형 머그 및 손잡이 확인"], "compatibleAssetId": "mug--white", "groupSuggestion": "white_ceramic_mug", **extra}

    def plan(self, reviews=None, **options):
        args = dict(products=self.products, families=self.families, base=self.base, manifest=self.manifest,
                    raw_overrides=self.overrides, reviews=reviews or [], jobs=self.jobs, repo=self.repo,
                    references=self.references, cache_dir=self.cache)
        args.update(options)
        return MODULE.plan_import(**args)

    def test_compatible_review_and_unresolved_preserve_metadata(self):
        original = copy.deepcopy(self.manifest)
        self.base["103"].update(familyId="table", color="brown", pattern="woodgrain")
        plan = self.plan([{"reviewed": [self.reviewed("102")], "unresolved": [{"prd_id": "103", "reason": "선택 옵션 확인 필요"}]}])
        rows = {row["prd_id"]: row for row in plan["overrides"]}
        self.assertIn("102", plan["manifest"]["assets"][0]["approvedProductIds"])
        self.assertEqual((rows["103"]["familyId"], rows["103"]["color"], rows["103"]["pattern"]), ("table", "brown", "woodgrain"))
        self.assertEqual(rows["103"]["mappingStatus"], "needs_review")
        self.assertIn("선택 옵션 확인 필요", rows["103"]["reasons"])
        self.assertEqual(self.manifest, original)

    def test_registered_matching_review_retains_approval_and_evidence(self):
        self.jobs = [{"key": "mug-white", "status": "registered", "assetId": "mug--white", "approvedProductIds": ["101"],
                      "familyId": "mug", "domain": "living", "color": "white", "pattern": "solid"}]
        plan = self.plan([{"reviewed": [self.reviewed("101", compatibleAssetId=None)], "unresolved": []}])
        row = plan["overrides"][0]
        self.assertEqual(plan["summary"]["conflicts"], [])
        self.assertIn("사진에서 흰 도자기 머그 확인", row["evidence"])
        self.assertIn("101", plan["manifest"]["assets"][0]["approvedProductIds"])

    def test_registered_conflict_prevents_any_apply(self):
        self.jobs = [{"key": "mug-white", "status": "registered", "assetId": "mug--white", "approvedProductIds": ["101"],
                      "familyId": "mug", "domain": "living", "color": "white", "pattern": "solid"}]
        plan = self.plan([{"reviewed": [self.reviewed("101", color="black", compatibleAssetId=None), self.reviewed("102")], "unresolved": []}])
        self.assertEqual(plan["summary"]["conflicts"][0]["prd_id"], "101")
        manifest_path = self.repo / "manifest.json"
        override_path = self.repo / "overrides.json"
        with self.assertRaises(MODULE.InvalidInput):
            MODULE.apply_plan(plan, manifest_path=manifest_path, overrides_path=override_path, snapshots={})
        self.assertFalse(manifest_path.exists())
        self.assertFalse(override_path.exists())

    def test_exact_hash_reuses_only_verified_ready_seed(self):
        self.base["103"]["color"] = "black"
        self.base["104"]["familyId"] = "table"
        plan = self.plan(expand=True)
        self.assertEqual([row["prd_id"] for row in plan["summary"]["expansions"]], ["102"])
        row = next(row for row in plan["overrides"] if row["prd_id"] == "102")
        self.assertEqual(row["identicalImageSourcePrdId"], "101")
        self.assertIn("SHA-256 완전 일치", " ".join(row["evidence"]))

    def test_no_seed_from_title_only_classification(self):
        self.base["101"].update(color="white", pattern="solid")
        plan = self.plan(raw_overrides=[], expand=True)
        self.assertEqual(plan["summary"]["expandedMappings"], 0)

    def test_explicit_needs_review_and_unresolved_are_not_expanded(self):
        self.overrides.append(self.override("102", mappingStatus="needs_review", reasons=["옵션 미확인"]))
        plan = self.plan([{"reviewed": [], "unresolved": [{"prd_id": "103", "reason": "패키지 모양 불명"}]}], expand=True)
        expanded = {record["prd_id"] for record in plan["summary"]["expansions"]}
        self.assertNotIn("102", expanded)
        self.assertNotIn("103", expanded)
        self.assertIn("104", expanded)

    def test_same_hash_status_with_changed_local_bytes_is_excluded(self):
        (self.cache / "102.png").write_bytes(PNG + b"changed")
        plan = self.plan(expand=True)
        self.assertNotIn("102", [record["prd_id"] for record in plan["summary"]["expansions"]])
        self.assertTrue(any(record["prd_id"] == "102" and "SHA-256" in record["reason"] for record in plan["summary"]["held"]))

    def test_cross_domain_is_not_expanded(self):
        self.products["104"]["domain"] = "beauty"
        self.base["104"]["familyId"] = "serum"
        plan = self.plan(expand=True)
        self.assertNotIn("104", [record["prd_id"] for record in plan["summary"]["expansions"]])

    def test_multiple_ready_assets_on_same_photo_hold_target(self):
        second = copy.deepcopy(self.asset)
        second.update(id="mug--other-shape", approvedProductIds=["103"])
        self.manifest["assets"].append(second)
        self.overrides.append(self.override("103"))
        plan = self.plan(expand=True)
        self.assertEqual(plan["summary"]["expandedMappings"], 0)
        self.assertTrue(any(record["prd_id"] == "102" and "서로 다른" in record["reason"] for record in plan["summary"]["held"]))

    def test_unassigned_review_cannot_attach_to_legacy_asset(self):
        del self.asset["approvedProductIds"]
        plan = self.plan([{"reviewed": [self.reviewed("102", compatibleAssetId=None)], "unresolved": []}])
        self.assertEqual(plan["manifest"]["assets"][0]["approvedProductIds"], ["101"])
        self.assertEqual(plan["summary"]["frozenLegacyAssets"], [{"assetId": "mug--white", "retainedIds": 1}])

    def test_duplicate_unknown_and_cross_domain_reviews_fail(self):
        cases = [
            {"reviewed": [self.reviewed("102"), self.reviewed("102")], "unresolved": []},
            {"reviewed": [self.reviewed("999")], "unresolved": []},
            {"reviewed": [self.reviewed("102", familyId="serum")], "unresolved": []},
            {"reviewed": [self.reviewed("102", color="black")], "unresolved": []},
            {"reviewed": [self.reviewed("102", evidence=[])], "unresolved": []},
        ]
        for case in cases:
            with self.subTest(case=case), self.assertRaises(MODULE.InvalidInput):
                self.plan([case])

    def test_atomic_apply_detects_concurrent_modification(self):
        manifest_path = self.repo / "manifest.json"
        overrides_path = self.repo / "overrides.json"
        manifest_path.write_text(json.dumps(self.manifest))
        overrides_path.write_text(json.dumps(self.overrides))
        snapshots = {path: MODULE.fingerprint(path) for path in (manifest_path, overrides_path)}
        plan = self.plan([{"reviewed": [self.reviewed("102")], "unresolved": []}])
        manifest_path.write_text("concurrent update")
        previous = overrides_path.read_bytes()
        with self.assertRaises(MODULE.InvalidInput):
            MODULE.apply_plan(plan, manifest_path=manifest_path, overrides_path=overrides_path, snapshots=snapshots)
        self.assertEqual(overrides_path.read_bytes(), previous)
        self.assertEqual(manifest_path.read_text(), "concurrent update")

    def test_duplicate_reference_product_keys_are_rejected(self):
        path = self.repo / "duplicate-reference-status.json"
        path.write_text('{"version":1,"products":{"101":{},"101":{}}}')
        with self.assertRaises(MODULE.InvalidInput):
            MODULE.read_json(path)

    def test_generation_checkpoint_does_not_block_or_get_overwritten_by_review_import(self):
        directory = self.repo / 'jobs'
        directory.mkdir()
        job_path = directory / 'pending.json'
        job_path.write_text(json.dumps({'status': 'generating', 'key': 'pending'}))
        guard = (directory, MODULE.registered_job_snapshot(directory))
        manifest_path, overrides_path = self.repo / 'manifest.json', self.repo / 'overrides.json'
        manifest_path.write_text(json.dumps(self.manifest))
        overrides_path.write_text(json.dumps(self.overrides))
        snapshots = {path: MODULE.fingerprint(path) for path in (manifest_path, overrides_path)}
        plan = self.plan([{'reviewed': [self.reviewed('102')], 'unresolved': []}])
        stage = MODULE.stage_json
        def checkpoint_during_stage(path, payload):
            job_path.write_text(json.dumps({'status': 'generated', 'key': 'pending', 'generatedPath': '/new.png'}))
            return stage(path, payload)
        with patch.object(MODULE, 'stage_json', side_effect=checkpoint_during_stage):
            MODULE.apply_plan(plan, manifest_path=manifest_path, overrides_path=overrides_path,
                              snapshots=snapshots, job_snapshot=guard)
        self.assertIn('102', json.loads(manifest_path.read_text())['assets'][0]['approvedProductIds'])
        self.assertEqual(json.loads(job_path.read_text())['generatedPath'], '/new.png')

    def test_registered_job_changes_during_staging_abort_without_partial_writes(self):
        directory = self.repo / 'jobs'
        directory.mkdir()
        registered = {'status': 'registered', 'key': 'ready', 'assetId': 'mug--white',
                      'approvedProductIds': ['101'], 'familyId': 'mug', 'domain': 'living',
                      'color': 'white', 'pattern': 'solid'}
        for change in ['existing_registration', 'new_registration', 'attributes', 'removal']:
            with self.subTest(change=change):
                for path in directory.glob('*.json'):
                    path.unlink()
                ready_path, pending_path = directory / 'ready.json', directory / 'pending.json'
                ready_path.write_text(json.dumps(registered))
                pending_path.write_text(json.dumps({'status': 'generating', 'key': 'pending'}))
                guard = (directory, MODULE.registered_job_snapshot(directory))
                manifest_path, overrides_path = self.repo / 'manifest.json', self.repo / 'overrides.json'
                manifest_path.write_text(json.dumps(self.manifest))
                overrides_path.write_text(json.dumps(self.overrides))
                previous = {path: path.read_bytes() for path in (manifest_path, overrides_path)}
                snapshots = {path: MODULE.fingerprint(path) for path in previous}
                plan = self.plan([{'reviewed': [self.reviewed('102')], 'unresolved': []}])
                stage = MODULE.stage_json
                def mutate_during_stage(path, payload):
                    if change == 'existing_registration':
                        pending_path.write_text(json.dumps({**registered, 'key': 'pending'}))
                    elif change == 'new_registration':
                        (directory / 'new.json').write_text(json.dumps({**registered, 'key': 'new'}))
                    elif change == 'attributes':
                        ready_path.write_text(json.dumps({**registered, 'color': 'black'}))
                    else:
                        ready_path.unlink(missing_ok=True)
                    return stage(path, payload)
                with patch.object(MODULE, 'stage_json', side_effect=mutate_during_stage):
                    with self.assertRaisesRegex(MODULE.InvalidInput, 'changed before save'):
                        MODULE.apply_plan(plan, manifest_path=manifest_path, overrides_path=overrides_path,
                                          snapshots=snapshots, job_snapshot=guard)
                for path, original in previous.items():
                    self.assertEqual(path.read_bytes(), original)
                self.assertEqual(list(self.repo.glob('.*.tmp')), [])

    def test_expansion_rejects_a_different_known_pattern(self):
        self.base["102"]["pattern"] = "stripe"
        plan = self.plan(expand=True)
        self.assertNotIn("102", [record["prd_id"] for record in plan["summary"]["expansions"]])

    def test_cli_defaults_to_read_only_and_apply_preserves_catalog(self):
        catalog_path = self.repo / "data/catalog/products.csv"
        catalog_path.parent.mkdir(parents=True)
        with catalog_path.open("w", encoding="utf-8-sig", newline="") as stream:
            writer = csv.DictWriter(stream, fieldnames=MODULE.FIELDS)
            writer.writeheader()
            writer.writerows(self.products.values())
        catalog_bytes = catalog_path.read_bytes()
        manifest_path = self.repo / "data/game-assets/manifest.json"
        manifest_path.parent.mkdir(parents=True)
        manifest_path.write_text(json.dumps(self.manifest))
        override_path = self.repo / "data/game-assets/product-overrides.json"
        override_path.write_text(json.dumps(self.overrides))
        review_path = self.repo / "review.json"
        review_path.write_text(json.dumps({"reviewed": [self.reviewed("102")], "unresolved": []}))
        original_manifest = manifest_path.read_bytes()
        original_overrides = override_path.read_bytes()
        with patch.object(MODULE, "load_classifier", return_value=(self.families, self.base)), redirect_stdout(io.StringIO()) as output:
            self.assertEqual(MODULE.main([str(review_path), "--repository", str(self.repo)]), 0)
        self.assertFalse(json.loads(output.getvalue())["written"])
        self.assertEqual(manifest_path.read_bytes(), original_manifest)
        self.assertEqual(override_path.read_bytes(), original_overrides)
        self.assertFalse((manifest_path.parent / ".review-import.lock").exists())
        with patch.object(MODULE, "load_classifier", return_value=(self.families, self.base)), redirect_stdout(io.StringIO()) as output:
            self.assertEqual(MODULE.main([str(review_path), "--repository", str(self.repo), "--apply"]), 0)
        self.assertTrue(json.loads(output.getvalue())["written"])
        self.assertEqual(catalog_path.read_bytes(), catalog_bytes)
        self.assertIn("102", json.loads(manifest_path.read_text())["assets"][0]["approvedProductIds"])


if __name__ == "__main__":
    unittest.main()

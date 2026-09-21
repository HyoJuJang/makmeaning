"""Small synthetic fixtures for the streaming preparation contract."""
import contextlib
import csv
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

MODULE_PATH = Path(__file__).resolve().parents[1] / "scripts/recommendation/prepare.py"
spec = importlib.util.spec_from_file_location("recommendation_prepare", MODULE_PATH)
prepare = importlib.util.module_from_spec(spec)
spec.loader.exec_module(prepare)


class PreparationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.data = self.root / "data"
        self.output = self.root / "prepared"
        self.data.mkdir()
        self.products = [
            {"prd_id": "001", "view_name": 'A, "quoted"\nname', "cate1_nm": "스킨케어", "cate2_nm": "크림", "cate3_nm": "", "cate4_nm": "", "brand_name": "한글", "discprice": "1000", "domain": "beauty"},
            {"prd_id": "002", "view_name": "Serum", "cate1_nm": "스킨케어", "cate2_nm": "세럼", "cate3_nm": "", "cate4_nm": "", "brand_name": "한글", "discprice": "2000", "domain": "beauty"},
            {"prd_id": "003", "view_name": "Rice", "cate1_nm": "쌀", "cate2_nm": "", "cate3_nm": "", "cate4_nm": "", "brand_name": "", "discprice": "3000", "domain": "food"},
        ]
        for name, columns in prepare.REQUIRED_COLUMNS.items():
            self.write(name, self.products if name == "product.csv" else [], columns)

    def tearDown(self):
        self.temp.cleanup()

    def write(self, name, rows, columns=None):
        with (self.data / name).open("w", encoding="utf-8-sig", newline="") as stream:
            writer = csv.DictWriter(stream, fieldnames=columns or prepare.REQUIRED_COLUMNS[name])
            writer.writeheader()
            writer.writerows(rows)

    def activity(self, user="fixture-user", product="001", day="20260918", hour="2026091801", **extra):
        return {"prd_id": product, "userid": user, "dt": day, "dh": hour, **extra}

    def run_prepare(self):
        capture = io.StringIO()
        with contextlib.redirect_stdout(capture):
            summary = prepare.prepare(self.data, self.output)
        self.assertNotIn("fixture-user", capture.getvalue())
        return json.loads((self.output / "catalog.json").read_text()), summary

    def read_user(self, user="fixture-user"):
        shard = hashlib.sha256(user.encode()).hexdigest()[:2]
        return json.loads((self.output / "users" / f"{shard}.json").read_text()).get(user)

    def test_quoting_bom_strings_and_empty_shards(self):
        catalog, summary = self.run_prepare()
        self.assertEqual(catalog["products"][0]["view_name"], 'A, "quoted"\nname')
        self.assertEqual(catalog["products"][0]["prd_id"], "001")
        self.assertEqual(catalog["products"][0]["discprice"], 1000)
        self.assertEqual(len(list((self.output / "users").glob("*.json"))), 256)
        self.assertEqual(self.read_user(), None)
        self.assertEqual(json.loads((self.output / "samples.json").read_text()), {})
        self.assertEqual(catalog["window"], {"from": "", "to": ""})
        self.assertEqual(summary["users"], 0)

    def test_anonymous_outside_catalog_and_count_caps(self):
        rows = [self.activity() for _ in range(7)]
        rows += [self.activity(user=user) for user in ("", "NULL", "undefined", " nan ")]
        rows += [self.activity(product="unknown"), self.activity(hour="2026091899")]
        self.write("user_item_view.csv", rows)
        self.write("user_item_cart.csv", [self.activity() for _ in range(5)])
        catalog, summary = self.run_prepare()
        stats = summary["files"]["user_item_view.csv"]
        self.assertEqual(summary["users"], 1)
        self.assertEqual(stats["rows"], 13)
        self.assertEqual(stats["anonymousRows"], 4)
        self.assertEqual(stats["outOfCatalogRows"], 1)
        self.assertEqual(stats["invalidDateRows"], 1)
        self.assertEqual(self.read_user()["items"], [{"productId": "001", "viewCount": 3, "cartCount": 3, "orderCount": 0, "lastAt": "2026091801"}])
        self.assertEqual(catalog["window"], {"from": "20260918", "to": "20260918"})

    def test_orders_deduplicate_and_ignore_non_positive_or_invalid(self):
        rows = [self.activity(ordernum="order-a", ordqty="2"), self.activity(ordernum="order-a", ordqty="2", hour="2026091802")]
        rows += [self.activity(ordernum=f"order-{quantity}", ordqty=quantity) for quantity in ("0", "-1", "NaN", "1.5")]
        rows += [self.activity(ordernum="", ordqty="1")]
        self.write("user_item_order.csv", rows)
        _, summary = self.run_prepare()
        self.assertEqual(self.read_user()["items"][0]["orderCount"], 1)
        self.assertEqual(self.read_user()["items"][0]["lastAt"], "2026091802")
        stats = summary["files"]["user_item_order.csv"]
        self.assertEqual(stats["duplicateRows"], 1)
        self.assertEqual(stats["nonPositiveOrderRows"], 2)
        self.assertEqual(stats["invalidQuantityRows"], 3)

    def test_popularity_is_hourly_max_then_sum_not_user_rating(self):
        rows = [
            {"prd_id": "001", "dt": "20260918", "dh": "2026091801", "rating": value}
            for value in ("1", "4", "2", "-1", "NaN")
        ]
        rows += [{"prd_id": "001", "dt": "20260919", "dh": "2026091901", "rating": "3"}]
        self.write("user_item_rating.csv", rows)
        catalog, summary = self.run_prepare()
        self.assertEqual(catalog["popularity"]["001"], 7)
        self.assertEqual(catalog["popularity"]["002"], 0)
        self.assertEqual(summary["files"]["user_item_rating.csv"]["duplicateRows"], 2)
        self.assertEqual(summary["files"]["user_item_rating.csv"]["invalidRatingRows"], 2)
        self.assertEqual(summary["users"], 0)

    def test_distinct_user_support_and_same_domain_neighbors(self):
        rows = [self.activity(user=user, product=product) for user in ("fixture-user", "second-user") for product in ("001", "002", "003")]
        rows += [self.activity() for _ in range(20)]
        self.write("user_item_cart.csv", rows)
        catalog, _ = self.run_prepare()
        self.assertEqual(catalog["neighbors"]["001"][0]["productId"], "002")
        self.assertEqual(catalog["neighbors"]["001"][0]["support"], 2)
        self.assertGreater(catalog["neighbors"]["001"][0]["score"], 0)
        self.assertLessEqual(catalog["neighbors"]["001"][0]["score"], 0.4)
        self.assertNotIn("003", catalog["neighbors"])
        self.assertEqual(set(json.loads((self.output / "samples.json").read_text())), {"beauty", "food"})
        self.write("user_item_cart.csv", [self.activity(product=p) for p in ("001", "002")])
        catalog, _ = self.run_prepare()
        self.assertEqual(catalog["neighbors"], {})

    def test_invalid_products_are_counted_and_not_joined(self):
        rows = self.products + [{**self.products[0], "prd_id": "bad", "discprice": "NaN"}]
        rows += [{**self.products[0], "prd_id": "negative", "discprice": "-1"}]
        rows += [{**self.products[0], "prd_id": f"invalid-price-{index}", "discprice": value}
                 for index, value in enumerate(("1.5", "9007199254740992", "9007199254740990.5"))]
        rows += [{**self.products[0], "prd_id": "max-safe", "discprice": "9007199254740991"}]
        rows += [self.products[0]]
        self.write("product.csv", rows)
        catalog, summary = self.run_prepare()
        self.assertEqual(len(catalog["products"]), 4)
        self.assertEqual(next(product for product in catalog["products"] if product["prd_id"] == "max-safe")["discprice"], 9007199254740991)
        self.assertEqual(summary["files"]["product.csv"]["invalidPriceRows"], 5)
        self.assertEqual(summary["files"]["product.csv"]["duplicateRows"], 1)

    def test_hidden_output_staging_and_backup_use_single_dot_prefix(self):
        self.output = self.root / ".recommendation"
        with patch.object(prepare.tempfile, "mkdtemp", wraps=tempfile.mkdtemp) as create_temp:
            self.run_prepare()
            self.run_prepare()
        prefixes = [call.kwargs["prefix"] for call in create_temp.call_args_list]
        self.assertEqual(prefixes, [".recommendation-staging-", ".recommendation-staging-", ".recommendation-previous-"])

    def test_missing_column_and_publish_failure_preserve_existing_output(self):
        self.run_prepare()
        original = (self.output / "catalog.json").read_bytes()
        self.write("user_item_cart.csv", [], ("prd_id", "dt", "dh"))
        with self.assertRaises(prepare.PreparationError) as raised:
            self.run_prepare()
        self.assertEqual(raised.exception.summary["files"]["user_item_cart.csv"]["missingColumns"], ["userid"])
        self.assertEqual((self.output / "catalog.json").read_bytes(), original)
        self.write("user_item_cart.csv", [])
        real_rename = Path.rename
        def fail_stage(source, target):
            if "-staging-" in source.name:
                raise OSError("simulated publish failure")
            return real_rename(source, target)
        with patch.object(Path, "rename", fail_stage):
            with self.assertRaises(OSError):
                self.run_prepare()
        self.assertEqual((self.output / "catalog.json").read_bytes(), original)
        self.assertEqual(len(list(self.root.glob(".prepared-*"))), 0)

    def test_pcids_and_sessions_never_substitute_for_missing_userid(self):
        columns = (*prepare.ACTIVITY_COLUMNS, "pcid", "session")
        self.write("user_item_view.csv", [{**self.activity(user=""), "pcid": "not-a-user", "session": "not-a-user"}], columns)
        _, summary = self.run_prepare()
        self.assertEqual(summary["users"], 0)
        self.assertEqual(self.read_user("not-a-user"), None)


if __name__ == "__main__":
    unittest.main()

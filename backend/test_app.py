import importlib
import io
import os
import tempfile
import unittest


class FlipSiteApiTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp_dir = tempfile.TemporaryDirectory()
        os.environ["FLIPSITE_DATA_DIR"] = cls.temp_dir.name
        cls.module = importlib.import_module("backend.app")
        cls.client = cls.module.app.test_client()

    @classmethod
    def tearDownClass(cls):
        cls.temp_dir.cleanup()

    def test_local_workflow_requires_no_account(self):
        self.assertEqual(self.client.get("/api/auth/session").status_code, 404)
        self.assertEqual(self.client.get("/api/items").status_code, 200)

        parent = self.client.post(
            "/api/bundles",
            json={
                "parent": {
                    "name": "Camera kit",
                    "category": "Cameras",
                    "condition": "Good",
                    "buy_price": 100,
                    "sell_price": None,
                    "status": "holding",
                    "bought_at": "2026-01-01T00:00:00+00:00",
                },
                "children": [{
                    "name": "Camera",
                    "category": "Cameras",
                    "condition": "Good",
                    "status": "holding",
                }],
            },
        )
        self.assertEqual(parent.status_code, 201)
        parent_id = parent.get_json()["tsid"]
        child = next(
            item for item in self.client.get("/api/items").get_json()
            if item["bundle_id"] == parent_id
        )

        uploaded = self.client.post(
            f"/api/items/{child['tsid']}/files",
            data={"file": (io.BytesIO(b"image"), "receipt.jpg")},
            content_type="multipart/form-data",
        )
        self.assertEqual(uploaded.status_code, 201)
        file_row = uploaded.get_json()
        self.assertEqual(file_row["user_id"], "local")
        content = self.client.get(f"/api/files/{file_row['id']}/content")
        self.assertEqual(content.status_code, 200)
        self.assertEqual(content.data, b"image")
        content.close()


if __name__ == "__main__":
    unittest.main()

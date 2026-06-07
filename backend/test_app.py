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
        os.environ["FLIPSITE_SECRET_KEY"] = "test-secret"
        os.environ["FLIPSITE_ALLOW_SIGNUP"] = "false"
        cls.module = importlib.import_module("backend.app")
        cls.client = cls.module.app.test_client()

    @classmethod
    def tearDownClass(cls):
        cls.temp_dir.cleanup()

    def test_local_workflow(self):
        signup = self.client.post(
            "/api/auth/signup",
            json={"email": "owner@example.com", "password": "password123"},
        )
        self.assertEqual(signup.status_code, 201)
        user_id = signup.get_json()["user"]["id"]

        second_signup = self.client.post(
            "/api/auth/signup",
            json={"email": "other@example.com", "password": "password123"},
        )
        self.assertEqual(second_signup.status_code, 403)

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
                "children": [
                    {
                        "name": "Camera",
                        "category": "Cameras",
                        "condition": "Good",
                        "status": "holding",
                    }
                ],
            },
        )
        self.assertEqual(parent.status_code, 201)
        parent_id = parent.get_json()["tsid"]

        items = self.client.get("/api/items").get_json()
        child = next(item for item in items if item["bundle_id"] == parent_id)
        updated = self.client.patch(
            f"/api/items/{child['tsid']}",
            json={
                "status": "sold",
                "sell_price": 150,
                "sold_at": "2026-02-01T00:00:00+00:00",
            },
        )
        self.assertEqual(updated.status_code, 200)

        items = self.client.get("/api/items").get_json()
        sold_parent = next(item for item in items if item["tsid"] == parent_id)
        self.assertEqual(sold_parent["status"], "sold")

        uploaded = self.client.post(
            f"/api/items/{child['tsid']}/files",
            data={"file": (io.BytesIO(b"image"), "receipt.jpg")},
            content_type="multipart/form-data",
        )
        self.assertEqual(uploaded.status_code, 201)
        file_row = uploaded.get_json()
        self.assertEqual(file_row["user_id"], user_id)

        content = self.client.get(f"/api/files/{file_row['id']}/content")
        self.assertEqual(content.status_code, 200)
        self.assertEqual(content.data, b"image")
        content.close()

        logout = self.client.post("/api/auth/logout")
        self.assertEqual(logout.status_code, 204)
        self.assertEqual(self.client.get("/api/items").status_code, 401)

        login = self.client.post(
            "/api/auth/login",
            json={"email": "owner@example.com", "password": "password123"},
        )
        self.assertEqual(login.status_code, 200)


if __name__ == "__main__":
    unittest.main()

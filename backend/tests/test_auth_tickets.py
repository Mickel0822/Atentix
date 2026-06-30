import asyncio
import os
from types import SimpleNamespace

os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_KEY", "ci-placeholder")

import pytest
from fastapi import HTTPException, status

from endpoints.auth import auth as auth_module
from models.schemas import LoginRequest, LoginResponse, RegisterRequest


class FakeAdminAuth:
    def __init__(self):
        self.updated_users = []

    def update_user_by_id(self, user_id, metadata):
        self.updated_users.append((user_id, metadata))


class FakeAuth:
    def __init__(self, user=None):
        self.user = user or SimpleNamespace(
            id="user-123",
            email="estudiante@universidad.edu",
            email_confirmed_at="2026-06-29T00:00:00Z",
        )
        self.admin = FakeAdminAuth()
        self.sign_up_payload = None

    def sign_up(self, payload):
        self.sign_up_payload = payload
        return SimpleNamespace(user=self.user)


class FakeQuery:
    def __init__(self, client, table_name):
        self.client = client
        self.table_name = table_name
        self.operation = None
        self.payload = None
        self.filters = []

    def select(self, *_args):
        self.operation = "select"
        return self

    def eq(self, column, value):
        self.filters.append((column, value))
        return self

    def upsert(self, payload):
        self.operation = "upsert"
        self.payload = payload
        return self

    def execute(self):
        if self.operation == "upsert":
            self.client.upserts.append((self.table_name, self.payload))
            return SimpleNamespace(data=self.payload)

        if self.table_name == "profiles":
            return SimpleNamespace(data=self.client.profile_rows)

        if self.table_name == "classes":
            return SimpleNamespace(data=self.client.class_rows)

        return SimpleNamespace(data=[])


class FakeSupabase:
    def __init__(self, profile_rows=None, class_rows=None, auth=None):
        self.profile_rows = profile_rows or []
        self.class_rows = class_rows or []
        self.auth = auth or FakeAuth()
        self.upserts = []

    def table(self, table_name):
        return FakeQuery(self, table_name)


def run_register(request):
    return asyncio.run(auth_module.register(request))


def make_register_request(role=3):
    return RegisterRequest(
        email="estudiante@universidad.edu",
        password="segura123",
        full_name="Estudiante Demo",
        role=role,
    )


def test_register_rejects_invalid_role():
    with pytest.raises(HTTPException) as exc_info:
        run_register(make_register_request(role=9))

    assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
    assert exc_info.value.detail == "El role debe ser 1, 2 o 3"


def test_register_rejects_existing_email(monkeypatch):
    fake_supabase = FakeSupabase(profile_rows=[{"email": "estudiante@universidad.edu"}])
    monkeypatch.setattr(auth_module, "get_supabase_client", lambda: fake_supabase)

    with pytest.raises(HTTPException) as exc_info:
        run_register(make_register_request())

    assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
    assert "ya está registrado" in exc_info.value.detail
    assert fake_supabase.auth.sign_up_payload is None


def test_register_creates_profile_and_enrolls_student(monkeypatch):
    fake_supabase = FakeSupabase(
        class_rows=[
            {"id": "class-1"},
            {"id": "class-2"},
        ]
    )
    monkeypatch.setattr(auth_module, "get_supabase_client", lambda: fake_supabase)

    response = run_register(make_register_request(role=3))

    assert response.message == "Registro exitoso"
    assert response.user.user_id == "user-123"
    assert response.user.email == "estudiante@universidad.edu"
    assert response.user.full_name == "Estudiante Demo"
    assert response.user.role == 3
    assert response.user.confirmed is True
    assert fake_supabase.auth.sign_up_payload == {
        "email": "estudiante@universidad.edu",
        "password": "segura123",
        "options": {"data": {"full_name": "Estudiante Demo"}},
    }
    assert ("user-123", {"app_metadata": {"role": 3}}) in fake_supabase.auth.admin.updated_users
    assert (
        "profiles",
        {
            "user_id": "user-123",
            "full_name": "Estudiante Demo",
            "email": "estudiante@universidad.edu",
            "role": 3,
            "is_active": True,
            "ctr_estado": 1,
        },
    ) in fake_supabase.upserts
    assert (
        "class_enrollments",
        [
            {"class_id": "class-1", "student_id": "user-123", "estado": 1},
            {"class_id": "class-2", "student_id": "user-123", "estado": 1},
        ],
    ) in fake_supabase.upserts


def test_login_schema_contract():
    request = LoginRequest(email="usuario@universidad.edu", password="segura123")
    response = LoginResponse(access_token="token-demo", token_type="bearer")

    assert request.email == "usuario@universidad.edu"
    assert request.password == "segura123"
    assert response.access_token == "token-demo"
    assert response.token_type == "bearer"

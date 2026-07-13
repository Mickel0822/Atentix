import asyncio
import json

from endpoints.websockets.connection_manager import ConnectionManager


class FakeWebSocket:
    def __init__(self):
        self.accepted = False
        self.messages = []

    async def accept(self):
        self.accepted = True

    async def send_text(self, message):
        self.messages.append(message)


def test_connection_manager_registers_and_serializes_attention_response():
    manager = ConnectionManager()
    websocket = FakeWebSocket()

    async def scenario():
        await manager.connect(websocket)
        await manager.send_json_message(
            {
                "attention_score": 0.82,
                "status": "engaged",
                "warnings": [],
                "face_detected": True,
            },
            websocket,
        )

    asyncio.run(scenario())

    assert websocket.accepted is True
    assert manager.get_connection_count() == 1
    assert json.loads(websocket.messages[0]) == {
        "attention_score": 0.82,
        "status": "engaged",
        "warnings": [],
        "face_detected": True,
    }


def test_connection_manager_removes_disconnected_monitor():
    manager = ConnectionManager()
    websocket = FakeWebSocket()

    async def scenario():
        await manager.connect(websocket)
        manager.disconnect(websocket)

    asyncio.run(scenario())

    assert manager.get_connection_count() == 0

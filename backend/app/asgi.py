from __future__ import annotations

import socketio

from app.logging_config import configure_logging
from app.main import create_fastapi_app
from app.socket_server import sio

configure_logging()

fastapi_app = create_fastapi_app()
app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app)


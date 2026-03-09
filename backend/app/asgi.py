from __future__ import annotations

import socketio

from app.main import create_fastapi_app
from app.socket_server import sio


fastapi_app = create_fastapi_app()
app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app)


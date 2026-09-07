from __future__ import annotations

import logging
import logging.config

from app.settings import settings

LOG_LEVEL = "DEBUG" if settings.env == "local" else "INFO"

LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {
            "()": "logging.Formatter",
            "fmt": '{"time":"%(asctime)s","level":"%(levelname)s","logger":"%(name)s","msg":%(message)r}',
            "datefmt": "%Y-%m-%dT%H:%M:%S",
        },
        "plain": {
            "format": "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
            "datefmt": "%Y-%m-%dT%H:%M:%S",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "json" if settings.env == "production" else "plain",
            "stream": "ext://sys.stdout",
        }
    },
    "root": {"handlers": ["console"], "level": LOG_LEVEL},
    "loggers": {
        "uvicorn.access": {"level": "WARNING", "propagate": True},
        "socketio": {"level": "WARNING", "propagate": True},
        "engineio": {"level": "WARNING", "propagate": True},
    },
}


def configure_logging() -> None:
    logging.config.dictConfig(LOGGING_CONFIG)

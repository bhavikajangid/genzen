"""session focus/social split + room name unique

Revision ID: 20260907_0002
Revises: 20260305_0001
Create Date: 2026-09-07
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260907_0002"
down_revision = "20260305_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "session_records",
        sa.Column("focus_seconds", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "session_records",
        sa.Column("social_seconds", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "session_records",
        sa.Column("end_reason", sa.String(length=20), nullable=True),
    )
    op.create_unique_constraint("uq_rooms_name", "rooms", ["name"])


def downgrade() -> None:
    op.drop_constraint("uq_rooms_name", "rooms", type_="unique")
    op.drop_column("session_records", "end_reason")
    op.drop_column("session_records", "social_seconds")
    op.drop_column("session_records", "focus_seconds")

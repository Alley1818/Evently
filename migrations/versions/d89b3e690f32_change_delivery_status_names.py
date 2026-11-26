"""change_delivery_status_names

Revision ID: d89b3e690f32
Revises: 672998a9d541
Create Date: 2026-11-26 21:51:41.030450

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd89b3e690f32'
down_revision: Union[str, Sequence[str], None] = '672998a9d541'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE deliverystatus RENAME VALUE 'PENDING' TO 'pending'")
    op.execute("ALTER TYPE deliverystatus RENAME VALUE 'SUCCESS' TO 'success'")
    op.execute("ALTER TYPE deliverystatus RENAME VALUE 'FAILED' TO 'failed'")



def downgrade() -> None:
    op.execute("ALTER TYPE deliverystatus RENAME VALUE 'pending' TO 'PENDING'")
    op.execute("ALTER TYPE deliverystatus RENAME VALUE 'success' TO 'SUCCESS'")
    op.execute("ALTER TYPE deliverystatus RENAME VALUE 'failed' TO 'FAILED'")

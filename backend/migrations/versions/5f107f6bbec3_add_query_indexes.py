"""Add missing indexes for project lookups and report queries.

Revision ID: 5f107f6bbec3
Revises: b75f84c2bb35
Create Date: 2026-08-04 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "5f107f6bbec3"
down_revision: Union[str, Sequence[str], None] = "b75f84c2bb35"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE INDEX IF NOT EXISTS ix_requirements_project_id ON requirements (project_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_architectures_project_id ON architectures (project_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_reports_project_id_type ON reports (project_id, report_type)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_requirements_project_id")
    op.execute("DROP INDEX IF EXISTS ix_architectures_project_id")
    op.execute("DROP INDEX IF EXISTS ix_reports_project_id_type")

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from backend.services.knowledge_validator import KnowledgeValidator


class KnowledgeLoader:
    """Load and cache DOPA knowledge files from disk."""

    REQUIRED_FILES = (
        "architecture-patterns.json",
        "architecture-ontology.json",
        "service-capabilities.json",
        "tradeoff-rules.json",
        "recommendation-rules.json",
        "security-rules.json",
        "validation-rules.json",
        "cost-rules.json",
        "question-flows.json",
        "terraform-module-catalog.json",
        "provider-mappings.json",
        "aws-resource-schemas.json",
        "architecture-templates.json",
    )

    def __init__(self, knowledge_dir: str | Path | None = None, validate: bool = True) -> None:
        self.knowledge_dir = Path(knowledge_dir) if knowledge_dir else Path(__file__).resolve().parents[1] / "knowledge"
        self.cache: dict[str, Any] = {}
        self._validate = validate

    def load_json(self, filename: str) -> Any:
        path = self.knowledge_dir / filename
        with path.open("r", encoding="utf-8") as handle:
            return json.load(handle)

    def load_all(self) -> dict[str, Any]:
        missing = [name for name in self.REQUIRED_FILES if not (self.knowledge_dir / name).exists()]
        if missing:
            raise FileNotFoundError(f"Missing knowledge files: {missing}")

        loaded: dict[str, Any] = {}
        for filename in self.REQUIRED_FILES:
            loaded[filename] = self.load_json(filename)

        # Validate all knowledge files at startup - fail fast on schema/reference errors
        if self._validate:
            validator = KnowledgeValidator(self.knowledge_dir)
            result = validator.validate_all()
            errors = [i for i in result.issues if i.severity == "error"]
            if errors:
                msg_lines = [f"  [{e.file}] {e.message}" for e in errors]
                raise KnowledgeValidator.validation_error_class(
                    f"Knowledge validation failed with {len(errors)} error(s):\n" + "\n".join(msg_lines)
                )

        self.cache = loaded
        return loaded

    def get(self, filename: str) -> Any:
        if filename not in self.cache:
            self.cache[filename] = self.load_json(filename)
        return self.cache[filename]

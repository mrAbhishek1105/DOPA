from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from backend.schemas.validation import KnowledgeIssue, KnowledgeValidationResult


class KnowledgeValidationError(Exception):
    """Raised when knowledge validation fails at startup."""
    pass


# Expected top-level type for each required knowledge file.
# Used for basic schema validation.
FILE_SCHEMAS: dict[str, str] = {
    "architecture-patterns.json": "list",
    "architecture-ontology.json": "dict",
    "service-capabilities.json": "list",
    "tradeoff-rules.json": "list",
    "recommendation-rules.json": "list",
    "security-rules.json": "list",
    "validation-rules.json": "list",
    "cost-rules.json": "list",
    "question-flows.json": "list",
    "terraform-module-catalog.json": "list",
    "provider-mappings.json": "list",
    "aws-resource-schemas.json": "dict",
    "architecture-templates.json": "list",
}

# Fields that must be present in each pattern entry
PATTERN_REQUIRED_FIELDS = {"pattern_id", "name", "conditions", "default_services"}
RECOMMENDATION_REQUIRED_FIELDS = {"pattern", "option_a", "option_b", "option_c"}
SERVICE_CAPABILITY_REQUIRED_FIELDS = {"service", "provider", "category", "cost_level", "complexity", "scalability"}
VALIDATION_RULE_REQUIRED_FIELDS = {"rule_id", "category", "severity", "condition", "message"}

# Naming convention: all IDs should use snake_case
ID_PATTERN = re.compile(r"^[a-z][a-z0-9_]*$")


class KnowledgeValidator:
    """Validate all knowledge files for schema, reference, and naming integrity."""

    validation_error_class = KnowledgeValidationError

    def __init__(self, knowledge_dir: str | Path) -> None:
        self.knowledge_dir = Path(knowledge_dir)
        self.issues: list[KnowledgeIssue] = []
        self._pattern_ids: set[str] = set()
        self._service_names: set[str] = set()

    def validate_all(self) -> KnowledgeValidationResult:
        """Run all validation checks and return the result."""
        self.issues.clear()
        self._pattern_ids.clear()
        self._service_names.clear()

        loaded_count = 0
        valid_count = 0

        # First pass: validate schema and collect references
        for filename, expected_type in FILE_SCHEMAS.items():
            filepath = self.knowledge_dir / filename
            if not filepath.exists():
                self.issues.append(KnowledgeIssue(
                    file=filename,
                    severity="error",
                    category="missing_file",
                    message=f"Required knowledge file missing: {filename}",
                ))
                continue

            loaded_count += 1
            data = self._load_and_validate_schema(filename, filepath, expected_type)
            if data is None:
                continue

            valid_count += 1
            self._collect_references(filename, data)

        # Second pass: cross-file reference checks
        self._validate_cross_references()

        passed = not any(issue.severity == "error" for issue in self.issues)
        return KnowledgeValidationResult(
            passed=passed,
            issues=self.issues,
            loaded_files=loaded_count,
            valid_files=valid_count,
        )

    # Schema Validation

    def _load_and_validate_schema(self, filename: str, filepath: Path, expected_type: str) -> Any:
        """Try to load JSON and validate top-level type. Returns parsed data or None on error."""
        try:
            with filepath.open("r", encoding="utf-8") as f:
                data = json.load(f)
        except json.JSONDecodeError as exc:
            self.issues.append(KnowledgeIssue(
                file=filename,
                severity="error",
                category="parse_error",
                message=f"Invalid JSON: {exc}",
            ))
            return None

        actual_type = type(data).__name__
        if actual_type != expected_type:
            self.issues.append(KnowledgeIssue(
                file=filename,
                severity="error",
                category="schema_type_mismatch",
                message=f"Expected top-level type '{expected_type}', got '{actual_type}'",
            ))
            return None

        # File-specific field validation
        if filename == "architecture-patterns.json":
            self._validate_pattern_entries(filename, data)
        elif filename == "recommendation-rules.json":
            self._validate_recommendation_entries(filename, data)
        elif filename == "service-capabilities.json":
            self._validate_service_entries(filename, data)
        elif filename == "validation-rules.json":
            self._validate_validation_rule_entries(filename, data)
        elif filename == "architecture-templates.json":
            self._validate_template_entries(filename, data)

        return data

    def _validate_pattern_entries(self, filename: str, data: list[Any]) -> None:
        for idx, entry in enumerate(data):
            if not isinstance(entry, dict):
                self._record_issue(filename, "error", "entry_type", f"Entry {idx} is not a dict")
                continue
            missing = PATTERN_REQUIRED_FIELDS - set(entry.keys())
            if missing:
                self._record_issue(filename, "error", "missing_field",
                                   f"Entry {idx} ('{entry.get('pattern_id', 'unknown')}') missing fields: {missing}")
            pattern_id = entry.get("pattern_id", "")
            if pattern_id and not ID_PATTERN.match(pattern_id):
                self._record_issue(filename, "warning", "naming_convention",
                                   f"pattern_id '{pattern_id}' does not follow snake_case convention")

    def _validate_recommendation_entries(self, filename: str, data: list[Any]) -> None:
        for idx, entry in enumerate(data):
            if not isinstance(entry, dict):
                self._record_issue(filename, "error", "entry_type", f"Entry {idx} is not a dict")
                continue
            missing = RECOMMENDATION_REQUIRED_FIELDS - set(entry.keys())
            if missing:
                self._record_issue(filename, "error", "missing_field",
                                   f"Entry {idx} ('{entry.get('pattern', 'unknown')}') missing fields: {missing}")

    def _validate_service_entries(self, filename: str, data: list[Any]) -> None:
        for idx, entry in enumerate(data):
            if not isinstance(entry, dict):
                self._record_issue(filename, "error", "entry_type", f"Entry {idx} is not a dict")
                continue
            missing = SERVICE_CAPABILITY_REQUIRED_FIELDS - set(entry.keys())
            if missing:
                self._record_issue(filename, "error", "missing_field",
                                   f"Entry {idx} ('{entry.get('service', 'unknown')}') missing: {missing}")

    def _validate_validation_rule_entries(self, filename: str, data: list[Any]) -> None:
        for idx, entry in enumerate(data):
            if not isinstance(entry, dict):
                self._record_issue(filename, "error", "entry_type", f"Entry {idx} is not a dict")
                continue
            missing = VALIDATION_RULE_REQUIRED_FIELDS - set(entry.keys())
            if missing:
                self._record_issue(filename, "error", "missing_field",
                                   f"Entry {idx} ('{entry.get('rule_id', 'unknown')}') missing: {missing}")
            valid_severities = {"critical", "high", "medium", "low"}
            if entry.get("severity") not in valid_severities:
                self._record_issue(filename, "warning", "invalid_severity",
                                   f"rule_id '{entry.get('rule_id', '')}' has invalid severity '{entry.get('severity')}'")

    def _validate_template_entries(self, filename: str, data: list[Any]) -> None:
        for idx, entry in enumerate(data):
            if not isinstance(entry, dict):
                self._record_issue(filename, "error", "entry_type", f"Entry {idx} is not a dict")
                continue
            if "pattern_id" not in entry:
                self._record_issue(filename, "error", "missing_field",
                                   f"Entry {idx} missing 'pattern_id'")
            if "nodes" not in entry or not isinstance(entry.get("nodes"), list):
                self._record_issue(filename, "warning", "missing_nodes",
                                   f"Template '{entry.get('pattern_id', 'unknown')}' has no nodes")
            if "edges" not in entry or not isinstance(entry.get("edges"), list):
                self._record_issue(filename, "warning", "missing_edges",
                                   f"Template '{entry.get('pattern_id', 'unknown')}' has no edges")

    # Reference Collection

    def _collect_references(self, filename: str, data: Any) -> None:
        """Collect cross-file reference identifiers."""
        if filename == "architecture-patterns.json":
            for entry in data:
                pid = entry.get("pattern_id")
                if pid:
                    self._pattern_ids.add(pid)

        if filename == "service-capabilities.json":
            for entry in data:
                svc = entry.get("service")
                if svc:
                    self._service_names.add(svc)

        if filename == "aws-resource-schemas.json":
            for entry in data.get("resources", []):
                svc = entry.get("service") or entry.get("resource_type") or entry.get("name")
                if svc:
                    self._service_names.add(svc)

    # Cross-File Reference Validation

    def _validate_cross_references(self) -> None:
        """Check that references between files are consistent."""
        rec_file = self.knowledge_dir / "recommendation-rules.json"
        if rec_file.exists():
            try:
                with rec_file.open("r", encoding="utf-8") as f:
                    rec_data = json.load(f)
            except (json.JSONDecodeError, OSError):
                return

            for entry in rec_data:
                pattern_ref = entry.get("pattern")
                if pattern_ref and pattern_ref not in self._pattern_ids:
                    self._record_issue(
                        "recommendation-rules.json", "error", "reference_mismatch",
                        f"references pattern '{pattern_ref}' which does not exist in architecture-patterns.json",
                    )

        tmpl_file = self.knowledge_dir / "architecture-templates.json"
        if tmpl_file.exists():
            try:
                with tmpl_file.open("r", encoding="utf-8") as f:
                    tmpl_data = json.load(f)
            except (json.JSONDecodeError, OSError):
                return

            for entry in tmpl_data:
                pattern_ref = entry.get("pattern_id")
                if pattern_ref and pattern_ref not in self._pattern_ids:
                    self._record_issue(
                        "architecture-templates.json", "warning", "reference_mismatch",
                        f"references pattern_id '{pattern_ref}' which does not exist in architecture-patterns.json",
                    )

        patterns_file = self.knowledge_dir / "architecture-patterns.json"
        if patterns_file.exists() and self._service_names:
            try:
                with patterns_file.open("r", encoding="utf-8") as f:
                    patterns_data = json.load(f)
            except (json.JSONDecodeError, OSError):
                return

            for entry in patterns_data:
                for svc in entry.get("default_services", []):
                    if svc not in self._service_names:
                        self._record_issue(
                            "architecture-patterns.json", "warning", "unknown_service",
                            f"pattern '{entry.get('pattern_id', '')}' references unknown service '{svc}'",
                        )

    # Helpers

    def _record_issue(self, file: str, severity: str, category: str, message: str) -> None:
        self.issues.append(KnowledgeIssue(
            file=file,
            severity=severity,  # type: ignore
            category=category,
            message=message,
        ))

    def validate_and_raise(self) -> None:
        """Validate and raise KnowledgeValidationError if any errors found."""
        result = self.validate_all()
        errors = [i for i in result.issues if i.severity == "error"]
        if errors:
            msg_lines = [f"  [{e.file}] {e.message}" for e in errors]
            raise KnowledgeValidationError(
                f"Knowledge validation failed with {len(errors)} error(s):\n" + "\n".join(msg_lines)
            )

from __future__ import annotations

from pathlib import Path
from typing import Any

from backend.schemas import ArchitectureGraph
from backend.schemas.validation import (
    PASS_THRESHOLD,
    ValidationIssue,
    ValidationResult,
)
from .knowledge_loader import KnowledgeLoader


class GraphValidationError(Exception):
    """Raised when a graph fails validation."""
    pass


# Known AWS service names for reference validation
# This is a fallback set; the primary source is service-capabilities.json
KNOWN_AWS_SERVICES: set[str] = {
    "cloudfront", "alb", "nlb", "ecs", "eks", "ec2", "lambda",
    "rds", "aurora", "dynamodb", "redis", "elasticache",
    "s3", "sqs", "sns", "kinesis", "kafka", "msk",
    "opensearch", "elasticsearch",
    "kms", "iam", "waf", "shield", "cognito",
    "route53", "api_gateway", "step_functions",
    "cloudwatch", "xray", "cloudtrail",
    "vpc", "subnet", "security_group", "nat_gateway",
    "ecr", "acm", "secretsmanager",
}

# Known valid relationship types
KNOWN_RELATIONSHIPS: set[str] = {
    "serves", "routes_to", "reads_from", "writes_to",
    "authenticates_with", "encrypts_with", "monitors",
    "triggers", "publishes_to", "subscribes_to",
    "stores_in", "caches_in", "streams_to",
    "load_balances", "proxies", "terminates_tls",
    "depends_on", "connects_to",
    "uses",
}

# Layer compliance rules: which service types can connect to which
# Format: {source_type: {target_type: allowed_relationship}}
# If a source_type is not listed, it's allowed to connect to anything
LAYER_COMPLIANCE_RULES: dict[str, dict[str, str]] = {
    "cdn": {
        "database": "prohibited",  # CDN cannot directly connect to database
        "cache": "prohibited",     # CDN cannot directly connect to cache
    },
    "load_balancer": {
        "database": "prohibited",  # ALB/NLB cannot directly connect to database
    },
}


class GraphValidator:
    """Validates the structural integrity of an ArchitectureGraph.

    Returns a structured ValidationResult with a validation_score (0-100)
    and a list of issues found. The graph passes if validation_score >= PASS_THRESHOLD (70).
    """

    def __init__(self, knowledge_loader: KnowledgeLoader | None = None) -> None:
        self.loader = knowledge_loader or KnowledgeLoader()
        self._service_capabilities: list[dict[str, Any]] = list(self.loader.get("service-capabilities.json"))
        self._valid_services: set[str] = {s.get("service", "") for s in self._service_capabilities if s.get("service")}

    def validate(self, graph: ArchitectureGraph) -> ValidationResult:
        """Run all validation checks and return a structured result."""
        issues: list[ValidationIssue] = []

        issues.extend(self._check_invalid_edges(graph))
        issues.extend(self._check_orphan_nodes(graph))
        issues.extend(self._check_cycles(graph))
        issues.extend(self._check_invalid_service_references(graph))
        issues.extend(self._check_unsupported_relationships(graph))
        issues.extend(self._check_layer_compliance(graph))

        validation_score = self._compute_score(issues)
        passed = validation_score >= PASS_THRESHOLD

        return ValidationResult(
            graph_id=graph.graph_id,
            validation_score=validation_score,
            passed=passed,
            issues=issues,
        )

    # ── Individual Checks ──────────────────────────────────

    def _check_invalid_edges(self, graph: ArchitectureGraph) -> list[ValidationIssue]:
        """Ensure all edges point to valid node IDs."""
        issues: list[ValidationIssue] = []
        node_ids = {node.id for node in graph.nodes}
        for edge in graph.edges:
            if edge.source not in node_ids:
                issues.append(ValidationIssue(
                    severity="error",
                    category="graph_integrity",
                    rule_id="edge_source_missing",
                    message=f"Edge '{edge.id}' references source node '{edge.source}' which does not exist.",
                    edge_id=edge.id,
                ))
            if edge.target not in node_ids:
                issues.append(ValidationIssue(
                    severity="error",
                    category="graph_integrity",
                    rule_id="edge_target_missing",
                    message=f"Edge '{edge.id}' references target node '{edge.target}' which does not exist.",
                    edge_id=edge.id,
                ))
        return issues

    def _check_orphan_nodes(self, graph: ArchitectureGraph) -> list[ValidationIssue]:
        """Ensure no node is completely disconnected (orphan)."""
        issues: list[ValidationIssue] = []
        if len(graph.nodes) <= 1:
            return issues

        connected_nodes: set[str] = set()
        for edge in graph.edges:
            connected_nodes.add(edge.source)
            connected_nodes.add(edge.target)

        for node in graph.nodes:
            if node.id not in connected_nodes:
                issues.append(ValidationIssue(
                    severity="warning",
                    category="graph_integrity",
                    rule_id="orphan_node",
                    message=f"Node '{node.id}' ({node.service}) has no edges and is disconnected.",
                    node_id=node.id,
                ))
        return issues

    def _check_cycles(self, graph: ArchitectureGraph) -> list[ValidationIssue]:
        """Check for cycles using standard DFS.

        Skips edges that reference non-existent nodes (those are caught by _check_invalid_edges).
        """
        issues: list[ValidationIssue] = []
        adj_list: dict[str, list[str]] = {node.id: [] for node in graph.nodes}
        for edge in graph.edges:
            if edge.source in adj_list and edge.target in adj_list:
                adj_list[edge.source].append(edge.target)

        visited: set[str] = set()
        rec_stack: set[str] = set()

        def dfs(node_id: str) -> bool:
            visited.add(node_id)
            rec_stack.add(node_id)
            for neighbor in adj_list.get(node_id, []):
                if neighbor not in visited:
                    if dfs(neighbor):
                        return True
                elif neighbor in rec_stack:
                    return True
            rec_stack.remove(node_id)
            return False

        for node in graph.nodes:
            if node.id not in visited:
                if dfs(node.id):
                    issues.append(ValidationIssue(
                        severity="error",
                        category="graph_integrity",
                        rule_id="cycle_detected",
                        message="Cycle detected in the architecture graph.",
                    ))
                    break
        return issues

    def _check_invalid_service_references(self, graph: ArchitectureGraph) -> list[ValidationIssue]:
        """Ensure all node services are known AWS services."""
        issues: list[ValidationIssue] = []
        valid_services = self._valid_services | KNOWN_AWS_SERVICES

        for node in graph.nodes:
            if node.service not in valid_services:
                issues.append(ValidationIssue(
                    severity="error",
                    category="service_compatibility",
                    rule_id="invalid_service_reference",
                    message=f"Node '{node.id}' references unknown service '{node.service}'. "
                            f"Valid services: {sorted(valid_services)[:10]}...",
                    node_id=node.id,
                ))
        return issues

    def _check_unsupported_relationships(self, graph: ArchitectureGraph) -> list[ValidationIssue]:
        """Ensure all edge relationships are known types."""
        issues: list[ValidationIssue] = []
        for edge in graph.edges:
            if edge.relationship not in KNOWN_RELATIONSHIPS:
                issues.append(ValidationIssue(
                    severity="warning",
                    category="service_compatibility",
                    rule_id="unsupported_relationship",
                    message=f"Edge '{edge.id}' uses relationship '{edge.relationship}' which is not a known type.",
                    edge_id=edge.id,
                ))
        return issues

    def _check_layer_compliance(self, graph: ArchitectureGraph) -> list[ValidationIssue]:
        """Check that service layers are connected in a valid way.

        For example, CloudFront cannot route directly to Aurora/RDS.
        There must be an ALB/ECS layer in between.
        """
        issues: list[ValidationIssue] = []
        node_map: dict[str, dict[str, Any]] = {n.id: {"type": n.type, "service": n.service} for n in graph.nodes}

        for edge in graph.edges:
            source_node = node_map.get(edge.source)
            target_node = node_map.get(edge.target)
            if not source_node or not target_node:
                continue

            source_type = source_node["type"]
            target_type = target_node["type"]

            # Check layer compliance rules
            source_rules = LAYER_COMPLIANCE_RULES.get(source_type, {})
            target_rule = source_rules.get(target_type)

            if target_rule == "prohibited":
                issues.append(ValidationIssue(
                    severity="error",
                    category="layer_compliance",
                    rule_id=f"{source_type}_to_{target_type}_prohibited",
                    message=f"'{source_node['service']}' ({source_type}) cannot route directly to "
                            f"'{target_node['service']}' ({target_type}). "
                            f"Missing intermediate layer (e.g., ALB/ECS).",
                    node_id=edge.source,
                    edge_id=edge.id,
                ))

        return issues

    # ── Scoring ────────────────────────────────────────────

    def _compute_score(self, issues: list[ValidationIssue]) -> int:
        """Compute validation score from issues.

        Start at 100, deduct for each issue:
        - error: -35  (one error → fail at 65 < 70)
        - warning: -5
        - info: 0
        Floor at 0.

        With PASS_THRESHOLD=70:
        - 0 errors → pass (score >= 75 minimum with up to 5 warnings)
        - 1+ errors → fail (score <= 65)
        """
        score = 100
        for issue in issues:
            if issue.severity == "error":
                score -= 35
            elif issue.severity == "warning":
                score -= 5
        return max(score, 0)

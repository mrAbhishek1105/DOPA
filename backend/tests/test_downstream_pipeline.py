import pytest
from backend.services.terraform_engine import TerraformEngine
from backend.services.security_engine import SecurityEngine
from backend.services.cost_engine import CostEngine
from backend.services.validation_engine import ValidationEngine
from backend.services.explanation_engine import ExplanationEngine
from backend.services.report_engine import ReportEngine
from backend.services.packaging_engine import PackagingEngine

# Sample graph nodes & edges for testing
SAMPLE_NODES = [
    {"id": "vpc-1", "data": {"label": "AWS VPC", "service": "vpc"}},
    {"id": "alb-1", "data": {"label": "Application Load Balancer", "service": "alb"}},
    {"id": "ecs-1", "data": {"label": "ECS Compute Cluster", "service": "ecs"}},
    {"id": "rds-1", "data": {"label": "RDS PostgreSQL", "service": "rds"}},
    {"id": "s3-1", "data": {"label": "S3 Bucket", "service": "s3"}},
]

SAMPLE_EDGES = [
    {"id": "e1", "source": "alb-1", "target": "ecs-1"},
    {"id": "e2", "source": "ecs-1", "target": "rds-1"},
]


def test_terraform_engine_generation():
    engine = TerraformEngine()
    files = engine.generate(SAMPLE_NODES, SAMPLE_EDGES, project_name="test-project", region="us-east-1")

    assert "main.tf" in files
    assert "provider.tf" in files
    assert "variables.tf" in files
    assert "outputs.tf" in files

    assert 'module "vpc"' in files["main.tf"]
    assert 'module "alb"' in files["main.tf"]
    assert 'module "ecs"' in files["main.tf"]
    assert 'module "rds"' in files["main.tf"]
    assert 'module "s3"' in files["main.tf"]


def test_security_engine_analysis():
    engine = SecurityEngine()
    analysis = engine.analyze(SAMPLE_NODES, SAMPLE_EDGES)

    assert "risk_score" in analysis
    assert "risk_level" in analysis
    assert "findings" in analysis
    assert isinstance(analysis["findings"], list)
    assert "summary" in analysis


def test_cost_engine_calculation():
    engine = CostEngine()
    cost = engine.calculate(SAMPLE_NODES, SAMPLE_EDGES)

    assert "estimated_monthly_cost" in cost
    assert cost["estimated_monthly_cost"] > 0
    assert "itemized_breakdown" in cost
    assert "categories" in cost
    assert "optimization_recommendations" in cost


def test_validation_engine():
    engine = ValidationEngine()
    val = engine.validate(SAMPLE_NODES, SAMPLE_EDGES)

    assert "status" in val
    assert "passed" in val
    assert "issues" in val


def test_explanation_engine():
    engine = ExplanationEngine()
    exp = engine.generate(
        extracted_reqs={"application_type": "ecommerce", "cloud": "aws", "traffic": "high"},
        selected_option={"name": "Option B (Balanced)", "score": 0.92},
        security_report={"risk_level": "LOW"},
        cost_report={"estimated_monthly_cost": 210.0},
    )

    assert "chosen_because" in exp
    assert "tradeoff_narrative" in exp
    assert len(exp["chosen_because"]) > 0


def test_report_engine():
    engine = ReportEngine()
    hld = engine.generate_hld("TestProject", {"cloud": "aws"}, SAMPLE_NODES, SAMPLE_EDGES, {"estimated_monthly_cost": 200}, {"risk_level": "LOW"}, {})
    lld = engine.generate_lld("TestProject", SAMPLE_NODES, SAMPLE_EDGES, None, {})

    assert "# High-Level Design (HLD): TestProject" in hld
    assert "# Low-Level Design (LLD): TestProject" in lld


def test_packaging_engine():
    pkg = PackagingEngine()
    tf_files = {"main.tf": "# main", "provider.tf": "# provider"}
    res = pkg.package(
        project_id="12345678-1234-1234-1234-123456789012",
        project_name="TestProject",
        terraform_files=tf_files,
        hld_md="# HLD",
        lld_md="# LLD",
    )

    assert "zip_path" in res
    assert "zip_filename" in res
    assert res["size_bytes"] > 0

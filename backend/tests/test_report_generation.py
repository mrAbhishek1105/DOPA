from backend.api.v1.reports import GenerateReportsRequest
from backend.schemas.requirements import RequirementModel


def test_requirement_model_supports_multi_cloud_and_capabilities():
    model = RequirementModel(application_type="web_app", cloud="gcp", capabilities=["storage", "analytics"])
    assert model.cloud == "gcp"
    assert model.capabilities == ["storage", "analytics"]


def test_generate_reports_request_accepts_project_id():
    request = GenerateReportsRequest(project_id="00000000-0000-0000-0000-000000000001")
    assert str(request.project_id) == "00000000-0000-0000-0000-000000000001"

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import subprocess
import sys
import tempfile
from collections import OrderedDict
from pathlib import Path
from typing import Any, Iterable

DEFAULT_PROVIDER_VERSION = "5.40.0"
DEFAULT_REGION = "us-east-1"
DEFAULT_PROVIDER_SOURCE = "hashicorp/aws"
DEFAULT_OUTPUT = Path(__file__).resolve().parent.parent / "knowledge" / "aws-resource-schemas.json"
DEFAULT_RAW_CACHE = Path(__file__).resolve().parent.parent / "generated" / "aws-provider-schema"

WHITELIST_RESOURCES = {
    "aws_instance",
    "aws_s3_bucket",
    "aws_ecs_service",
    "aws_db_instance",
    "aws_vpc",
    "aws_subnet",
    "aws_security_group",
    "aws_lb",
    "aws_kms_key",
}

BASIC_FIELD_HINTS = {
    "name",
    "bucket",
    "bucket_prefix",
    "instance_type",
    "ami",
    "engine",
    "engine_version",
    "cluster",
    "task_definition",
    "desired_count",
    "subnet_ids",
    "security_groups",
    "vpc_id",
    "cidr_block",
    "multi_az",
    "storage_encrypted",
    "launch_type",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Sync AWS provider schemas into DOPA curated JSON.")
    parser.add_argument("--provider-version", default=DEFAULT_PROVIDER_VERSION, help="Pinned AWS provider version to sync.")
    parser.add_argument("--region", default=DEFAULT_REGION, help="Temporary region used in the Terraform workspace.")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT), help="Curated schema output path.")
    parser.add_argument("--raw-cache-dir", default=str(DEFAULT_RAW_CACHE), help="Directory to store the raw Terraform schema JSON.")
    parser.add_argument("--keep-temp", action="store_true", help="Keep the temporary Terraform workspace for debugging.")
    return parser.parse_args()


def run_cmd(cmd: list[str], cwd: Path) -> str:
    result = subprocess.run(cmd, cwd=str(cwd), capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(
            f"Command failed: {' '.join(cmd)}\nSTDOUT:\n{result.stdout}\nSTDERR:\n{result.stderr}"
        )
    return result.stdout


def write_workspace(temp_dir: Path, provider_version: str, region: str) -> None:
    main_tf = f'''terraform {{
  required_version = ">= 1.0"

  required_providers {{
    aws = {{
      source  = "{DEFAULT_PROVIDER_SOURCE}"
      version = "{provider_version}"
    }}
  }}
}}

provider "aws" {{
  region = "{region}"
}}
'''
    (temp_dir / "main.tf").write_text(main_tf, encoding="utf-8")


def flatten_block(block: dict[str, Any]) -> tuple[dict[str, Any], list[str]]:
    attributes = block.get("attributes", {}) or {}
    nested = block.get("block_types", {}) or {}

    details: dict[str, Any] = {}
    nested_names: list[str] = []

    for name, attr in attributes.items():
        details[name] = {
            "required": bool(attr.get("required", False)),
            "optional": bool(attr.get("optional", False)),
            "computed": bool(attr.get("computed", False)),
            "sensitive": bool(attr.get("sensitive", False)),
            "type": attr.get("type"),
            "description": attr.get("description", ""),
        }

    for name, nested_block in nested.items():
        nested_names.append(name)
        nested_block_spec = nested_block.get("block", {}) or {}
        child_attrs = nested_block_spec.get("attributes", {}) or {}
        if child_attrs:
            details[f"{name}.*"] = {
                "required": bool(nested_block.get("min_items", 0) > 0),
                "optional": True,
                "computed": False,
                "sensitive": False,
                "type": "nested_block",
                "description": nested_block_spec.get("description", ""),
            }

    return details, nested_names


def choose_logical_component(resource_type: str) -> str:
    if resource_type.startswith("aws_lb"):
        return "load_balancer"
    if resource_type.startswith("aws_ecs"):
        return "compute"
    if resource_type.startswith("aws_db_") or resource_type.startswith("aws_rds") or resource_type.startswith("aws_aurora"):
        return "database"
    if resource_type.startswith("aws_s3_"):
        return "object_storage"
    if resource_type.startswith("aws_kms_"):
        return "key_management"
    if resource_type.startswith("aws_vpc") or resource_type.startswith("aws_subnet"):
        return "network"
    if resource_type.startswith("aws_security_group"):
        return "security"
    return resource_type.removeprefix("aws_").replace("_", "_")


def classify_fields(field_names: Iterable[str], required_fields: list[str], sensitive_fields: list[str], nested_names: list[str]) -> dict[str, list[str]]:
    field_names = list(dict.fromkeys(field_names))

    basic = [f for f in required_fields if f in field_names and f not in sensitive_fields]
    for hint in BASIC_FIELD_HINTS:
        if hint in field_names and hint not in basic and hint not in sensitive_fields:
            basic.append(hint)

    advanced: list[str] = []
    expert: list[str] = []

    for name in field_names:
        if name in basic or name in sensitive_fields:
            continue
        if name.endswith(".*") or name in nested_names:
            expert.append(name)
            continue
        if len(advanced) < 12 and (name.startswith("enable_") or name.startswith("allow_") or name.startswith("deletion_") or name.startswith("performance_") or name.startswith("backup_") or name in {"multi_az", "storage_encrypted", "publicly_accessible", "internal", "desired_count", "launch_type", "subnet_ids", "security_groups"}):
            advanced.append(name)
        else:
            expert.append(name)

    return {
        "basic_fields": list(dict.fromkeys(basic)),
        "advanced_fields": list(dict.fromkeys(advanced)),
        "expert_fields": list(dict.fromkeys(expert)),
    }


def build_resource_entry(resource_name: str, resource_schema: dict[str, Any]) -> dict[str, Any]:
    block = resource_schema.get("block", {}) or {}
    field_meta, nested_names = flatten_block(block)

    required_fields = [name for name, meta in field_meta.items() if meta["required"]]
    optional_fields = [name for name, meta in field_meta.items() if meta["optional"]]
    computed_fields = [name for name, meta in field_meta.items() if meta["computed"]]
    sensitive_fields = [name for name, meta in field_meta.items() if meta["sensitive"]]

    exposure = classify_fields(field_meta.keys(), required_fields, sensitive_fields, nested_names)

    validation_notes = []
    if resource_name in {"aws_db_instance", "aws_vpc", "aws_subnet", "aws_security_group"}:
        validation_notes.append("Review network exposure and encryption defaults before promotion to production.")
    if resource_name == "aws_s3_bucket":
        validation_notes.append("Block public access by default unless DOPA explicitly exposes a public asset pattern.")
    if resource_name == "aws_ecs_service":
        validation_notes.append("Use private subnets and align the task definition with the selected launch type.")

    recommended_defaults = {}
    if resource_name == "aws_ecs_service":
        recommended_defaults = {"launch_type": "FARGATE", "desired_count": 2}
    elif resource_name == "aws_db_instance":
        recommended_defaults = {"multi_az": True, "storage_encrypted": True, "deletion_protection": True}
    elif resource_name == "aws_s3_bucket":
        recommended_defaults = {"versioning": True, "block_public_acls": True, "block_public_policy": True}
    elif resource_name == "aws_vpc":
        recommended_defaults = {"enable_dns_support": True, "enable_dns_hostnames": True, "instance_tenancy": "default"}

    description = resource_schema.get("description") or resource_name.replace("aws_", "AWS ").replace("_", " ").title()

    return {
        "resource_type": resource_name,
        "logical_component": choose_logical_component(resource_name),
        "description": description,
        "exposure": exposure,
        "required_fields": required_fields,
        "optional_fields": optional_fields,
        "computed_fields": computed_fields,
        "sensitive_fields": sensitive_fields,
        "recommended_defaults": recommended_defaults,
        "validation_notes": validation_notes,
        "allowed_modes": ["basic", "advanced", "expert"],
        "tags": sorted({resource_name.split("_")[1]} if "_" in resource_name else set()),
    }


def extract_schema(raw_schema: dict[str, Any]) -> list[dict[str, Any]]:
    provider_schemas = raw_schema.get("provider_schemas", {})
    aws_provider = provider_schemas.get("registry.terraform.io/hashicorp/aws")
    if not aws_provider:
        raise KeyError("AWS provider schema not found in terraform providers schema output.")

    resource_schemas = aws_provider.get("resource_schemas", {})
    results: list[dict[str, Any]] = []

    for resource_name in sorted(resource_schemas.keys()):
        if resource_name not in WHITELIST_RESOURCES:
            continue
        results.append(build_resource_entry(resource_name, resource_schemas[resource_name]))

    return results


def validate_output(payload: dict[str, Any]) -> None:
    required_top_level = {"version", "provider", "source", "synced_at", "provider_version", "mode", "resources"}
    missing = required_top_level - set(payload.keys())
    if missing:
        raise ValueError(f"Missing required top-level keys: {sorted(missing)}")
    if not isinstance(payload["resources"], list) or not payload["resources"]:
        raise ValueError("No curated resources were produced.")


def main() -> int:
    args = parse_args()
    output_path = Path(args.output).resolve()
    raw_cache_dir = Path(args.raw_cache_dir).resolve()

    temp_dir_obj = tempfile.TemporaryDirectory()
    temp_dir = Path(temp_dir_obj.name)
    try:
        write_workspace(temp_dir, args.provider_version, args.region)
        run_cmd(["terraform", "init", "-input=false"], cwd=temp_dir)
        raw_schema_json = run_cmd(["terraform", "providers", "schema", "-json"], cwd=temp_dir)
        raw_schema = json.loads(raw_schema_json)

        raw_cache_dir.mkdir(parents=True, exist_ok=True)
        raw_cache_path = raw_cache_dir / f"aws-provider-schema-{args.provider_version}.json"
        raw_cache_path.write_text(raw_schema_json, encoding="utf-8")

        curated_resources = extract_schema(raw_schema)
        curated = OrderedDict(
            [
                ("version", "1.0.0"),
                ("provider", "aws"),
                ("source", DEFAULT_PROVIDER_SOURCE),
                ("synced_at", dt.datetime.now(dt.timezone.utc).isoformat()),
                ("provider_version", args.provider_version),
                ("mode", "curated"),
                ("resources", curated_resources),
            ]
        )
        validate_output(curated)

        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(curated, indent=2) + "\n", encoding="utf-8")

        print(f"Wrote curated schema to {output_path}")
        print(f"Wrote raw provider cache to {raw_cache_path}")
        print(f"Extracted {len(curated_resources)} resources from provider version {args.provider_version}.")
        return 0
    finally:
        if args.keep_temp:
            print(f"Keeping temp workspace at {temp_dir}")
            temp_dir_obj.cleanup = lambda: None  # type: ignore[assignment]
        else:
            temp_dir_obj.cleanup()


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:  # pragma: no cover - script entrypoint
        print(f"Sync failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
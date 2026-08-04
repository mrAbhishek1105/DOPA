"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { configurationApi, type SectionSchema, type FieldSchema, type StructuredProperty } from "@/lib/api/configuration";
import { HelpCircle, Loader2, Sparkles, AlertTriangle, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface DynamicResourceFormProps {
  projectId: string;
  resourceId: string;
  provider: string;
  service: string;
  currentProperties?: Record<string, StructuredProperty>;
  sectionsOverride?: SectionSchema[];
}

function normalizeResourceType(service: string): string {
  const s = service.toLowerCase().trim();
  if (s.includes("s3") || s.includes("bucket")) return "aws_s3_bucket";
  if (s.includes("alb") || s.includes("load balancer") || s.includes("lb")) return "aws_lb";
  if (s.includes("target group") || s.includes("target_group")) return "aws_lb_target_group";
  if (s.includes("listener")) return "aws_lb_listener";
  if (s.includes("vpc")) return "aws_vpc";
  if (s.includes("subnet")) return "aws_subnet";
  if (s.includes("nat")) return "aws_nat_gateway";
  if (s.includes("igw") || s.includes("internet gateway")) return "aws_internet_gateway";
  if (s.includes("route table") || s.includes("route_table")) return "aws_route_table";
  if (s.includes("security group") || s.includes("security_group") || s.includes("sg")) return "aws_security_group";
  if (s.includes("iam role") || s.includes("iam_role")) return "aws_iam_role";
  if (s.includes("iam policy") || s.includes("iam_policy")) return "aws_iam_policy";
  if (s.includes("kms")) return "aws_kms_key";
  if (s.includes("secret")) return "aws_secretsmanager_secret";
  if (s.includes("acm") || s.includes("certificate")) return "aws_acm_certificate";
  if (s.includes("waf")) return "aws_wafv2_web_acl";
  if (s.includes("cloudfront") || s.includes("cdn")) return "aws_cloudfront_distribution";
  if (s.includes("log group") || s.includes("cloudwatch")) return "aws_cloudwatch_log_group";
  if (s.includes("alarm")) return "aws_cloudwatch_metric_alarm";
  if (s.includes("aurora")) return "aws_rds_cluster";
  if (s.includes("rds") || s.includes("postgres") || s.includes("mysql") || s.includes("database")) return "aws_db_instance";
  if (s.includes("redis") || s.includes("elasticache")) return "aws_elasticache_replication_group";
  if (s.includes("dynamo")) return "aws_dynamodb_table";
  if (s.includes("docdb")) return "aws_docdb_cluster";
  if (s.includes("task definition") || s.includes("task_definition")) return "aws_ecs_task_definition";
  if (s.includes("ecs") || s.includes("fargate")) return "aws_ecs_service";
  if (s.includes("node group") || s.includes("node_group")) return "aws_eks_node_group";
  if (s.includes("eks") || s.includes("kubernetes")) return "aws_eks_cluster";
  if (s.includes("asg") || s.includes("auto scaling")) return "aws_autoscaling_group";
  if (s.includes("sqs") || s.includes("queue")) return "aws_sqs_queue";
  if (s.includes("sns") || s.includes("topic")) return "aws_sns_topic";
  if (s.includes("ec2") || s.includes("instance")) return "aws_instance";
  if (s.includes("lambda") || s.includes("function")) return "aws_lambda_function";

  return s.startsWith("aws_") ? s : `aws_${s.replace(/[^a-z0-9]/g, "_")}`;
}

function generateFallbackSections(serviceName: string): SectionSchema[] {
  return [
    {
      "id": "general",
      "title": "General & Identity",
      "description": `Core identity and operational parameters for ${serviceName}`,
      "fields": [
        {
          "id": "resource_name",
          "var_name": "name",
          "label": `${serviceName} Name`,
          "ui_component": "text",
          "importance": "required",
          "visibility": "basic",
          "operational_frequency": "high",
          "default": { "value": `${serviceName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-01`, "source": "dopa_recommended" },
          "validation": { "regex": "^[a-zA-Z0-9-]{1,64}$", "error_message": "Must be 1 to 64 alphanumeric characters or hyphens." },
          "why": `Identifies this ${serviceName} instance within your cloud architecture.`,
          "impact": "Changing the name on an active deployment recreates the resource."
        },
        {
          "id": "environment",
          "var_name": "environment",
          "label": "Environment Tier",
          "ui_component": "select",
          "options": [
            { "label": "Development / Staging", "value": "development" },
            { "label": "Production High Availability", "value": "production" }
          ],
          "importance": "required",
          "visibility": "basic",
          "operational_frequency": "high",
          "default": { "value": "production", "source": "dopa_recommended" },
          "why": "Determines scaling limits, multi-AZ deployment strategy, and backup retention.",
          "impact": "Production mode enforces strict multi-AZ failover rules."
        },
        {
          "id": "deletion_protection",
          "var_name": "enable_deletion_protection",
          "label": "Deletion Protection",
          "ui_component": "switch",
          "importance": "recommended",
          "visibility": "basic",
          "operational_frequency": "high",
          "default": { "value": true, "source": "dopa_recommended" },
          "why": "Prevents accidental resource removal.",
          "impact": "Must be turned off prior to running terraform destroy."
        },
        {
          "id": "monitoring_enabled",
          "var_name": "monitoring_enabled",
          "label": "Enhanced Monitoring",
          "ui_component": "switch",
          "importance": "optional",
          "visibility": "advanced",
          "operational_frequency": "medium",
          "default": { "value": false, "source": "dopa_recommended" },
          "why": "Enables OS-level metrics at 1-second granularity via CloudWatch.",
          "impact": "Incurs additional CloudWatch metrics cost."
        },
        {
          "id": "tags_json",
          "var_name": "tags",
          "label": "Resource Tags (JSON)",
          "ui_component": "textarea",
          "importance": "optional",
          "visibility": "advanced",
          "operational_frequency": "low",
          "default": { "value": "{}", "source": "dopa_recommended" },
          "why": "Metadata tags for cost allocation and governance.",
          "impact": "Tag changes do not cause resource recreation."
        },
        {
          "id": "iam_role_arn",
          "var_name": "iam_role_arn",
          "label": "IAM Role ARN",
          "ui_component": "iam_role",
          "importance": "optional",
          "visibility": "expert",
          "operational_frequency": "low",
          "default": { "value": "", "source": "dopa_recommended" },
          "why": "Attaches a custom IAM role for cross-service permissions.",
          "impact": "Requires careful IAM boundary configuration."
        }
      ]
    },
    {
      "id": "sizing",
      "title": "Capacity & Performance Sizing",
      "description": "Compute units, memory, and scaling boundaries",
      "fields": [
        {
          "id": "resource_capacity",
          "var_name": "capacity_units",
          "label": "Capacity Allocation",
          "ui_component": "select",
          "options": [
            { "label": "Standard (1x Base Capacity)", "value": "standard" },
            { "label": "Performance (2x Scaled Capacity)", "value": "performance" },
            { "label": "High Throughput (4x Burst Capacity)", "value": "high_throughput" }
          ],
          "importance": "recommended",
          "visibility": "basic",
          "operational_frequency": "high",
          "default": { "value": "standard", "source": "dopa_recommended" },
          "why": "Allocates CPU and memory resource quotas according to projected traffic workload.",
          "impact": "Higher capacity tiers scale performance linear with cost."
        },
        {
          "id": "min_capacity",
          "var_name": "min_capacity",
          "label": "Minimum Capacity Units",
          "ui_component": "number",
          "importance": "optional",
          "visibility": "advanced",
          "operational_frequency": "medium",
          "default": { "value": 1, "source": "dopa_recommended" },
          "why": "Floor for auto-scaling — ensures baseline availability.",
          "impact": "Setting too low can allow scale-to-zero causing cold starts."
        },
        {
          "id": "max_capacity",
          "var_name": "max_capacity",
          "label": "Maximum Capacity Units",
          "ui_component": "number",
          "importance": "optional",
          "visibility": "advanced",
          "operational_frequency": "medium",
          "default": { "value": 10, "source": "dopa_recommended" },
          "why": "Ceiling for auto-scaling — prevents runaway cost during traffic spikes.",
          "impact": "Setting too low may cause 429 throttling under peak load."
        },
        {
          "id": "cooldown_seconds",
          "var_name": "scale_in_cooldown",
          "label": "Scale-In Cooldown (seconds)",
          "ui_component": "number",
          "importance": "optional",
          "visibility": "expert",
          "operational_frequency": "low",
          "default": { "value": 300, "source": "aws" },
          "why": "Prevents aggressive scale-in by requiring a stabilization window after last scale event.",
          "impact": "Lower values may cause oscillation; higher values delay cost savings."
        }
      ]
    }
  ];
}

/** Extracts the raw scalar value from a field's default, which can be {value, source} or a plain scalar. */
function resolveDefault(fieldDefault: any): any {
  if (fieldDefault !== null && fieldDefault !== undefined && typeof fieldDefault === "object" && "value" in fieldDefault) {
    return fieldDefault.value;
  }
  return fieldDefault;
}

/** Resolves current field value: localValues > currentProperties > field default */
function resolveFieldValue(
  fieldId: string,
  varName: string,
  localValues: Record<string, any>,
  currentProperties: Record<string, StructuredProperty> | undefined,
  fieldDefault: any
): any {
  // 1. User has typed something locally
  if (localValues[fieldId] !== undefined) return localValues[fieldId];
  if (localValues[varName] !== undefined) return localValues[varName];

  // 2. Server-side resolved value
  const propStruct = currentProperties?.[fieldId] ?? currentProperties?.[varName];
  if (propStruct !== undefined && propStruct.value !== null && propStruct.value !== undefined) {
    return propStruct.value;
  }

  // 3. Field default
  return resolveDefault(fieldDefault);
}

/** Strict visibility filter — returns true if the field should show at the given mode. */
function isFieldVisible(field: FieldSchema, mode: "basic" | "advanced" | "expert"): boolean {
  const vis = field.visibility;
  if (vis === "hidden" || vis === "computed") return false;

  if (mode === "basic") {
    // Show only basic-tier or required fields (never advanced/expert)
    return vis === "basic" || field.importance === "required";
  }
  if (mode === "advanced") {
    // Show basic + advanced; also pull in recommended fields regardless of vis tier
    return vis === "basic" || vis === "advanced" || field.importance === "required" || field.importance === "recommended";
  }
  // Expert: everything that isn't hidden/computed
  return true;
}

export function DynamicResourceForm({
  projectId,
  resourceId,
  provider,
  service,
  currentProperties = {},
  sectionsOverride,
}: DynamicResourceFormProps) {
  const queryClient = useQueryClient();
  const [localValues, setLocalValues] = useState<Record<string, any>>({});
  const [visibilityMode, setVisibilityMode] = useState<"basic" | "advanced" | "expert">("basic");
  const [activeExplanation, setActiveExplanation] = useState<{
    fieldId: string;
    label: string;
    why: string;
    impact?: string;
    learn_more?: string;
  } | null>(null);

  const normalizedType = normalizeResourceType(service);

  // Fetch resource schema from API if sections not overridden
  const { data: schemaData, isLoading: schemaLoading } = useQuery({
    queryKey: ["config-schema", provider, normalizedType],
    queryFn: () => configurationApi.getSchema(provider, normalizedType),
    enabled: !sectionsOverride,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Initialize localValues from currentProperties when they first arrive (server → local hydration)
  useEffect(() => {
    if (!currentProperties || Object.keys(currentProperties).length === 0) return;
    setLocalValues((prev) => {
      // Only hydrate keys that haven't been touched by the user yet
      const merged: Record<string, any> = { ...prev };
      for (const [key, struct] of Object.entries(currentProperties)) {
        if (merged[key] === undefined && struct.value !== null && struct.value !== undefined) {
          merged[key] = struct.value;
        }
      }
      return merged;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resourceId]); // run once per resource

  const updateMutation = useMutation({
    mutationFn: ({ propName, val }: { propName: string; val: any }) =>
      configurationApi.updateProperty(projectId, resourceId, propName, val),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-config", projectId] });
      queryClient.invalidateQueries({ queryKey: ["config-readiness", projectId] });
    },
    onError: (_err, { propName }) => {
      // Revert optimistic local update so UI doesn't get out of sync with server
      setLocalValues((prev) => {
        const reverted = { ...prev };
        delete reverted[propName];
        return reverted;
      });
    },
  });

  const handleFieldChange = useCallback((fieldId: string, varName: string, value: any) => {
    // Optimistic update
    setLocalValues((prev) => ({ ...prev, [fieldId]: value }));
    // Persist to server using var_name as the canonical property name
    updateMutation.mutate({ propName: varName || fieldId, val: value });
  }, [updateMutation]);

  if (schemaLoading && !sectionsOverride) {
    return (
      <div className="p-4 flex items-center justify-center gap-2 text-slate-400 text-xs">
        <Loader2 size={14} className="animate-spin text-blue-400" />
        <span>Loading field schemas for {service}...</span>
      </div>
    );
  }

  let sections: SectionSchema[] = sectionsOverride || schemaData?.sections || [];
  if (sections.length === 0) {
    sections = generateFallbackSections(service);
  }

  // Compute field counts per mode
  const totalBasicCount = sections.reduce((acc, sec) =>
    acc + sec.fields.filter((f) => isFieldVisible(f, "basic")).length, 0);
  const totalAdvancedCount = sections.reduce((acc, sec) =>
    acc + sec.fields.filter((f) => isFieldVisible(f, "advanced")).length, 0);
  const totalExpertCount = sections.reduce((acc, sec) =>
    acc + sec.fields.filter((f) => isFieldVisible(f, "expert")).length, 0);

  const modeLabel = visibilityMode === "basic"
    ? `${totalBasicCount} fields`
    : visibilityMode === "advanced"
    ? `${totalAdvancedCount} fields`
    : `${totalExpertCount} fields`;

  return (
    <div className="space-y-4">
      {/* 3-Way Visibility Switcher */}
      <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800/80 space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Workbench Visibility</span>
          <span className="text-[10px] text-blue-400 font-mono font-bold">{modeLabel}</span>
        </div>

        <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800/60 text-center">
          {(["basic", "advanced", "expert"] as const).map((mode) => {
            const isActive = visibilityMode === mode;
            const activeClass =
              mode === "basic"
                ? "bg-blue-600 text-white shadow-md shadow-blue-900/40"
                : mode === "advanced"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/40"
                : "bg-purple-600 text-white shadow-md shadow-purple-900/40";
            const label = mode === "basic" ? "Basic Mode" : mode === "advanced" ? "Advanced" : "Expert Mode";
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setVisibilityMode(mode)}
                className={`py-1.5 rounded-md text-[11px] font-bold transition-all duration-150 ${
                  isActive ? activeClass : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Mode description hint */}
        <p className="text-[9px] text-slate-600 px-1">
          {visibilityMode === "basic" && "Required fields and essential parameters only."}
          {visibilityMode === "advanced" && "Includes recommended tunables and advanced settings."}
          {visibilityMode === "expert" && "All configurable parameters including low-level expert options."}
        </p>
      </div>

      {/* Sections Accordion */}
      {sections.map((section) => {
        const visibleFields = section.fields.filter((f) => {
          if (!isFieldVisible(f, visibilityMode)) return false;

          // Evaluate conditional show_if against combined local + server state
          if (f.conditions?.show_if) {
            const cond = f.conditions.show_if;
            const targetF = cond.field_id || cond.field;
            if (targetF) {
              const localVal = localValues[targetF];
              const serverVal = currentProperties[targetF]?.value;
              const currentVal = localVal !== undefined ? localVal : serverVal;
              if (currentVal !== undefined && currentVal !== cond.equals) return false;
            }
          }

          return true;
        });

        if (visibleFields.length === 0) return null;

        return (
          <div key={section.id} className="space-y-3 bg-slate-950/50 p-4 rounded-2xl border border-slate-800/60">
            {/* Section Header */}
            <div>
              <div className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={12} />
                {section.title}
              </div>
              {section.description && (
                <div className="text-[10px] text-slate-500 mt-0.5">{section.description}</div>
              )}
            </div>

            {/* Fields List */}
            <div className="space-y-3 pt-1">
              {visibleFields.map((field) => {
                const fieldId = field.id || field.var_name;
                const propStruct = currentProperties[fieldId] || currentProperties[field.var_name];

                const val = resolveFieldValue(fieldId, field.var_name, localValues, currentProperties, field.default);
                const whyText = propStruct?.explanation || field.why || `Configures ${field.label} according to cloud best practices.`;
                const impactText = propStruct?.impact || field.impact;
                const learnMoreUrl = propStruct?.learn_more || field.learn_more;
                const isUserModified = propStruct?.is_modified || localValues[fieldId] !== undefined;
                const isTopologyDerived = propStruct?.source === "topology";

                // Visibility tier badge for non-basic fields
                const visBadge = field.visibility === "advanced"
                  ? <span className="text-[9px] font-bold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">Advanced</span>
                  : field.visibility === "expert"
                  ? <span className="text-[9px] font-bold text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">Expert</span>
                  : null;

                return (
                  <div key={fieldId} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5 flex-wrap">
                        <span>{field.label}</span>
                        {(field.importance === "required" || field.validation?.regex) && (
                          <span className="text-red-400 text-[10px] font-bold">*</span>
                        )}
                        {field.importance === "recommended" && (
                          <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            Recommended
                          </span>
                        )}
                        {visBadge}
                        {isTopologyDerived && (
                          <span className="text-[9px] font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                            Topology Auto-Bound
                          </span>
                        )}
                        {isUserModified && !isTopologyDerived && (
                          <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-1 py-0.5 rounded border border-amber-500/20">
                            Custom
                          </span>
                        )}
                      </label>

                      {/* "Why & Impact" Explanation Button */}
                      <button
                        type="button"
                        onClick={() =>
                          setActiveExplanation({
                            fieldId,
                            label: field.label,
                            why: whyText,
                            impact: impactText,
                            learn_more: learnMoreUrl,
                          })
                        }
                        className="flex items-center gap-1 text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-950/40 hover:bg-indigo-900/50 px-2 py-0.5 rounded-md border border-indigo-500/30 transition-all"
                        title="Click to learn why this value was chosen and its operational impact"
                      >
                        <HelpCircle size={10} />
                        Why?
                      </button>
                    </div>

                    {/* SELECT CONTROL */}
                    {field.ui_component === "select" && (
                      <select
                        key={`${fieldId}-select`}
                        value={val !== undefined && val !== null ? String(val) : ""}
                        onChange={(e) => handleFieldChange(fieldId, field.var_name, e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700/60 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        {/* Render a blank placeholder only if current val doesn't match any option */}
                        {(() => {
                          const opts = field.options ?? [];
                          const hasMatch = opts.some((opt) => {
                            const v = typeof opt === "object" ? String(opt.value) : String(opt);
                            return v === String(val ?? "");
                          });
                          if (!hasMatch && (val === undefined || val === null || val === "")) {
                            return <option value="" disabled>Select an option…</option>;
                          }
                          return null;
                        })()}
                        {field.options?.map((opt) => {
                          const labelStr = typeof opt === "object" ? opt.label : opt;
                          const valStr = typeof opt === "object" ? String(opt.value) : String(opt);
                          return (
                            <option key={valStr} value={valStr}>
                              {labelStr}
                            </option>
                          );
                        })}
                      </select>
                    )}

                    {/* TEXT / ARN / CIDR / etc. CONTROL */}
                    {(field.ui_component === "text" || field.ui_component === "cidr" || field.ui_component === "kms_key" || field.ui_component === "subnet" || field.ui_component === "security_group" || field.ui_component === "iam_role" || field.ui_component === "arn" || field.ui_component === "certificate") && (
                      <input
                        type="text"
                        value={val !== undefined && val !== null ? String(val) : ""}
                        placeholder={`Enter ${field.label}…`}
                        onChange={(e) => handleFieldChange(fieldId, field.var_name, e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700/60 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                      />
                    )}

                    {/* TEXTAREA CONTROL */}
                    {field.ui_component === "textarea" && (
                      <textarea
                        value={val !== undefined && val !== null ? String(val) : ""}
                        placeholder={`Enter ${field.label}…`}
                        rows={3}
                        onChange={(e) => handleFieldChange(fieldId, field.var_name, e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700/60 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono resize-none"
                      />
                    )}

                    {/* NUMBER CONTROL */}
                    {field.ui_component === "number" && (
                      <input
                        type="number"
                        value={val !== undefined && val !== null ? Number(val) : 0}
                        onChange={(e) => handleFieldChange(fieldId, field.var_name, Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700/60 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                      />
                    )}

                    {/* SLIDER CONTROL */}
                    {field.ui_component === "slider" && (
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={128}
                          max={10240}
                          step={128}
                          value={val !== undefined && val !== null ? Number(val) : 128}
                          onChange={(e) => handleFieldChange(fieldId, field.var_name, Number(e.target.value))}
                          className="flex-1 accent-blue-500 cursor-pointer"
                        />
                        <span className="text-xs font-mono font-bold text-blue-400 w-16 text-right">{val} MB</span>
                      </div>
                    )}

                    {/* SWITCH CONTROL */}
                    {field.ui_component === "switch" && (
                      <div className="flex items-center gap-3 pt-0.5">
                        <button
                          type="button"
                          onClick={() => handleFieldChange(fieldId, field.var_name, !val)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            val ? "bg-emerald-600" : "bg-slate-700"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              val ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                        <span className="text-xs text-slate-400 font-mono">{val ? "Enabled" : "Disabled"}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* "Why & Impact" Explanation Modal */}
      <AnimatePresence>
        {activeExplanation && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            className="fixed bottom-6 right-6 max-w-lg w-full bg-slate-900/95 border border-indigo-500/50 p-5 rounded-2xl shadow-2xl z-50 backdrop-blur-2xl space-y-3"
          >
            <div className="flex items-center justify-between border-b border-indigo-500/20 pb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                <Sparkles size={14} className="text-indigo-400" />
                Architectural Rationale: <span className="text-white">{activeExplanation.label}</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveExplanation(null)}
                className="text-slate-400 hover:text-white text-xs font-bold px-1.5 py-0.5 rounded bg-slate-800/80"
              >
                ✕
              </button>
            </div>

            {/* Why Section */}
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Why Recommended</div>
              <div className="text-xs text-slate-300 leading-relaxed bg-indigo-950/30 p-3 rounded-xl border border-indigo-500/20">
                {activeExplanation.why}
              </div>
            </div>

            {/* Impact Section */}
            {activeExplanation.impact && (
              <div className="space-y-1 pt-1">
                <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                  <AlertTriangle size={11} /> Operational Impact
                </div>
                <div className="text-xs text-amber-300 leading-relaxed bg-amber-950/20 p-3 rounded-xl border border-amber-500/20">
                  {activeExplanation.impact}
                </div>
              </div>
            )}

            {/* Learn More AWS Documentation */}
            {activeExplanation.learn_more && (
              <div className="pt-1 flex justify-end">
                <a
                  href={activeExplanation.learn_more}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[10px] font-bold text-blue-400 hover:text-blue-300 hover:underline"
                >
                  Official AWS Documentation <ExternalLink size={10} />
                </a>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

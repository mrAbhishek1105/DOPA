import { apiClient } from "./client";

export interface FieldOption {
  label: string;
  value: any;
}

export interface FieldSchema {
  id: string;
  var_name: string;
  label: string;
  ui_component: "text" | "select" | "switch" | "number" | "slider" | "tags" | "key_value" | "kms_key" | "subnet" | "security_group" | "iam_role" | "cidr" | "arn" | "certificate" | "textarea" | "multi_select";
  options?: Array<FieldOption | string>;
  importance?: "required" | "recommended" | "optional";
  visibility?: "basic" | "advanced" | "expert" | "hidden" | "computed";
  operational_frequency?: "high" | "medium" | "low";
  default?: { value: any; source: string } | any;
  recommended?: Record<string, any> | any;
  validation?: { regex?: string; error_message?: string };
  terraform?: { resource: string; argument: string };
  why?: string;
  impact?: string;
  learn_more?: string;
  conditions?: {
    show_if?: { field_id?: string; field?: string; equals: any };
    required_if?: { field_id?: string; field?: string; equals: any };
  };
}

export interface SectionSchema {
  id: string;
  title: string;
  description?: string;
  fields: FieldSchema[];
}

export interface ResourceSchemaResponse {
  schema_version: string;
  resource_type: string;
  display_name: string;
  category: string;
  description: string;
  sections: SectionSchema[];
}

export interface StructuredProperty {
  value: any;
  default_value: any;
  recommended_value: any;
  source: string;
  explanation?: string;
  impact?: string;
  learn_more?: string;
  is_modified: boolean;
}

export interface ResourceInstanceData {
  id: string;
  logical_component: string;
  provider: string;
  resource_type: string;
  topology_node_id: string;
  properties: Record<string, StructuredProperty>;
  completion_percentage: number;
  status: "UNCONFIGURED" | "PARTIALLY_CONFIGURED" | "COMPLETE";
  validation_errors: Array<{ field: string; error: string }>;
}

export interface ConfigurationArtifactData {
  project_id: string;
  version: number;
  readiness_score: number;
  is_complete: boolean;
  resources: Record<string, ResourceInstanceData>;
  ui_schema: Record<string, { display_name: string; category: string; description: string; sections: SectionSchema[] }>;
}

export const configurationApi = {
  getSchema: async (provider: string, resourceType: string): Promise<ResourceSchemaResponse> => {
    const res = await apiClient.get<ResourceSchemaResponse>(`/configuration/schemas/${provider}/${resourceType}`);
    return res.data;
  },

  getConfiguration: async (projectId: string): Promise<ConfigurationArtifactData> => {
    const res = await apiClient.get<ConfigurationArtifactData>(`/configuration/resolved/${projectId}`);
    return res.data;
  },

  updateProperty: async (
    projectId: string,
    resourceId: string,
    propertyName: string,
    value: any
  ): Promise<ConfigurationArtifactData> => {
    const res = await apiClient.patch<ConfigurationArtifactData>(
      `/configuration/${projectId}/resource/${resourceId}`,
      { property_name: propertyName, value }
    );
    return res.data;
  },

  getExplanation: async (projectId: string, resourceId: string, fieldId: string): Promise<{ field_id: string; why: string; impact?: string; learn_more?: string }> => {
    const res = await apiClient.get(`/configuration/${projectId}/explain/${resourceId}/${fieldId}`);
    return res.data;
  },

  getReadiness: async (projectId: string): Promise<{ readiness_score: number; is_complete: boolean; version: number }> => {
    const res = await apiClient.get(`/configuration/${projectId}/readiness`);
    return res.data;
  },
};

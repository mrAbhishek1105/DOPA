import { useQuery } from "@tanstack/react-query";
import { projectsApi } from "@/lib/api/projects";

export type WorkspaceMode = 
  | "DISCOVERY" 
  | "ARCHITECTURE_SELECTION" 
  | "ARCHITECTURE_REVIEW" 
  | "EDITING" 
  | "EXPORT";

export function useWorkspaceMode(projectId?: string) {
  const { data: statusData } = useQuery({
    queryKey: ["status", projectId],
    queryFn: () => projectId ? projectsApi.getStatus(projectId) : Promise.resolve({ status: "" }),
    enabled: !!projectId,
    refetchInterval: 3000,
  });

  const status = (statusData?.status || "").toLowerCase();

  let mode: WorkspaceMode = "DISCOVERY";

  switch (status) {
    case "discovery":
    case "requirements_gathered":
      mode = "DISCOVERY";
      break;
    case "options_generated":
      mode = "ARCHITECTURE_SELECTION";
      break;
    case "graph_generated":
    case "terraform_generating":
    case "analyzing":
    case "explaining":
      mode = "ARCHITECTURE_REVIEW";
      break;
    case "completed":
      mode = "EXPORT";
      break;
    case "failed":
    default:
      mode = "DISCOVERY";
  }

  return { mode, status };
}

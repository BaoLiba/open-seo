import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { RowSelectionState } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import {
  TableBulkActionBar,
  TableBulkActionButton,
} from "@/client/components/table/TableBulkActionBar";
import { researchAiVisibilityPrompts } from "@/serverFunctions/ai-visibility";
import { normalizeAiSuggestion } from "@/shared/ai-prompt-suggestions";
import type { AiTrackerState } from "@/shared/ai-visibility";
import type { AiTrackerPatch } from "@/types/schemas/ai-visibility";
import { PromptResearchTable } from "./PromptResearchTable";
import { TrackerPatchReview } from "./TrackerPatchReview";
import { AiQueryError, aiVisibilityKey } from "./shared";

export function PromptResearchKeyword({
  projectId,
  state,
  keyword,
}: {
  projectId: string;
  state: AiTrackerState;
  keyword: string;
}) {
  const queryClient = useQueryClient();
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [change, setChange] = useState<{
    patch: AiTrackerPatch;
    description: string;
  } | null>(null);
  // The tracked prompts refresh tracked flags after any tracker edit. The
  // server reuses its cached provider response, so this costs no extra credits.
  const research = useQuery({
    queryKey: [
      ...aiVisibilityKey(projectId),
      "research",
      keyword,
      state.prompts.filter((prompt) => !prompt.archived).map(({ id }) => id),
    ],
    queryFn: () =>
      researchAiVisibilityPrompts({ data: { projectId, keyword } }),
    retry: false,
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  // Table order, so the review lists prompts as the user sees them.
  const selected = (research.data?.prompts ?? [])
    .filter((prompt) => rowSelection[prompt.text])
    .map((prompt) => prompt.text);
  const track = () => {
    const topic =
      state.topics.find(
        (name) =>
          normalizeAiSuggestion(name) === normalizeAiSuggestion(keyword),
      ) ?? keyword;
    setChange({
      description: `Track ${selected.length} researched ${selected.length === 1 ? "prompt" : "prompts"} in the ${topic} topic.`,
      patch: { prompts: selected.map((text) => ({ text, topic })) },
    });
  };
  return (
    <>
      <TableBulkActionBar
        selectedCount={selected.length}
        onClear={() => setRowSelection({})}
        actions={
          <div className="flex items-center px-1.5">
            <TableBulkActionButton
              icon={<Plus className="size-3.5" />}
              onClick={track}
            >
              Track prompts
            </TableBulkActionButton>
          </div>
        }
      />
      <PromptResearchTable
        prompts={research.data?.prompts ?? []}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        isLoading={research.isPending}
        error={
          research.isError ? (
            <AiQueryError
              error={research.error}
              retry={() => {
                void research.refetch();
              }}
            />
          ) : undefined
        }
        empty={{
          title: `No prompts found for “${keyword}”`,
          description: "Try a shorter, broader term.",
        }}
        toolbar={
          <div className="border-b px-4 py-3 border-border">
            <h2 className="font-medium">Prompts about “{keyword}”</h2>
          </div>
        }
      />
      {change && (
        <TrackerPatchReview
          projectId={projectId}
          state={state}
          patch={change.patch}
          description={change.description}
          onClose={() => setChange(null)}
          onSaved={(next) => {
            queryClient.setQueryData(
              [...aiVisibilityKey(projectId), "tracker"],
              next,
            );
            setChange(null);
            setRowSelection({});
          }}
        />
      )}
    </>
  );
}

// components/nodes/LlmNode.tsx
import { useCallback, useState } from "react";
import { type NodeProps, Position, useUpdateNodeInternals } from "@xyflow/react";
import { Plus, Play, ChevronsUpDown, Check } from "lucide-react";
import { NodeShell } from "@/components/nodes/NodeShell";
import { BaseNode } from "@/components/nodes/BaseNode";
import { PreviewArea } from "@/components/nodes/PreviewArea";
import { LLMNodeData, LLMRFNode } from "@/types/nodetype";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { MODELS } from "@/lib/constant";
import { useNodeInput } from "@/store/useFlowStore";

const HANDLE_SPACING = 28;
const HANDLE_START_Y = 60;

const PROMPT_HANDLE = (id: string) => `handle-${id}-prompt`;
const IMAGE_HANDLE = (id: string, i: number) => `handle-${id}-image-${i}`;

// Separate component per image slot so each has its own targeted subscription
function ImageSlot({ nodeId, index }: { nodeId: string; index: number }) {
  const input = useNodeInput(nodeId, IMAGE_HANDLE(nodeId, index));
  const url = input?.imageUrl;

  return url ? (
    <img
      src={url}
      alt={`ref ${index + 1}`}
      className="h-20 w-20 object-cover rounded-sm border border-sidebar-border"
    />
  ) : (
    <div className="h-20 w-20 rounded-sm border border-dashed border-sidebar-border flex items-center justify-center text-[10px] text-sidebar-foreground/40">
      Not connected
    </div>
  );
}

export function LLMNode(props: NodeProps<LLMRFNode>) {
  const updateNodeInternals = useUpdateNodeInternals();

  // Each of these is a targeted subscription — zero unnecessary re-renders
  const promptInput = useNodeInput(props.id, PROMPT_HANDLE(props.id));
  const promptText = promptInput?.text ?? "";

  const [model, setModel] = useState(props.data.model ?? MODELS[0].value);
  const [imageInputCount, setImageInputCount] = useState(
    props.data.imageInputCount ?? 0,
  );
  const [comboOpen, setComboOpen] = useState(false);

  const addImageInput = useCallback(() => {
    setImageInputCount((c) => {
      updateNodeInternals(props.id);
      return c + 1;
    });
  }, [props.id, updateNodeInternals]);

  const handles = [
    {
      text: "Prompt",
      id: `${props.id}-prompt`,
      position: Position.Left,
      type: "target" as const,
      style: { top: HANDLE_START_Y, background: "#f1a0fa" },
    },
    ...Array.from({ length: imageInputCount }, (_, i) => ({
      text: `Reference Image ${i + 1}`,
      id: `${props.id}-image-${i}`,
      position: Position.Left,
      type: "target" as const,
      style: {
        top: HANDLE_START_Y + HANDLE_SPACING * (i + 1),
        background: "#45a08a",
      },
    })),
    {
      text: "Result",
      id: `${props.id}-result`,
      position: Position.Right,
      type: "source" as const,
      style: { top: "50%", background: "#45a08a" },
    },
  ];

  return (
    <BaseNode<LLMNodeData> {...props} handles={handles}>
      {() => (
        <NodeShell
          title="Run LLM"
          icon={<span className="text-base">🤖</span>}
          className="h-96"
          nodeId={props?.id}
        >
          {/* Model selector */}
          <Popover open={comboOpen} onOpenChange={setComboOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={comboOpen}
                className="nodrag w-full justify-between border-sidebar-border bg-sidebar-background rounded-sm px-2 py-1.5 text-xs text-sidebar-foreground hover:bg-button-hover hover:cursor-pointer hover:text-sidebar-foreground"
              >
                {MODELS.find((m) => m.value === model)?.label ?? "Select model…"}
                <ChevronsUpDown
                  size={12}
                  className="ml-auto opacity-50 shrink-0"
                />
              </Button>
            </PopoverTrigger>

            <PopoverContent className="w-full p-0 border-sidebar-border bg-sidebar-background">
              <Command className="bg-transparent text-sidebar-foreground">
                <CommandInput
                  placeholder="Search models…"
                  className="text-xs text-sidebar-foreground"
                />

                <CommandList>
                  <CommandEmpty className="py-2 text-center text-xs text-sidebar-foreground/80">
                    No model found.
                  </CommandEmpty>
                  <CommandGroup>
                    {MODELS.map((m) => (
                      <CommandItem
                        key={m.value}
                        value={m.value}
                        onSelect={(val) => {
                          setModel(val);
                          setComboOpen(false);
                        }}
                        className="text-xs font-medium text-sidebar-foreground hover:bg-gray-700 cursor-pointer"
                      >
                        {m.label}
                        <Check
                          size={12}
                          className={cn(
                            "ml-auto",
                            model === m.value ? "opacity-100" : "opacity-0",
                          )}
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Preview */}
          <PreviewArea>
            {imageInputCount > 0 && (
              <div className="absolute inset-0 flex flex-wrap gap-1 p-2 overflow-auto">
                {Array.from({ length: imageInputCount }, (_, i) => (
                  <ImageSlot key={i} nodeId={props.id} index={i} />
                ))}
              </div>
            )}
            {promptText && imageInputCount === 0 && (
              <div className="absolute inset-0 p-3 overflow-auto">
                <p className="text-[11px] text-sidebar-foreground/70 leading-relaxed">
                  {promptText}
                </p>
              </div>
            )}
          </PreviewArea>

          {/* Footer */}
          <div className="flex items-center justify-between mt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={addImageInput}
              className="nodrag h-auto px-0! py-1 cursor-pointer gap-1 text-[11px] text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-transparent"
            >
              <Plus size={12} /> Add another image input
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="nodrag cursor-pointer h-auto gap-1.5 px-3 py-2 text-xs border-sidebar-border bg-yellow-bg/80 text-black/80 hover:bg-yellow-bg"
            >
              <Play size={10} /> Run Model
            </Button>
          </div>
        </NodeShell>
      )}
    </BaseNode>
  );
}


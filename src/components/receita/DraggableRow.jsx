import { Draggable } from "@hello-pangea/dnd";
import { GripVertical } from "lucide-react";

export default function DraggableRow({ draggableId, index, isDragDisabled = false, handlePosition = "start", children }) {
  return (
    <Draggable draggableId={draggableId} index={index} isDragDisabled={isDragDisabled}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`group flex items-stretch gap-0.5 ${snapshot.isDragging ? "z-50" : ""}`}
        >
          {handlePosition === "start" && (
            !isDragDisabled ? (
              <button
                {...provided.dragHandleProps}
                className="flex items-center justify-center w-8 min-h-[32px] cursor-grab active:cursor-grabbing text-muted-foreground opacity-40 group-hover:opacity-100 group-hover:text-primary transition-all touch-none shrink-0 rounded-l-md"
                title="Arraste para reordenar"
                aria-label="Arraste para reordenar"
              >
                <GripVertical className="w-4 h-4" />
              </button>
            ) : (
              <div className="w-2 shrink-0" />
            )
          )}
          <div className={`flex-1 min-w-0 transition-all rounded-md ${
            snapshot.isDragging
              ? "ring-2 ring-primary shadow-xl scale-[1.02] bg-background"
              : "group-hover:ring-1 group-hover:ring-primary/15"
          }`}>
            {typeof children === "function" ? children(provided, snapshot) : children}
          </div>
        </div>
      )}
    </Draggable>
  );
}
import { Draggable } from "@hello-pangea/dnd";
import { GripVertical } from "lucide-react";

export default function DraggableRow({ draggableId, index, isDragDisabled = false, children }) {
  return (
    <Draggable draggableId={draggableId} index={index} isDragDisabled={isDragDisabled}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`flex items-stretch gap-1 ${snapshot.isDragging ? "opacity-75 z-50" : ""}`}
        >
          {!isDragDisabled && (
            <button
              {...provided.dragHandleProps}
              className="flex items-center justify-center w-5 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-primary transition-colors touch-none shrink-0"
              title="Arraste para reordenar"
            >
              <GripVertical className="w-4 h-4" />
            </button>
          )}
          <div className={`flex-1 min-w-0 transition-shadow ${snapshot.isDragging ? "ring-2 ring-primary rounded-lg shadow-lg" : ""}`}>
            {children}
          </div>
          {provided.placeholder}
        </div>
      )}
    </Draggable>
  );
}
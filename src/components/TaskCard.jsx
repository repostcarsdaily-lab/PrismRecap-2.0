import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function TaskCard({ task, onOpenTask, onDeleteTask, onDuplicateTask }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <article ref={setNodeRef} style={style} className="kanban-card">
      <div className="kanban-card-header">
        <div>
          <h4>{task.title}</h4>
          <p>{task.description}</p>
        </div>
        <button type="button" className="ghost-btn small" {...attributes} {...listeners}>⋮</button>
      </div>
      <div className="kanban-tags">
        <span className="tag">{task.priority}</span>
        <span className="tag">{task.department}</span>
      </div>
      <div className="kanban-meta">
        <span>{task.assignee}</span>
        <span>{task.dueDate || 'No due date'}</span>
      </div>
      <div className="task-actions">
        <button type="button" className="ghost-btn small" onClick={() => onOpenTask(task)}>View</button>
        <button type="button" className="ghost-btn small" onClick={() => onDuplicateTask(task)}>Duplicate</button>
        <button type="button" className="ghost-btn small" onClick={() => onDeleteTask(task.id)}>Delete</button>
      </div>
    </article>
  );
}

export default TaskCard;

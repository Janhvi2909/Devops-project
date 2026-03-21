import React from 'react';

export default function TaskCard({ task, onEdit, onDelete }) {
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="task-card" id={`task-card-${task.id}`}>
      <div className={`task-card__priority-bar task-card__priority-bar--${task.priority}`} />
      <div className="task-card__content">
        <div className="task-card__header">
          <span
            className={`task-card__title ${task.status === 'completed' ? 'task-card__title--completed' : ''}`}
          >
            {task.title}
          </span>
          <span className={`task-card__badge task-card__badge--${task.status}`}>{task.status}</span>
        </div>
        {task.description && <p className="task-card__desc">{task.description}</p>}
        <div className="task-card__meta">
          <span>📁 {task.category}</span>
          <span>📅 {formatDate(task.createdAt)}</span>
          <span>🔥 {task.priority}</span>
        </div>
      </div>
      <div className="task-card__actions">
        <button
          className="task-card__action-btn"
          onClick={() => onEdit(task)}
          title="Edit task"
          id={`edit-task-${task.id}`}
        >
          ✏️
        </button>
        <button
          className="task-card__action-btn task-card__action-btn--delete"
          onClick={() => onDelete(task.id)}
          title="Delete task"
          id={`delete-task-${task.id}`}
        >
          🗑️
        </button>
      </div>
    </div>
  );
}

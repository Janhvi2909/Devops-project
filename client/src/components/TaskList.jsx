import React from 'react';
import TaskCard from './TaskCard';

export default function TaskList({ tasks, loading, onEdit, onDelete }) {
  if (loading) {
    return (
      <div className="loading">
        <div className="loading__spinner" />
        <p>Loading tasks...</p>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="task-list__empty" id="empty-state">
        <div className="task-list__empty-icon">📋</div>
        <p className="task-list__empty-text">No tasks found. Create one to get started!</p>
      </div>
    );
  }

  return (
    <div className="task-list" id="task-list">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}

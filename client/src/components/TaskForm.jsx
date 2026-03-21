import React, { useState, useEffect } from 'react';

export default function TaskForm({ task, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'pending',
    priority: 'medium',
    category: 'general',
  });

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'pending',
        priority: task.priority || 'medium',
        category: task.category || 'general',
      });
    }
  }, [task]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    onSubmit(formData);
  };

  return (
    <div className="modal-overlay" onClick={onCancel} id="task-form-modal">
      <form className="task-form" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2 className="task-form__title">{task ? '✏️ Edit Task' : '✨ Create New Task'}</h2>

        <div className="task-form__group">
          <label className="task-form__label" htmlFor="task-title">
            Title
          </label>
          <input
            className="task-form__input"
            id="task-title"
            name="title"
            type="text"
            placeholder="What needs to be done?"
            value={formData.title}
            onChange={handleChange}
            required
            autoFocus
          />
        </div>

        <div className="task-form__group">
          <label className="task-form__label" htmlFor="task-description">
            Description
          </label>
          <textarea
            className="task-form__textarea"
            id="task-description"
            name="description"
            placeholder="Add more details..."
            value={formData.description}
            onChange={handleChange}
          />
        </div>

        <div className="task-form__row">
          <div className="task-form__group">
            <label className="task-form__label" htmlFor="task-status">
              Status
            </label>
            <select
              className="task-form__select"
              id="task-status"
              name="status"
              value={formData.status}
              onChange={handleChange}
            >
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className="task-form__group">
            <label className="task-form__label" htmlFor="task-priority">
              Priority
            </label>
            <select
              className="task-form__select"
              id="task-priority"
              name="priority"
              value={formData.priority}
              onChange={handleChange}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        <div className="task-form__group">
          <label className="task-form__label" htmlFor="task-category">
            Category
          </label>
          <input
            className="task-form__input"
            id="task-category"
            name="category"
            type="text"
            placeholder="e.g., Work, Personal, Study"
            value={formData.category}
            onChange={handleChange}
          />
        </div>

        <div className="task-form__actions">
          <button
            type="button"
            className="task-form__btn task-form__btn--cancel"
            onClick={onCancel}
            id="cancel-task-btn"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="task-form__btn task-form__btn--submit"
            id="submit-task-btn"
          >
            {task ? 'Update Task' : 'Create Task'}
          </button>
        </div>
      </form>
    </div>
  );
}

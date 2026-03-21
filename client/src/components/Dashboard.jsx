import React from 'react';

export default function Dashboard({ tasks }) {
  const total = tasks.length;
  const pending = tasks.filter((t) => t.status === 'pending').length;
  const inProgress = tasks.filter((t) => t.status === 'in-progress').length;
  const completed = tasks.filter((t) => t.status === 'completed').length;

  return (
    <section className="dashboard" id="dashboard">
      <div className="stat-card stat-card--total">
        <div className="stat-card__value">{total}</div>
        <div className="stat-card__label">Total Tasks</div>
      </div>
      <div className="stat-card stat-card--pending">
        <div className="stat-card__value">{pending}</div>
        <div className="stat-card__label">Pending</div>
      </div>
      <div className="stat-card stat-card--progress">
        <div className="stat-card__value">{inProgress}</div>
        <div className="stat-card__label">In Progress</div>
      </div>
      <div className="stat-card stat-card--completed">
        <div className="stat-card__value">{completed}</div>
        <div className="stat-card__label">Completed</div>
      </div>
    </section>
  );
}

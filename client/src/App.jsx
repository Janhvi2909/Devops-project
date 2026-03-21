import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import TaskList from './components/TaskList';
import TaskForm from './components/TaskForm';
import Footer from './components/Footer';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterPriority) params.priority = filterPriority;
      if (sortOrder === 'oldest') params.sort = 'oldest';
      const res = await axios.get(`${API_URL}/tasks`, { params });
      setTasks(res.data);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterPriority, sortOrder]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleCreateTask = async (data) => {
    try {
      await axios.post(`${API_URL}/tasks`, data);
      setShowForm(false);
      fetchTasks();
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  const handleUpdateTask = async (data) => {
    try {
      await axios.put(`${API_URL}/tasks/${editingTask.id}`, data);
      setEditingTask(null);
      setShowForm(false);
      fetchTasks();
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const handleDeleteTask = async (id) => {
    try {
      await axios.delete(`${API_URL}/tasks/${id}`);
      fetchTasks();
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setShowForm(true);
  };

  const handleFormSubmit = (data) => {
    if (editingTask) {
      handleUpdateTask(data);
    } else {
      handleCreateTask(data);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingTask(null);
  };

  return (
    <div className="app">
      <Header />
      <Dashboard tasks={tasks} />

      <div className="controls">
        <button
          className="controls__btn controls__btn--primary"
          onClick={() => {
            setEditingTask(null);
            setShowForm(true);
          }}
          id="add-task-btn"
        >
          ＋ New Task
        </button>
        <select
          className="controls__select"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          id="filter-status"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
        <select
          className="controls__select"
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          id="filter-priority"
        >
          <option value="">All Priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          className="controls__select"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          id="sort-order"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
        </select>
      </div>

      <TaskList tasks={tasks} loading={loading} onEdit={handleEdit} onDelete={handleDeleteTask} />

      {showForm && (
        <TaskForm task={editingTask} onSubmit={handleFormSubmit} onCancel={handleCancel} />
      )}

      <Footer />
    </div>
  );
}

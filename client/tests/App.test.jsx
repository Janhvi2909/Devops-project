import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import Header from '../src/components/Header';
import Dashboard from '../src/components/Dashboard';
import TaskCard from '../src/components/TaskCard';
import Footer from '../src/components/Footer';
import TaskList from '../src/components/TaskList';

describe('Header Component', () => {
  test('renders the app title', () => {
    render(<Header />);
    expect(screen.getByText('TaskFlow')).toBeInTheDocument();
  });

  test('renders the subtitle', () => {
    render(<Header />);
    expect(screen.getByText('Smart Task Manager')).toBeInTheDocument();
  });
});

describe('Dashboard Component', () => {
  const mockTasks = [
    { id: 1, status: 'pending' },
    { id: 2, status: 'in-progress' },
    { id: 3, status: 'completed' },
    { id: 4, status: 'pending' },
  ];

  test('displays correct total count', () => {
    render(<Dashboard tasks={mockTasks} />);
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  test('displays correct pending count', () => {
    render(<Dashboard tasks={mockTasks} />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  test('displays stat labels', () => {
    render(<Dashboard tasks={mockTasks} />);
    expect(screen.getByText('Total Tasks')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });
});

describe('TaskCard Component', () => {
  const mockTask = {
    id: 1,
    title: 'Test Task',
    description: 'Test description',
    status: 'pending',
    priority: 'high',
    category: 'work',
    createdAt: '2026-03-20T10:00:00Z',
  };

  test('renders task title', () => {
    render(<TaskCard task={mockTask} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });

  test('renders task description', () => {
    render(<TaskCard task={mockTask} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  test('renders status badge', () => {
    render(<TaskCard task={mockTask} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('pending')).toBeInTheDocument();
  });

  test('renders category', () => {
    render(<TaskCard task={mockTask} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText(/work/)).toBeInTheDocument();
  });

  test('applies completed style when status is completed', () => {
    const completedTask = { ...mockTask, status: 'completed' };
    render(<TaskCard task={completedTask} onEdit={vi.fn()} onDelete={vi.fn()} />);
    const title = screen.getByText('Test Task');
    expect(title).toHaveClass('task-card__title--completed');
  });
});

describe('TaskList Component', () => {
  test('shows loading spinner when loading', () => {
    render(<TaskList tasks={[]} loading={true} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('Loading tasks...')).toBeInTheDocument();
  });

  test('shows empty state when no tasks', () => {
    render(<TaskList tasks={[]} loading={false} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText(/No tasks found/)).toBeInTheDocument();
  });
});

describe('Footer Component', () => {
  test('renders footer text', () => {
    render(<Footer />);
    expect(screen.getByText(/React \+ Express \+ Prisma/)).toBeInTheDocument();
  });
});

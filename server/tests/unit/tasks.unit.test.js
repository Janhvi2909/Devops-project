const { VALID_STATUSES, VALID_PRIORITIES } = (() => {
  const VALID_STATUSES = ['pending', 'in-progress', 'completed'];
  const VALID_PRIORITIES = ['low', 'medium', 'high'];
  return { VALID_STATUSES, VALID_PRIORITIES };
})();

function validateTaskInput(data) {
  const errors = [];

  if (!data.title || data.title.trim().length === 0) {
    errors.push('Title is required');
  }

  if (data.status && !VALID_STATUSES.includes(data.status)) {
    errors.push(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  if (data.priority && !VALID_PRIORITIES.includes(data.priority)) {
    errors.push(`Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}`);
  }

  return errors;
}

describe('Task Validation - Unit Tests', () => {
  test('should reject empty title', () => {
    const errors = validateTaskInput({ title: '' });
    expect(errors).toContain('Title is required');
  });

  test('should reject null title', () => {
    const errors = validateTaskInput({ title: null });
    expect(errors).toContain('Title is required');
  });

  test('should accept valid title', () => {
    const errors = validateTaskInput({ title: 'Buy groceries' });
    expect(errors).toHaveLength(0);
  });

  test('should reject invalid status', () => {
    const errors = validateTaskInput({ title: 'Test', status: 'invalid' });
    expect(errors.some((e) => e.includes('Invalid status'))).toBe(true);
  });

  test('should accept valid status values', () => {
    VALID_STATUSES.forEach((status) => {
      const errors = validateTaskInput({ title: 'Test', status });
      expect(errors).toHaveLength(0);
    });
  });

  test('should reject invalid priority', () => {
    const errors = validateTaskInput({ title: 'Test', priority: 'urgent' });
    expect(errors.some((e) => e.includes('Invalid priority'))).toBe(true);
  });

  test('should accept valid priority values', () => {
    VALID_PRIORITIES.forEach((priority) => {
      const errors = validateTaskInput({ title: 'Test', priority });
      expect(errors).toHaveLength(0);
    });
  });

  test('should reject whitespace-only title', () => {
    const errors = validateTaskInput({ title: '   ' });
    expect(errors).toContain('Title is required');
  });
});

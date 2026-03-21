import { test, expect } from '@playwright/test';

test.describe('TaskFlow E2E Tests', () => {
  test('should load the app and display header', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#app-header')).toBeVisible();
    await expect(page.locator('text=TaskFlow')).toBeVisible();
  });

  test('should display dashboard stats', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#dashboard')).toBeVisible();
    await expect(page.locator('text=Total Tasks')).toBeVisible();
    await expect(page.locator('text=Pending')).toBeVisible();
  });

  test('should open task creation form', async ({ page }) => {
    await page.goto('/');
    await page.click('#add-task-btn');
    await expect(page.locator('#task-form-modal')).toBeVisible();
    await expect(page.locator('text=Create New Task')).toBeVisible();
  });

  test('should create a new task', async ({ page }) => {
    await page.goto('/');
    await page.click('#add-task-btn');
    await page.fill('#task-title', 'E2E Test Task');
    await page.fill('#task-description', 'Created by Playwright');
    await page.selectOption('#task-priority', 'high');
    await page.click('#submit-task-btn');

    await expect(page.locator('text=E2E Test Task')).toBeVisible({ timeout: 5000 });
  });

  test('should cancel task creation', async ({ page }) => {
    await page.goto('/');
    await page.click('#add-task-btn');
    await expect(page.locator('#task-form-modal')).toBeVisible();
    await page.click('#cancel-task-btn');
    await expect(page.locator('#task-form-modal')).not.toBeVisible();
  });

  test('should display footer', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#app-footer')).toBeVisible();
  });

  test('should have filter controls', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#filter-status')).toBeVisible();
    await expect(page.locator('#filter-priority')).toBeVisible();
    await expect(page.locator('#sort-order')).toBeVisible();
  });
});

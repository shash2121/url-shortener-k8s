import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('pg', () => ({
  Pool: vi.fn(() => ({
    query: vi.fn(),
    end: vi.fn(),
  })),
}));

describe('Expiry Cron Cleanup', () => {
  let deleteExpiredUrls: any, deleteSoftDeletedUrls: any;
  let Pool: any;

  beforeEach(async () => {
    vi.resetModules();
    Pool = (await import('pg')).Pool;
    const cleanup = await import('../db/cleanup');
    deleteExpiredUrls = cleanup.deleteExpiredUrls;
    deleteSoftDeletedUrls = cleanup.deleteSoftDeletedUrls;
  });

  it('deletes expired URLs', async () => {
    const mockPool = new Pool();
    (mockPool.query as any).mockResolvedValue({ rowCount: 5 });
    const count = await deleteExpiredUrls();
    expect(count).toBe(5);
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM urls WHERE expires_at'),
      []
    );
  });

  it('deletes soft-deleted URLs older than 30 days', async () => {
    const mockPool = new Pool();
    (mockPool.query as any).mockResolvedValue({ rowCount: 3 });
    const count = await deleteSoftDeletedUrls();
    expect(count).toBe(3);
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('deleted_at < NOW()'),
      []
    );
  });
});

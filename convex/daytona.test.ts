import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const { getMock, MockDaytonaError, MockDaytonaNotFoundError } = vi.hoisted(() => {
  class HoistedMockDaytonaError extends Error {
    constructor(
      message: string,
      readonly statusCode?: number,
    ) {
      super(message);
      this.name = 'DaytonaError';
    }
  }

  class HoistedMockDaytonaNotFoundError extends Error {
    constructor(message = 'Not found') {
      super(message);
      this.name = 'DaytonaNotFoundError';
    }
  }

  return {
    getMock: vi.fn(),
    MockDaytonaError: HoistedMockDaytonaError,
    MockDaytonaNotFoundError: HoistedMockDaytonaNotFoundError,
  };
});

vi.mock('@daytona/sdk', () => ({
  CodeLanguage: {
    TYPESCRIPT: 'typescript',
  },
  Daytona: class MockDaytona {
    constructor(_options: unknown) {}

    get(remoteId: string) {
      return getMock(remoteId);
    }
  },
  DaytonaError: MockDaytonaError,
  DaytonaNotFoundError: MockDaytonaNotFoundError,
}));

import { getSandboxState, getRemoteSandboxDetails } from './daytona';

describe('daytona state normalization', () => {
  beforeEach(() => {
    process.env.DAYTONA_API_KEY = 'test-api-key';
    getMock.mockReset();
  });

  afterEach(() => {
    delete process.env.DAYTONA_API_KEY;
  });

  test.each([
    ['deleted', 'destroyed'],
    ['destroyed', 'destroyed'],
    ['failed', 'error'],
  ] as const)('normalizes %s when reading sandbox state', async (remoteState, expectedState) => {
    getMock.mockResolvedValue({
      id: 'remote-1',
      state: remoteState,
      labels: { app: 'repospark' },
      refreshData: vi.fn().mockResolvedValue(undefined),
    });

    await expect(getSandboxState('remote-1')).resolves.toBe(expectedState);
  });

  test('returns normalized labels and state from remote sandbox details', async () => {
    getMock.mockResolvedValue({
      id: 'remote-2',
      organizationId: 'org-1',
      createdAt: '2026-04-24T00:00:00.000Z',
      updatedAt: '2026-04-24T00:00:01.000Z',
      state: 'failed',
      labels: { app: 'repospark' },
      refreshData: vi.fn().mockResolvedValue(undefined),
    });

    await expect(getRemoteSandboxDetails('remote-2')).resolves.toEqual({
      exists: true,
      remoteId: 'remote-2',
      organizationId: 'org-1',
      createdAt: '2026-04-24T00:00:00.000Z',
      updatedAt: '2026-04-24T00:00:01.000Z',
      labels: { app: 'repospark' },
      state: 'error',
    });
  });
});

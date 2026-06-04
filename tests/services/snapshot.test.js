jest.mock('better-sqlite3')
jest.mock('fs')

import Database from 'better-sqlite3'
import { writeFileSync, mkdirSync, existsSync, readFileSync, readdirSync } from 'fs'
import { createSnapshotService } from '../../src/services/snapshot'

const mockServers = [
  { id: 's1', name: 'Server 1', database: '/fake/game.db', refreshCooldown: 5 }
]

describe('snapshotService', () => {
  let service

  beforeEach(() => {
    jest.clearAllMocks()
    existsSync.mockReturnValue(false)
    readdirSync.mockReturnValue([])
    service = createSnapshotService(mockServers)
  })

  test('get() returns null when no snapshot exists', () => {
    expect(service.get('s1')).toBeNull()
  })

  test('get() returns null for unknown server', () => {
    expect(service.get('unknown')).toBeNull()
  })

  test('refresh() rejects unknown serverId', async () => {
    await expect(service.refresh('unknown')).rejects.toThrow('Unknown server')
  })

  test('refresh() rejects while already refreshing', async () => {
    service._snapshots.set('s1', { refreshing: true })
    await expect(service.refresh('s1')).rejects.toMatchObject({ code: 'REFRESHING' })
  })

  test('refresh() rejects when cooldown has not elapsed', async () => {
    const mockDb = {
      prepare: jest.fn().mockReturnValue({ all: jest.fn().mockReturnValue([]) }),
      close: jest.fn()
    }
    Database.mockImplementation(() => mockDb)
    mkdirSync.mockImplementation(() => {})
    writeFileSync.mockImplementation(() => {})

    await service.refresh('s1')

    // Immediate second refresh should hit cooldown (cooldown = 5s, 0s elapsed)
    await expect(service.refresh('s1')).rejects.toMatchObject({
      code: 'COOLDOWN',
      retryAfter: expect.any(Number)
    })
  })

  test('get() returns snapshot after successful refresh', async () => {
    const mockDb = {
      prepare: jest.fn().mockReturnValue({ all: jest.fn().mockReturnValue([]) }),
      close: jest.fn()
    }
    Database.mockImplementation(() => mockDb)
    mkdirSync.mockImplementation(() => {})
    writeFileSync.mockImplementation(() => {})

    await service.refresh('s1')
    const snap = service.get('s1')

    expect(snap).not.toBeNull()
    expect(snap.serverId).toBe('s1')
    expect(snap.timestamp).toBeTruthy()
    expect(snap.refreshing).toBe(false)
    expect(snap.data).toHaveProperty('players')
    expect(snap.data).toHaveProperty('altars')
    expect(snap.data).toHaveProperty('all')
  })
})

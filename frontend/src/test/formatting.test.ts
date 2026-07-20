import { describe, it, expect, vi, afterEach } from 'vitest'
import { formatTimestamp, timeAgo, ipfsToGatewayUrl } from '../utils/formatting'

describe('ipfsToGatewayUrl', () => {
  it('converts a valid ipfs:// CIDv0 URI to a Pinata gateway URL', () => {
    const uri = 'ipfs://QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco'
    expect(ipfsToGatewayUrl(uri)).toBe(
      'https://gateway.pinata.cloud/ipfs/QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco'
    )
  })

  it('does not pass an arbitrary external URL through unchanged', () => {
    expect(ipfsToGatewayUrl('https://evil.example.com/pixel.png')).not.toBe(
      'https://evil.example.com/pixel.png'
    )
    expect(ipfsToGatewayUrl('https://evil.example.com/pixel.png')).toBeNull()
  })

  it('returns null for a data: URI', () => {
    expect(ipfsToGatewayUrl('data:text/html,<script>alert(1)</script>')).toBeNull()
  })

  it('returns null for a malformed CID', () => {
    expect(ipfsToGatewayUrl('ipfs://not-a-cid')).toBeNull()
  })

  it('returns null for an empty string', () => {
    expect(ipfsToGatewayUrl('')).toBeNull()
  })
})

describe('formatTimestamp', () => {
  it('formats a known timestamp correctly', () => {
    // 2026-03-19T15:28:00Z
    expect(formatTimestamp(1773934080)).toBe('Mar 19, 2026, 3:28 PM UTC')
  })

  it('handles 0 without throwing', () => {
    expect(() => formatTimestamp(0)).not.toThrow()
  })

  it('handles a future timestamp without throwing', () => {
    expect(() => formatTimestamp(9999999999)).not.toThrow()
  })
})

describe('timeAgo', () => {
  afterEach(() => vi.useRealTimers())

  const freeze = (nowSeconds: number) => {
    vi.useFakeTimers()
    vi.setSystemTime(nowSeconds * 1000)
  }

  it('returns seconds ago', () => {
    freeze(1000)
    expect(timeAgo(955)).toBe('45 seconds ago')
  })

  it('returns singular second', () => {
    freeze(1000)
    expect(timeAgo(999)).toBe('1 second ago')
  })

  it('returns minutes ago', () => {
    freeze(1000)
    expect(timeAgo(880)).toBe('2 minutes ago')
  })

  it('returns hours ago', () => {
    freeze(7200)
    expect(timeAgo(3600)).toBe('1 hour ago')
  })

  it('returns days ago', () => {
    freeze(86400 * 3)
    expect(timeAgo(86400)).toBe('2 days ago')
  })

  it('returns just now for future timestamps', () => {
    freeze(1000)
    expect(timeAgo(2000)).toBe('just now')
  })

  it('handles 0 without throwing', () => {
    freeze(1000)
    expect(() => timeAgo(0)).not.toThrow()
  })
})

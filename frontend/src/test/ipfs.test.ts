import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { IPFSService, IPFSUploadError, isTokenMetadata } from '../services/ipfs'

const VALID_CID = 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco'

describe('isTokenMetadata', () => {
  it('accepts well-formed metadata with a valid ipfs:// image', () => {
    expect(
      isTokenMetadata({ name: 'MyToken', description: 'desc', image: `ipfs://${VALID_CID}` })
    ).toBe(true)
  })

  it('rejects metadata whose image is a non-IPFS URL', () => {
    expect(
      isTokenMetadata({
        name: 'MyToken',
        description: 'desc',
        image: 'https://evil.example.com/pixel.png',
      })
    ).toBe(false)
  })

  it('rejects metadata missing required fields', () => {
    expect(isTokenMetadata({ image: `ipfs://${VALID_CID}` })).toBe(false)
  })

  it('rejects non-object input', () => {
    expect(isTokenMetadata('not an object')).toBe(false)
    expect(isTokenMetadata(null)).toBe(false)
  })
})

describe('IPFSService.getMetadata', () => {
  const service = new IPFSService()

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('rejects metadata with a non-IPFS image field with IPFSUploadError, not silently accepted', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        name: 'EvilToken',
        description: 'desc',
        image: 'https://evil.example.com/pixel.png',
      }),
    } as Response)

    await expect(service.getMetadata(`ipfs://${VALID_CID}`)).rejects.toThrow(IPFSUploadError)
  })

  it('resolves with metadata when the image is a well-formed ipfs:// URI', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ name: 'MyToken', description: 'desc', image: `ipfs://${VALID_CID}` }),
    } as Response)

    await expect(service.getMetadata(`ipfs://${VALID_CID}`)).resolves.toMatchObject({ name: 'MyToken' })
  })

  it('rejects a non-ipfs:// uri before ever fetching', async () => {
    await expect(service.getMetadata('https://example.com/metadata.json')).rejects.toThrow(IPFSUploadError)
    expect(fetch).not.toHaveBeenCalled()
  })
})

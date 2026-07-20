import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { stellarService } from '../services/stellar'
import { ipfsService, type TokenMetadata } from '../services/ipfs'
import { ipfsToGatewayUrl, PLACEHOLDER_TOKEN_IMAGE } from '../utils/formatting'

export const TokenDetail: React.FC = () => {
  const { address } = useParams<{ address: string }>()
  const [token, setToken] = useState<Record<string, unknown> | null>(null)
  const [metadata, setMetadata] = useState<TokenMetadata | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!address) return
    stellarService
      .getTokenInfo(address)
      .then((t) => setToken(t as Record<string, unknown>))
      .catch((err) => setError(err.message || 'Unable to load token'))
  }, [address])

  useEffect(() => {
    const metadataUri = typeof token?.metadataUri === 'string' ? token.metadataUri : undefined
    if (!metadataUri) return
    ipfsService
      .getMetadata(metadataUri)
      // Untrusted metadata that fails validation (e.g. a non-ipfs:// image) is
      // treated as absent rather than surfaced as a page error.
      .then(setMetadata)
      .catch(() => setMetadata(null))
  }, [token])

  const imageUrl = metadata ? ipfsToGatewayUrl(metadata.image) : null

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Token Detail</h2>
      <div className="p-4 rounded-lg border border-gray-300 bg-white">
        {error && <p className="text-red-500">{error}</p>}
        {!token && !error && <p className="text-gray-500">Loading token {address}...</p>}
        {token && (
          <div className="space-y-4">
            <img
              src={imageUrl ?? PLACEHOLDER_TOKEN_IMAGE}
              alt={metadata?.name ?? 'Token'}
              className="h-24 w-24 rounded-lg object-cover bg-gray-100"
            />
            {metadata?.description && <p className="text-sm text-gray-700">{metadata.description}</p>}
            <pre className="text-xs overflow-auto">{JSON.stringify(token, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  )
}

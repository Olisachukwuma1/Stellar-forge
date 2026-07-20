import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { stellarService } from '../services/stellar'
import { ipfsService, type TokenMetadata } from '../services/ipfs'
import { ipfsToGatewayUrl, PLACEHOLDER_TOKEN_IMAGE, truncateAddress } from '../utils/formatting'
import { STELLAR_CONFIG } from '../config/stellar'
import { Card } from './UI/Card'
import { Spinner } from './UI/Spinner'

interface ExplorerToken {
  address: string
  creator: string
  metadataUri?: string
  metadata?: TokenMetadata
}

export const TokenExplorer: React.FC = () => {
  const [tokens, setTokens] = useState<ExplorerToken[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadTokens = useCallback(async () => {
    const factoryContractId = STELLAR_CONFIG.factoryContractId
    if (!factoryContractId) {
      setTokens([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const { events } = await stellarService.getContractEvents(factoryContractId, 50)

      const byAddress = new Map<string, ExplorerToken>()
      for (const event of events) {
        if (event.type === 'token_created' && event.data.tokenAddress) {
          if (!byAddress.has(event.data.tokenAddress)) {
            byAddress.set(event.data.tokenAddress, {
              address: event.data.tokenAddress,
              creator: event.data.creator,
            })
          }
        }
        if (event.type === 'metadata_set' && event.data.tokenAddress) {
          const existing = byAddress.get(event.data.tokenAddress)
          if (existing) existing.metadataUri = event.data.metadataUri
        }
      }

      const list = Array.from(byAddress.values())

      await Promise.all(
        list.map(async (t) => {
          if (!t.metadataUri) return
          try {
            // Metadata is attacker-controlled (any token creator can pin
            // arbitrary JSON), so a validation failure here just means the
            // token renders with no metadata rather than crashing the page.
            t.metadata = await ipfsService.getMetadata(t.metadataUri)
          } catch {
            // ignore - falls back to placeholder image / address-only display
          }
        })
      )

      setTokens(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tokens')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTokens()
  }, [loadTokens])

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 dark:bg-red-950 p-4 text-sm text-red-700 dark:text-red-300">
        {error}
      </div>
    )
  }

  if (tokens.length === 0) {
    return <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">No tokens found.</p>
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {tokens.map((token) => {
        const imageUrl = token.metadata ? ipfsToGatewayUrl(token.metadata.image) : null
        return (
          <Link key={token.address} to={`/tokens/${token.address}`}>
            <Card>
              <div className="flex items-center gap-3">
                <img
                  src={imageUrl ?? PLACEHOLDER_TOKEN_IMAGE}
                  alt={token.metadata?.name ?? 'Token'}
                  className="h-12 w-12 rounded-lg object-cover bg-gray-100 dark:bg-gray-700 shrink-0"
                />
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">
                    {token.metadata?.name ?? truncateAddress(token.address)}
                  </p>
                  {token.metadata?.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {token.metadata.description}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}

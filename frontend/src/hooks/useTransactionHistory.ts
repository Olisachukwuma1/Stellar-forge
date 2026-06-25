import { useState, useEffect, useCallback, useRef } from 'react'

export type TransactionType = 'create' | 'mint' | 'burn' | 'other'

export interface TransactionHistoryItem {
  id: string
  type: TransactionType
  token: string
  amount: string
  date: string
  status: 'success' | 'failed'
  hash: string
}

interface UseTransactionHistoryOptions {
  assetCodes?: string[]
  issuer?: string
  contractIds?: string[]
  pageSize?: number
  pollIntervalMs?: number
}

/** The subset of Horizon's polymorphic operation record shape this hook reads. */
interface HorizonOperationRecord {
  id: string
  type: string
  name?: string
  asset_code?: string
  asset_issuer?: string
  amount?: string
  created_at: string
  transaction_successful: boolean
  transaction_hash: string
}

export function useTransactionHistory(
  publicKey: string | undefined,
  options: UseTransactionHistoryOptions = {},
) {
  const [transactions, setTransactions] = useState<TransactionHistoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const cacheRef = useRef<{ [key: string]: TransactionHistoryItem[] }>({})
  const debounceRef = useRef<number | null>(null)
  const pollRef = useRef<number | null>(null)
  const isMountedRef = useRef(true)

  const pageSize = options.pageSize || 10
  const pollIntervalMs = options.pollIntervalMs ?? 30_000

  const fetchTransactions = useCallback(
    async (reset = false) => {
      if (!publicKey) return
      setLoading(true)
      setError(null)
      try {
        const cacheKey = `${publicKey}-${page}`
        if (cacheRef.current[cacheKey]) {
          setTransactions((prev: TransactionHistoryItem[]) =>
            reset ? cacheRef.current[cacheKey] : [...prev, ...cacheRef.current[cacheKey]],
          )
          setHasMore(cacheRef.current[cacheKey].length === pageSize)
          setLoading(false)
          setLastUpdated(new Date())
          return
        }
        const url = `https://horizon.stellar.org/accounts/${publicKey}/operations?order=desc&limit=${pageSize}&cursor=`
        const resp = await fetch(url)
        if (!resp.ok) throw new Error('Failed to fetch transactions')
        const data = await resp.json()
        const items: TransactionHistoryItem[] = (data._embedded?.records || [])
          .map((op: HorizonOperationRecord) => parseOperation(op, options))
          .filter((item: TransactionHistoryItem | null) => item !== null)
        cacheRef.current[cacheKey] = items
        setTransactions((prev: TransactionHistoryItem[]) => (reset ? items : [...prev, ...items]))
        setHasMore(items.length === pageSize)
        setLastUpdated(new Date())
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    },
    [publicKey, page, pageSize, options],
  )

  // The effects below trigger fetches in response to specific values
  // (publicKey, page, poll interval). They deliberately do NOT depend on
  // `fetchTransactions` itself: its identity changes on every render because
  // `options` is a fresh object each time, so listing it would re-run the
  // effects in a loop. Instead we read the latest fetch function and page from
  // refs, which keeps the dependency arrays honest and exhaustive.
  const fetchRef = useRef(fetchTransactions)
  useEffect(() => {
    fetchRef.current = fetchTransactions
  }, [fetchTransactions])

  const pageRef = useRef(page)
  useEffect(() => {
    pageRef.current = page
  }, [page])

  // Debounce on publicKey change
  useEffect(() => {
    if (!publicKey) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setPage(1)
      setTransactions([])
      fetchRef.current(true)
    }, 400)
  }, [publicKey])

  // Fetch on page change
  useEffect(() => {
    if (page === 1) return
    fetchRef.current()
  }, [page])

  // Polling: re-fetch the first page every pollIntervalMs
  useEffect(() => {
    isMountedRef.current = true
    const id = setInterval(() => {
      if (!publicKey || !isMountedRef.current) return
      if (pageRef.current === 1) {
        cacheRef.current = {}
        fetchRef.current(true)
      }
    }, pollIntervalMs)
    pollRef.current = id
    return () => {
      isMountedRef.current = false
      clearInterval(id)
    }
  }, [publicKey, pollIntervalMs])

  const loadMore = useCallback(() => {
    if (!loading && hasMore) setPage((p: number) => p + 1)
  }, [loading, hasMore])

  const refresh = useCallback(() => {
    cacheRef.current = {}
    setPage(1)
    setTransactions([])
    fetchRef.current(true)
  }, [])

  return { transactions, loading, error, hasMore, loadMore, lastUpdated, refresh }
}

function parseOperation(
  op: HorizonOperationRecord,
  options: UseTransactionHistoryOptions,
): TransactionHistoryItem | null {
  // Filter by operation type and asset/issuer/contract if provided
  // Token creation: manage_data or create_account or custom contract
  // Mint: payment or custom contract
  // Burn: payment with negative amount or custom contract
  // This logic may need to be adapted for your token factory specifics
  let type: TransactionType = 'other'
  let token = ''
  let amount = ''
  if (op.type === 'manage_data' && op.name && op.name.toLowerCase().includes('token')) {
    type = 'create'
    token = op.name
  } else if (op.type === 'payment' && op.asset_code && op.amount) {
    if (Number(op.amount) > 0) {
      type = 'mint'
      token = op.asset_code
      amount = op.amount
    } else if (Number(op.amount) < 0) {
      type = 'burn'
      token = op.asset_code
      amount = op.amount
    }
  } else if (op.type === 'change_trust' && op.asset_code) {
    type = 'create'
    token = op.asset_code
  }
  // Optionally filter by assetCodes, issuer, contractIds
  if (options.assetCodes && token && !options.assetCodes.includes(token)) return null
  if (options.issuer && op.asset_issuer && op.asset_issuer !== options.issuer) return null
  // Add more contractId logic if needed
  if (type === 'other') return null
  return {
    id: op.id,
    type,
    token,
    amount: amount || op.amount || '',
    date: op.created_at,
    status: op.transaction_successful ? 'success' : 'failed',
    hash: op.transaction_hash,
  }
}

import React, { useState, useEffect } from 'react'
import type { Brokerage } from '../../types'
import { getBrokerageIcon } from '../BrokerageIcons'
import { Trash2, ExternalLink, UserPlus } from 'lucide-react'
import { toast } from 'sonner'

// Supported brokerage templates (matching backend)
const SUPPORTED_BROKERAGE_TEMPLATES = [
  { brokerage_type: 'alpaca', name: 'Alpaca (Live)', type: 'broker' as const },
  { brokerage_type: 'alpaca-paper', name: 'Alpaca (Paper)', type: 'broker' as const },
  { brokerage_type: 'ibkr', name: 'Interactive Brokers', type: 'broker' as const },
  { brokerage_type: 'simplefx', name: 'SimpleFX', type: 'broker' as const },
  { brokerage_type: 'oanda', name: 'OANDA', type: 'forex' as const },
]

// Registration links for brokerages
const brokerageRegistrationLinks: Record<string, { url: string; hasReferral?: boolean }> = {
  alpaca: { url: 'https://app.alpaca.markets/signup', hasReferral: false },
  'alpaca-paper': { url: 'https://app.alpaca.markets/signup', hasReferral: false },
  ibkr: { url: 'https://www.interactivebrokers.com/en/home.php', hasReferral: false },
  simplefx: { url: 'https://simplefx.com/', hasReferral: false },
  oanda: { url: 'https://www.oanda.com/', hasReferral: false },
}

interface BrokerageConfigModalProps {
  allBrokerages: Brokerage[]
  editingBrokerageId: string | null
  onSave: (
    brokerageId: string | null,
    brokerageType: string,
    accountName: string,
    apiKey: string,
    secretKey?: string,
  ) => Promise<void>
  onDelete: (brokerageId: string) => void
  onClose: () => void
}

export function BrokerageConfigModal({
  allBrokerages,
  editingBrokerageId,
  onSave,
  onDelete,
  onClose,
}: BrokerageConfigModalProps) {
  const [selectedBrokerageType, setSelectedBrokerageType] = useState('')
  const [accountName, setAccountName] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [secretKey, setSecretKey] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Get existing brokerage if editing
  const selectedBrokerage = editingBrokerageId
    ? allBrokerages?.find((e) => e.id === editingBrokerageId)
    : null

  // Get template for UI display - fall back to exchange_type if brokerage_type is missing
  const editingBrokerageTypeRaw = selectedBrokerage?.brokerage_type || (selectedBrokerage as any)?.exchange_type
  const selectedTemplate = editingBrokerageId
    ? SUPPORTED_BROKERAGE_TEMPLATES.find((t) => t.brokerage_type === editingBrokerageTypeRaw) ||
    { brokerage_type: editingBrokerageTypeRaw || 'alpaca-paper', name: selectedBrokerage?.name || 'Exchange', type: 'broker' as const }
    : SUPPORTED_BROKERAGE_TEMPLATES.find((t) => t.brokerage_type === selectedBrokerageType)

  const currentBrokerageType = editingBrokerageId
    ? editingBrokerageTypeRaw
    : selectedBrokerageType

  // Initialize form when editing
  useEffect(() => {
    if (editingBrokerageId && selectedBrokerage) {
      // Handle both camelCase and snake_case field names from API
      const accountNameValue = selectedBrokerage.account_name || (selectedBrokerage as any).accountName || ''
      setAccountName(accountNameValue)
      // API doesn't return actual credentials for security - leave empty for re-entry
      // but show that credentials are configured if the brokerage is enabled
      setApiKey('')
      setSecretKey('')
    } else {
      // Reset form when creating new
      setAccountName('')
      setApiKey('')
      setSecretKey('')
    }
  }, [editingBrokerageId, selectedBrokerage])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSaving) return

    if (!editingBrokerageId && !selectedBrokerageType) return

    const trimmedAccountName = accountName.trim()
    if (!trimmedAccountName) {
      toast.error('Please enter account name')
      return
    }

    // For new brokerages, require API key
    // For editing, allow empty to keep existing credentials
    if (!editingBrokerageId && !apiKey.trim()) {
      toast.error('Please enter API Key')
      return
    }

    setIsSaving(true)
    try {
      await onSave(
        editingBrokerageId || null,
        currentBrokerageType || '',
        trimmedAccountName,
        apiKey.trim(),
        secretKey.trim() || undefined
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className="rounded-lg w-full max-w-lg"
        style={{ background: 'rgba(22, 27, 34, 0.88)' }}
      >
        <div className="flex items-center justify-between p-6 pb-4">
          <h3 className="text-xl font-bold" style={{ color: '#F9FAFB' }}>
            {editingBrokerageId ? 'Edit Brokerage' : 'Add Brokerage'}
          </h3>
          {editingBrokerageId && (
            <button
              type="button"
              onClick={() => onDelete(editingBrokerageId)}
              className="p-2 rounded hover:bg-red-100 transition-colors"
              style={{ background: 'rgba(246, 70, 93, 0.1)', color: '#F6465D' }}
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          {/* Brokerage Type Selection */}
          {!editingBrokerageId && (
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#F9FAFB' }}>
                Select Brokerage
              </label>
              <select
                value={selectedBrokerageType}
                onChange={(e) => setSelectedBrokerageType(e.target.value)}
                className="w-full px-3 py-2 rounded"
                style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB' }}
                required
              >
                <option value="">Select a brokerage...</option>
                {SUPPORTED_BROKERAGE_TEMPLATES.map((template) => (
                  <option key={template.brokerage_type} value={template.brokerage_type}>
                    {template.name} ({template.type.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Selected Brokerage Info */}
          {selectedTemplate && (
            <div className="p-4 rounded" style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 flex items-center justify-center">
                  {getBrokerageIcon(selectedTemplate.brokerage_type, { width: 32, height: 32 })}
                </div>
                <div>
                  <div className="font-semibold" style={{ color: '#F9FAFB' }}>
                    {selectedTemplate.name}
                  </div>
                  <div className="text-xs" style={{ color: '#9CA3AF' }}>
                    {selectedTemplate.type.toUpperCase()}
                  </div>
                </div>
              </div>

              {/* Registration Link */}
              {brokerageRegistrationLinks[currentBrokerageType || ''] && (
                <a
                  href={brokerageRegistrationLinks[currentBrokerageType || ''].url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-lg transition-all hover:scale-[1.02]"
                  style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.2)' }}
                >
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                    <span className="text-sm" style={{ color: '#F9FAFB' }}>
                      No account? Register here
                    </span>
                  </div>
                  <ExternalLink className="w-4 h-4" style={{ color: '#9CA3AF' }} />
                </a>
              )}
            </div>
          )}

          {/* Account Name */}
          {selectedTemplate && (
            <>
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#F9FAFB' }}>
                  Account Name *
                </label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="e.g., Main Trading Account"
                  className="w-full px-3 py-2 rounded"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB' }}
                  required
                />
              </div>

              {/* API Key */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#F9FAFB' }}>
                  API Key *
                  {editingBrokerageId && selectedBrokerage?.masked_api_key && (
                    <span className="ml-2 text-xs font-normal" style={{ color: '#22C55E' }}>✓ Configured</span>
                  )}
                </label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={editingBrokerageId && selectedBrokerage?.masked_api_key 
                    ? `Current: ${selectedBrokerage.masked_api_key} (enter new to update)` 
                    : "Enter API Key"}
                  className="w-full px-3 py-2 rounded"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB' }}
                  required={!editingBrokerageId}
                />
                {editingBrokerageId && selectedBrokerage?.masked_api_key && (
                  <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                    Current key: <span style={{ color: '#22C55E', fontFamily: 'monospace' }}>{selectedBrokerage.masked_api_key}</span> — Leave empty to keep
                  </p>
                )}
              </div>

              {/* Secret Key */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#F9FAFB' }}>
                  Secret Key {currentBrokerageType?.includes('alpaca') ? '*' : '(Optional)'}
                  {editingBrokerageId && selectedBrokerage?.masked_secret_key && (
                    <span className="ml-2 text-xs font-normal" style={{ color: '#22C55E' }}>✓ Configured</span>
                  )}
                </label>
                <input
                  type="text"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  placeholder={editingBrokerageId && selectedBrokerage?.masked_secret_key 
                    ? `Current: ${selectedBrokerage.masked_secret_key} (enter new to update)` 
                    : "Enter Secret Key"}
                  className="w-full px-3 py-2 rounded"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB' }}
                  required={currentBrokerageType?.includes('alpaca') && !editingBrokerageId}
                />
                {editingBrokerageId && selectedBrokerage?.masked_secret_key && (
                  <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                    Current key: <span style={{ color: '#22C55E', fontFamily: 'monospace' }}>{selectedBrokerage.masked_secret_key}</span> — Leave empty to keep
                  </p>
                )}
              </div>

              {/* Alpaca-specific info */}
              {currentBrokerageType?.includes('alpaca') && (
                <div className="p-3 rounded text-sm" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#9CA3AF' }}>
                  <strong style={{ color: 'var(--primary)' }}>Alpaca API Setup:</strong>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Log in to app.alpaca.markets</li>
                    <li>Go to Paper Trading or Live Trading</li>
                    <li>Generate new API keys</li>
                    <li>Copy API Key ID and Secret Key here</li>
                  </ol>
                </div>
              )}
            </>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded text-sm font-semibold"
              style={{ background: 'rgba(255, 255, 255, 0.08)', color: '#9CA3AF' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !selectedTemplate}
              className="flex-1 px-4 py-2 rounded text-sm font-semibold transition-all hover:scale-105 disabled:opacity-50"
              style={{ background: 'var(--primary)', color: '#000' }}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

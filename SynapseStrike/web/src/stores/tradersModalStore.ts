import { create } from 'zustand'
import type { TraderConfigData } from '../types'

interface TradersModalState {
  // Modal showstatus
  showCreateModal: boolean
  showEditModal: boolean
  showModelModal: boolean
  showBrokerageModal: boolean

  // editstatus
  editingModel: string | null
  editingBrokerage: string | null
  editingTrader: TraderConfigData | null

  // Actions
  setShowCreateModal: (show: boolean) => void
  setShowEditModal: (show: boolean) => void
  setShowModelModal: (show: boolean) => void
  setShowBrokerageModal: (show: boolean) => void

  setEditingModel: (modelId: string | null) => void
  setEditingBrokerage: (brokerageId: string | null) => void
  setEditingTrader: (trader: TraderConfigData | null) => void

  // convenience method
  openModelModal: (modelId?: string) => void
  closeModelModal: () => void
  openBrokerageModal: (brokerageId?: string) => void
  closeBrokerageModal: () => void

  // reset
  reset: () => void
}

const initialState = {
  showCreateModal: false,
  showEditModal: false,
  showModelModal: false,
  showBrokerageModal: false,
  editingModel: null,
  editingBrokerage: null,
  editingTrader: null,
}

export const useTradersModalStore = create<TradersModalState>((set) => ({
  ...initialState,

  setShowCreateModal: (show) => set({ showCreateModal: show }),
  setShowEditModal: (show) => set({ showEditModal: show }),
  setShowModelModal: (show) => set({ showModelModal: show }),
  setShowBrokerageModal: (show) => set({ showBrokerageModal: show }),

  setEditingModel: (modelId) => set({ editingModel: modelId }),
  setEditingBrokerage: (brokerageId) => set({ editingBrokerage: brokerageId }),
  setEditingTrader: (trader) => set({ editingTrader: trader }),

  openModelModal: (modelId) => {
    set({ editingModel: modelId || null, showModelModal: true })
  },

  closeModelModal: () => {
    set({ showModelModal: false, editingModel: null })
  },

  openBrokerageModal: (brokerageId) => {
    set({ editingBrokerage: brokerageId || null, showBrokerageModal: true })
  },

  closeBrokerageModal: () => {
    set({ showBrokerageModal: false, editingBrokerage: null })
  },

  reset: () => set(initialState),
}))

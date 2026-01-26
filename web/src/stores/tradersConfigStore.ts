import { create } from 'zustand'
import type { AIModel, Brokerage } from '../types'
import { api } from '../lib/api'

interface TradersConfigState {
  // data
  allModels: AIModel[]
  allBrokerages: Brokerage[]
  supportedModels: AIModel[]
  supportedBrokerages: Brokerage[]

  // computed property
  configuredModels: AIModel[]
  configuredBrokerages: Brokerage[]

  // Actions
  setAllModels: (models: AIModel[]) => void
  setAllBrokerages: (brokerages: Brokerage[]) => void
  setSupportedModels: (models: AIModel[]) => void
  setSupportedBrokerages: (brokerages: Brokerage[]) => void

  // asyncLoad
  loadConfigs: (user: any, token: string | null) => Promise<void>

  // reset
  reset: () => void
}

const initialState = {
  allModels: [],
  allBrokerages: [],
  supportedModels: [],
  supportedBrokerages: [],
  configuredModels: [],
  configuredBrokerages: [],
}

export const useTradersConfigStore = create<TradersConfigState>((set, get) => ({
  ...initialState,

  setAllModels: (models) => {
    set({ allModels: models })
    // Update configuredModels
    const configuredModels = models.filter((m) => {
      return m.enabled || (m.customApiUrl && m.customApiUrl.trim() !== '')
    })
    set({ configuredModels })
  },

  setAllBrokerages: (brokerages) => {
    set({ allBrokerages: brokerages })
    // Update configuredBrokerages - for stock brokerages, just check enabled
    const configuredBrokerages = brokerages.filter((e) => e.enabled)
    set({ configuredBrokerages })
  },

  setSupportedModels: (models) => set({ supportedModels: models }),
  setSupportedBrokerages: (brokerages) => set({ supportedBrokerages: brokerages }),

  loadConfigs: async (user, token) => {
    if (!user || !token) {
      // notLoginwhenonlyLoadpublic'ssupportmodelandbrokerage
      try {
        const [supportedModels, supportedBrokerages] = await Promise.all([
          api.getSupportedModels(),
          api.getSupportedBrokerages(),
        ])
        get().setSupportedModels(supportedModels)
        get().setSupportedBrokerages(supportedBrokerages)
      } catch (err) {
        console.error('Failed to load supported configs:', err)
      }
      return
    }

    try {
      const [
        modelConfigs,
        brokerageConfigs,
        supportedModels,
        supportedBrokerages,
      ] = await Promise.all([
        api.getModelConfigs(),
        api.getBrokerageConfigs(),
        api.getSupportedModels(),
        api.getSupportedBrokerages(),
      ])

      get().setAllModels(modelConfigs)
      get().setAllBrokerages(brokerageConfigs)
      get().setSupportedModels(supportedModels)
      get().setSupportedBrokerages(supportedBrokerages)
    } catch (error) {
      console.error('Failed to load configs:', error)
    }
  },

  reset: () => set(initialState),
}))

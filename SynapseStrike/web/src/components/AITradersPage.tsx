import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useSWR from 'swr'
import { api } from '../lib/api'
import type {
  TraderInfo,
  CreateTraderRequest,
  AIModel,
  Brokerage,
} from '../types'
import { useLanguage } from '../contexts/LanguageContext'
import { t, type Language } from '../i18n/translations'
import { useAuth } from '../contexts/AuthContext'
import { getBrokerageIcon } from './BrokerageIcons'
import { getModelIcon } from './ModelIcons'
import { TraderConfigModal } from './TraderConfigModal'
import { BrokerageConfigModal } from './traders/BrokerageConfigModal'
import { PunkAvatar, getTraderAvatar } from './PunkAvatar'
import {
  Bot,
  Brain,
  Landmark,
  BarChart3,
  Trash2,
  Plus,
  Users,
  Pencil,
  Eye,
  EyeOff,
  ExternalLink,
} from 'lucide-react'
import { confirmToast } from '../lib/notify'
import { toast } from 'sonner'

// getfriendly'sAImodelname
function getModelDisplayName(modelId: string): string {
  switch (modelId.toLowerCase()) {
    case 'deepseek':
      return 'DeepSeek'
    case 'qwen':
      return 'Qwen'
    case 'claude':
      return 'Claude'
    case 'openai':
      return 'OpenAI'
    case 'gemini':
      return 'Gemini'
    case 'grok':
      return 'Grok'
    case 'kimi':
      return 'Kimi'
    case 'localai':
      return 'Local AI'
    case 'localfunc':
      return 'Smart Function'
    case 'architect':
      return 'Architect'
    default:
      return modelId.toUpperCase()
  }
}

// Extract name after underscore
function getShortName(fullName: string): string {
  const parts = fullName.split('_')
  return parts.length > 1 ? parts[parts.length - 1] : fullName
}

// AI Provider configuration - default models and API links
const AI_PROVIDER_CONFIG: Record<string, {
  defaultModel: string
  apiUrl: string
  apiName: string
}> = {
  deepseek: {
    defaultModel: 'deepseek-chat',
    apiUrl: 'https://platform.deepseek.com/api_keys',
    apiName: 'DeepSeek',
  },
  qwen: {
    defaultModel: 'qwen3-max',
    apiUrl: 'https://dashscope.console.aliyun.com/apiKey',
    apiName: 'Alibaba Cloud',
  },
  openai: {
    defaultModel: 'gpt-5.2',
    apiUrl: 'https://platform.openai.com/api-keys',
    apiName: 'OpenAI',
  },
  claude: {
    defaultModel: 'claude-opus-4-5-20251101',
    apiUrl: 'https://console.anthropic.com/settings/keys',
    apiName: 'Anthropic',
  },
  gemini: {
    defaultModel: 'gemini-3-pro-preview',
    apiUrl: 'https://aistudio.google.com/app/apikey',
    apiName: 'Google AI Studio',
  },
  grok: {
    defaultModel: 'grok-3-latest',
    apiUrl: 'https://console.x.ai/',
    apiName: 'xAI',
  },
  kimi: {
    defaultModel: 'moonshot-v1-auto',
    apiUrl: 'https://platform.moonshot.ai/console/api-keys',
    apiName: 'Moonshot',
  },
  architect: {
    defaultModel: 'architect-ai',
    apiUrl: 'http://10.0.0.247:8065/api',
    apiName: 'Architect AI',
  },
}

interface AITradersPageProps {
  onTraderSelect?: (traderId: string) => void
}

// Helper function to get brokerage display name from brokerage ID (UUID)
function getBrokerageDisplayName(brokerageId: string | undefined, brokerages: Brokerage[]): string {
  if (!brokerageId) return 'Unknown'
  const brokerage = brokerages.find(e => e.id === brokerageId)
  if (!brokerage) return brokerageId.substring(0, 8).toUpperCase() + '...' // Show truncated UUID if not found
  const typeName = brokerage.brokerage_type?.toUpperCase() || brokerage.name
  return brokerage.account_name ? `${typeName} - ${brokerage.account_name}` : typeName
}

export function AITradersPage({ onTraderSelect }: AITradersPageProps) {
  const { language } = useLanguage()
  const { user, token } = useAuth()
  const navigate = useNavigate()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showModelModal, setShowModelModal] = useState(false)
  const [showBrokerageModal, setShowBrokerageModal] = useState(false)
  const [editingModel, setEditingModel] = useState<string | null>(null)
  const [editingBrokerage, setEditingBrokerage] = useState<string | null>(null)
  const [editingTrader, setEditingTrader] = useState<any>(null)
  const [allModels, setAllModels] = useState<AIModel[]>([])
  const [allBrokerages, setAllBrokerages] = useState<Brokerage[]>([])
  const [supportedModels, setSupportedModels] = useState<AIModel[]>([])
  const [supportedBrokerages, setSupportedBrokerages] = useState<Brokerage[]>([])

  const { data: traders, mutate: mutateTraders, isLoading: isTradersLoading } = useSWR<TraderInfo[]>(
    user && token ? 'traders' : null,
    api.getTraders,
    { refreshInterval: 5000 }
  )

  // Fetch market status - refresh every 30 seconds
  const { data: marketStatus } = useSWR<{
    is_open: boolean
    current_time: string
    market_hours: string
  }>(
    'market-status',
    api.getMarketStatus,
    { refreshInterval: 30000 }
  )

  // LoadAImodelandbrokerageconfig
  useEffect(() => {
    const loadConfigs = async () => {
      if (!user || !token) {
        // notLoginwhenonlyLoadpublic'ssupportmodelandbrokerage
        try {
          const [supportedModels, supportedBrokerages] = await Promise.all([
            api.getSupportedModels(),
            api.getSupportedBrokerages(),
          ])
          setSupportedModels(supportedModels)
          setSupportedBrokerages(supportedBrokerages)
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
        setAllModels(modelConfigs)
        setAllBrokerages(brokerageConfigs)
        setSupportedModels(supportedModels)
        setSupportedBrokerages(supportedBrokerages)
      } catch (error) {
        console.error('Failed to load configs:', error)
      }
    }
    loadConfigs()
  }, [user, token])

  // onlyshowalreadyconfig'smodelandbrokerage
  // note：backendreturn'sdatanotpackagecontainsensitiveinfo（apiKeyetc），allwithdetermine by other fieldswhetheralreadyconfig
  const configuredModels =
    allModels?.filter((m) => {
      // ifmodelalreadyenabled，explanationalreadyconfig
      // orwhohascustomAPI URL，alsoexplanationalreadyconfig
      return m.enabled || (m.customApiUrl && m.customApiUrl.trim() !== '')
    }) || []
  const configuredBrokerages =
    allBrokerages?.filter((e) => {
      // For stock brokerages: if enabled, it's configured
      return e.enabled
    }) || []

  // onlyatCreate TraderwhenUsealreadyenabled andconfigcomplete's
  const enabledModels = allModels?.filter((m) => m.enabled) || []
  const enabledBrokerages =
    allBrokerages?.filter((e) => e.enabled) || []

  // checkmodelis runningatisRunning'straderUse（used forUIdisabled）
  const isModelInUse = (modelId: string) => {
    return traders?.some((t) => t.ai_model === modelId && t.is_running)
  }

  // checkbrokerageis runningatisRunning'straderUse（used forUIdisabled）
  const isBrokerageInUse = (brokerageId: string) => {
    return traders?.some((t) => t.brokerage_id === brokerageId && t.is_running)
  }

  // checkmodelwhetherisanytraderUse（including stopped status's）
  const isModelUsedByAnyTrader = (modelId: string) => {
    return traders?.some((t) => t.ai_model === modelId) || false
  }

  // checkbrokeragewhetherisanytraderUse（including stopped status's）
  const isBrokerageUsedByAnyTrader = (brokerageId: string) => {
    return traders?.some((t) => t.brokerage_id === brokerageId) || false
  }

  // getUsespecificmodel'strader list
  const getTradersUsingModel = (modelId: string) => {
    return traders?.filter((t) => t.ai_model === modelId) || []
  }

  // getUsespecificbrokerage'strader list
  const getTradersUsingBrokerage = (brokerageId: string) => {
    return traders?.filter((t) => t.brokerage_id === brokerageId) || []
  }

  const handleCreateTrader = async (data: CreateTraderRequest) => {
    try {
      const model = allModels?.find((m) => m.id === data.ai_model_id)
      const brokerage = allBrokerages?.find((e) => e.id === data.brokerage_id)

      if (!model?.enabled) {
        toast.error(t('modelNotConfigured', language))
        return
      }

      if (!brokerage?.enabled) {
        toast.error(t('brokerageNotConfigured', language))
        return
      }

      await toast.promise(api.createTrader(data), {
        loading: 'Creating...',
        success: 'Creation successful',
        error: 'Creation failed',
      })
      setShowCreateModal(false)
      // Immediately refresh traders list for better UX
      await mutateTraders()
    } catch (error) {
      console.error('Failed to create trader:', error)
      toast.error(t('createTraderFailed', language))
    }
  }

  const handleEditTrader = async (traderId: string) => {
    try {
      const traderConfig = await api.getTraderConfig(traderId)
      setEditingTrader(traderConfig)
      setShowEditModal(true)
    } catch (error) {
      console.error('Failed to fetch trader config:', error)
      toast.error(t('getTraderConfigFailed', language))
    }
  }

  const handleSaveEditTrader = async (data: CreateTraderRequest) => {
    console.log('🔥🔥🔥 handleSaveEditTrader CALLED with data:', data)
    if (!editingTrader) return

    try {
      const model = enabledModels?.find((m) => m.id === data.ai_model_id)
      const brokerage = enabledBrokerages?.find((e) => e.id === data.brokerage_id)

      if (!model) {
        toast.error(t('modelConfigNotExist', language))
        return
      }

      if (!brokerage) {
        toast.error(t('brokerageConfigNotExist', language))
        return
      }

      const request = {
        name: data.name,
        ai_model_id: data.ai_model_id,
        brokerage_id: data.brokerage_id,
        strategy_id: data.strategy_id,
        initial_balance: data.initial_balance,
        scan_interval_minutes: data.scan_interval_minutes,
        is_cross_margin: data.is_cross_margin,
        show_in_competition: data.show_in_competition,
        trade_only_market_hours: data.trade_only_market_hours,
      }

      console.log('🔥 handleSaveEditTrader - data:', data)
      console.log('🔥 handleSaveEditTrader - data.strategy_id:', data.strategy_id)
      console.log('🔥 handleSaveEditTrader - request:', request)

      await toast.promise(api.updateTrader(editingTrader.trader_id, request), {
        loading: 'Saving...',
        success: 'Save successful',
        error: 'Save failed',
      })
      setShowEditModal(false)
      setEditingTrader(null)
      // Immediately refresh traders list for better UX
      await mutateTraders()
    } catch (error) {
      console.error('Failed to update trader:', error)
      toast.error(t('updateTraderFailed', language))
    }
  }

  const handleDeleteTrader = async (traderId: string) => {
    {
      const ok = await confirmToast(t('confirmDeleteTrader', language))
      if (!ok) return
    }

    try {
      await toast.promise(api.deleteTrader(traderId), {
        loading: 'Deleting...',
        success: 'Deleted successfully',
        error: 'Failed to delete',
      })

      // Immediately refresh traders list for better UX
      await mutateTraders()
    } catch (error) {
      console.error('Failed to delete trader:', error)
      toast.error(t('deleteTraderFailed', language))
    }
  }

  const handleToggleTrader = async (traderId: string, running: boolean) => {
    try {
      if (running) {
        await toast.promise(api.stopTrader(traderId), {
          loading: 'Stopping...',
          success: 'Stopped',
          error: 'Failed to stop',
        })
      } else {
        await toast.promise(api.startTrader(traderId), {
          loading: 'Starting...',
          success: 'Started',
          error: 'Failed to start',
        })
      }

      // Immediately refresh traders list to update running status
      await mutateTraders()
    } catch (error) {
      console.error('Failed to toggle trader:', error)
      toast.error(t('operationFailed', language))
    }
  }

  const handleToggleCompetition = async (traderId: string, currentShowInCompetition: boolean) => {
    try {
      const newValue = !currentShowInCompetition
      await toast.promise(api.toggleCompetition(traderId, newValue), {
        loading: 'Updating...',
        success: newValue ? 'Now visible in competition' : 'Hidden from competition',
        error: 'Failed to update',
      })

      // Immediately refresh traders list to update status
      await mutateTraders()
    } catch (error) {
      console.error('Failed to toggle competition visibility:', error)
      toast.error(t('operationFailed', language))
    }
  }

  const handleModelClick = (modelId: string) => {
    if (!isModelInUse(modelId)) {
      setEditingModel(modelId)
      setShowModelModal(true)
    }
  }

  const handleBrokerageClick = (brokerageId: string) => {
    if (!isBrokerageInUse(brokerageId)) {
      setEditingBrokerage(brokerageId)
      setShowBrokerageModal(true)
    }
  }

  // generaldeleteconfighandlefunction
  const handleDeleteConfig = async <T extends { id: string }>(config: {
    id: string
    type: 'model' | 'brokerage'
    checkInUse: (id: string) => boolean
    getUsingTraders: (id: string) => any[]
    cannotDeleteKey: string
    confirmDeleteKey: string
    allItems: T[] | undefined
    clearFields: (item: T) => T
    buildRequest: (items: T[]) => any
    updateApi: (request: any) => Promise<void>
    refreshApi: () => Promise<T[]>
    setItems: (items: T[]) => void
    closeModal: () => void
    errorKey: string
  }) => {
    // check if hastraderrunningatUse
    if (config.checkInUse(config.id)) {
      const usingTraders = config.getUsingTraders(config.id)
      const traderNames = usingTraders.map((t) => t.trader_name).join(', ')
      toast.error(
        `${t(config.cannotDeleteKey, language)} · ${t('tradersUsing', language)}: ${traderNames} · ${t('pleaseDeleteTradersFirst', language)}`
      )
      return
    }

    {
      const ok = await confirmToast(t(config.confirmDeleteKey, language))
      if (!ok) return
    }

    try {
      const updatedItems =
        config.allItems?.map((item) =>
          item.id === config.id ? config.clearFields(item) : item
        ) || []

      const request = config.buildRequest(updatedItems)
      await toast.promise(config.updateApi(request), {
        loading: 'Updating config...',
        success: 'Config updated',
        error: 'Failed to update config',
      })

      // Refresh user config to ensure data sync
      const refreshedItems = await config.refreshApi()
      config.setItems(refreshedItems)

      config.closeModal()
    } catch (error) {
      console.error(`Failed to delete ${config.type} config:`, error)
      toast.error(t(config.errorKey, language))
    }
  }

  const handleDeleteModelConfig = async (modelId: string) => {
    await handleDeleteConfig({
      id: modelId,
      type: 'model',
      checkInUse: isModelUsedByAnyTrader,
      getUsingTraders: getTradersUsingModel,
      cannotDeleteKey: 'cannotDeleteModelInUse',
      confirmDeleteKey: 'confirmDeleteModel',
      allItems: allModels,
      clearFields: (m) => ({
        ...m,
        apiKey: '',
        customApiUrl: '',
        customModelName: '',
        enabled: false,
      }),
      buildRequest: (models) => ({
        models: Object.fromEntries(
          models.map((model) => [
            model.provider,
            {
              enabled: model.enabled,
              api_key: model.apiKey || '',
              custom_api_url: model.customApiUrl || '',
              custom_model_name: model.customModelName || '',
            },
          ])
        ),
      }),
      updateApi: api.updateModelConfigs,
      refreshApi: api.getModelConfigs,
      setItems: (items) => {
        // UsefunctionmodeUpdateensurestatuscorrectUpdate
        setAllModels([...items])
      },
      closeModal: () => {
        setShowModelModal(false)
        setEditingModel(null)
      },
      errorKey: 'deleteConfigFailed',
    })
  }

  const handleSaveModelConfig = async (
    modelId: string,
    apiKey: string,
    customApiUrl?: string,
    customModelName?: string
  ) => {
    try {
      // createorUpdateuser'smodelconfig
      const existingModel = allModels?.find((m) => m.id === modelId)
      let updatedModels

      // find toconfig'smodel（Priorityfromalreadyconfiglist，secondlyfromsupportlist）
      const modelToUpdate =
        existingModel || supportedModels?.find((m) => m.id === modelId)
      if (!modelToUpdate) {
        toast.error(t('modelNotExist', language))
        return
      }

      if (existingModel) {
        // Updateexistingconfig
        updatedModels =
          allModels?.map((m) =>
            m.id === modelId
              ? {
                ...m,
                apiKey,
                customApiUrl: customApiUrl || '',
                customModelName: customModelName || '',
                enabled: true,
              }
              : m
          ) || []
      } else {
        // addnewconfig
        const newModel = {
          ...modelToUpdate,
          apiKey,
          customApiUrl: customApiUrl || '',
          customModelName: customModelName || '',
          enabled: true,
        }
        updatedModels = [...(allModels || []), newModel]
      }

      const request = {
        models: Object.fromEntries(
          updatedModels.map((model) => [
            model.provider, // Use provider butis not id
            {
              enabled: model.enabled,
              api_key: model.apiKey || '',
              custom_api_url: model.customApiUrl || '',
              custom_model_name: model.customModelName || '',
            },
          ])
        ),
      }

      await toast.promise(api.updateModelConfigs(request), {
        loading: 'Updating model config...',
        success: 'Model config updated',
        error: 'Failed to update model config',
      })

      // Refresh user config to ensure data sync
      const refreshedModels = await api.getModelConfigs()
      setAllModels(refreshedModels)

      setShowModelModal(false)
      setEditingModel(null)
    } catch (error) {
      console.error('Failed to save model config:', error)
      toast.error(t('saveConfigFailed', language))
    }
  }

  const handleDeleteBrokerageConfig = async (brokerageId: string) => {
    // check if hastraderatUsethisbrokerageaccount
    if (isBrokerageUsedByAnyTrader(brokerageId)) {
      const tradersUsing = getTradersUsingBrokerage(brokerageId)
      toast.error(
        `${t('cannotDeleteBrokerageInUse', language)}: ${tradersUsing.join(', ')}`
      )
      return
    }

    // Confirm Delete
    const ok = await confirmToast(t('confirmDeleteBrokerage', language))
    if (!ok) return

    try {
      await toast.promise(api.deleteBrokerage(brokerageId), {
        loading: false ? 'Deleting brokerage account...' : 'Deleting brokerage account...',
        success: false ? 'brokerageaccountalreadydelete' : 'Brokerage account deleted',
        error: false ? 'deletebrokerageaccountfailed' : 'Failed to delete brokerage account',
      })

      // re-getuserconfigwithensuredataSync
      const refreshedBrokerages = await api.getBrokerageConfigs()
      setAllBrokerages(refreshedBrokerages)

      setShowBrokerageModal(false)
      setEditingBrokerage(null)
    } catch (error) {
      console.error('Failed to delete brokerage config:', error)
      toast.error(t('deleteBrokerageConfigFailed', language))
    }
  }

  const handleSaveBrokerageConfig = async (
    brokerageId: string | null, // null for creating new account
    brokerageType: string,
    accountName: string,
    apiKey: string,
    secretKey?: string,
    passphrase?: string,
    testnet?: boolean,
    hyperliquidWalletAddr?: string,
    asterUser?: string,
    asterSigner?: string,
    asterPrivateKey?: string,
    lighterWalletAddr?: string,
    lighterPrivateKey?: string,
    lighterApiKeyPrivateKey?: string,
    lighterApiKeyIndex?: number
  ) => {
    try {
      if (brokerageId) {
        // Updateexistingaccountconfig
        const existingBrokerage = allBrokerages?.find((e) => e.id === brokerageId)
        if (!existingBrokerage) {
          toast.error(t('brokerageNotExist', language))
          return
        }

        const request = {
          brokerages: {
            [brokerageId]: {
              enabled: true,
              api_key: apiKey || '',
              secret_key: secretKey || '',
              passphrase: passphrase || '',
              testnet: testnet || false,
              hyperliquid_wallet_addr: hyperliquidWalletAddr || '',
              aster_user: asterUser || '',
              aster_signer: asterSigner || '',
              aster_private_key: asterPrivateKey || '',
              lighter_wallet_addr: lighterWalletAddr || '',
              lighter_private_key: lighterPrivateKey || '',
              lighter_api_key_private_key: lighterApiKeyPrivateKey || '',
              lighter_api_key_index: lighterApiKeyIndex || 0,
            },
          },
        }

        await toast.promise(api.updateBrokerageConfigsEncrypted(request), {
          loading: false ? 'Updating brokerage config...' : 'Updating brokerage config...',
          success: false ? 'brokerageconfigalreadyUpdate' : 'Brokerage config updated',
          error: false ? 'Updatebrokerageconfigfailed' : 'Failed to update brokerage config',
        })
      } else {
        // createnewaccount
        const createRequest = {
          exchange_type: brokerageType,
          account_name: accountName,
          enabled: true,
          api_key: apiKey || '',
          secret_key: secretKey || '',
          passphrase: passphrase || '',
          testnet: testnet || false,
          hyperliquid_wallet_addr: hyperliquidWalletAddr || '',
          aster_user: asterUser || '',
          aster_signer: asterSigner || '',
          aster_private_key: asterPrivateKey || '',
          lighter_wallet_addr: lighterWalletAddr || '',
          lighter_private_key: lighterPrivateKey || '',
          lighter_api_key_private_key: lighterApiKeyPrivateKey || '',
          lighter_api_key_index: lighterApiKeyIndex || 0,
        }

        await toast.promise(api.createBrokerageEncrypted(createRequest), {
          loading: false ? 'Creating brokerage account...' : 'Creating brokerage account...',
          success: false ? 'brokerageaccountalreadycreate' : 'Brokerage account created',
          error: false ? 'createbrokerageaccountfailed' : 'Failed to create brokerage account',
        })
      }

      // re-getuserconfigwithensuredataSync
      const refreshedBrokerages = await api.getBrokerageConfigs()
      setAllBrokerages(refreshedBrokerages)

      setShowBrokerageModal(false)
      setEditingBrokerage(null)
    } catch (error) {
      console.error('Failed to save brokerage config:', error)
      toast.error(t('saveConfigFailed', language))
    }
  }

  const handleAddModel = () => {
    setEditingModel(null)
    setShowModelModal(true)
  }

  const handleAddBrokerage = () => {
    setEditingBrokerage(null)
    setShowBrokerageModal(true)
  }

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-0">
        <div className="flex items-center gap-3 md:gap-4">
          <div
            className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary) 100%)',
              boxShadow: '0 4px 14px var(--primary-bg, 0.4)',
            }}
          >
            <Bot className="w-5 h-5 md:w-6 md:h-6" style={{ color: '#000' }} />
          </div>
          <div>
            <h1
              className="text-xl md:text-2xl font-bold flex items-center gap-2"
              style={{ color: '#F9FAFB' }}
            >
              {t('aiTraders', language)}
              <span
                className="text-xs font-normal px-2 py-1 rounded"
                style={{
                  background: 'var(--primary-bg, 0.15)',
                  color: 'var(--primary)',
                }}
              >
                {traders?.length || 0} {t('active', language)}
              </span>
            </h1>
            <p className="text-xs" style={{ color: '#9CA3AF' }}>
              {t('manageAITraders', language)}
            </p>
          </div>
        </div>

        <div className="flex gap-2 md:gap-3 w-full md:w-auto overflow-hidden flex-wrap md:flex-nowrap">
          <button
            onClick={handleAddModel}
            className="px-3 md:px-4 py-2 rounded text-xs md:text-sm font-semibold transition-all hover:scale-105 flex items-center gap-1 md:gap-2 whitespace-nowrap"
            style={{
              background: 'transparent',
              color: 'rgb(0, 200, 5)',
              border: '1px solid rgb(0, 200, 5)',
            }}
          >
            <Plus className="w-3 h-3 md:w-4 md:h-4" />
            {t('aiModels', language)}
          </button>

          <button
            onClick={handleAddBrokerage}
            className="px-3 md:px-4 py-2 rounded text-xs md:text-sm font-semibold transition-all hover:scale-105 flex items-center gap-1 md:gap-2 whitespace-nowrap"
            style={{
              background: 'transparent',
              color: 'rgb(0, 200, 5)',
              border: '1px solid rgb(0, 200, 5)',
            }}
          >
            <Plus className="w-3 h-3 md:w-4 md:h-4" />
            {t('brokerages', language)}
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            disabled={
              configuredModels.length === 0 || configuredBrokerages.length === 0
            }
            className="px-3 md:px-4 py-2 rounded text-xs md:text-sm font-semibold transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 md:gap-2 whitespace-nowrap"
            style={{
              background:
                configuredModels.length > 0 && configuredBrokerages.length > 0
                  ? 'var(--primary)'
                  : 'rgb(204, 255, 0)',
              color:
                configuredModels.length > 0 && configuredBrokerages.length > 0
                  ? '#000'
                  : '#0ecb81',
            }}
          >
            <Plus className="w-4 h-4" />
            {t('createTrader', language)}
          </button>
        </div>
      </div>

      {/* Configuration Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* AI Models */}
        <div className="glass-card p-3 md:p-4">
          <h3
            className="text-base md:text-lg font-semibold mb-3 flex items-center gap-2"
            style={{ color: '#F9FAFB' }}
          >
            <Brain
              className="w-4 h-4 md:w-5 md:h-5"
              style={{ color: '#60a5fa' }}
            />
            {t('aiModels', language)}
          </h3>
          <div className="space-y-2 md:space-y-3">
            {configuredModels.map((model) => {
              const inUse = isModelInUse(model.id)
              return (
                <div
                  key={model.id}
                  className={`flex items-center justify-between p-2 md:p-3 rounded transition-all ${inUse
                    ? 'cursor-not-allowed'
                    : 'cursor-pointer hover:bg-gray-700'
                    }`}
                  style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                  onClick={() => handleModelClick(model.id)}
                >
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center flex-shrink-0">
                      {getModelIcon(model.provider || model.id, {
                        width: 28,
                        height: 28,
                      }) || (
                          <div
                            className="w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm font-bold"
                            style={{
                              background:
                                model.id === 'deepseek' ? '#60a5fa' : '#c084fc',
                              color: '#000000',
                            }}
                          >
                            {getShortName(model.name)[0]}
                          </div>
                        )}
                    </div>
                    <div className="min-w-0">
                      <div
                        className="font-semibold text-sm md:text-base truncate"
                        style={{ color: '#F9FAFB' }}
                      >
                        {getShortName(model.name)}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--primary)' }}>
                        {model.customModelName || AI_PROVIDER_CONFIG[model.provider]?.defaultModel || ''}
                      </div>
                      <div className="text-xs" style={{ color: '#9CA3AF' }}>
                        {inUse
                          ? t('inUse', language)
                          : model.enabled
                            ? t('enabled', language)
                            : t('configured', language)}
                      </div>
                    </div>
                  </div>
                  <div
                    className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: model.enabled ? '#0ecb81' : '#6B7280' }}
                  />
                </div>
              )
            })}
            {configuredModels.length === 0 && (
              <div
                className="text-center py-6 md:py-8"
                style={{ color: '#9CA3AF' }}
              >
                <Brain className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-2 opacity-50" />
                <div className="text-xs md:text-sm">
                  {t('noModelsConfigured', language)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Brokerages */}
        <div className="glass-card p-3 md:p-4">
          <h3
            className="text-base md:text-lg font-semibold mb-3 flex items-center gap-2"
            style={{ color: '#F9FAFB' }}
          >
            <Landmark
              className="w-4 h-4 md:w-5 md:h-5"
              style={{ color: 'var(--primary)' }}
            />
            {t('brokerages', language)}
          </h3>
          <div className="space-y-2 md:space-y-3">
            {configuredBrokerages.map((brokerage) => {
              const inUse = isBrokerageInUse(brokerage.id)
              return (
                <div
                  key={brokerage.id}
                  className={`flex items-center justify-between p-2 md:p-3 rounded transition-all ${inUse
                    ? 'cursor-not-allowed'
                    : 'cursor-pointer hover:bg-gray-700'
                    }`}
                  style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                  onClick={() => handleBrokerageClick(brokerage.id)}
                >
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center flex-shrink-0">
                      {getBrokerageIcon(brokerage.brokerage_type || brokerage.id, { width: 28, height: 28 })}
                    </div>
                    <div className="min-w-0">
                      <div
                        className="font-semibold text-sm md:text-base truncate"
                        style={{ color: 'rgb(0, 200, 5)' }}
                      >
                        {brokerage.brokerage_type?.toUpperCase() || getShortName(brokerage.name)}
                        <span className="text-xs font-normal ml-1.5" style={{ color: 'rgb(0, 200, 5)' }}>
                          - {brokerage.account_name || 'Default'}
                        </span>
                      </div>
                      <div className="text-xs" style={{ color: '#6B7280' }}>
                        {brokerage.type?.toUpperCase() || 'CEX'} •{' '}
                        {inUse
                          ? t('inUse', language)
                          : brokerage.enabled
                            ? t('enabled', language)
                            : t('configured', language)}
                      </div>
                    </div>
                  </div>
                  <div
                    className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: brokerage.enabled ? '#0ecb81' : '#6B7280' }}
                  />
                </div>
              )
            })}
            {configuredBrokerages.length === 0 && (
              <div
                className="text-center py-6 md:py-8"
                style={{ color: '#9CA3AF' }}
              >
                <Landmark className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-2 opacity-50" />
                <div className="text-xs md:text-sm">
                  {t('noBrokeragesConfigured', language)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Traders List */}
      <div className="glass-card p-4 md:p-6">
        <div className="flex items-center justify-between mb-4 md:mb-5">
          <h2
            className="text-lg md:text-xl font-bold flex items-center gap-2"
            style={{ color: '#F9FAFB' }}
          >
            <Users
              className="w-5 h-5 md:w-6 md:h-6"
              style={{ color: 'var(--primary)' }}
            />
            {t('currentTraders', language)}
          </h2>
        </div>

        {isTradersLoading ? (
          /* Loading Skeleton */
          <div className="space-y-3 md:space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex flex-col md:flex-row md:items-center justify-between p-3 md:p-4 rounded gap-3 md:gap-4 animate-pulse"
                style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
              >
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full skeleton"></div>
                  <div className="min-w-0 space-y-2">
                    <div className="skeleton h-5 w-32"></div>
                    <div className="skeleton h-3 w-24"></div>
                  </div>
                </div>
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="skeleton h-6 w-16"></div>
                  <div className="skeleton h-6 w-16"></div>
                  <div className="skeleton h-8 w-20"></div>
                </div>
              </div>
            ))}
          </div>
        ) : traders && traders.length > 0 ? (
          <div className="space-y-3 md:space-y-4">
            {traders.map((trader) => (
              <div
                key={trader.trader_id}
                className="flex flex-col md:flex-row md:items-center justify-between p-3 md:p-4 rounded transition-all hover:translate-y-[-1px] gap-3 md:gap-4"
                style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
              >
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="flex-shrink-0">
                    <PunkAvatar
                      seed={getTraderAvatar(trader.trader_id, trader.trader_name)}
                      size={48}
                      className="rounded-lg hidden md:block"
                    />
                    <PunkAvatar
                      seed={getTraderAvatar(trader.trader_id, trader.trader_name)}
                      size={40}
                      className="rounded-lg md:hidden"
                    />
                  </div>
                  <div className="min-w-0">
                    <div
                      className="font-bold text-base md:text-lg truncate"
                      style={{ color: '#F9FAFB' }}
                    >
                      {trader.trader_name}
                    </div>
                    <div
                      className="text-xs md:text-sm truncate"
                      style={{
                        color: (trader.ai_model || '').includes('deepseek')
                          ? '#60a5fa'
                          : 'rgb(0, 200, 5)',
                      }}
                    >
                      {getModelDisplayName(
                        (trader.ai_model || '').split('_').pop() || trader.ai_model || 'Unknown'
                      )}{' '}
                      Model • {getBrokerageDisplayName(trader.brokerage_id, allBrokerages)}
                      {trader.strategy_name && (
                        <span style={{ color: 'rgb(195, 245, 60)' }}> • {trader.strategy_name}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 md:gap-4 flex-wrap md:flex-nowrap">
                  {/* Status */}
                  <div className="text-center">
                    {/* <div className="text-xs mb-1" style={{ color: '#9CA3AF' }}>
                      {t('status', language)}
                    </div> */}
                    <div
                      className={`px-2 md:px-3 py-1 rounded text-xs font-bold ${trader.is_running
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                        }`}
                      style={
                        trader.is_running
                          ? {
                            background: 'transparent',
                            color: 'rgb(195, 245, 60)',
                            border: '1px solid rgb(195, 245, 60)'
                          }
                          : {
                            background: 'transparent',
                            color: 'rgb(255, 90, 135)',
                            border: '1px solid rgb(255, 90, 135)'
                          }
                      }
                    >
                      {trader.is_running
                        ? t('running', language)
                        : t('stopped', language)}
                    </div>
                    {/* Market Closed indicator - show when running and market is closed */}
                    {trader.is_running && marketStatus && !marketStatus.is_open && (
                      <div
                        className="text-xs mt-1"
                        style={{ color: '#FFA500' }}
                        title={marketStatus.market_hours}
                      >
                        Market Closed
                      </div>
                    )}
                  </div>

                  {/* Actions: no wrapline，overflow horizontal scroll */}
                  <div className="flex gap-1.5 md:gap-2 flex-nowrap overflow-x-auto items-center">
                    <button
                      onClick={() => {
                        if (onTraderSelect) {
                          onTraderSelect(trader.trader_id)
                        } else {
                          navigate(`/dashboard?trader=${trader.trader_id}`)
                        }
                      }}
                      className="px-2 md:px-3 py-1.5 md:py-2 rounded text-xs md:text-sm font-medium transition-all hover:bg-[rgba(255,255,255,0.08)] flex items-center gap-1 whitespace-nowrap border border-[rgba(255,255,255,0.12)]"
                      style={{ color: '#9CA3AF' }}
                    >
                      <BarChart3 className="w-3 h-3 md:w-4 md:h-4" />
                      {t('view', language)}
                    </button>

                    <button
                      onClick={() => handleEditTrader(trader.trader_id)}
                      disabled={trader.is_running}
                      className="px-2 md:px-3 py-1.5 md:py-2 rounded text-xs md:text-sm font-medium transition-all hover:bg-[rgba(255,255,255,0.08)] disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-1 border border-[rgba(255,255,255,0.12)]"
                      style={{ color: trader.is_running ? '#6B7280' : '#9CA3AF' }}
                    >
                      <Pencil className="w-3 h-3 md:w-4 md:h-4" />
                      {t('edit', language)}
                    </button>

                    <button
                      onClick={() =>
                        handleToggleTrader(
                          trader.trader_id,
                          trader.is_running || false
                        )
                      }
                      className="px-2 md:px-3 py-1.5 md:py-2 rounded text-xs md:text-sm font-medium transition-all whitespace-nowrap border"
                      style={
                        trader.is_running
                          ? {
                            background: 'transparent',
                            borderColor: 'rgb(255, 90, 135)',
                            color: 'rgb(255, 90, 135)',
                          }
                          : {
                            background: 'transparent',
                            borderColor: 'rgb(0, 200, 5)',
                            color: 'rgb(0, 200, 5)',
                          }
                      }
                    >
                      {trader.is_running
                        ? t('stop', language)
                        : t('start', language)}
                    </button>

                    <button
                      onClick={() => handleToggleCompetition(trader.trader_id, trader.show_in_competition ?? true)}
                      className="px-2 md:px-3 py-1.5 md:py-2 rounded text-xs md:text-sm font-semibold transition-all hover:scale-105 whitespace-nowrap flex items-center gap-1"
                      style={
                        trader.show_in_competition !== false
                          ? {
                            background: 'rgba(14, 203, 129, 0.1)',
                            color: 'var(--primary)',
                          }
                          : {
                            background: 'rgba(132, 142, 156, 0.1)',
                            color: '#9CA3AF',
                          }
                      }
                      title={trader.show_in_competition !== false ? 'atarenashow' : 'atarena hidden'}
                    >
                      {trader.show_in_competition !== false ? (
                        <Eye className="w-3 h-3 md:w-4 md:h-4" />
                      ) : (
                        <EyeOff className="w-3 h-3 md:w-4 md:h-4" />
                      )}
                    </button>

                    <button
                      onClick={() => handleDeleteTrader(trader.trader_id)}
                      className="px-2 md:px-3 py-1.5 md:py-2 rounded text-xs md:text-sm font-semibold transition-all hover:scale-105"
                      style={{
                        background: 'rgba(246, 70, 93, 0.1)',
                        color: '#F6465D',
                      }}
                    >
                      <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            className="text-center py-12 md:py-16"
            style={{ color: '#9CA3AF' }}
          >
            <Bot className="w-16 h-16 md:w-24 md:h-24 mx-auto mb-3 md:mb-4 opacity-50" />
            <div className="text-base md:text-lg font-semibold mb-2">
              {t('noTraders', language)}
            </div>
            <div className="text-xs md:text-sm mb-3 md:mb-4">
              {t('createFirstTrader', language)}
            </div>
            {(configuredModels.length === 0 ||
              configuredBrokerages.length === 0) && (
                <div className="text-xs md:text-sm text-yellow-500">
                  {configuredModels.length === 0 &&
                    configuredBrokerages.length === 0
                    ? t('configureModelsAndBrokeragesFirst', language)
                    : configuredModels.length === 0
                      ? t('configureModelsFirst', language)
                      : t('configureBrokeragesFirst', language)}
                </div>
              )}
          </div>
        )}
      </div>

      {/* Create Trader Modal */}
      {
        showCreateModal && (
          <TraderConfigModal
            isOpen={showCreateModal}
            isEditMode={false}
            availableModels={enabledModels}
            availableBrokerages={enabledBrokerages}
            onSave={handleCreateTrader}
            onClose={() => setShowCreateModal(false)}
          />
        )
      }

      {/* Edit Trader Modal */}
      {
        showEditModal && editingTrader && (
          <TraderConfigModal
            isOpen={showEditModal}
            isEditMode={true}
            traderData={editingTrader}
            availableModels={enabledModels}
            availableBrokerages={enabledBrokerages}
            onSave={handleSaveEditTrader}
            onClose={() => {
              setShowEditModal(false)
              setEditingTrader(null)
            }}
          />
        )
      }

      {/* Model Configuration Modal */}
      {
        showModelModal && (
          <ModelConfigModal
            allModels={supportedModels}
            configuredModels={allModels}
            editingModelId={editingModel}
            onSave={handleSaveModelConfig}
            onDelete={handleDeleteModelConfig}
            onClose={() => {
              setShowModelModal(false)
              setEditingModel(null)
            }}
            language={language}
          />
        )
      }

      {/* Brokerage Configuration Modal */}
      {
        showBrokerageModal && (
          <BrokerageConfigModal
            allBrokerages={supportedBrokerages}
            editingBrokerageId={editingBrokerage}
            onSave={handleSaveBrokerageConfig}
            onDelete={handleDeleteBrokerageConfig}
            onClose={() => {
              setShowBrokerageModal(false)
              setEditingBrokerage(null)
            }}
          />
        )
      }
    </div >
  )
}

// Model Configuration Modal Component
function ModelConfigModal({
  allModels,
  configuredModels,
  editingModelId,
  onSave,
  onDelete,
  onClose,
  language,
}: {
  allModels: AIModel[]
  configuredModels: AIModel[]
  editingModelId: string | null
  onSave: (
    modelId: string,
    apiKey: string,
    baseUrl?: string,
    modelName?: string
  ) => void
  onDelete: (modelId: string) => void
  onClose: () => void
  language: Language
}) {
  const [selectedModelId, setSelectedModelId] = useState(editingModelId || '')
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [modelName, setModelName] = useState('')

  // getcurrentedit'smodelinfo - editwhenfromalreadyconfig'smodelinfind，newwhenfromallsupport'smodelinfind
  const selectedModel = editingModelId
    ? configuredModels?.find((m) => m.id === selectedModelId)
    : allModels?.find((m) => m.id === selectedModelId)

  // ifiseditexistingmodel，initializeAPI Key、Base URLandModel Name
  useEffect(() => {
    if (editingModelId && selectedModel) {
      setApiKey(selectedModel.apiKey || '')
      setBaseUrl(selectedModel.customApiUrl || '')
      setModelName(selectedModel.customModelName || '')
    }
  }, [editingModelId, selectedModel])

  const isLocalFunc = selectedModel?.provider === 'localfunc'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedModelId) return
    if (!isLocalFunc && !apiKey.trim()) return

    onSave(
      selectedModelId,
      isLocalFunc ? 'local-function' : apiKey.trim(),
      isLocalFunc ? undefined : (baseUrl.trim() || undefined),
      modelName.trim() || undefined
    )
  }

  // optionalselect'smodellist（allsupport'smodel）
  const availableModels = allModels || []

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div
        className="bg-gray-800 rounded-lg w-full max-w-lg relative my-8"
        style={{
          background: 'rgba(22, 27, 34, 0.88)',
          maxHeight: 'calc(100vh - 4rem)',
        }}
      >
        <div
          className="flex items-center justify-between p-6 pb-4 sticky top-0 z-10"
          style={{ background: 'rgba(22, 27, 34, 0.88)' }}
        >
          <h3 className="text-xl font-bold" style={{ color: '#F9FAFB' }}>
            {editingModelId
              ? t('editAIModel', language)
              : t('addAIModel', language)}
          </h3>
          {editingModelId && (
            <button
              type="button"
              onClick={() => onDelete(editingModelId)}
              className="p-2 rounded hover:bg-red-100 transition-colors"
              style={{ background: 'rgba(246, 70, 93, 0.1)', color: '#F6465D' }}
              title={t('delete', language)}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6">
          <div
            className="space-y-4 overflow-y-auto"
            style={{ maxHeight: 'calc(100vh - 16rem)' }}
          >
            {!editingModelId && (
              <div>
                <label
                  className="block text-sm font-semibold mb-2"
                  style={{ color: '#F9FAFB' }}
                >
                  {t('selectModel', language)}
                </label>
                <select
                  value={selectedModelId}
                  onChange={(e) => setSelectedModelId(e.target.value)}
                  className="w-full px-3 py-2 rounded"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#F9FAFB',
                  }}
                  required
                >
                  <option value="">{t('pleaseSelectModel', language)}</option>
                  {availableModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {getShortName(model.name)} ({model.provider})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedModel && (
              <div
                className="p-4 rounded"
                style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 flex items-center justify-center">
                    {getModelIcon(selectedModel.provider || selectedModel.id, {
                      width: 32,
                      height: 32,
                    }) || (
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                          style={{
                            background:
                              selectedModel.id === 'deepseek'
                                ? '#60a5fa'
                                : '#c084fc',
                            color: '#fff',
                          }}
                        >
                          {selectedModel.name[0]}
                        </div>
                      )}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold" style={{ color: '#F9FAFB' }}>
                      {getShortName(selectedModel.name)}
                    </div>
                    <div className="text-xs" style={{ color: '#9CA3AF' }}>
                      {selectedModel.provider} • {selectedModel.id}
                    </div>
                  </div>
                </div>
                {/* Default model info and API link */}
                {AI_PROVIDER_CONFIG[selectedModel.provider] && (
                  <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <div className="text-xs mb-2" style={{ color: '#9CA3AF' }}>
                      {t('defaultModel', language)}: <span style={{ color: 'var(--primary)' }}>{AI_PROVIDER_CONFIG[selectedModel.provider].defaultModel}</span>
                    </div>
                    <a
                      href={AI_PROVIDER_CONFIG[selectedModel.provider].apiUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs hover:underline"
                      style={{ color: 'var(--primary)' }}
                    >
                      <ExternalLink className="w-3 h-3" />
                      {t('applyApiKey', language)} → {AI_PROVIDER_CONFIG[selectedModel.provider].apiName}
                    </a>
                    {selectedModel.provider === 'kimi' && (
                      <div className="mt-2 text-xs p-2 rounded" style={{ background: 'rgba(246, 70, 93, 0.1)', color: '#F6465D' }}>
                        ⚠️ {t('kimiApiNote', language)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {selectedModel && (
              <>
                {/* API Key and Base URL - hidden for Local Function */}
                {!isLocalFunc && (
                  <>
                    <div>
                      <label
                        className="block text-sm font-semibold mb-2"
                        style={{ color: '#F9FAFB' }}
                      >
                        API Key
                      </label>
                      <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder={t('enterAPIKey', language)}
                        className="w-full px-3 py-2 rounded"
                        style={{
                          background: 'var(--bg-secondary)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          color: '#F9FAFB',
                        }}
                        required
                      />
                    </div>

                    <div>
                      <label
                        className="block text-sm font-semibold mb-2"
                        style={{ color: '#F9FAFB' }}
                      >
                        {t('customBaseURL', language)}
                      </label>
                      <input
                        type="url"
                        value={baseUrl}
                        onChange={(e) => setBaseUrl(e.target.value)}
                        placeholder={t('customBaseURLPlaceholder', language)}
                        className="w-full px-3 py-2 rounded"
                        style={{
                          background: 'var(--bg-secondary)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          color: '#F9FAFB',
                        }}
                      />
                      <div className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                        {t('leaveBlankForDefault', language)}
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label
                    className="block text-sm font-semibold mb-2"
                    style={{ color: '#F9FAFB' }}
                  >
                    {isLocalFunc ? 'Model' : t('customModelName', language)}
                  </label>
                  {isLocalFunc ? (
                    <select
                      value={modelName || 'model_1'}
                      onChange={(e) => setModelName(e.target.value)}
                      className="w-full px-3 py-2 rounded"
                      style={{
                        background: 'var(--bg-secondary)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        color: '#F9FAFB',
                      }}
                    >
                      <option value="model_1">Model 1</option>
                      <option value="model_2">Model 2</option>
                      <option value="model_3">Model 3</option>
                    </select>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={modelName}
                        onChange={(e) => setModelName(e.target.value)}
                        placeholder={t('customModelNamePlaceholder', language)}
                        className="w-full px-3 py-2 rounded"
                        style={{
                          background: 'var(--bg-secondary)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          color: '#F9FAFB',
                        }}
                      />
                      <div className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                        {t('leaveBlankForDefaultModel', language)}
                      </div>
                    </>
                  )}
                </div>

                <div
                  className="p-4 rounded"
                  style={{
                    background: 'var(--primary-bg, 0.1)',
                    border: '1px solid var(--primary-bg, 0.2)',
                  }}
                >
                  <div
                    className="text-sm font-semibold mb-2"
                    style={{ color: 'var(--primary)' }}
                  >
                    ℹ️ {isLocalFunc ? 'Local Function' : t('information', language)}
                  </div>
                  <div
                    className="text-xs space-y-1"
                    style={{ color: '#9CA3AF' }}
                  >
                    {isLocalFunc ? (
                      <>
                        <div>• No API key or URL needed — runs locally</div>
                        <div>• Zero latency, zero API cost</div>
                        <div>• Auto-detects algo type (VWAPer, Scalper, etc.)</div>
                        <div>• Each model uses different parameters per algo</div>
                      </>
                    ) : (
                      <>
                        <div>{t('modelConfigInfo1', language)}</div>
                        <div>{t('modelConfigInfo2', language)}</div>
                        <div>{t('modelConfigInfo3', language)}</div>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <div
            className="flex gap-3 mt-6 pt-4 sticky bottom-0"
            style={{ background: 'rgba(22, 27, 34, 0.88)' }}
          >
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded text-sm font-semibold"
              style={{ background: 'rgba(255, 255, 255, 0.08)', color: '#9CA3AF' }}
            >
              {t('cancel', language)}
            </button>
            <button
              type="submit"
              disabled={!selectedModel || (!isLocalFunc && !apiKey.trim())}
              className="flex-1 px-4 py-2 rounded text-sm font-semibold disabled:opacity-50"
              style={{ background: 'var(--primary)', color: '#000' }}
            >
              {t('saveConfig', language)}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

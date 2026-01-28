import {
  Rocket,
  Settings,
  Shield,
  Users,
  HelpCircle,
  Download,
  Brain,
  type LucideIcon,
} from 'lucide-react'

export interface FAQItem {
  id: string
  questionKey: string
  answerKey: string
}

export interface FAQCategory {
  id: string
  icon: LucideIcon
  titleKey: string
  items: FAQItem[]
}

export const faqCategories: FAQCategory[] = [
  {
    id: 'getting-started',
    icon: Rocket,
    titleKey: 'faqCategoryGettingStarted',
    items: [
      {
        id: 'what-is-synapsestrike',
        questionKey: 'faqWhatIsSynapseStrike',
        answerKey: 'faqWhatIsSynapseStrikeAnswer',
      },
      {
        id: 'what-is-architect-ai',
        questionKey: 'faqWhatIsArchitectAI',
        answerKey: 'faqWhatIsArchitectAIAnswer',
      },
      {
        id: 'architect-vs-standard',
        questionKey: 'faqArchitectVsStandard',
        answerKey: 'faqArchitectVsStandardAnswer',
      },
      {
        id: 'how-does-it-work',
        questionKey: 'faqHowDoesItWork',
        answerKey: 'faqHowDoesItWorkAnswer',
      },
      {
        id: 'is-profitable',
        questionKey: 'faqIsProfitable',
        answerKey: 'faqIsProfitableAnswer',
      },
      {
        id: 'supported-brokerages',
        questionKey: 'faqSupportedBrokerages',
        answerKey: 'faqSupportedBrokeragesAnswer',
      },
      {
        id: 'supported-ai-models',
        questionKey: 'faqSupportedAIModels',
        answerKey: 'faqSupportedAIModelsAnswer',
      },
      {
        id: 'system-requirements',
        questionKey: 'faqSystemRequirements',
        answerKey: 'faqSystemRequirementsAnswer',
      },
    ],
  },
  {
    id: 'installation',
    icon: Download,
    titleKey: 'faqCategoryInstallation',
    items: [
      {
        id: 'how-to-install',
        questionKey: 'faqHowToInstall',
        answerKey: 'faqHowToInstallAnswer',
      },
      {
        id: 'windows-installation',
        questionKey: 'faqWindowsInstallation',
        answerKey: 'faqWindowsInstallationAnswer',
      },
      {
        id: 'docker-deployment',
        questionKey: 'faqDockerDeployment',
        answerKey: 'faqDockerDeploymentAnswer',
      },
      {
        id: 'manual-installation',
        questionKey: 'faqManualInstallation',
        answerKey: 'faqManualInstallationAnswer',
      },
      {
        id: 'server-deployment',
        questionKey: 'faqServerDeployment',
        answerKey: 'faqServerDeploymentAnswer',
      },
      {
        id: 'update-synapsestrike',
        questionKey: 'faqUpdateSynapseStrike',
        answerKey: 'faqUpdateSynapseStrikeAnswer',
      },
    ],
  },
  {
    id: 'configuration',
    icon: Settings,
    titleKey: 'faqCategoryConfiguration',
    items: [
      {
        id: 'configure-ai-models',
        questionKey: 'faqConfigureAIModels',
        answerKey: 'faqConfigureAIModelsAnswer',
      },
      {
        id: 'configure-brokerages',
        questionKey: 'faqConfigureBrokerages',
        answerKey: 'faqConfigureBrokeragesAnswer',
      },
      {
        id: 'alpaca-api-setup',
        questionKey: 'faqAlpacaAPISetup',
        answerKey: 'faqAlpacaAPISetupAnswer',
      },
      {
        id: 'paper-trading',
        questionKey: 'faqPaperTrading',
        answerKey: 'faqPaperTradingAnswer',
      },
      {
        id: 'create-strategy',
        questionKey: 'faqCreateStrategy',
        answerKey: 'faqCreateStrategyAnswer',
      },
      {
        id: 'create-trader',
        questionKey: 'faqCreateTrader',
        answerKey: 'faqCreateTraderAnswer',
      },
    ],
  },
  {
    id: 'trading',
    icon: Shield,
    titleKey: 'faqCategoryTrading',
    items: [
      {
        id: 'how-ai-decides',
        questionKey: 'faqHowAIDecides',
        answerKey: 'faqHowAIDecidesAnswer',
      },
      {
        id: 'decision-frequency',
        questionKey: 'faqDecisionFrequency',
        answerKey: 'faqDecisionFrequencyAnswer',
      },
      {
        id: 'no-trades-executing',
        questionKey: 'faqNoTradesExecuting',
        answerKey: 'faqNoTradesExecutingAnswer',
      },
      {
        id: 'only-short-positions',
        questionKey: 'faqOnlyShortPositions',
        answerKey: 'faqOnlyShortPositionsAnswer',
      },
      {
        id: 'margin-settings',
        questionKey: 'faqMarginSettings',
        answerKey: 'faqMarginSettingsAnswer',
      },
      {
        id: 'stop-loss-take-profit',
        questionKey: 'faqStopLossTakeProfit',
        answerKey: 'faqStopLossTakeProfitAnswer',
      },
      {
        id: 'multiple-traders',
        questionKey: 'faqMultipleTraders',
        answerKey: 'faqMultipleTradersAnswer',
      },
      {
        id: 'ai-costs',
        questionKey: 'faqAICosts',
        answerKey: 'faqAICostsAnswer',
      },
    ],
  },
  {
    id: 'ai-models',
    icon: Brain,
    titleKey: 'faqCategoryAIModels',
    items: [
      {
        id: 'ai-model-comparison',
        questionKey: 'faqAIModelComparison',
        answerKey: 'faqAIModelComparisonAnswer',
      },
      {
        id: 'use-local-ai',
        questionKey: 'faqUseLocalAI',
        answerKey: 'faqUseLocalAIAnswer',
      },
      {
        id: 'debate-arena',
        questionKey: 'faqDebateArena',
        answerKey: 'faqDebateArenaAnswer',
      },
    ],
  },
  {
    id: 'technical-issues',
    icon: HelpCircle,
    titleKey: 'faqCategoryTechnicalIssues',
    items: [
      {
        id: 'port-in-use',
        questionKey: 'faqPortInUse',
        answerKey: 'faqPortInUseAnswer',
      },
      {
        id: 'frontend-not-loading',
        questionKey: 'faqFrontendNotLoading',
        answerKey: 'faqFrontendNotLoadingAnswer',
      },
      {
        id: 'database-locked',
        questionKey: 'faqDatabaseLocked',
        answerKey: 'faqDatabaseLockedAnswer',
      },
      {
        id: 'ta-lib-not-found',
        questionKey: 'faqTALibNotFound',
        answerKey: 'faqTALibNotFoundAnswer',
      },
      {
        id: 'ai-api-timeout',
        questionKey: 'faqAIAPITimeout',
        answerKey: 'faqAIAPITimeoutAnswer',
      },
      {
        id: 'market-data-issues',
        questionKey: 'faqMarketDataIssues',
        answerKey: 'faqMarketDataIssuesAnswer',
      },
    ],
  },
  {
    id: 'community',
    icon: Users,
    titleKey: 'faqCategoryCommunity',
    items: [
      {
        id: 'join-community',
        questionKey: 'faqJoinCommunity',
        answerKey: 'faqJoinCommunityAnswer',
      },
    ],
  },
]

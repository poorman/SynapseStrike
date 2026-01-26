export type Language = 'en' | 'pl'

export const translations = {
  en: {
    // Header
    appTitle: 'SynapseStrike',
    subtitle: 'Multi-AI Model Trading Platform',
    aiTraders: 'AI Traders',
    details: 'Details',
    tradingPanel: 'Trading Panel',
    competition: 'Competition',
    backtest: 'Backtest',
    running: 'RUNNING',
    stopped: 'STOPPED',
    adminMode: 'Admin Mode',
    logout: 'Logout',
    switchTrader: 'Switch Trader:',
    view: 'View',

    // Navigation
    realtimeNav: 'Live',
    configNav: 'Config',
    dashboardNav: 'Dashboard',
    strategyNav: 'Strategy',
    debateNav: 'Debate Arena',
    faqNav: 'FAQ',

    // Footer
    footerTitle: 'SynapseStrike - AI Trading System',
    footerWarning: '⚠️ Trading involves risk. Use at your own discretion.',

    // Stats Cards
    totalEquity: 'Total Equity',
    availableBalance: 'Available Balance',
    totalPnL: 'Total P&L',
    positions: 'Positions',
    margin: 'Margin',
    free: 'Free',

    // Positions Table
    currentPositions: 'Current Positions',
    active: 'Active',
    symbol: 'Symbol',
    side: 'Side',
    entryPrice: 'Entry Price',
    stopLoss: 'Stop Loss',
    takeProfit: 'Take Profit',
    riskReward: 'Risk/Reward',
    markPrice: 'Mark Price',
    quantity: 'Quantity',
    positionValue: 'Position Value',
    positionMargin: 'Margin',
    unrealizedPnL: 'Unrealized P&L',
    liqPrice: 'Liq. Price',
    long: 'LONG',
    short: 'SHORT',
    noPositions: 'No Positions',
    noActivePositions: 'No active trading positions',

    // Recent Decisions
    recentDecisions: 'Recent Decisions',
    lastCycles: 'Last {count} trading cycles',
    noDecisionsYet: 'No Decisions Yet',
    aiDecisionsWillAppear: 'AI trading decisions will appear here',
    cycle: 'Cycle',
    success: 'Success',
    failed: 'Failed',
    inputPrompt: 'Input Prompt',
    aiThinking: 'AI Chain of Thought',
    collapse: 'Collapse',
    expand: 'Expand',

    // Equity Chart
    accountEquityCurve: 'Account Equity Curve',
    noHistoricalData: 'No Historical Data',
    dataWillAppear: 'Equity curve will appear after running a few cycles',
    initialBalance: 'Initial Balance',
    currentEquity: 'Current Equity',
    historicalCycles: 'Historical Cycles',
    displayRange: 'Display Range',
    recent: 'Recent',
    allData: 'All Data',
    cycles: 'Cycles',

    // Comparison Chart
    comparisonMode: 'Comparison Mode',
    dataPoints: 'Data Points',
    currentGap: 'Current Gap',
    count: '{count} pts',

    // TradingView Chart
    marketChart: 'Market Chart',
    viewChart: 'Click to view chart',
    enterSymbol: 'Enter symbol...',
    popularSymbols: 'Popular Symbols',
    fullscreen: 'Fullscreen',
    exitFullscreen: 'Exit Fullscreen',

    // Backtest Page
    backtestPage: {
      title: 'Backtest Lab',
      subtitle:
        'Pick a model + time range to replay the full AI decision loop.',
      start: 'Start Backtest',
      starting: 'Starting...',
      quickRanges: {
        h24: '24h',
        d3: '3d',
        d7: '7d',
      },
      actions: {
        pause: 'Pause',
        resume: 'Resume',
        stop: 'Stop',
      },
      states: {
        running: 'Running',
        paused: 'Paused',
        completed: 'Completed',
        failed: 'Failed',
        liquidated: 'Liquidated',
      },
      form: {
        aiModelLabel: 'AI Model',
        selectAiModel: 'Select AI model',
        providerLabel: 'Provider',
        statusLabel: 'Status',
        enabled: 'Enabled',
        disabled: 'Disabled',
        noModelWarning:
          'Please add and enable an AI model on the Model Config page first.',
        runIdLabel: 'Run ID',
        runIdPlaceholder: 'Leave blank to auto-generate',
        decisionTfLabel: 'Decision TF',
        cadenceLabel: 'Decision cadence (bars)',
        timeRangeLabel: 'Time range',
        symbolsLabel: 'Symbols (comma-separated)',
        customTfPlaceholder: 'Custom TFs (comma separated, e.g. 2h,6h)',
        initialBalanceLabel: 'Initial balance ()',
        feeLabel: 'Fee (bps)',
        slippageLabel: 'Slippage (bps)',
        largeCapMarginLabel: 'Large Cap Margin (x)',
        smallCapMarginLabel: 'Small Cap Margin (x)',
        fillPolicies: {
          nextOpen: 'Next open',
          barVwap: 'Bar VWAP',
          midPrice: 'Mid price',
        },
        promptPresets: {
          baseline: 'Baseline',
          aggressive: 'Aggressive',
          conservative: 'Conservative',
          scalping: 'Scalping',
        },
        cacheAiLabel: 'Reuse AI cache',
        replayOnlyLabel: 'Replay only',
        overridePromptLabel: 'Use only custom prompt',
        customPromptLabel: 'Custom prompt (optional)',
        customPromptPlaceholder:
          'Append or fully customize the strategy prompt',
      },
      runList: {
        title: 'Runs',
        count: 'Total {count} records',
      },
      filters: {
        allStates: 'All states',
        searchPlaceholder: 'Run ID / label',
      },
      tableHeaders: {
        runId: 'Run ID',
        label: 'Label',
        state: 'State',
        progress: 'Progress',
        equity: 'Equity',
        lastError: 'Last Error',
        updated: 'Updated',
      },
      emptyStates: {
        noRuns: 'No runs yet',
        selectRun: 'Select a run to view details',
      },
      detail: {
        tfAndSymbols: 'TF: {tf} · Symbols {count}',
        labelPlaceholder: 'Label note',
        saveLabel: 'Save',
        deleteLabel: 'Delete',
        exportLabel: 'Export',
        errorLabel: 'Error',
      },
      toasts: {
        selectModel: 'Please select an AI model first.',
        modelDisabled: 'AI model {name} is disabled.',
        invalidRange: 'End time must be later than start time.',
        startSuccess: 'Backtest {id} started.',
        startFailed: 'Failed to start. Please try again later.',
        actionSuccess: '{action} {id} succeeded.',
        actionFailed: 'Operation failed. Please try again later.',
        labelSaved: 'Label updated.',
        labelFailed: 'Failed to update label.',
        confirmDelete: 'Delete backtest {id}? This action cannot be undone.',
        deleteSuccess: 'Backtest record deleted.',
        deleteFailed: 'Failed to delete. Please try again later.',
        traceFailed: 'Failed to fetch AI trace.',
        exportSuccess: 'Exported data for {id}.',
        exportFailed: 'Failed to export.',
      },
      aiTrace: {
        title: 'AI Trace',
        clear: 'Clear',
        cyclePlaceholder: 'Cycle',
        fetch: 'Fetch',
        prompt: 'Prompt',
        cot: 'Chain of thought',
        output: 'Output',
        cycleTag: 'Cycle #{cycle}',
      },
      decisionTrail: {
        title: 'AI Decision Trail',
        subtitle: 'Showing last {count} cycles',
        empty: 'No records yet',
        emptyHint:
          'The AI thought & execution log will appear once the run starts.',
      },
      charts: {
        equityTitle: 'Equity Curve',
        equityEmpty: 'No data yet',
      },
      metrics: {
        title: 'Metrics',
        totalReturn: 'Total Return %',
        maxDrawdown: 'Max Drawdown %',
        sharpe: 'Sharpe',
        profitFactor: 'Profit Factor',
        pending: 'Calculating...',
        realized: 'Realized PnL',
        unrealized: 'Unrealized PnL',
      },
      trades: {
        title: 'Trade Events',
        headers: {
          time: 'Time',
          symbol: 'Symbol',
          action: 'Action',
          qty: 'Qty',
          margin: 'Margin',
          pnl: 'PnL',
        },
        empty: 'No trades yet',
      },
      metadata: {
        title: 'Metadata',
        created: 'Created',
        updated: 'Updated',
        processedBars: 'Processed Bars',
        maxDrawdown: 'Max DD',
        liquidated: 'Liquidated',
        yes: 'Yes',
        no: 'No',
      },
    },

    // Competition Page
    aiCompetition: 'AI Competition',
    traders: 'traders',
    liveBattle: 'Live Battle',
    realTimeBattle: 'Real-time Battle',
    leader: 'Leader',
    leaderboard: 'Leaderboard',
    live: 'LIVE',
    realTime: 'LIVE',
    performanceComparison: 'Performance Comparison',
    realTimePnL: 'Real-time PnL %',
    realTimePnLPercent: 'Real-time PnL %',
    headToHead: 'Head-to-Head Battle',
    leadingBy: 'Leading by {gap}%',
    behindBy: 'Behind by {gap}%',
    equity: 'Equity',
    pnl: 'P&L',
    pos: 'Pos',

    // AI Traders Management
    manageAITraders: 'Manage your AI trading bots',
    aiModels: 'AI Models',
    brokerages: 'Brokerages',
    createTrader: 'Create Trader',
    modelConfiguration: 'Model Configuration',
    configured: 'Configured',
    notConfigured: 'Not Configured',
    currentTraders: 'Current Traders',
    noTraders: 'No AI Traders',
    createFirstTrader: 'Create your first AI trader to get started',
    dashboardEmptyTitle: "Let's Get Started!",
    dashboardEmptyDescription:
      'Create your first AI trader to automate your trading strategy. Connect an brokerage, choose an AI model, and start trading in minutes!',
    goToTradersPage: 'Create Your First Trader',
    configureModelsFirst: 'Please configure AI models first',
    configureBrokeragesFirst: 'Please configure brokerages first',
    configureModelsAndBrokeragesFirst:
      'Please configure AI models and brokerages first',
    modelNotConfigured: 'Selected model is not configured',
    brokerageNotConfigured: 'Selected brokerage is not configured',
    confirmDeleteTrader: 'Are you sure you want to delete this trader?',
    status: 'Status',
    start: 'Start',
    stop: 'Stop',
    createNewTrader: 'Create New AI Trader',
    selectAIModel: 'Select AI Model',
    selectBrokerage: 'Select Brokerage',
    traderName: 'Trader Name',
    enterTraderName: 'Enter trader name',
    cancel: 'Cancel',
    create: 'Create',
    configureAIModels: 'Configure AI Models',
    configureBrokerages: 'Configure Brokerages',
    aiScanInterval: 'AI Scan Decision Interval (minutes)',
    scanIntervalRecommend: 'Recommended: 3-10 minutes',
    useTestnet: 'Use Testnet',
    enabled: 'Enabled',
    save: 'Save',

    // AI Model Configuration
    officialAPI: 'Official API',
    customAPI: 'Custom API',
    apiKey: 'API Key',
    customAPIURL: 'Custom API URL',
    enterAPIKey: 'Enter API Key',
    enterCustomAPIURL: 'Enter custom API endpoint URL',
    useOfficialAPI: 'Use official API service',
    useCustomAPI: 'Use custom API endpoint',

    // Brokerage Configuration
    secretKey: 'Secret Key',
    privateKey: 'Private Key',
    walletAddress: 'Wallet Address',
    user: 'User',
    signer: 'Signer',
    passphrase: 'Passphrase',
    enterPrivateKey: 'Enter Private Key',
    enterWalletAddress: 'Enter Wallet Address',
    enterUser: 'Enter User',
    enterSigner: 'Enter Signer Address',
    enterSecretKey: 'Enter Secret Key',
    enterPassphrase: 'Enter Passphrase',
    hyperliquidPrivateKeyDesc:
      'Hyperliquid uses private key for trading authentication',
    hyperliquidWalletAddressDesc:
      'Wallet address corresponding to the private key',
    // Hyperliquid Agent Wallet (New Security Model)
    hyperliquidAgentWalletTitle: 'Hyperliquid Agent Wallet Configuration',
    hyperliquidAgentWalletDesc:
      'Use Agent Wallet for secure trading: Agent wallet signs transactions (balance ~0), Main wallet holds funds (never expose private key)',
    hyperliquidAgentPrivateKey: 'Agent Private Key',
    enterHyperliquidAgentPrivateKey: 'Enter Agent wallet private key',
    hyperliquidAgentPrivateKeyDesc:
      'Agent wallet private key for signing transactions (keep balance near 0 for security)',
    hyperliquidMainWalletAddress: 'Main Wallet Address',
    enterHyperliquidMainWalletAddress: 'Enter Main wallet address',
    hyperliquidMainWalletAddressDesc:
      'Main wallet address that holds your trading funds (never expose its private key)',
    // Aster API Pro Configuration
    asterApiProTitle: 'Aster API Pro Wallet Configuration',
    asterApiProDesc:
      'Use API Pro wallet for secure trading: API wallet signs transactions, main wallet holds funds (never expose main wallet private key)',
    asterUserDesc:
      'Main wallet address - The EVM wallet address you use to log in to Aster (Note: Only EVM wallets are supported)',
    asterSignerDesc:
      'API Pro wallet address (0x...) - Generate from https://www.asterdex.com/en/api-wallet',
    asterPrivateKeyDesc:
      'API Pro wallet private key - Get from https://www.asterdex.com/en/api-wallet (only used locally for signing, never transmitted)',
    asterUsdtWarning:
      'Important: Aster only tracks  balance. Please ensure you use  as margin currency to avoid P&L calculation errors caused by price fluctuations of other assets (BNB, ETH, etc.)',
    asterUserLabel: 'Main Wallet Address',
    asterSignerLabel: 'API Pro Wallet Address',
    asterPrivateKeyLabel: 'API Pro Wallet Private Key',
    enterAsterUser: 'Enter main wallet address (0x...)',
    enterAsterSigner: 'Enter API Pro wallet address (0x...)',
    enterAsterPrivateKey: 'Enter API Pro wallet private key',

    // LIGHTER Configuration
    lighterWalletAddress: 'L1 Wallet Address',
    lighterPrivateKey: 'L1 Private Key',
    lighterApiKeyPrivateKey: 'API Key Private Key',
    enterLighterWalletAddress: 'Enter Ethereum wallet address (0x...)',
    enterLighterPrivateKey: 'Enter L1 private key (32 bytes)',
    enterLighterApiKeyPrivateKey:
      'Enter API Key private key (40 bytes, optional)',
    lighterWalletAddressDesc:
      'Your Ethereum wallet address for account identification',
    lighterPrivateKeyDesc:
      'L1 private key for account identification (32-byte ECDSA key)',
    lighterApiKeyPrivateKeyDesc:
      'API Key private key for transaction signing (40-byte Poseidon2 key)',
    lighterApiKeyOptionalNote:
      'Without API Key, system will use limited V1 mode',
    lighterV1Description:
      'Basic Mode - Limited functionality, testing framework only',
    lighterV2Description:
      'Full Mode - Supports Poseidon2 signing and real trading',
    lighterPrivateKeyImported: 'LIGHTER private key imported',

    // Brokerage names
    hyperliquidBrokerageName: 'Hyperliquid',
    asterBrokerageName: 'Aster DEX',

    // Secure input
    secureInputButton: 'Secure Input',
    secureInputReenter: 'Re-enter Securely',
    secureInputClear: 'Clear',
    secureInputHint:
      'Captured via secure two-step input. Use "Re-enter Securely" to update this value.',

    // Two Stage Key Modal
    twoStageModalTitle: 'Secure Key Input',
    twoStageModalDescription:
      'Use a two-step flow to enter your {length}-character private key safely.',
    twoStageStage1Title: 'Step 1 · Enter the first half',
    twoStageStage1Placeholder: 'First 32 characters (include 0x if present)',
    twoStageStage1Hint:
      'Continuing copies an obfuscation string to your clipboard as a diversion.',
    twoStageStage1Error: 'Please enter the first part before continuing.',
    twoStageNext: 'Next',
    twoStageProcessing: 'Processing…',
    twoStageCancel: 'Cancel',
    twoStageStage2Title: 'Step 2 · Enter the rest',
    twoStageStage2Placeholder: 'Remaining characters of your private key',
    twoStageStage2Hint:
      'Paste the obfuscation string somewhere neutral, then finish entering your key.',
    twoStageClipboardSuccess:
      'Obfuscation string copied. Paste it into any text field once before completing.',
    twoStageClipboardReminder:
      'Remember to paste the obfuscation string before submitting to avoid clipboard leaks.',
    twoStageClipboardManual:
      'Automatic copy failed. Copy the obfuscation string below manually.',
    twoStageBack: 'Back',
    twoStageSubmit: 'Confirm',
    twoStageInvalidFormat:
      'Invalid private key format. Expected {length} hexadecimal characters (optional 0x prefix).',
    testnetDescription:
      'Enable to connect to brokerage test environment for simulated trading',
    securityWarning: 'Security Warning',
    saveConfiguration: 'Save Configuration',

    // Trader Configuration
    positionMode: 'Position Mode',
    crossMarginMode: 'Cross Margin',
    isolatedMarginMode: 'Isolated Margin',
    crossMarginDescription:
      'Cross margin: All positions share account balance as collateral',
    isolatedMarginDescription:
      'Isolated margin: Each position manages collateral independently, risk isolation',
    marginConfiguration: 'Margin Configuration',
    largeCapMargin: 'Large Cap Margin',
    smallCapMargin: 'Small Cap Margin',
    marginRecommendation:
      'Recommended: Large Cap 5-10x, Small Cap 3-5x for risk control',
    tradingSymbols: 'Trading Symbols',
    tradingSymbolsPlaceholder:
      'Enter symbols, comma separated (e.g., AAPL,MSFT,GOOGL)',
    selectSymbols: 'Select Symbols',
    selectTradingSymbols: 'Select Trading Symbols',
    selectedSymbolsCount: 'Selected {count} symbols',
    clearSelection: 'Clear All',
    confirmSelection: 'Confirm',
    tradingSymbolsDescription:
      'Empty = use default symbols. Must end with  (e.g., AAPL, MSFT)',
    largeCapMarginValidation: 'Large Cap margin must be between 1-50x',
    smallCapMarginValidation: 'Small Cap margin must be between 1-20x',
    invalidSymbolFormat: 'Invalid symbol format: {symbol}, must end with ',

    // System Prompt Templates
    systemPromptTemplate: 'System Prompt Template',
    promptTemplateDefault: 'Default Stable',
    promptTemplateAdaptive: 'Conservative Strategy',
    promptTemplateAdaptiveRelaxed: 'Aggressive Strategy',
    promptTemplateHansen: 'Hansen Strategy',
    promptTemplateNof1: 'NoF1 English Framework',
    promptTemplateTaroLong: 'Taro Long Position',
    promptDescDefault: '📊 Default Stable Strategy',
    promptDescDefaultContent:
      'Maximize Sharpe ratio, balanced risk-reward, suitable for beginners and stable long-term trading',
    promptDescAdaptive: '🛡️ Conservative Strategy (v6.0.0)',
    promptDescAdaptiveContent:
      'Strict risk control, BTC mandatory confirmation, high win rate priority, suitable for conservative traders',
    promptDescAdaptiveRelaxed: '⚡ Aggressive Strategy (v6.0.0)',
    promptDescAdaptiveRelaxedContent:
      'High-frequency trading, BTC optional confirmation, pursue trading opportunities, suitable for volatile markets',
    promptDescHansen: '🎯 Hansen Strategy',
    promptDescHansenContent:
      'Hansen custom strategy, maximize Sharpe ratio, for professional traders',
    promptDescNof1: '🌐 NoF1 English Framework',
    promptDescNof1Content:
      'Hyperliquid brokerage specialist, English prompts, maximize risk-adjusted returns',
    promptDescTaroLong: '📈 Taro Long Position Strategy',
    promptDescTaroLongContent:
      'Data-driven decisions, multi-dimensional validation, continuous learning evolution, long position specialist',

    // Loading & Error
    loading: 'Loading...',

    // AI Traders Page - Additional
    inUse: 'In Use',
    noModelsConfigured: 'No configured AI models',
    noBrokeragesConfigured: 'No configured brokerages',
    signalSource: 'Signal Source',
    signalSourceConfig: 'Signal Source Configuration',
    stockPoolDescription:
      'API endpoint for AI500 data provider, leave blank to disable this signal source',
    oiTopDescription:
      'API endpoint for open interest rankings, leave blank to disable this signal source',
    information: 'Information',
    signalSourceInfo1:
      '• Signal source configuration is per-user, each user can set their own URLs',
    signalSourceInfo2:
      '• When creating traders, you can choose whether to use these signal sources',
    signalSourceInfo3:
      '• Configured URLs will be used to fetch market data and trading signals',
    editAIModel: 'Edit AI Model',
    addAIModel: 'Add AI Model',
    confirmDeleteModel:
      'Are you sure you want to delete this AI model configuration?',
    cannotDeleteModelInUse:
      'Cannot delete this AI model because it is being used by traders',
    tradersUsing: 'Traders using this configuration',
    pleaseDeleteTradersFirst:
      'Please delete or reconfigure these traders first',
    selectModel: 'Select AI Model',
    pleaseSelectModel: 'Please select a model',
    customBaseURL: 'Base URL (Optional)',
    customBaseURLPlaceholder:
      'Custom API base URL, e.g.: https://api.openai.com/v1',
    leaveBlankForDefault: 'Leave blank to use default API address',
    modelConfigInfo1:
      '• For official API, only API Key is required, leave other fields blank',
    modelConfigInfo2:
      '• Custom Base URL and Model Name only needed for third-party proxies',
    modelConfigInfo3: '• API Key is encrypted and stored securely',
    defaultModel: 'Default model',
    applyApiKey: 'Apply API Key',
    kimiApiNote:
      'Kimi requires API Key from international site (moonshot.ai), China region keys are not compatible',
    leaveBlankForDefaultModel: 'Leave blank to use default model',
    customModelName: 'Model Name (Optional)',
    customModelNamePlaceholder: 'e.g.: deepseek-chat, qwen3-max, gpt-4o',
    saveConfig: 'Save Configuration',
    editBrokerage: 'Edit Brokerage',
    addBrokerage: 'Add Brokerage',
    confirmDeleteBrokerage:
      'Are you sure you want to delete this brokerage configuration?',
    cannotDeleteBrokerageInUse:
      'Cannot delete this brokerage because it is being used by traders',
    pleaseSelectBrokerage: 'Please select an brokerage',
    brokerageConfigWarning1:
      '• API keys will be encrypted, recommend using read-only or futures trading permissions',
    brokerageConfigWarning2:
      '• Do not grant withdrawal permissions to ensure fund security',
    brokerageConfigWarning3:
      '• After deleting configuration, related traders will not be able to trade',
    edit: 'Edit',
    viewGuide: 'View Guide',
    binanceSetupGuide: 'Binance Setup Guide',
    closeGuide: 'Close',
    whitelistIP: 'Whitelist IP',
    whitelistIPDesc: 'Binance requires adding server IP to API whitelist',
    serverIPAddresses: 'Server IP Addresses',
    copyIP: 'Copy',
    ipCopied: 'IP Copied',
    copyIPFailed: 'Failed to copy IP address. Please copy manually',
    loadingServerIP: 'Loading server IP...',

    // Error Messages
    createTraderFailed: 'Failed to create trader',
    getTraderConfigFailed: 'Failed to get trader configuration',
    modelConfigNotExist: 'Model configuration does not exist or is not enabled',
    brokerageConfigNotExist:
      'Brokerage configuration does not exist or is not enabled',
    updateTraderFailed: 'Failed to update trader',
    deleteTraderFailed: 'Failed to delete trader',
    operationFailed: 'Operation failed',
    deleteConfigFailed: 'Failed to delete configuration',
    modelNotExist: 'Model does not exist',
    saveConfigFailed: 'Failed to save configuration',
    brokerageNotExist: 'Brokerage does not exist',
    deleteBrokerageConfigFailed: 'Failed to delete brokerage configuration',
    saveSignalSourceFailed: 'Failed to save signal source configuration',
    encryptionFailed: 'Failed to encrypt sensitive data',

    // Login & Register
    login: 'Sign In',
    register: 'Sign Up',
    username: 'Username',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    usernamePlaceholder: 'your username',
    emailPlaceholder: 'your@email.com',
    passwordPlaceholder: 'Enter your password',
    confirmPasswordPlaceholder: 'Re-enter your password',
    passwordRequirements: 'Password requirements',
    passwordRuleMinLength: 'Minimum 8 characters',
    passwordRuleUppercase: 'At least 1 uppercase letter',
    passwordRuleLowercase: 'At least 1 lowercase letter',
    passwordRuleNumber: 'At least 1 number',
    passwordRuleSpecial: 'At least 1 special character (@#$%!&*?)',
    passwordRuleMatch: 'Passwords match',
    passwordNotMeetRequirements:
      'Password does not meet the security requirements',
    otpPlaceholder: '000000',
    loginTitle: 'Sign in to your account',
    registerTitle: 'Create a new account',
    loginButton: 'Sign In',
    registerButton: 'Sign Up',
    back: 'Back',
    noAccount: "Don't have an account?",
    hasAccount: 'Already have an account?',
    registerNow: 'Sign up now',
    loginNow: 'Sign in now',
    forgotPassword: 'Forgot password?',
    rememberMe: 'Remember me',
    otpCode: 'OTP Code',
    resetPassword: 'Reset Password',
    resetPasswordTitle: 'Reset your password',
    newPassword: 'New Password',
    newPasswordPlaceholder: 'Enter new password (at least 6 characters)',
    resetPasswordButton: 'Reset Password',
    resetPasswordSuccess:
      'Password reset successful! Please login with your new password',
    resetPasswordFailed: 'Password reset failed',
    backToLogin: 'Back to Login',
    scanQRCode: 'Scan QR Code',
    enterOTPCode: 'Enter 6-digit OTP code',
    verifyOTP: 'Verify OTP',
    setupTwoFactor: 'Set up two-factor authentication',
    setupTwoFactorDesc:
      'Follow the steps below to secure your account with Google Authenticator',
    scanQRCodeInstructions:
      'Scan this QR code with Google Authenticator or Authy',
    otpSecret: 'Or enter this secret manually:',
    qrCodeHint: 'QR code (if scanning fails, use the secret below):',
    authStep1Title: 'Step 1: Install Google Authenticator',
    authStep1Desc:
      'Download and install Google Authenticator from your app store',
    authStep2Title: 'Step 2: Add account',
    authStep2Desc: 'Tap "+", then choose "Scan QR code" or "Enter a setup key"',
    authStep3Title: 'Step 3: Verify setup',
    authStep3Desc: 'After setup, continue to enter the 6-digit code',
    setupCompleteContinue: 'I have completed setup, continue',
    copy: 'Copy',
    completeRegistration: 'Complete Registration',
    completeRegistrationSubtitle: 'to complete registration',
    loginSuccess: 'Login successful',
    registrationSuccess: 'Registration successful',
    loginFailed: 'Login failed. Please check your email and password.',
    registrationFailed: 'Registration failed. Please try again.',
    verificationFailed:
      'OTP verification failed. Please check the code and try again.',
    sessionExpired: 'Session expired, please login again',
    invalidCredentials: 'Invalid email or password',
    weak: 'Weak',
    medium: 'Medium',
    strong: 'Strong',
    passwordStrength: 'Password strength',
    passwordStrengthHint:
      'Use at least 8 characters with mix of letters, numbers and symbols',
    passwordMismatch: 'Passwords do not match',
    emailRequired: 'Email is required',
    passwordRequired: 'Password is required',
    invalidEmail: 'Invalid email format',
    passwordTooShort: 'Password must be at least 6 characters',

    // Landing Page
    features: 'Features',
    howItWorks: 'How it Works',
    community: 'Community',
    language: 'Language',
    loggedInAs: 'Logged in as',
    exitLogin: 'Sign Out',
    signIn: 'Sign In',
    signUp: 'Sign Up',
    registrationClosed: 'Registration Closed',
    registrationClosedMessage:
      'User registration is currently disabled. Please contact the administrator for access.',

    // Hero Section
    githubStarsInDays: '2.5K+ GitHub Stars in 3 days',
    heroTitle1: 'LLM intelligence',
    heroTitle2: 'for real returns.',
    heroDescription:
      'Self-hosted and broker-agnostic, LLM Trader integrates with Alpaca for trade execution and Polygon for market data, enabling multiple AI agents to learn from historical and real-time stock market data. The platform allows AI to autonomously analyze markets, generate and evaluate strategies, execute trades, and continuously optimize performance within U.S. equities.',
    poweredBy:
      'Powered by Aster DEX and Binance, strategically invested by Amber.ac.',

    // Landing Page CTA
    readyToDefine: 'Ready to define the future of AI trading?',
    startWithCrypto:
      'Starting with crypto markets, expanding to TradFi. SynapseStrike is the infrastructure of AgentFi.',
    getStartedNow: 'Get Started Now',
    viewSourceCode: 'View Source Code',

    // Features Section
    coreFeatures: 'Core Features',
    whyChooseNofx: 'Why Choose SynapseStrike?',
    openCommunityDriven:
      'Open source, transparent, community-driven AI trading OS',
    openSourceSelfHosted: '100% Open Source & Self-Hosted',
    openSourceDesc:
      'Your framework, your rules. Non-black box, supports custom prompts and multi-models.',
    openSourceFeatures1: 'Fully open source code',
    openSourceFeatures2: 'Self-hosting deployment support',
    openSourceFeatures3: 'Custom AI prompts',
    openSourceFeatures4: 'Multi-model support (DeepSeek, Qwen)',
    multiAgentCompetition: 'Multi-Agent Intelligent Competition',
    multiAgentDesc:
      'AI strategies battle at high speed in sandbox, survival of the fittest, achieving strategy evolution.',
    multiAgentFeatures1: 'Multiple AI agents running in parallel',
    multiAgentFeatures2: 'Automatic strategy optimization',
    multiAgentFeatures3: 'Sandbox security testing',
    multiAgentFeatures4: 'Cross-market strategy porting',
    secureReliableTrading: 'Secure and Reliable Trading',
    secureDesc:
      'Enterprise-grade security, complete control over your funds and trading strategies.',
    secureFeatures1: 'Local private key management',
    secureFeatures2: 'Fine-grained API permission control',
    secureFeatures3: 'Real-time risk monitoring',
    secureFeatures4: 'Trading log auditing',

    // About Section
    aboutNofx: 'About SynapseStrike',
    whatIsNofx: 'What is SynapseStrike?',
    nofxNotAnotherBot:
      "SynapseStrike is not another trading bot, but the 'Linux' of AI trading —",
    nofxDescription1:
      'a transparent, trustworthy open source OS that provides a unified',
    nofxDescription2:
      "'decision-risk-execution' layer, supporting all asset classes.",
    nofxDescription3:
      'Starting with crypto markets (24/7, high volatility perfect testing ground), future expansion to stocks, futures, forex. Core: open architecture, AI',
    nofxDescription4:
      'Darwinism (multi-agent self-competition, strategy evolution), CodeFi',
    nofxDescription5:
      'flywheel (developers get point rewards for PR contributions).',
    youFullControl: 'You 100% Control',
    fullControlDesc: 'Complete control over AI prompts and funds',
    startupMessages1: 'Starting automated trading system...',
    startupMessages2: 'API server started on port 8080',
    startupMessages3: 'Web console http://127.0.0.1:3000',

    // How It Works Section
    howToStart: 'How to Get Started with SynapseStrike',
    fourSimpleSteps:
      'Four simple steps to start your AI automated trading journey',
    step1Title: 'Clone GitHub Repository',
    step1Desc:
      'git clone https://github.com/tinkle-community/nofx and switch to dev branch to test new features.',
    step2Title: 'Configure Environment',
    step2Desc:
      'Frontend setup for brokerage APIs (like Binance, Hyperliquid), AI models and custom prompts.',
    step3Title: 'Deploy & Run',
    step3Desc:
      'One-click Docker deployment, start AI agents. Note: High-risk market, only test with money you can afford to lose.',
    step4Title: 'Optimize & Contribute',
    step4Desc:
      'Monitor trading, submit PRs to improve framework. Join Telegram to share strategies.',
    importantRiskWarning: 'Important Risk Warning',
    riskWarningText:
      'Dev branch is unstable, do not use funds you cannot afford to lose. SynapseStrike is non-custodial, no official strategies. Trading involves risks, invest carefully.',

    // Community Section (testimonials are kept as-is since they are quotes)

    // Footer Section
    futureStandardAI: 'The future standard of AI trading',
    links: 'Links',
    resources: 'Resources',
    documentation: 'Documentation',
    supporters: 'Supporters',
    strategicInvestment: '(Strategic Investment)',

    // Login Modal
    accessNofxPlatform: 'Access SynapseStrike Platform',
    loginRegisterPrompt:
      'Please login or register to access the full AI trading platform',
    registerNewAccount: 'Register New Account',

    // Candidate Stocks Warnings
    candidateStocks: 'Candidate Stocks',
    candidateStocksZeroWarning: 'Candidate Stocks Count is 0',
    possibleReasons: 'Possible Reasons:',
    stockPoolApiNotConfigured:
      'AI500 data provider API not configured or inaccessible (check signal source settings)',
    apiConnectionTimeout: 'API connection timeout or returned empty data',
    noCustomStocksAndApiFailed:
      'No custom stocks configured and API fetch failed',
    solutions: 'Solutions:',
    setCustomStocksInConfig: 'Set custom stock list in trader configuration',
    orConfigureCorrectApiUrl: 'Or configure correct data provider API address',
    orDisableStockPoolOptions:
      'Or disable "Use AI500 Data Provider" and "Use OI Top" options',
    signalSourceNotConfigured: 'Signal Source Not Configured',
    signalSourceWarningMessage:
      'You have traders that enabled "Use AI500 Data Provider" or "Use OI Top", but signal source API address is not configured yet. This will cause candidate stocks count to be 0, and traders cannot work properly.',
    configureSignalSourceNow: 'Configure Signal Source Now',

    // FAQ Page
    faqTitle: 'Frequently Asked Questions',
    faqSubtitle: 'Find answers to common questions about SynapseStrike',
    faqStillHaveQuestions: 'Still Have Questions?',
    faqContactUs: 'Join our community or check our GitHub for more help',

    // FAQ Categories
    faqCategoryGettingStarted: 'Getting Started',
    faqCategoryInstallation: 'Installation',
    faqCategoryConfiguration: 'Configuration',
    faqCategoryTrading: 'Trading',
    faqCategoryTechnicalIssues: 'Technical Issues',
    faqCategorySecurity: 'Security',
    faqCategoryFeatures: 'Features',
    faqCategoryAIModels: 'AI Models',
    faqCategoryContributing: 'Contributing',

    // ===== GETTING STARTED =====
    faqWhatIsSynapseStrike: 'What is SynapseStrike?',
    faqWhatIsSynapseStrikeAnswer:
      'SynapseStrike is an open-source AI-powered trading operating system for cryptocurrency and US stock markets. It uses large language models (LLMs) like DeepSeek, GPT, Claude, Gemini to analyze market data and make autonomous trading decisions. Key features include: multi-AI model support, multi-brokerage trading, visual strategy builder, backtesting, and AI debate arena for consensus decisions.',

    faqHowDoesItWork: 'How does SynapseStrike work?',
    faqHowDoesItWorkAnswer:
      'SynapseStrike works in 5 steps: 1) Configure AI models and brokerage API credentials; 2) Create a trading strategy (stock selection, indicators, risk controls); 3) Create a "Trader" combining AI model + Brokerage + Strategy; 4) Start the trader - it will analyze market data at regular intervals and make buy/sell/hold decisions; 5) Monitor performance on the dashboard. The AI uses Chain of Thought reasoning to explain each decision.',

    faqIsProfitable: 'Is SynapseStrike profitable?',
    faqIsProfitableAnswer:
      'AI trading is experimental and NOT guaranteed to be profitable. Cryptocurrency futures are highly volatile and risky. SynapseStrike is designed for educational and research purposes. We strongly recommend: starting with small amounts (10-50 ), never investing more than you can afford to lose, thoroughly testing with backtests before live trading, and understanding that past performance does not guarantee future results.',

    faqSupportedBrokerages: 'Which brokerages are supported?',
    faqSupportedBrokeragesAnswer:
      'CEX (Centralized): Binance Futures, Bybit, OKX, Bitget. DEX (Decentralized): Hyperliquid, Aster DEX, Lighter. Each brokerage has different features - Binance has the most liquidity, Hyperliquid is fully on-chain with no KYC required. Check the documentation for setup guides for each brokerage.',

    faqSupportedAIModels: 'Which AI models are supported?',
    faqSupportedAIModelsAnswer:
      'SynapseStrike supports 7+ AI models: DeepSeek (recommended for cost/performance), Alibaba Qwen, OpenAI (GPT-5.2), Anthropic Claude, Google Gemini, xAI Grok, and Kimi (Moonshot). You can also use any OpenAI-compatible API endpoint. Each model has different strengths - DeepSeek is cost-effective, OpenAI models are powerful but expensive, Claude excels at reasoning.',

    faqSystemRequirements: 'What are the system requirements?',
    faqSystemRequirementsAnswer:
      'Minimum: 2 CPU cores, 2GB RAM, 1GB disk space, stable internet. Recommended: 4GB RAM for running multiple traders. Supported OS: Linux, macOS, or Windows (via Docker or WSL2). Docker is the easiest installation method. For manual installation, you need Go 1.21+, Node.js 18+, and TA-Lib library.',

    // ===== INSTALLATION =====
    faqHowToInstall: 'How do I install SynapseStrike?',
    faqHowToInstallAnswer:
      'Easiest method (Linux/macOS): Run "curl -fsSL https://raw.githubusercontent.com/NoFxAiOS/nofx/main/install.sh | bash" - this installs Docker containers automatically. Then open http://127.0.0.1:3000 in your browser. For manual installation or development, clone the repository and follow the README instructions.',

    faqWindowsInstallation: 'How do I install on Windows?',
    faqWindowsInstallationAnswer:
      'Three options: 1) Docker Desktop (Recommended) - Install Docker Desktop, then run "docker compose -f docker-compose.prod.yml up -d" in PowerShell; 2) WSL2 - Install Windows Subsystem for Linux, then follow Linux installation; 3) Docker in WSL2 - Best of both worlds, run the install script in WSL2 terminal. Access via http://127.0.0.1:3000',

    faqDockerDeployment: 'Docker deployment keeps failing',
    faqDockerDeploymentAnswer:
      'Common solutions: 1) Check Docker is running: "docker info"; 2) Ensure sufficient memory (2GB minimum); 3) If stuck on "go build", try: "docker compose down && docker compose build --no-cache && docker compose up -d"; 4) Check logs: "docker compose logs -f"; 5) For slow pulls, configure a Docker mirror in daemon.json.',

    faqManualInstallation: 'How do I install manually for development?',
    faqManualInstallationAnswer:
      'Prerequisites: Go 1.21+, Node.js 18+, TA-Lib. Steps: 1) Clone repo: "git clone https://github.com/NoFxAiOS/nofx.git"; 2) Install backend deps: "go mod download"; 3) Install frontend deps: "cd web && npm install"; 4) Build backend: "go build -o nofx"; 5) Run backend: "./nofx"; 6) Run frontend (new terminal): "cd web && npm run dev". Access at http://127.0.0.1:3000',

    faqServerDeployment: 'How do I deploy to a remote server?',
    faqServerDeploymentAnswer:
      'Run the install script on your server - it auto-detects the server IP. Access via http://YOUR_SERVER_IP:3000. For HTTPS: 1) Use Cloudflare (free) - add domain, create A record pointing to server IP, set SSL to "Flexible"; 2) Enable TRANSPORT_ENCRYPTION=true in .env for browser-side encryption; 3) Access via https://your-domain.com',

    faqUpdateSynapseStrike: 'How do I update SynapseStrike?',
    faqUpdateSynapseStrikeAnswer:
      'For Docker: Run "docker compose pull && docker compose up -d" to pull latest images and restart. For manual installation: "git pull && go build -o nofx" for backend, "cd web && npm install && npm run build" for frontend. Your configurations in data.db are preserved during updates.',

    // ===== CONFIGURATION =====
    faqConfigureAIModels: 'How do I configure AI models?',
    faqConfigureAIModelsAnswer:
      'Go to Config page → AI Models section. For each model: 1) Get API key from the provider (links provided in UI); 2) Enter API key; 3) Optionally customize base URL and model name; 4) Save. API keys are encrypted before storage. Test the connection after saving to verify it works.',

    faqConfigureBrokerages: 'How do I configure brokerage connections?',
    faqConfigureBrokeragesAnswer:
      'Go to Config page → Brokerages section. Click "Add Brokerage", select brokerage type, and enter credentials. For CEX (Binance/Bybit/OKX): Need API Key + Secret Key (+ Passphrase for OKX). For DEX (Hyperliquid/Aster/Lighter): Need wallet address and private key. Always enable only necessary permissions (Futures Trading) and consider IP whitelisting.',

    faqBinanceAPISetup: 'How do I set up Binance API correctly?',
    faqBinanceAPISetupAnswer:
      'Important steps: 1) Create API key in Binance → API Management; 2) Enable ONLY "Enable Futures" permission; 3) Consider adding IP whitelist for security; 4) CRITICAL: Switch to Hedge Mode (双向持仓) in Futures settings → Preferences → Position Mode; 5) Ensure funds are in Futures wallet (not Spot). Common error -4061 means you need Hedge Mode.',

    faqHyperliquidSetup: 'How do I set up Hyperliquid?',
    faqHyperliquidSetupAnswer:
      'Hyperliquid is a decentralized brokerage requiring wallet authentication. Steps: 1) Go to app.hyperliquid.xyz; 2) Connect your wallet; 3) Generate an API wallet (recommended) or use your main wallet; 4) Copy the wallet address and private key; 5) In SynapseStrike, add Hyperliquid brokerage with these credentials. No KYC required, fully on-chain.',

    faqCreateStrategy: 'How do I create a trading strategy?',
    faqCreateStrategyAnswer:
      'Go to Strategy Studio: 1) Stock Source - select which stocks to trade (static list, AI500 pool, or OI Top ranking); 2) Indicators - enable technical indicators (EMA, MACD, RSI, ATR, Volume, OI, Funding Rate); 3) Risk Controls - set margin limits, max positions, margin usage cap, position size limits; 4) Custom Prompt (optional) - add specific instructions for the AI. Save and assign to a trader.',

    faqCreateTrader: 'How do I create and start a trader?',
    faqCreateTraderAnswer:
      'Go to Traders page: 1) Click "Create Trader"; 2) Select AI Model (must be configured first); 3) Select Brokerage (must be configured first); 4) Select Strategy (or use default); 5) Set decision interval (e.g., 5 minutes); 6) Save, then click "Start" to begin trading. Monitor performance on Dashboard page.',

    // ===== TRADING =====
    faqHowAIDecides: 'How does the AI make trading decisions?',
    faqHowAIDecidesAnswer:
      'The AI uses Chain of Thought (CoT) reasoning in 4 steps: 1) Position Analysis - reviews current holdings and P/L; 2) Risk Assessment - checks account margin, available balance; 3) Opportunity Evaluation - analyzes market data, indicators, candidate stocks; 4) Final Decision - outputs specific action (buy/sell/hold) with reasoning. You can view the full reasoning in decision logs.',

    faqDecisionFrequency: 'How often does the AI make decisions?',
    faqDecisionFrequencyAnswer:
      'Configurable per trader, default is 3-5 minutes. Considerations: Too frequent (1-2 min) = overtrading, high fees; Too slow (30+ min) = missed opportunities. Recommended: 5 minutes for active trading, 15-30 minutes for swing trading. The AI may decide to "hold" (no action) in many cycles.',

    faqNoTradesExecuting: "Why isn't my trader executing any trades?",
    faqNoTradesExecutingAnswer:
      'Common causes: 1) AI decided to wait (check decision logs for reasoning); 2) Insufficient balance in futures account; 3) Max positions limit reached (default: 3); 4) Brokerage API issues (check error messages); 5) Strategy constraints too restrictive. Check Dashboard → Decision Logs for detailed AI reasoning each cycle.',

    faqOnlyShortPositions: 'Why is the AI only opening short positions?',
    faqOnlyShortPositionsAnswer:
      'This is usually due to Binance Position Mode. Solution: Switch to Hedge Mode (双向持仓) in Binance Futures → Preferences → Position Mode. You must close all positions first. After switching, the AI can open both long and short positions independently.',

    faqMarginSettings: 'How do margin settings work?',
    faqMarginSettingsAnswer:
      'Margin is set in Strategy → Risk Controls: Large Cap margin (typically 5-10x) and Small Cap margin (typically 3-5x). Higher margin = higher risk and potential returns. Subaccounts may have restrictions (e.g., Binance subaccounts limited to 5x). The AI respects these limits when placing orders.',

    faqStopLossTakeProfit: 'Does SynapseStrike support stop-loss and take-profit?',
    faqStopLossTakeProfitAnswer:
      'The AI can suggest stop-loss/take-profit levels in its decisions, but these are guidance-based rather than hard-coded brokerage orders. The AI monitors positions each cycle and may decide to close based on P/L. For guaranteed stop-loss, you can set brokerage-level orders manually or adjust the strategy prompt to be more conservative.',

    faqMultipleTraders: 'Can I run multiple traders?',
    faqMultipleTradersAnswer:
      'Yes! SynapseStrike supports running 20+ concurrent traders. Each trader can have different: AI model, brokerage account, strategy, decision interval. Use this to A/B test strategies, compare AI models, or diversify across brokerages. Monitor all traders on the Competition page.',

    faqAICosts: 'How much do AI API calls cost?',
    faqAICostsAnswer:
      'Approximate daily costs per trader (5-min intervals): DeepSeek: $0.10-0.50; Qwen: $0.20-0.80; OpenAI: $2-5; Claude: $1-3. Costs depend on prompt length and response tokens. DeepSeek offers the best cost/performance ratio. Longer decision intervals reduce costs.',

    // ===== TECHNICAL ISSUES =====
    faqPortInUse: 'Port 8080 or 3000 already in use',
    faqPortInUseAnswer:
      'Check what\'s using the port: "lsof -i :8080" (macOS/Linux) or "netstat -ano | findstr 8080" (Windows). Kill the process or change ports in .env: SynapseStrike_BACKEND_PORT=8081, SynapseStrike_FRONTEND_PORT=3001. Restart with "docker compose down && docker compose up -d".',

    faqFrontendNotLoading: 'Frontend shows "Loading..." forever',
    faqFrontendNotLoadingAnswer:
      'Backend may not be running or reachable. Check: 1) "curl http://127.0.0.1:8080/api/health" should return {"status":"ok"}; 2) "docker compose ps" to verify containers are running; 3) Check backend logs: "docker compose logs nofx-backend"; 4) Ensure firewall allows port 8080.',

    faqDatabaseLocked: 'Database locked error',
    faqDatabaseLockedAnswer:
      'Multiple processes accessing SQLite simultaneously. Solution: 1) Stop all processes: "docker compose down" or "pkill nofx"; 2) Remove lock files if present: "rm -f data/data.db-wal data/data.db-shm"; 3) Restart: "docker compose up -d". Only one backend instance should access the database.',

    faqTALibNotFound: 'TA-Lib not found during build',
    faqTALibNotFoundAnswer:
      'TA-Lib is required for technical indicators. Install: macOS: "brew install ta-lib"; Ubuntu/Debian: "sudo apt-get install libta-lib0-dev"; CentOS: "yum install ta-lib-devel". After installing, rebuild: "go build -o nofx". Docker images include TA-Lib pre-installed.',

    faqAIAPITimeout: 'AI API timeout or connection refused',
    faqAIAPITimeoutAnswer:
      'Check: 1) API key is valid (test with curl); 2) Network can reach API endpoint (ping/curl); 3) API provider is not down (check status page); 4) VPN/firewall not blocking; 5) Rate limits not exceeded. Default timeout is 120 seconds.',

    faqBinancePositionMode: 'Binance error code -4061 (Position Mode)',
    faqBinancePositionModeAnswer:
      'Error: "Order\'s position side does not match user\'s setting". You\'re in One-way Mode but SynapseStrike requires Hedge Mode. Fix: 1) Close ALL positions first; 2) Binance Futures → Settings (gear icon) → Preferences → Position Mode → Switch to "Hedge Mode" (双向持仓); 3) Restart your trader.',

    faqBalanceShowsZero: 'Account balance shows 0',
    faqBalanceShowsZeroAnswer:
      'Funds are likely in Spot wallet, not Futures wallet. Solution: 1) In Binance, go to Wallet → Futures → Transfer; 2) Transfer  from Spot to Futures; 3) Refresh SynapseStrike dashboard. Also check: funds not locked in savings/staking products.',

    faqDockerPullFailed: 'Docker image pull failed or slow',
    faqDockerPullFailedAnswer:
      'Docker Hub can be slow in some regions. Solutions: 1) Configure a Docker mirror in /etc/docker/daemon.json: {"registry-mirrors": ["https://mirror.gcr.io"]}; 2) Restart Docker; 3) Retry pull. Alternatively, use GitHub Container Registry (ghcr.io) which may have better connectivity in your region.',

    // ===== SECURITY =====
    faqAPIKeyStorage: 'How are API keys stored?',
    faqAPIKeyStorageAnswer:
      'API keys are encrypted using AES-256-GCM before storage in the local SQLite database. The encryption key (DATA_ENCRYPTION_KEY) is stored in your .env file. Keys are decrypted only in memory when needed for API calls. Never share your data.db or .env files.',

    faqEncryptionDetails: 'What encryption does SynapseStrike use?',
    faqEncryptionDetailsAnswer:
      'SynapseStrike uses multiple encryption layers: 1) AES-256-GCM for database storage (API keys, secrets); 2) RSA-2048 for optional transport encryption (browser to server); 3) JWT for authentication tokens. Keys are generated during installation. Enable TRANSPORT_ENCRYPTION=true for HTTPS environments.',

    faqSecurityBestPractices: 'What are security best practices?',
    faqSecurityBestPracticesAnswer:
      'Recommended: 1) Use brokerage API keys with IP whitelist and minimal permissions (Futures Trading only); 2) Use dedicated subaccount for SynapseStrike; 3) Enable TRANSPORT_ENCRYPTION for remote deployments; 4) Never share .env or data.db files; 5) Use HTTPS with valid certificates; 6) Regularly rotate API keys; 7) Monitor account activity.',

    faqCanSynapseStrikeStealFunds: 'Can SynapseStrike steal my funds?',
    faqCanSynapseStrikeStealFundsAnswer:
      'SynapseStrike is open-source (AGPL-3.0 license) - you can audit all code on GitHub. API keys are stored locally on YOUR machine, never sent to external servers. SynapseStrike only has the permissions you grant via API keys. For maximum safety: use API keys with trading-only permissions (no withdrawal), enable IP whitelist, use a dedicated subaccount.',

    // ===== FEATURES =====
    faqStrategyStudio: 'What is Strategy Studio?',
    faqStrategyStudioAnswer:
      'Strategy Studio is a visual strategy builder where you configure: 1) Stock Sources - which cryptocurrencies to trade (static list, AI500 top stocks, OI ranking); 2) Technical Indicators - EMA, MACD, RSI, ATR, Volume, Open Interest, Funding Rate; 3) Risk Controls - margin limits, position sizing, margin caps; 4) Custom Prompts - specific instructions for AI. No coding required.',

    faqBacktestLab: 'What is Backtest Lab?',
    faqBacktestLabAnswer:
      'Backtest Lab tests your strategy against historical data without risking real funds. Features: 1) Configure AI model, date range, initial balance; 2) Watch real-time progress with equity curve; 3) View metrics: Return %, Max Drawdown, Sharpe Ratio, Win Rate; 4) Analyze individual trades and AI reasoning. Essential for validating strategies before live trading.',

    faqDebateArena: 'What is Debate Arena?',
    faqDebateArenaAnswer:
      'Debate Arena lets multiple AI models debate trading decisions before execution. Setup: 1) Choose 2-5 AI models; 2) Assign personalities (Bull, Bear, Analyst, Contrarian, Risk Manager); 3) Watch them debate in rounds; 4) Final decision based on consensus voting. Useful for high-conviction trades where you want multiple perspectives.',

    faqCompetitionMode: 'What is Competition Mode?',
    faqCompetitionModeAnswer:
      'Competition page shows a real-time leaderboard of all your traders. Compare: ROI, P&L, Sharpe ratio, win rate, number of trades. Use this to A/B test different AI models, strategies, or configurations. Traders can be marked as "Show in Competition" to appear on the leaderboard.',

    faqChainOfThought: 'What is Chain of Thought (CoT)?',
    faqChainOfThoughtAnswer:
      "Chain of Thought is the AI's reasoning process, visible in decision logs. The AI explains its thinking in 4 steps: 1) Current position analysis; 2) Account risk assessment; 3) Market opportunity evaluation; 4) Final decision rationale. This transparency helps you understand WHY the AI made each decision, useful for improving strategies.",

    // ===== AI MODELS =====
    faqWhichAIModelBest: 'Which AI model should I use?',
    faqWhichAIModelBestAnswer:
      'Recommended: DeepSeek for best cost/performance ratio ($0.10-0.50/day). Alternatives: OpenAI for best reasoning but expensive ($2-5/day); Claude for nuanced analysis; Qwen for competitive pricing. You can run multiple traders with different models to compare. Check the Competition page to see which performs best for your strategy.',

    faqCustomAIAPI: 'Can I use a custom AI API?',
    faqCustomAIAPIAnswer:
      'Yes! SynapseStrike supports any OpenAI-compatible API. In Config → AI Models → Custom API: 1) Enter your API endpoint URL (e.g., https://your-api.com/v1); 2) Enter API key; 3) Specify model name. This works with self-hosted models, alternative providers, or Claude via third-party proxies.',

    faqAIHallucinations: 'What about AI hallucinations?',
    faqAIHallucinationsAnswer:
      'AI models can sometimes produce incorrect or fabricated information ("hallucinations"). SynapseStrike mitigates this by: 1) Providing structured prompts with real market data; 2) Enforcing JSON output format for decisions; 3) Validating orders before execution. However, AI trading is experimental - always monitor decisions and don\'t rely solely on AI judgment.',

    faqCompareAIModels: 'How do I compare different AI models?',
    faqCompareAIModelsAnswer:
      'Create multiple traders with different AI models but same strategy/brokerage. Run them simultaneously and compare on Competition page. Metrics to watch: ROI, win rate, Sharpe ratio, max drawdown. Alternatively, use Backtest Lab to test models against same historical data. The Debate Arena also shows how different models reason about the same situation.',

    // ===== CONTRIBUTING =====
    faqHowToContribute: 'How can I contribute to SynapseStrike?',
    faqHowToContributeAnswer:
      'SynapseStrike is open-source and welcomes contributions! Ways to contribute: 1) Code - fix bugs, add features (check GitHub Issues); 2) Documentation - improve guides, translate; 3) Bug Reports - report issues with details; 4) Feature Ideas - suggest improvements. Start with issues labeled "good first issue". All contributors may receive airdrop rewards.',

    faqPRGuidelines: 'What are the PR guidelines?',
    faqPRGuidelinesAnswer:
      'PR Process: 1) Fork repo to your account; 2) Create feature branch from dev: "git checkout -b feat/your-feature"; 3) Make changes, run lint: "npm --prefix web run lint"; 4) Commit with Conventional Commits format; 5) Push and create PR to NoFxAiOS/nofx:dev; 6) Reference related issue (Closes #123); 7) Wait for review. Keep PRs small and focused.',

    faqBountyProgram: 'Is there a bounty program?',
    faqBountyProgramAnswer:
      'Yes! Contributors receive airdrop rewards based on contributions: Code commits (highest weight), bug fixes, feature suggestions, documentation. Issues with "bounty" label have cash rewards. After completing work, submit a Bounty Claim. Check CONTRIBUTING.md for details on the reward structure.',

    faqReportBugs: 'How do I report bugs?',
    faqReportBugsAnswer:
      'For bugs: Open a GitHub Issue with: 1) Clear description of the problem; 2) Steps to reproduce; 3) Expected vs actual behavior; 4) System info (OS, Docker version, browser); 5) Relevant logs. For SECURITY vulnerabilities: Do NOT open public issues - DM @Web3Tinkle on Twitter instead.',

    // Web Crypto Environment Check
    environmentCheck: {
      button: 'Check Secure Environment',
      checking: 'Checking...',
      description:
        'Automatically verifying whether this browser context allows Web Crypto before entering sensitive keys.',
      secureTitle: 'Secure context detected',
      secureDesc:
        'Web Crypto API is available. You can continue entering secrets with encryption enabled.',
      insecureTitle: 'Insecure context detected',
      insecureDesc:
        'This page is not running over HTTPS or a trusted localhost origin, so browsers block Web Crypto calls.',
      tipsTitle: 'How to fix:',
      tipHTTPS:
        'Serve the dashboard over HTTPS with a valid certificate (IP origins also need TLS).',
      tipLocalhost:
        'During development, open the app via http://localhost or 127.0.0.1.',
      tipIframe:
        'Avoid embedding the app in insecure HTTP iframes or reverse proxies that strip HTTPS.',
      unsupportedTitle: 'Browser does not expose Web Crypto',
      unsupportedDesc:
        'Open SynapseStrike over HTTPS (or http://localhost during development) and avoid insecure iframes/reverse proxies so the browser can enable Web Crypto.',
      summary: 'Current origin: {origin} • Protocol: {protocol}',
      disabledTitle: 'Transport encryption disabled',
      disabledDesc:
        'Server-side transport encryption is disabled. API keys will be transmitted in plaintext. Enable TRANSPORT_ENCRYPTION=true for enhanced security.',
    },

    environmentSteps: {
      checkTitle: '1. Environment check',
      selectTitle: '2. Select brokerage',
    },

    // Two-Stage Key Modal
    twoStageKey: {
      title: 'Two-Stage Private Key Input',
      stage1Description:
        'Enter the first {length} characters of your private key',
      stage2Description:
        'Enter the remaining {length} characters of your private key',
      stage1InputLabel: 'First Part',
      stage2InputLabel: 'Second Part',
      characters: 'characters',
      processing: 'Processing...',
      nextButton: 'Next',
      cancelButton: 'Cancel',
      backButton: 'Back',
      encryptButton: 'Encrypt & Submit',
      obfuscationCopied: 'Obfuscation data copied to clipboard',
      obfuscationInstruction:
        'Paste something else to clear clipboard, then continue',
      obfuscationManual: 'Manual obfuscation required',
    },

    // Error Messages
    errors: {
      privatekeyIncomplete: 'Please enter at least {expected} characters',
      privatekeyInvalidFormat:
        'Invalid private key format (should be 64 hex characters)',
      privatekeyObfuscationFailed: 'Clipboard obfuscation failed',
    },

    // Debate Arena Page
    debatePage: {
      title: 'Market Debate Arena',
      subtitle: 'Watch AI models debate market conditions and reach consensus',
      newDebate: 'New Debate',
      noDebates: 'No debates yet',
      createFirst: 'Create your first debate to get started',
      selectDebate: 'Select a debate to view details',
      createDebate: 'Create Debate',
      creating: 'Creating...',
      debateName: 'Debate Name',
      debateNamePlaceholder: 'e.g., BTC Bull or Bear?',
      tradingPair: 'Trading Pair',
      strategy: 'Strategy',
      selectStrategy: 'Select a strategy',
      maxRounds: 'Max Rounds',
      autoExecute: 'Auto Execute',
      autoExecuteHint: 'Automatically execute the consensus trade',
      participants: 'Participants',
      addParticipant: 'Add AI Participant',
      noModels: 'No AI models available',
      atLeast2: 'Add at least 2 participants',
      personalities: {
        bull: 'Aggressive Bull',
        bear: 'Cautious Bear',
        analyst: 'Data Analyst',
        contrarian: 'Contrarian',
        risk_manager: 'Risk Manager',
      },
      status: {
        pending: 'Pending',
        running: 'Running',
        voting: 'Voting',
        completed: 'Completed',
        cancelled: 'Cancelled',
      },
      actions: {
        start: 'Start Debate',
        starting: 'Starting...',
        cancel: 'Cancel',
        delete: 'Delete',
        execute: 'Execute Trade',
      },
      round: 'Round',
      roundOf: 'Round {current} of {max}',
      messages: 'Messages',
      noMessages: 'No messages yet',
      waitingStart: 'Waiting for debate to start...',
      votes: 'Votes',
      consensus: 'Consensus',
      finalDecision: 'Final Decision',
      confidence: 'Confidence',
      votesCount: '{count} votes',
      decision: {
        open_long: 'Open Long',
        open_short: 'Open Short',
        close_long: 'Close Long',
        close_short: 'Close Short',
        hold: 'Hold',
        wait: 'Wait',
      },
      messageTypes: {
        analysis: 'Analysis',
        rebuttal: 'Rebuttal',
        vote: 'Vote',
        summary: 'Summary',
      },
    },
  },
}

export function t(
  key: string,
  lang: Language,
  params?: Record<string, string | number>
): string {
  // Handle nested keys like 'twoStageKey.title'
  const keys = key.split('.')
  // Fallback to English if the requested language doesn't have translations
  let value: any = (translations as any)[lang] || translations.en

  for (const k of keys) {
    value = value?.[k]
  }

  let text = typeof value === 'string' ? value : key

  // Replace parameters like {count}, {gap}, etc.
  if (params) {
    Object.entries(params).forEach(([param, value]) => {
      text = text.replace(`{${param}}`, String(value))
    })
  }

  return text
}

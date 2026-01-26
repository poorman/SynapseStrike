interface IconProps {
  width?: number
  height?: number
  className?: string
}

// AI model colors for fallback display
const MODEL_COLORS: Record<string, string> = {
  deepseek: '#4A90E2',
  qwen: '#9B59B6',
  claude: '#D97757',
  kimi: 'rgb(195, 245, 60)',
  gemini: '#4285F4',
  grok: '#000000',
  openai: '#10A37F',
}

// Function to get AI model icon
export const getModelIcon = (modelType: string, props: IconProps = {}) => {
  // Supports full ID or type name
  const type = modelType.includes('_') ? modelType.split('_').pop() : modelType

  let iconPath: string | null = null

  switch (type) {
    case 'deepseek':
      iconPath = '/icons/deepseek.svg'
      break
    case 'qwen':
      iconPath = '/icons/qwen.svg'
      break
    case 'claude':
      iconPath = '/icons/claude.svg'
      break
    case 'kimi':
      iconPath = '/icons/kimi.svg'
      break
    case 'gemini':
      iconPath = '/icons/gemini.svg'
      break
    case 'grok':
      iconPath = '/icons/grok.svg'
      break
    case 'openai':
      iconPath = '/icons/openai.svg'
      break
    default:
      return null
  }

  return (
    <img
      src={iconPath}
      alt={`${type} icon`}
      width={props.width || 24}
      height={props.height || 24}
      className={props.className}
    />
  )
}

// Get model color（Used as fallback when no icon）
export const getModelColor = (modelType: string): string => {
  const type = modelType.includes('_') ? modelType.split('_').pop() : modelType
  return MODEL_COLORS[type || ''] || '#60a5fa'
}

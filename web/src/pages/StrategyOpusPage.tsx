/**
 * Strategy Opus Page
 * 
 * Renders TacticsStudioPage with Opus-specific configuration:
 * - Title: "Opus Studio"
 * - Filter: Only shows strategies with "opus" in name/description
 */

import { TacticsStudioPage } from './TacticsStudioPage'

export function StrategyOpusPage() {
    return (
        <TacticsStudioPage
            studioTitle="Opus Studio"
            studioSubtitle="Configure Opus trading strategies with AI-powered insights"
            filterType="opus"
        />
    )
}

export default StrategyOpusPage

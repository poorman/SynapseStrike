/**
 * Strategy Current Page
 * 
 * Renders TacticsStudioPage with Current-specific configuration:
 * - Title: "Current Studio"
 * - Filter: Only shows strategies with "current" in name/description
 */

import { TacticsStudioPage } from './TacticsStudioPage'

export function StrategyCurrentPage() {
    return (
        <TacticsStudioPage
            studioTitle="Current Studio"
            studioSubtitle="Configure current trading strategies with indicators and risk controls"
            filterType="current"
        />
    )
}

export default StrategyCurrentPage

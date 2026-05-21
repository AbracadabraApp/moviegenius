//
//  CategoryBadgeColors.swift
//  moviegenius
//
//  Badge color progression helper for category completion badges
//

import SwiftUI

/// Helper for calculating badge background and text colors based on progress percentage
struct CategoryBadgeColors {

    /// Returns the badge background color for a given progress value (0.0 to 1.0)
    /// - Parameter progress: Completion percentage from 0.0 (0%) to 1.0 (100%)
    /// - Returns: Color that progresses from gray → bronze → copper → rose gold → gold
    static func badgeColor(for progress: Double) -> Color {
        switch progress {
        case 0..<0.20:
            return .mgProgressStart
        case 0.20..<0.40:
            return .mgProgressBronze
        case 0.40..<0.60:
            return .mgProgressCopper
        case 0.60..<0.80:
            return .mgProgressRoseGold
        default:
            return .mgGold
        }
    }

    /// Returns the text color for optimal contrast at a given progress (dark mode adaptive)
    /// - Parameter progress: Completion percentage from 0.0 (0%) to 1.0 (100%)
    /// - Returns: .mgPrimary for light backgrounds (<40%), .white for mid-tier metallics (40-80%), .black for gold (≥80%)
    /// - Note: Gold backgrounds require black text for sufficient contrast. Mid-tier metallics use white.
    static func textColor(for progress: Double) -> Color {
        if progress >= 0.80 {
            return .black  // Gold background - needs black text for contrast
        } else if progress >= 0.40 {
            return .white  // Copper/RoseGold - white text works well
        } else {
            return .mgPrimary  // Gray/Bronze - use primary text color
        }
    }

    /// Returns the semantic tier color for a given tier name
    /// - Parameter tierName: The tier name (Essential, Foundational, Connoisseur, Specialist, Genius)
    /// - Returns: Fixed color for the tier (gray → bronze → copper → rose gold → gold)
    static func semanticTierColor(for tierName: String) -> Color {
        switch tierName {
        case "Essential":
            return .mgProgressStart
        case "Foundational":
            return .mgProgressBronze
        case "Connoisseur":
            return .mgProgressCopper
        case "Specialist":
            return .mgProgressRoseGold
        case "Genius":
            return .mgGold
        default:
            return .mgSecondaryBackground
        }
    }

    /// Returns the semantic tier text color for a given tier name
    /// - Parameter tierName: The tier name
    /// - Returns: .mgPrimary for gray tier, .black for gold tier, .white for other metallic tiers
    static func semanticTierTextColor(for tierName: String) -> Color {
        if tierName == "Essential" {
            return .mgPrimary
        } else if tierName == "Genius" {
            return .black  // Gold background - needs black text for contrast
        } else {
            return .white  // Other metallics - white text works well
        }
    }
}

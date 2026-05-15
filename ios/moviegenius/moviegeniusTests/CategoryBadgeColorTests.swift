//
//  CategoryBadgeColorTests.swift
//  moviegeniusTests
//
//  Tests for category badge progress color system
//

import Testing
import SwiftUI
@testable import moviegenius

struct CategoryBadgeColorTests {

    // MARK: - Badge Color Tests (5 gradations)

    @Test func badgeColor_0to19Percent_returnsProgressStart() {
        #expect(CategoryBadgeColors.badgeColor(for: 0.00) == .mgProgressStart)
        #expect(CategoryBadgeColors.badgeColor(for: 0.10) == .mgProgressStart)
        #expect(CategoryBadgeColors.badgeColor(for: 0.19) == .mgProgressStart)
    }

    @Test func badgeColor_20to39Percent_returnsProgressBronze() {
        #expect(CategoryBadgeColors.badgeColor(for: 0.20) == .mgProgressBronze)
        #expect(CategoryBadgeColors.badgeColor(for: 0.30) == .mgProgressBronze)
        #expect(CategoryBadgeColors.badgeColor(for: 0.39) == .mgProgressBronze)
    }

    @Test func badgeColor_40to59Percent_returnsProgressCopper() {
        #expect(CategoryBadgeColors.badgeColor(for: 0.40) == .mgProgressCopper)
        #expect(CategoryBadgeColors.badgeColor(for: 0.50) == .mgProgressCopper)
        #expect(CategoryBadgeColors.badgeColor(for: 0.59) == .mgProgressCopper)
    }

    @Test func badgeColor_60to79Percent_returnsProgressRoseGold() {
        #expect(CategoryBadgeColors.badgeColor(for: 0.60) == .mgProgressRoseGold)
        #expect(CategoryBadgeColors.badgeColor(for: 0.70) == .mgProgressRoseGold)
        #expect(CategoryBadgeColors.badgeColor(for: 0.79) == .mgProgressRoseGold)
    }

    @Test func badgeColor_80PercentAndAbove_returnsGold() {
        #expect(CategoryBadgeColors.badgeColor(for: 0.80) == .mgGold)
        #expect(CategoryBadgeColors.badgeColor(for: 0.90) == .mgGold)
        #expect(CategoryBadgeColors.badgeColor(for: 1.00) == .mgGold)
        #expect(CategoryBadgeColors.badgeColor(for: 1.50) == .mgGold) // Over 100%
    }

    // MARK: - Text Color Tests

    @Test func textColor_below40Percent_returnsBlack() {
        #expect(CategoryBadgeColors.textColor(for: 0.00) == .black)
        #expect(CategoryBadgeColors.textColor(for: 0.20) == .black)
        #expect(CategoryBadgeColors.textColor(for: 0.39) == .black)
    }

    @Test func textColor_40PercentAndAbove_returnsWhite() {
        #expect(CategoryBadgeColors.textColor(for: 0.40) == .white)
        #expect(CategoryBadgeColors.textColor(for: 0.60) == .white)
        #expect(CategoryBadgeColors.textColor(for: 1.00) == .white)
    }

    // MARK: - Edge Cases

    @Test func handlesNegativeProgress() {
        // Should treat negative as 0%
        #expect(CategoryBadgeColors.badgeColor(for: -0.10) == .mgProgressStart)
        #expect(CategoryBadgeColors.textColor(for: -0.10) == .black)
    }

    @Test func handlesOverflowProgress() {
        // Should treat >100% as 100%
        #expect(CategoryBadgeColors.badgeColor(for: 2.50) == .mgGold)
        #expect(CategoryBadgeColors.textColor(for: 2.50) == .white)
    }
}

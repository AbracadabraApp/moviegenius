//
//  DesignSystem.swift
//  moviegenius
//
//  Modern iOS design system with semantic colors, typography, and styles
//

import SwiftUI

// MARK: - Colors
extension Color {
    // Brand
    static let mgGold = Color(red: 212/255, green: 175/255, blue: 55/255)

    // Progress badge gradients (adaptive to light/dark mode)
    static let mgProgressStart = Color(uiColor: UIColor { traitCollection in
        traitCollection.userInterfaceStyle == .dark
            ? UIColor(red: 0.40, green: 0.40, blue: 0.40, alpha: 1.0)  // Darker gray for dark mode
            : UIColor(red: 0.62, green: 0.62, blue: 0.62, alpha: 1.0)  // Light gray for light mode
    })

    static let mgProgressBronze = Color(uiColor: UIColor { traitCollection in
        traitCollection.userInterfaceStyle == .dark
            ? UIColor(red: 0.60, green: 0.54, blue: 0.45, alpha: 1.0)  // Muted bronze for dark mode
            : UIColor(red: 0.75, green: 0.68, blue: 0.56, alpha: 1.0)  // Light bronze for light mode
    })

    static let mgProgressCopper = Color(uiColor: UIColor { traitCollection in
        traitCollection.userInterfaceStyle == .dark
            ? UIColor(red: 0.68, green: 0.58, blue: 0.40, alpha: 1.0)  // Muted copper for dark mode
            : UIColor(red: 0.82, green: 0.71, blue: 0.50, alpha: 1.0)  // Copper for light mode
    })

    static let mgProgressRoseGold = Color(uiColor: UIColor { traitCollection in
        traitCollection.userInterfaceStyle == .dark
            ? UIColor(red: 0.80, green: 0.68, blue: 0.45, alpha: 1.0)  // Muted rose gold for dark mode
            : UIColor(red: 0.92, green: 0.78, blue: 0.52, alpha: 1.0)  // Rose gold for light mode
    })

    // Backgrounds (adaptive to light/dark mode)
    static let mgBackground = Color(.systemBackground)
    static let mgSecondaryBackground = Color(.secondarySystemBackground)
    static let mgGroupedBackground = Color(.systemGroupedBackground)

    // Text (adaptive to light/dark mode)
    static let mgPrimary = Color(.label)
    static let mgSecondary = Color(.secondaryLabel)
    static let mgTertiary = Color(.tertiaryLabel)

    // Semantic (adaptive to light/dark mode)
    static let mgDestructive = Color.red
    static let mgSuccess = Color.green
    static let mgWarning = Color.orange
}

// MARK: - Typography (Dynamic Type support)
extension Font {
    static let mgLargeTitle = Font.largeTitle.weight(.bold)
    static let mgTitle = Font.title.weight(.bold)
    static let mgTitle2 = Font.title2.weight(.bold)
    static let mgTitle3 = Font.title3.weight(.semibold)
    static let mgHeadline = Font.headline.weight(.semibold)
    static let mgBody = Font.body
    static let mgCallout = Font.callout
    static let mgSubheadline = Font.subheadline
    static let mgFootnote = Font.footnote
    static let mgCaption = Font.caption
    static let mgCaption2 = Font.caption2
}

// MARK: - Spacing
extension CGFloat {
    static let mgSpacing2: CGFloat = 2
    static let mgSpacing4: CGFloat = 4
    static let mgSpacing6: CGFloat = 6
    static let mgSpacing8: CGFloat = 8
    static let mgSpacing12: CGFloat = 12
    static let mgSpacing16: CGFloat = 16
    static let mgSpacing20: CGFloat = 20
    static let mgSpacing24: CGFloat = 24
    static let mgSpacing32: CGFloat = 32
    static let mgSpacing40: CGFloat = 40
    static let mgSpacing48: CGFloat = 48
}

// MARK: - Corner Radius
extension CGFloat {
    static let mgCornerTiny: CGFloat = 4    // Badges, pills
    static let mgCornerSmall: CGFloat = 8   // Cards, posters
    static let mgCornerMedium: CGFloat = 12 // Containers
    static let mgCornerLarge: CGFloat = 16  // Hero elements
}

// MARK: - Button Styles
struct MGPrimaryButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.mgHeadline)
            .foregroundStyle(.white)
            .padding(.horizontal, .mgSpacing32)
            .padding(.vertical, .mgSpacing12)
            .background(isEnabled ? Color.mgGold : Color.mgSecondary)
            .clipShape(RoundedRectangle(cornerRadius: .mgCornerSmall, style: .continuous))
            .scaleEffect(configuration.isPressed ? 0.96 : 1.0)
            .animation(.spring(response: 0.3, dampingFraction: 0.7), value: configuration.isPressed)
    }
}

struct MGCardButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .animation(.spring(response: 0.3, dampingFraction: 0.7), value: configuration.isPressed)
    }
}

struct MGListRowButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .background(configuration.isPressed ? Color.mgSecondary.opacity(0.1) : .clear)
            .animation(.easeOut(duration: 0.1), value: configuration.isPressed)
    }
}

// MARK: - View Modifiers
struct MGCard: ViewModifier {
    var useMaterial: Bool = false

    func body(content: Content) -> some View {
        content
            .background {
                if useMaterial {
                    RoundedRectangle(cornerRadius: .mgCornerMedium, style: .continuous)
                        .fill(.regularMaterial)
                } else {
                    RoundedRectangle(cornerRadius: .mgCornerMedium, style: .continuous)
                        .fill(Color.mgBackground)
                        .shadow(color: .black.opacity(0.06), radius: 8, x: 0, y: 2)
                }
            }
    }
}

extension View {
    // Card variants
    func mgCard(useMaterial: Bool = false) -> some View {
        modifier(MGCard(useMaterial: useMaterial))
    }

    func mgGlassCard() -> some View {
        self
            .background {
                RoundedRectangle(cornerRadius: .mgCornerMedium, style: .continuous)
                    .fill(.ultraThinMaterial)
            }
    }

    func mgProminentCard() -> some View {
        self
            .background {
                RoundedRectangle(cornerRadius: .mgCornerMedium, style: .continuous)
                    .fill(.regularMaterial)
                    .shadow(color: .black.opacity(0.1), radius: 8, x: 0, y: 4)
            }
    }

    // Typography helpers
    func mgSectionHeader() -> some View {
        self
            .font(.mgTitle3)
            .foregroundStyle(Color.mgPrimary)
    }
}

// MARK: - Haptic Feedback
struct HapticManager {
    private static let impactLight = UIImpactFeedbackGenerator(style: .light)
    private static let impactMedium = UIImpactFeedbackGenerator(style: .medium)
    private static let selectionGenerator = UISelectionFeedbackGenerator()
    private static let notificationGenerator = UINotificationFeedbackGenerator()

    static func light() {
        impactLight.impactOccurred()
    }

    static func medium() {
        impactMedium.impactOccurred()
    }

    static func selection() {
        selectionGenerator.selectionChanged()
    }

    static func success() {
        notificationGenerator.notificationOccurred(.success)
    }

    static func warning() {
        notificationGenerator.notificationOccurred(.warning)
    }

    static func error() {
        notificationGenerator.notificationOccurred(.error)
    }
}

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

    // Video player (intentionally absolute - video standard)
    static let mgVideoPlayerBackground = Color.black
    static let mgVideoPlayerText = Color.white
    static let mgVideoPlayerSecondaryText = Color(white: 1, opacity: 0.7)
    static let mgVideoPlayerOverlay = Color(white: 0, opacity: 0.3)
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

// MARK: - Adaptive Shadows
private struct MGShadowSubtle: ViewModifier {
    @Environment(\.colorScheme) var colorScheme

    func body(content: Content) -> some View {
        content.shadow(
            color: .black.opacity(colorScheme == .dark ? 0.3 : 0.06),
            radius: 4,
            x: 0,
            y: 2
        )
    }
}

private struct MGShadowMedium: ViewModifier {
    @Environment(\.colorScheme) var colorScheme

    func body(content: Content) -> some View {
        content.shadow(
            color: .black.opacity(colorScheme == .dark ? 0.4 : 0.1),
            radius: 8,
            x: 0,
            y: 4
        )
    }
}

private struct MGShadowProminent: ViewModifier {
    @Environment(\.colorScheme) var colorScheme

    func body(content: Content) -> some View {
        content.shadow(
            color: .black.opacity(colorScheme == .dark ? 0.5 : 0.15),
            radius: 12,
            x: 0,
            y: 6
        )
    }
}

// MARK: - View Modifiers
struct MGCard: ViewModifier {
    var useMaterial: Bool = false
    @Environment(\.colorScheme) var colorScheme

    func body(content: Content) -> some View {
        content
            .background {
                if useMaterial {
                    RoundedRectangle(cornerRadius: .mgCornerMedium, style: .continuous)
                        .fill(.regularMaterial)
                } else {
                    RoundedRectangle(cornerRadius: .mgCornerMedium, style: .continuous)
                        .fill(Color.mgBackground)
                        .shadow(
                            color: .black.opacity(colorScheme == .dark ? 0.3 : 0.06),
                            radius: 8,
                            x: 0,
                            y: 2
                        )
                }
            }
    }
}

extension View {
    // Shadow modifiers (adaptive to dark mode)
    func mgShadowSubtle() -> some View {
        modifier(MGShadowSubtle())
    }

    func mgShadowMedium() -> some View {
        modifier(MGShadowMedium())
    }

    func mgShadowProminent() -> some View {
        modifier(MGShadowProminent())
    }

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
            }
            .mgShadowMedium()
    }

    // Typography helpers
    func mgSectionHeader() -> some View {
        self
            .font(.mgTitle3)
            .foregroundStyle(Color.mgPrimary)
    }

    // MARK: - Elevation System

    /// Level 1: Resting on surface (cards, chips)
    /// Use for: Movie cards, collection items, small elements
    func mgElevationLow() -> some View {
        modifier(MGElevationLow())
    }

    /// Level 2: Floating above (nav, toolbars)
    /// Use for: Navigation headers, floating action buttons, persistent UI
    func mgElevationMedium() -> some View {
        modifier(MGElevationMedium())
    }

    /// Level 3: Modal/overlay (sheets, popovers)
    /// Use for: Trailer modal, sign-in sheet, full-screen overlays
    func mgElevationHigh() -> some View {
        modifier(MGElevationHigh())
    }

    /// Cinematic glow for movie posters
    /// Adds atmospheric rim light around posters for premium feel
    func mgCinematicGlow(color: Color = .mgGold) -> some View {
        modifier(MGCinematicGlow(glowColor: color))
    }

    /// Hero card style for prominent featured content
    /// Use for: Movie detail hero section, featured collections
    func mgHeroCard() -> some View {
        modifier(MGHeroCard())
    }
}

// MARK: - Elevation Implementations

private struct MGElevationLow: ViewModifier {
    @Environment(\.colorScheme) var colorScheme

    func body(content: Content) -> some View {
        content
            // Primary shadow (key light from above)
            .shadow(
                color: .black.opacity(colorScheme == .dark ? 0.4 : 0.08),
                radius: 4,
                x: 0,
                y: 2
            )
            // Secondary shadow (ambient/fill light)
            .shadow(
                color: .black.opacity(colorScheme == .dark ? 0.2 : 0.04),
                radius: 8,
                x: 0,
                y: 4
            )
    }
}

private struct MGElevationMedium: ViewModifier {
    @Environment(\.colorScheme) var colorScheme

    func body(content: Content) -> some View {
        content
            // Key light shadow
            .shadow(
                color: .black.opacity(colorScheme == .dark ? 0.5 : 0.12),
                radius: 8,
                x: 0,
                y: 4
            )
            // Ambient shadow (broader, softer)
            .shadow(
                color: .black.opacity(colorScheme == .dark ? 0.3 : 0.06),
                radius: 16,
                x: 0,
                y: 8
            )
    }
}

private struct MGElevationHigh: ViewModifier {
    @Environment(\.colorScheme) var colorScheme

    func body(content: Content) -> some View {
        content
            // Dramatic key light
            .shadow(
                color: .black.opacity(colorScheme == .dark ? 0.6 : 0.16),
                radius: 16,
                x: 0,
                y: 8
            )
            // Strong ambient shadow
            .shadow(
                color: .black.opacity(colorScheme == .dark ? 0.4 : 0.08),
                radius: 32,
                x: 0,
                y: 16
            )
            // Atmospheric halo (brand color)
            .shadow(
                color: Color.mgGold.opacity(0.1),
                radius: 40,
                x: 0,
                y: 20
            )
    }
}

// MARK: - Cinematic Effects

private struct MGCinematicGlow: ViewModifier {
    let glowColor: Color
    @Environment(\.colorScheme) var colorScheme

    func body(content: Content) -> some View {
        content
            // Inner glow (tight)
            .shadow(
                color: glowColor.opacity(colorScheme == .dark ? 0.3 : 0.2),
                radius: 8,
                x: 0,
                y: 0
            )
            // Outer atmospheric glow (wide)
            .shadow(
                color: glowColor.opacity(colorScheme == .dark ? 0.2 : 0.1),
                radius: 20,
                x: 0,
                y: 0
            )
    }
}

private struct MGHeroCard: ViewModifier {
    @Environment(\.colorScheme) var colorScheme

    func body(content: Content) -> some View {
        content
            .background {
                RoundedRectangle(cornerRadius: .mgCornerLarge, style: .continuous)
                    .fill(.thickMaterial)
            }
            // Cinematic edge treatment
            .overlay {
                RoundedRectangle(cornerRadius: .mgCornerLarge, style: .continuous)
                    .strokeBorder(
                        LinearGradient(
                            colors: [
                                Color.mgGold.opacity(0.4),
                                Color.mgGold.opacity(0.1),
                                .clear
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 2
                    )
            }
            .mgElevationHigh()
    }
}

// MARK: - Enhanced Glass Button Style

struct MGGlassButtonStyle: ButtonStyle {
    @Environment(\.colorScheme) var colorScheme
    var glowOnPress: Bool = true

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.mgHeadline)
            .foregroundStyle(Color.mgPrimary)
            .padding(.horizontal, .mgSpacing16)
            .padding(.vertical, .mgSpacing12)
            .background {
                ZStack {
                    // Base glass layer
                    RoundedRectangle(cornerRadius: .mgCornerSmall, style: .continuous)
                        .fill(.ultraThinMaterial)

                    // Press state: gold tint
                    if configuration.isPressed {
                        RoundedRectangle(cornerRadius: .mgCornerSmall, style: .continuous)
                            .fill(Color.mgGold.opacity(0.2))
                    }

                    // Edge highlight (brightens on press)
                    RoundedRectangle(cornerRadius: .mgCornerSmall, style: .continuous)
                        .strokeBorder(
                            .white.opacity(configuration.isPressed ? 0.3 : 0.15),
                            lineWidth: 1
                        )
                }
            }
            // Interactive depth: scale + shadow
            .scaleEffect(configuration.isPressed ? 0.96 : 1.0)
            .shadow(
                color: .black.opacity(colorScheme == .dark ? 0.4 : 0.15),
                radius: configuration.isPressed ? 4 : 8,
                x: 0,
                y: configuration.isPressed ? 2 : 4
            )
            // Optional: glow on press for cinematic feel
            .shadow(
                color: glowOnPress && configuration.isPressed
                    ? Color.mgGold.opacity(0.3)
                    : .clear,
                radius: 16,
                x: 0,
                y: 0
            )
            .animation(.spring(response: 0.3, dampingFraction: 0.6), value: configuration.isPressed)
    }
}

// MARK: - Layered Glass Card Component

/// Enhanced card with layered glass + atmospheric depth
/// Replaces flat .regularMaterial cards
struct LayeredGlassCard<Content: View>: View {
    let content: Content
    var cornerRadius: CGFloat = .mgCornerMedium
    var elevation: ElevationLevel = .low

    enum ElevationLevel {
        case low, medium, high
    }

    init(
        cornerRadius: CGFloat = .mgCornerMedium,
        elevation: ElevationLevel = .low,
        @ViewBuilder content: () -> Content
    ) {
        self.cornerRadius = cornerRadius
        self.elevation = elevation
        self.content = content()
    }

    var body: some View {
        content
            .padding(.mgSpacing16)
            .background {
                ZStack {
                    // Layer 1: Base material
                    RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                        .fill(.regularMaterial)

                    // Layer 2: Atmospheric tint (subtle gradient)
                    RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                        .fill(
                            LinearGradient(
                                colors: [
                                    Color.mgGold.opacity(0.03),
                                    Color.clear,
                                    Color.black.opacity(0.05)
                                ],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )

                    // Layer 3: Edge highlight for depth
                    RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                        .strokeBorder(
                            LinearGradient(
                                colors: [
                                    .white.opacity(0.2),
                                    .clear
                                ],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            lineWidth: 1
                        )
                }
            }
            // Apply elevation based on level
            .apply { view in
                switch elevation {
                case .low:
                    view.mgElevationLow()
                case .medium:
                    view.mgElevationMedium()
                case .high:
                    view.mgElevationHigh()
                }
            }
    }
}

// Helper for conditional view application
private extension View {
    func apply<V: View>(@ViewBuilder _ transform: (Self) -> V) -> V {
        transform(self)
    }
}

// MARK: - Atmospheric Background Component

struct MGAtmosphericBackground: View {
    @State private var animateGradient = false
    @Environment(\.colorScheme) var colorScheme

    var body: some View {
        ZStack {
            // Base color
            (colorScheme == .dark ? Color.black : Color.mgBackground)
                .ignoresSafeArea()

            // Animated atmospheric gradient layers
            LinearGradient(
                colors: [
                    Color.mgGold.opacity(animateGradient ? 0.05 : 0.02),
                    Color.mgProgressCopper.opacity(0.03),
                    Color.clear,
                    Color.mgProgressBronze.opacity(0.02)
                ],
                startPoint: animateGradient ? .topLeading : .topTrailing,
                endPoint: animateGradient ? .bottomTrailing : .bottomLeading
            )
            .ignoresSafeArea()
            .onAppear {
                withAnimation(
                    .easeInOut(duration: 8)
                    .repeatForever(autoreverses: true)
                ) {
                    animateGradient.toggle()
                }
            }

            // Subtle noise texture for film grain (optional)
            Color.white.opacity(0.02)
                .ignoresSafeArea()
                .blendMode(.overlay)
        }
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

// MARK: - Loading States

/// Reusable skeleton loading carousel for horizontal scrolling content
struct SkeletonCarousel: View {
    var body: some View {
        VStack(alignment: .leading, spacing: .mgSpacing8) {
            // Header skeleton
            HStack {
                RoundedRectangle(cornerRadius: .mgCornerTiny)
                    .fill(Color.mgSecondary.opacity(0.15))
                    .frame(width: 160, height: 19)

                Spacer()

                RoundedRectangle(cornerRadius: .mgCornerTiny)
                    .fill(Color.mgSecondary.opacity(0.15))
                    .frame(width: 52, height: 14)
            }
            .padding(.horizontal, .mgSpacing16)

            // Cards skeleton
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: .mgSpacing8) {
                    ForEach(0..<5, id: \.self) { _ in
                        RoundedRectangle(cornerRadius: .mgCornerSmall)
                            .fill(Color.mgSecondary.opacity(0.15))
                            .frame(width: 170, height: 227)
                    }
                }
                .padding(.horizontal, .mgSpacing16)
            }
        }
        .padding(.vertical, .mgSpacing4)
    }
}

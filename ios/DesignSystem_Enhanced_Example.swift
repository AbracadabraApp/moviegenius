//
//  DesignSystem_Enhanced_Example.swift
//  moviegenius
//
//  IMPLEMENTATION GUIDE: Add these to your existing DesignSystem.swift
//  Based on: MODERN_IOS_DESIGN_RECOMMENDATIONS.md
//

import SwiftUI

// MARK: - Enhanced Elevation System
// ADD AFTER LINE 165 in your current DesignSystem.swift

extension View {
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
            .modifier(ElevationModifier(level: elevation))
    }
}

// Helper for LayeredGlassCard elevation
private struct ElevationModifier: ViewModifier {
    let level: LayeredGlassCard<AnyView>.ElevationLevel

    func body(content: Content) -> some View {
        switch level {
        case .low:
            content.mgElevationLow()
        case .medium:
            content.mgElevationMedium()
        case .high:
            content.mgElevationHigh()
        }
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

// MARK: - Usage Examples

#Preview("Elevation Levels") {
    VStack(spacing: 40) {
        // Low elevation card
        Text("Low Elevation")
            .padding(.mgSpacing16)
            .background(Color.mgSecondaryBackground)
            .clipShape(RoundedRectangle(cornerRadius: .mgCornerMedium))
            .mgElevationLow()

        // Medium elevation card
        Text("Medium Elevation")
            .padding(.mgSpacing16)
            .background(Color.mgSecondaryBackground)
            .clipShape(RoundedRectangle(cornerRadius: .mgCornerMedium))
            .mgElevationMedium()

        // High elevation card
        Text("High Elevation")
            .padding(.mgSpacing16)
            .background(Color.mgSecondaryBackground)
            .clipShape(RoundedRectangle(cornerRadius: .mgCornerMedium))
            .mgElevationHigh()
    }
    .padding()
}

#Preview("Cinematic Glow") {
    ZStack {
        Color.black
            .ignoresSafeArea()

        VStack(spacing: 40) {
            // Poster without glow
            Rectangle()
                .fill(Color.mgProgressCopper)
                .frame(width: 125, height: 188)
                .clipShape(RoundedRectangle(cornerRadius: .mgCornerSmall))

            // Poster with glow
            Rectangle()
                .fill(Color.mgProgressCopper)
                .frame(width: 125, height: 188)
                .clipShape(RoundedRectangle(cornerRadius: .mgCornerSmall))
                .mgCinematicGlow()
        }
    }
}

#Preview("Layered Glass Card") {
    ZStack {
        MGAtmosphericBackground()

        LayeredGlassCard(elevation: .medium) {
            VStack(alignment: .leading, spacing: .mgSpacing12) {
                Text("The Godfather")
                    .font(.mgHeadline)

                Text("The aging patriarch of an organized crime dynasty transfers control...")
                    .font(.mgBody)
                    .foregroundStyle(Color.mgSecondary)
                    .lineLimit(3)

                HStack {
                    Button("Watch Trailer") {}
                        .buttonStyle(MGGlassButtonStyle())

                    Button("Add to Queue") {}
                        .buttonStyle(MGGlassButtonStyle())
                }
            }
        }
        .padding()
    }
}

#Preview("Glass Button Styles") {
    VStack(spacing: .mgSpacing20) {
        Button("Primary Action") {}
            .buttonStyle(MGGlassButtonStyle())

        Button("With Glow") {}
            .buttonStyle(MGGlassButtonStyle(glowOnPress: true))

        Button("No Glow") {}
            .buttonStyle(MGGlassButtonStyle(glowOnPress: false))
    }
    .padding()
    .background(Color.mgSecondaryBackground)
}

//
//  ProjectorBeamIcon.swift
//  moviegenius
//
//  App icon design - Projector lens with golden beam
//

import SwiftUI

struct ProjectorBeamIcon: View {
    var body: some View {
        ZStack {
            // Black background
            Rectangle()
                .fill(.black)
            
            // Concentric circles (lens rings)
            ForEach(0..<6) { index in
                Circle()
                    .stroke(
                        LinearGradient(
                            colors: [
                                Color(red: 212/255, green: 175/255, blue: 55/255).opacity(ringOpacity(for: index)),
                                Color(red: 212/255, green: 175/255, blue: 55/255).opacity(ringOpacity(for: index) * 0.7)
                            ],
                            startPoint: .top,
                            endPoint: .bottom
                        ),
                        lineWidth: ringWidth(for: index)
                    )
                    .frame(width: ringSize(for: index), height: ringSize(for: index))
            }
            
            // Center glow (light source)
            ZStack {
                // Outer glow
                Circle()
                    .fill(
                        RadialGradient(
                            colors: [
                                Color(red: 255/255, green: 223/255, blue: 128/255).opacity(0.9),
                                Color(red: 212/255, green: 175/255, blue: 55/255).opacity(0.6),
                                Color(red: 212/255, green: 175/255, blue: 55/255).opacity(0.0)
                            ],
                            center: .center,
                            startRadius: 0,
                            endRadius: 80
                        )
                    )
                    .frame(width: 160, height: 160)
                    .blur(radius: 20)
                
                // Core light
                Circle()
                    .fill(
                        RadialGradient(
                            colors: [
                                .white,
                                Color(red: 255/255, green: 240/255, blue: 180/255),
                                Color(red: 212/255, green: 175/255, blue: 55/255)
                            ],
                            center: .center,
                            startRadius: 0,
                            endRadius: 40
                        )
                    )
                    .frame(width: 80, height: 80)
                
                // Inner highlight
                Circle()
                    .fill(.white)
                    .frame(width: 30, height: 30)
                    .blur(radius: 5)
            }
            
            // Subtle lens flare streaks (optional detail)
            ForEach(0..<4) { index in
                Capsule()
                    .fill(
                        LinearGradient(
                            colors: [
                                .white.opacity(0.0),
                                .white.opacity(0.15),
                                .white.opacity(0.0)
                            ],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .frame(width: 600, height: 2)
                    .rotationEffect(.degrees(Double(index) * 45))
                    .blur(radius: 1)
            }
        }
        .frame(width: 1024, height: 1024)
    }
    
    // Ring sizing (outer to inner)
    private func ringSize(for index: Int) -> CGFloat {
        let sizes: [CGFloat] = [900, 750, 600, 450, 300, 180]
        return sizes[index]
    }
    
    // Ring width (thicker outer rings)
    private func ringWidth(for index: Int) -> CGFloat {
        let widths: [CGFloat] = [8, 7, 6, 5, 4, 3]
        return widths[index]
    }
    
    // Ring opacity (brighter toward center)
    private func ringOpacity(for index: Int) -> Double {
        let opacities: [Double] = [0.3, 0.4, 0.5, 0.6, 0.75, 0.9]
        return opacities[index]
    }
}

// MARK: - Variation B: Light Burst (stronger beams, fewer rings)

struct ProjectorBeamIconB: View {
    var body: some View {
        ZStack {
            Rectangle()
                .fill(.black)

            // Radial light beams (8 beams)
            ForEach(0..<8) { index in
                Capsule()
                    .fill(
                        LinearGradient(
                            colors: [
                                Color(red: 212/255, green: 175/255, blue: 55/255).opacity(0.0),
                                Color(red: 212/255, green: 175/255, blue: 55/255).opacity(0.4),
                                Color(red: 212/255, green: 175/255, blue: 55/255).opacity(0.0)
                            ],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .frame(width: 900, height: 60)
                    .rotationEffect(.degrees(Double(index) * 45))
                    .blur(radius: 15)
            }

            // Fewer, bolder rings
            ForEach(0..<4) { index in
                Circle()
                    .stroke(
                        Color(red: 212/255, green: 175/255, blue: 55/255).opacity([0.4, 0.6, 0.8, 1.0][index]),
                        lineWidth: [12, 10, 8, 6][index]
                    )
                    .frame(width: [900, 650, 400, 200][index], height: [900, 650, 400, 200][index])
            }

            // Intense center glow
            ZStack {
                Circle()
                    .fill(
                        RadialGradient(
                            colors: [
                                .white,
                                Color(red: 255/255, green: 240/255, blue: 180/255),
                                Color(red: 212/255, green: 175/255, blue: 55/255).opacity(0.0)
                            ],
                            center: .center,
                            startRadius: 0,
                            endRadius: 100
                        )
                    )
                    .frame(width: 200, height: 200)
                    .blur(radius: 30)

                Circle()
                    .fill(.white)
                    .frame(width: 60, height: 60)
            }
        }
        .frame(width: 1024, height: 1024)
    }
}

// MARK: - Variation C: Aperture Blades (camera lens style)

struct ProjectorBeamIconC: View {
    var body: some View {
        ZStack {
            Rectangle()
                .fill(.black)

            // Hexagonal aperture blades (6-blade aperture)
            ForEach(0..<6) { index in
                Rectangle()
                    .fill(
                        LinearGradient(
                            colors: [
                                Color(red: 212/255, green: 175/255, blue: 55/255).opacity(0.6),
                                Color(red: 212/255, green: 175/255, blue: 55/255).opacity(0.2)
                            ],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .frame(width: 600, height: 40)
                    .offset(x: -200)
                    .rotationEffect(.degrees(Double(index) * 60))
            }

            // Circular rings
            ForEach(0..<5) { index in
                Circle()
                    .stroke(
                        Color(red: 212/255, green: 175/255, blue: 55/255).opacity([0.3, 0.5, 0.7, 0.85, 1.0][index]),
                        lineWidth: [6, 6, 6, 5, 4][index]
                    )
                    .frame(width: [850, 700, 500, 320, 180][index], height: [850, 700, 500, 320, 180][index])
            }

            // Center hexagon (iris)
            Path { path in
                let center = CGPoint(x: 512, y: 512)
                let radius: CGFloat = 120
                for i in 0..<6 {
                    let angle = CGFloat(i) * .pi / 3 - .pi / 2
                    let point = CGPoint(
                        x: center.x + radius * cos(angle),
                        y: center.y + radius * sin(angle)
                    )
                    if i == 0 {
                        path.move(to: point)
                    } else {
                        path.addLine(to: point)
                    }
                }
                path.closeSubpath()
            }
            .fill(
                RadialGradient(
                    colors: [
                        .white,
                        Color(red: 255/255, green: 240/255, blue: 180/255),
                        Color(red: 212/255, green: 175/255, blue: 55/255)
                    ],
                    center: .center,
                    startRadius: 0,
                    endRadius: 120
                )
            )
            .blur(radius: 2)

            // Inner glow
            Circle()
                .fill(
                    RadialGradient(
                        colors: [
                            .white.opacity(0.8),
                            .white.opacity(0.0)
                        ],
                        center: .center,
                        startRadius: 0,
                        endRadius: 100
                    )
                )
                .frame(width: 200, height: 200)
                .blur(radius: 20)
        }
        .frame(width: 1024, height: 1024)
    }
}

#Preview {
    ScrollView {
        VStack(spacing: 60) {
            Text("Choose Your Icon")
                .font(.largeTitle.bold())
                .foregroundStyle(.white)
                .padding(.top, 40)

            // Version A: Classic Lens
            VStack(spacing: 20) {
                Text("A: Classic Lens")
                    .font(.headline)
                    .foregroundStyle(.white)

                HStack(spacing: 30) {
                    ProjectorBeamIcon()
                        .frame(width: 200, height: 200)
                        .clipShape(RoundedRectangle(cornerRadius: 200 * 0.2237, style: .continuous))
                        .shadow(color: .black.opacity(0.5), radius: 10, y: 5)

                    ProjectorBeamIcon()
                        .frame(width: 100, height: 100)
                        .clipShape(RoundedRectangle(cornerRadius: 100 * 0.2237, style: .continuous))
                        .shadow(color: .black.opacity(0.5), radius: 5, y: 2)
                }

                Text("Subtle • Many rings • Clean flares")
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.7))
            }

            // Version B: Light Burst
            VStack(spacing: 20) {
                Text("B: Light Burst")
                    .font(.headline)
                    .foregroundStyle(.white)

                HStack(spacing: 30) {
                    ProjectorBeamIconB()
                        .frame(width: 200, height: 200)
                        .clipShape(RoundedRectangle(cornerRadius: 200 * 0.2237, style: .continuous))
                        .shadow(color: .black.opacity(0.5), radius: 10, y: 5)

                    ProjectorBeamIconB()
                        .frame(width: 100, height: 100)
                        .clipShape(RoundedRectangle(cornerRadius: 100 * 0.2237, style: .continuous))
                        .shadow(color: .black.opacity(0.5), radius: 5, y: 2)
                }

                Text("Dramatic • Bold beams • Fewer rings")
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.7))
            }

            // Version C: Aperture Blades
            VStack(spacing: 20) {
                Text("C: Aperture Blades")
                    .font(.headline)
                    .foregroundStyle(.white)

                HStack(spacing: 30) {
                    ProjectorBeamIconC()
                        .frame(width: 200, height: 200)
                        .clipShape(RoundedRectangle(cornerRadius: 200 * 0.2237, style: .continuous))
                        .shadow(color: .black.opacity(0.5), radius: 10, y: 5)

                    ProjectorBeamIconC()
                        .frame(width: 100, height: 100)
                        .clipShape(RoundedRectangle(cornerRadius: 100 * 0.2237, style: .continuous))
                        .shadow(color: .black.opacity(0.5), radius: 5, y: 2)
                }

                Text("Technical • Hexagon iris • Camera lens")
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.7))
            }

            Spacer(minLength: 40)
        }
        .frame(maxWidth: .infinity)
    }
    .background(Color.gray.opacity(0.3))
}

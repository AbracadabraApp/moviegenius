//
//  YouView.swift
//  moviegenius
//
//  Your personal film journey with progressive insights
//

import SwiftUI

struct YouView: View {
    @ObservedObject var favorites = FavoritesManager.shared

    var journeyStage: (icon: String, title: String, description: String) {
        let totalFilms = favorites.lovedMovies.count

        if totalFilms == 0 {
            return ("🎬", "Your Cinematic Journey Begins", "Start building your film collection")
        } else if totalFilms <= 5 {
            return ("🌱", "Building Your Foundation", "\(totalFilms) \(totalFilms == 1 ? "film" : "films") loved")
        } else if totalFilms <= 15 {
            return ("🔍", "Patterns Emerging", "\(totalFilms) films • Taste developing")
        } else {
            return ("🎭", "Cinematic Understanding", "\(totalFilms) films • Strong profile")
        }
    }

    var body: some View {
        ScrollView {
            VStack(spacing: .mgSpacing32) {
                // Journey Progress
                VStack(spacing: .mgSpacing16) {
                    Text(journeyStage.icon)
                        .font(.system(size: 80))

                    Text(journeyStage.title)
                        .font(.mgTitle2)

                    Text(journeyStage.description)
                        .font(.mgBody)
                        .foregroundStyle(Color.mgSecondary)
                }
                .padding(.top, .mgSpacing40)

                // Quick stats
                HStack(spacing: .mgSpacing24) {
                    StatCard(number: "\(favorites.lovedMovies.count)", label: "Loved")
                    StatCard(number: "\(favorites.queueMovies.count)", label: "Queue")
                    StatCard(number: "\(favorites.lovedMovies.count + favorites.queueMovies.count)", label: "Total")
                }
                .padding(.horizontal, .mgSpacing20)

                // Menu sections
                VStack(spacing: 0) {
                    MenuRow(icon: "heart.fill", title: "Films You Love", color: .red, count: favorites.lovedMovies.count)
                    Divider().padding(.leading, 56)
                    MenuRow(icon: "bookmark.fill", title: "Your Queue", color: .blue, count: favorites.queueMovies.count)
                }
                .mgCard()
                .padding(.horizontal, .mgSpacing16)

                VStack(spacing: 0) {
                    MenuRow(icon: "gearshape.fill", title: "Settings", color: .gray)
                    Divider().padding(.leading, 56)
                    MenuRow(icon: "questionmark.circle.fill", title: "Help & Support", color: .gray)
                }
                .mgCard()
                .padding(.horizontal, .mgSpacing16)

                // Educational message
                if favorites.lovedMovies.isEmpty && favorites.queueMovies.isEmpty {
                    VStack(spacing: .mgSpacing12) {
                        Text("Start Your Film Journey")
                            .font(.mgHeadline)
                        Text("Search for films, then tap the heart ❤️ to mark films you love or the bookmark 🔖 to save films to watch later")
                            .font(.mgCaption)
                            .foregroundStyle(Color.mgSecondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding(.mgSpacing24)
                    .mgCard()
                    .padding(.horizontal, .mgSpacing16)
                }

                Spacer(minLength: .mgSpacing40)
            }
            .padding(.bottom, .mgSpacing40)
        }
        .scrollIndicators(.hidden)
        .background(Color.mgGroupedBackground)
        .onAppear {
            favorites.loadFavorites()
        }
    }
}

struct StatCard: View {
    let number: String
    let label: String

    var body: some View {
        VStack(spacing: .mgSpacing8) {
            Text(number)
                .font(.mgTitle)
                .foregroundStyle(Color.mgPrimary)
            Text(label)
                .font(.mgCaption)
                .foregroundStyle(Color.mgSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, .mgSpacing20)
        .mgCard()
    }
}

struct MenuRow: View {
    let icon: String
    let title: String
    let color: Color
    var count: Int? = nil

    var body: some View {
        Button(action: {
            HapticManager.selection()
        }) {
            HStack(spacing: .mgSpacing16) {
                Image(systemName: icon)
                    .font(.system(size: 20))
                    .foregroundStyle(color)
                    .frame(width: 24)

                Text(title)
                    .font(.mgBody)
                    .foregroundStyle(Color.mgPrimary)

                Spacer()

                if let count = count {
                    Text("\(count)")
                        .font(.mgCaption)
                        .foregroundStyle(Color.mgSecondary)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.mgSecondary.opacity(0.1))
                        .clipShape(Capsule())
                }

                Image(systemName: "chevron.right")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(Color.mgSecondary)
            }
            .padding(.horizontal, .mgSpacing16)
            .padding(.vertical, .mgSpacing12 + 2)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    YouView()
}

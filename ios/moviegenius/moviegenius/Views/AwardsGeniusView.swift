//
//  AwardsGeniusView.swift
//  moviegenius
//
//  View for displaying awards with chips and film lists
//

import SwiftUI

struct AwardsGeniusView: View {
    @State private var selectedAward: AwardTier?
    @State private var awards: [AwardTier] = []
    @State private var shuffledAwards: [AwardTier] = []
    @State private var isLoading = true

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                if isLoading {
                    ProgressView("Loading...")
                        .padding(.top, 100)
                } else if awards.isEmpty {
                    AwardsEmptyStateView()
                } else {
                    // Award selector chips
                    AwardChipsSection(
                        awards: shuffledAwards.isEmpty ? awards : shuffledAwards,
                        selectedAward: $selectedAward
                    )

                    // Films list
                    if let award = selectedAward {
                        AwardFilmsSection(award: award)
                    } else {
                        AwardInstructionView()
                    }
                }
            }
        }
        .background(Color.mgBackground)
        .task {
            loadAwards()
        }
    }

    private func loadAwards() {
        isLoading = true

        awards = AwardsGeniusLoader.shared.getAllAwardTiers()
        shuffledAwards = awards.shuffled()

        // Auto-select first award from original order
        if !awards.isEmpty {
            selectedAward = awards[0]
        }

        isLoading = false
    }
}

// MARK: - Award Chips Section
struct AwardChipsSection: View {
    let awards: [AwardTier]
    @Binding var selectedAward: AwardTier?

    var body: some View {
        VStack(alignment: .leading, spacing: .mgSpacing16) {
            // Section header
            Text("Select an award")
                .font(.mgCallout)
                .foregroundStyle(Color.mgSecondary)
                .padding(.horizontal, .mgSpacing16)
                .padding(.top, .mgSpacing16)

            // Chips using FlowLayout like Genius homepage
            FlowLayout(spacing: 6) {
                ForEach(awards) { award in
                    AwardChipView(
                        award: award,
                        isSelected: selectedAward?.id == award.id,
                        action: {
                            withAnimation(.easeInOut(duration: 0.3)) {
                                selectedAward = award
                            }
                        }
                    )
                }
            }
            .padding(.horizontal, .mgSpacing16)
            .padding(.bottom, .mgSpacing20)
        }
        .background(Color.mgBackground)
    }
}

// MARK: - Award Chip View
struct AwardChipView: View {
    let award: AwardTier
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(award.name)
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(isSelected ? Color("HeatTextDark") : Color("HeatTextLight"))
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(isSelected ? Color("HeatLevel5") : Color("HeatLevel0"))
                .cornerRadius(99)
        }
        .buttonStyle(MGChipButtonStyle())
        .sensoryFeedback(.selection, trigger: isSelected)
    }
}

// MARK: - Award Films Section
struct AwardFilmsSection: View {
    let award: AwardTier
    @State private var expandedCount = 30

    private var displayedFilms: [AwardFilm] {
        Array(award.films.prefix(expandedCount))
    }

    private var hasMore: Bool {
        award.films.count > expandedCount
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Award header
            VStack(alignment: .leading, spacing: .mgSpacing6) {
                Text(award.name)
                    .font(.mgTitle2)
                    .foregroundStyle(Color.mgPrimary)

                Text(award.subtitle)
                    .font(.mgSubheadline)
                    .foregroundStyle(Color.mgSecondary)

                Text("\(award.films.count) films")
                    .font(.mgCaption)
                    .foregroundStyle(Color.mgTertiary)
            }
            .padding(.horizontal, .mgSpacing16)
            .padding(.vertical, .mgSpacing16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                LinearGradient(
                    colors: [
                        Color.mgGold.opacity(0.05),
                        Color.mgBackground
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )

            // Films list
            LazyVStack(spacing: 0) {
                ForEach(Array(displayedFilms.enumerated()), id: \.element.id) { index, film in
                    AwardFilmRow(
                        film: film,
                        rank: index + 1,
                        isLast: index == displayedFilms.count - 1 && !hasMore
                    )
                }

                // Load more button
                if hasMore {
                    Button {
                        withAnimation(.easeInOut(duration: 0.3)) {
                            expandedCount = min(expandedCount + 30, award.films.count)
                        }
                    } label: {
                        HStack {
                            Text("Show \(min(30, award.films.count - expandedCount)) more")
                                .font(.mgCallout)
                                .fontWeight(.medium)

                            Image(systemName: "chevron.down")
                                .font(.mgCaption)
                                .fontWeight(.semibold)
                        }
                        .foregroundStyle(Color.mgGold)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, .mgSpacing12)
                        .background(Color.mgSecondary.opacity(0.05))
                    }
                    .buttonStyle(PlainButtonStyle())
                }
            }
        }
    }
}

// MARK: - Film Row
struct AwardFilmRow: View {
    let film: AwardFilm
    let rank: Int
    let isLast: Bool

    var body: some View {
        NavigationLink(value: MovieDestination.detail(tmdbId: film.tmdbId)) {
            HStack(spacing: .mgSpacing12) {
                // Film info
                VStack(alignment: .leading, spacing: .mgSpacing2) {
                    Text(film.title)
                        .font(.mgCallout)
                        .fontWeight(.medium)
                        .foregroundStyle(Color.mgPrimary)
                        .lineLimit(nil)  // No truncation per MOVIE_REPRESENTATION_SPEC.md

                    Text(String(film.year))
                        .font(.mgCaption)
                        .foregroundStyle(Color.mgSecondary)
                }

                Spacer()

                // Chevron
                Image(systemName: "chevron.right")
                    .font(.mgCaption2)
                    .fontWeight(.semibold)
                    .foregroundStyle(Color.mgTertiary)
            }
            .padding(.horizontal, .mgSpacing16)
            .padding(.vertical, .mgSpacing12)
            .background(Color.mgBackground)
            .contentShape(Rectangle())
        }
        .buttonStyle(PlainButtonStyle())
        .overlay(
            // Bottom separator
            Rectangle()
                .fill(Color.mgSecondary.opacity(isLast ? 0 : 0.2))
                .frame(height: 1)
                .padding(.leading, .mgSpacing16),
            alignment: .bottom
        )
    }
}

// MARK: - Supporting Views
struct AwardInstructionView: View {
    var body: some View {
        VStack(spacing: .mgSpacing12) {
            Image(systemName: "arrow.up")
                .font(.mgTitle)
                .foregroundStyle(Color.mgGold)

            Text("Select an award above")
                .font(.mgHeadline)
                .foregroundStyle(Color.mgPrimary)

            Text("Tap any award to see its films")
                .font(.mgCallout)
                .foregroundStyle(Color.mgSecondary)
                .multilineTextAlignment(.center)
        }
        .padding(.mgSpacing32)
        .padding(.top, .mgSpacing48)
    }
}

struct AwardsEmptyStateView: View {
    var body: some View {
        VStack(spacing: .mgSpacing12) {
            Image(systemName: "trophy.circle")
                .font(.system(size: 48))
                .foregroundStyle(Color.mgTertiary)

            Text("No awards available")
                .font(.mgHeadline)
                .foregroundStyle(Color.mgPrimary)
        }
        .padding(.top, 100)
    }
}

#Preview {
    NavigationStack {
        AwardsGeniusView()
    }
}
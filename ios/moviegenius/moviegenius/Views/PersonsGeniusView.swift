//
//  PersonsGeniusView.swift
//  moviegenius
//
//  View for displaying persons (actors, actresses, directors) with chips and filmographies
//

import SwiftUI

struct PersonsGeniusView: View {
    let categoryType: PersonCategoryType
    @State private var selectedPerson: PersonTier?
    @State private var persons: [PersonTier] = []
    @State private var shuffledPersons: [PersonTier] = []
    @State private var isLoading = true

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                if isLoading {
                    ProgressView("Loading...")
                        .padding(.top, 100)
                } else if persons.isEmpty {
                    PersonsEmptyStateView()
                } else {
                    // Person selector chips
                    PersonChipsSection(
                        persons: shuffledPersons.isEmpty ? persons : shuffledPersons,
                        selectedPerson: $selectedPerson
                    )

                    // Filmography list
                    if let person = selectedPerson {
                        PersonFilmographySection(person: person)
                    } else {
                        InstructionView()
                    }
                }
            }
        }
        .background(Color.mgBackground)
        .task {
            loadPersons()
        }
    }

    private func loadPersons() {
        isLoading = true

        if let category = PersonsGeniusLoader.shared.getCategory(type: categoryType) {
            persons = category.tiers.sorted { $0.order < $1.order }
            shuffledPersons = persons.shuffled()
            // Auto-select first person from original order
            if !persons.isEmpty {
                selectedPerson = persons[0]
            }
        }

        isLoading = false
    }
}

// MARK: - Person Chips Section
struct PersonChipsSection: View {
    let persons: [PersonTier]
    @Binding var selectedPerson: PersonTier?

    var body: some View {
        VStack(alignment: .leading, spacing: .mgSpacing16) {
            // Section header
            Text("Select a person")
                .font(.mgCallout)
                .foregroundStyle(Color.mgSecondary)
                .padding(.horizontal, .mgSpacing16)
                .padding(.top, .mgSpacing16)

            // Chips using FlowLayout like Genius homepage
            FlowLayout(spacing: 5) {
                ForEach(persons) { person in
                    PersonChipView(
                        person: person,
                        isSelected: selectedPerson?.id == person.id,
                        action: {
                            withAnimation(.easeInOut(duration: 0.3)) {
                                selectedPerson = person
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

// MARK: - Person Chip View
struct PersonChipView: View {
    let person: PersonTier
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(person.name)
                .font(.system(size: 17, weight: .semibold))
                .foregroundColor(isSelected ? Color("HeatTextDark") : Color("HeatTextLight"))
                .padding(.horizontal, 15)
                .padding(.vertical, 9)
                .background(isSelected ? Color("HeatLevel5") : Color("HeatLevel0"))
                .cornerRadius(99)
        }
        .buttonStyle(MGChipButtonStyle())
        .sensoryFeedback(.selection, trigger: isSelected)
    }
}

// MARK: - Filmography Section
struct PersonFilmographySection: View {
    let person: PersonTier
    @State private var expandedCount = 30

    private var displayedFilms: [PersonFilm] {
        Array(person.films.prefix(expandedCount))
    }

    private var hasMore: Bool {
        person.films.count > expandedCount
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Person header
            VStack(alignment: .leading, spacing: .mgSpacing6) {
                Text(person.name)
                    .font(.mgTitle2)
                    .foregroundStyle(Color.mgPrimary)

                Text(person.subtitle)
                    .font(.mgSubheadline)
                    .foregroundStyle(Color.mgSecondary)

                Text("\(person.films.count) films")
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
                    PersonFilmRow(
                        film: film,
                        rank: index + 1,
                        isLast: index == displayedFilms.count - 1 && !hasMore
                    )
                }

                // Load more button
                if hasMore {
                    Button {
                        withAnimation(.easeInOut(duration: 0.3)) {
                            expandedCount = min(expandedCount + 30, person.films.count)
                        }
                    } label: {
                        HStack {
                            Text("Show \(min(30, person.films.count - expandedCount)) more")
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
struct PersonFilmRow: View {
    let film: PersonFilm
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

                    if let year = film.year {
                        Text(String(year))
                            .font(.mgCaption)
                            .foregroundStyle(Color.mgSecondary)
                    }
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
struct InstructionView: View {
    var body: some View {
        VStack(spacing: .mgSpacing12) {
            Image(systemName: "arrow.up")
                .font(.mgTitle)
                .foregroundStyle(Color.mgGold)

            Text("Select a person above")
                .font(.mgHeadline)
                .foregroundStyle(Color.mgPrimary)

            Text("Tap any name to see their filmography")
                .font(.mgCallout)
                .foregroundStyle(Color.mgSecondary)
                .multilineTextAlignment(.center)
        }
        .padding(.mgSpacing32)
        .padding(.top, .mgSpacing48)
    }
}

struct PersonsEmptyStateView: View {
    var body: some View {
        VStack(spacing: .mgSpacing12) {
            Image(systemName: "person.crop.circle")
                .font(.system(size: 48))
                .foregroundStyle(Color.mgTertiary)

            Text("No data available")
                .font(.mgHeadline)
                .foregroundStyle(Color.mgPrimary)
        }
        .padding(.top, 100)
    }
}

// MARK: - Button Style
struct MGChipButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.95 : 1.0)
            .animation(.easeInOut(duration: 0.2), value: configuration.isPressed)
    }
}

#Preview {
    NavigationStack {
        PersonsGeniusView(categoryType: .actors)
    }
}
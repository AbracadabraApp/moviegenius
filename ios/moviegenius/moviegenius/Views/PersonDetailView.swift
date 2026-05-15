//
//  PersonDetailView.swift
//  moviegenius
//
//  Person (cast/crew) detail view
//

import SwiftUI

struct PersonDetailView: View {
    let personId: Int

    var body: some View {
        ScrollView {
            VStack(spacing: .mgSpacing24) {
                Text("Person Detail")
                    .font(.mgTitle)

                Text("ID: \(personId)")
                    .font(.mgBody)
                    .foregroundStyle(Color.mgSecondary)

                Text("Person details coming soon")
                    .font(.mgCallout)
                    .foregroundStyle(Color.mgSecondary)
                    .padding(.mgSpacing16)
            }
            .padding(.mgSpacing20)
        }
        .background(Color.mgBackground)
        .navigationTitle("Person")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                SearchBarCompactSmaller()
            }
        }
        .toolbarBackground(.visible, for: .navigationBar)
        .toolbarBackground(Color.mgBackground.opacity(0.95), for: .navigationBar)
    }
}

#Preview {
    NavigationStack {
        PersonDetailView(personId: 123)
    }
}

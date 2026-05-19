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
            VStack(spacing: 0) {
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
        }
        .background(Color.mgBackground)
        .navigationTitle("Person Detail")
        .navigationBarTitleDisplayMode(.inline)
    }
}

#Preview {
    NavigationStack {
        PersonDetailView(personId: 123)
    }
}

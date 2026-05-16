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
        ZStack(alignment: .top) {
            ScrollView {
                VStack(spacing: 0) {
                    // Top spacer for overlaid header
                    Color.clear.frame(height: 60)

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

            // Overlaid AppHeader
            VStack {
                AppHeader(showBackButton: true)
                Spacer()
            }
        }
        .background(Color.mgBackground)
        .navigationBarHidden(true)
        .enableSwipeBack()
    }
}

#Preview {
    NavigationStack {
        PersonDetailView(personId: 123)
    }
}

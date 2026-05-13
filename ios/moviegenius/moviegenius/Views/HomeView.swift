//
//  HomeView.swift
//  moviegenius
//
//  Netflix-style homepage with featured collections
//

import SwiftUI

struct HomeView: View {
    @StateObject private var viewModel = HomeViewModel()

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 0) {
                if let error = viewModel.error {
                    // Error state - SHOW THE ERROR!
                    VStack(spacing: .mgSpacing20) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .font(.system(size: 48))
                            .foregroundStyle(Color.mgWarning)

                        Text("Unable to Load Collections")
                            .font(.mgTitle3)
                            .foregroundStyle(Color.mgPrimary)

                        Text(error.localizedDescription)
                            .font(.mgBody)
                            .foregroundStyle(Color.mgSecondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, .mgSpacing32)

                        Button {
                            Task {
                                await viewModel.loadInitialCollections()
                            }
                        } label: {
                            Text("Try Again")
                                .font(.mgBody)
                                .fontWeight(.semibold)
                                .foregroundStyle(.white)
                                .padding(.horizontal, .mgSpacing24)
                                .padding(.vertical, .mgSpacing12)
                                .background(Color.mgGold)
                                .clipShape(RoundedRectangle(cornerRadius: .mgCornerMedium))
                        }
                        .accessibilityLabel("Try again")
                        .accessibilityHint("Retries loading collections")
                    }
                    .padding(.top, 60)
                } else if viewModel.isLoading && viewModel.collections.isEmpty {
                    // Loading skeleton
                    ForEach(0..<3, id: \.self) { _ in
                        SkeletonCarousel()
                    }
                    .padding(.top, .mgSpacing16)
                } else if viewModel.collections.isEmpty {
                    // Empty state
                    VStack(spacing: .mgSpacing16) {
                        Text("🎬")
                            .font(.system(size: 64))
                        Text("No collections available")
                            .font(.mgBody)
                            .foregroundStyle(Color.mgSecondary)
                    }
                    .padding(.top, 60)
                } else {
                    // Collections
                    ForEach(viewModel.collections) { collection in
                        CollectionCarousel(collection: collection)
                    }

                    // Load more trigger
                    Color.clear
                        .frame(height: 1)
                        .onAppear {
                            Task {
                                await viewModel.loadMoreCollections()
                            }
                        }
                }
            }
        }
        .scrollIndicators(.hidden)
        .background(Color.mgBackground)
        .refreshable {
            await viewModel.loadInitialCollections()
        }
        .task {
            await viewModel.loadInitialCollections()
        }
    }
}

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

#Preview {
    HomeView()
}

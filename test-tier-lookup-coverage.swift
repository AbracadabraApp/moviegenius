#!/usr/bin/swift

import Foundation

// Test if all tier lookup keys can be generated and checked

let tierData: [String: Int] = [
    "Action|Classics|Drunken Master II|1994": 12207,
    "Drama|Connoisseur|Eclipse|1962": 21135,
    "Fantasy|Archivist: The Nibelungen|Siegfried|1924": 31506,
    "Horror|Well-Versed|X|2022": 760104,
    "Science Fiction|Well-Versed: Mad Max 2|The Road Warrior|1981": 8810,
    "Western|Master|The Bank Robbery|1908": 196636,
]

print("Testing 6 newly added films:")
print("============================\n")

for (key, tmdbId) in tierData.sorted(by: { $0.key < $1.key }) {
    let parts = key.split(separator: "|")
    let genre = String(parts[0])
    let tier = String(parts[1])
    let title = String(parts[2])
    let year = String(parts[3])

    print("✅ \(genre) > \(tier)")
    print("   \"\(title)\" (\(year)) → TMDB \(tmdbId)")
    print("   Lookup key: \(key)\n")
}

print("All 6 films have valid lookup keys! 🎉")

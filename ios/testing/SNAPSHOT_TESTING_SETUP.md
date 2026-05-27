# Snapshot Testing Setup

**Purpose:** Visual regression testing for navigation components
**Library:** swift-snapshot-testing by Point-Free

---

## Installation

### 1. Add Package Dependency

In Xcode:
1. Select the moviegenius project in navigator
2. Select the moviegenius target
3. Go to "Package Dependencies" tab
4. Click "+" button
5. Enter URL: `https://github.com/pointfreeco/swift-snapshot-testing`
6. Version: "Up to Next Major" from `1.15.0`
7. Add to target: `moviegeniusTests`

### 2. Command Line Installation

```bash
cd /Users/josh.petersen/moviegenius/ios/moviegenius
swift package resolve
```

---

## Usage

### Recording Reference Images

Set `isRecording = true` in test setup:

```swift
override func setUp() {
    super.setUp()
    isRecording = true  // Record new reference images
}
```

Run tests once to generate reference images, then set back to `false`.

### Running Snapshot Tests

```bash
# Run all snapshot tests
xcodebuild test \
  -scheme moviegenius \
  -only-testing:moviegeniusTests/NavigationSnapshotTests \
  -destination 'platform=iOS Simulator,name=iPhone 15'
```

### Updating Snapshots

When UI changes are intentional:

1. Set `isRecording = true`
2. Run tests to generate new reference images
3. Review the changes in `__Snapshots__` directory
4. Commit new reference images
5. Set `isRecording = false`

---

## Reference Images Location

Snapshots are stored at:
```
ios/moviegenius/moviegeniusTests/__Snapshots__/NavigationSnapshotTests/
```

Directory structure:
```
__Snapshots__/
└── NavigationSnapshotTests/
    ├── testRootNavigationBarLargeTitle/
    │   ├── home-large-title-dark.png
    │   └── home-large-title-light.png
    ├── testDetailNavigationBarInlineTitle/
    │   └── detail-inline-title-dark.png
    └── ...
```

---

## Best Practices

### 1. Consistent Environment

Always use the same device for recording:
```swift
assertSnapshot(
    matching: view,
    as: .image(size: CGSize(width: 390, height: 844))  // iPhone 15 Pro
)
```

### 2. Dark/Light Mode Testing

Test both appearances:
```swift
// Dark mode
assertSnapshot(
    matching: view,
    as: .image(traits: .init(userInterfaceStyle: .dark)),
    named: "dark"
)

// Light mode
assertSnapshot(
    matching: view,
    as: .image(traits: .init(userInterfaceStyle: .light)),
    named: "light"
)
```

### 3. Precision Threshold

Allow minor differences (anti-aliasing, etc):
```swift
assertSnapshot(
    matching: view,
    as: .image(precision: 0.99)  // 99% match required
)
```

---

## Troubleshooting

### "No reference image found"

First time running test. Set `isRecording = true` and run again.

### "Snapshot does not match reference"

1. Review the diff in test output
2. If change is intentional, update reference image
3. If unintentional, fix the regression

### Tests Fail on CI

Ensure CI uses same iOS version and device:
```yaml
- name: Run Snapshot Tests
  run: |
    xcrun simctl list devices
    xcodebuild test \
      -scheme moviegenius \
      -only-testing:moviegeniusTests/NavigationSnapshotTests \
      -destination 'platform=iOS Simulator,OS=17.5,name=iPhone 15'
```

---

## Navigation-Specific Tests

Key snapshots to maintain:

1. **Large Title (Root Views)**
   - Movies tab initial state
   - Genius tab initial state
   - Search tab initial state

2. **Inline Title (Detail Views)**
   - Movie detail navigation bar
   - Collection detail navigation bar
   - Person detail navigation bar

3. **Toolbar Configuration**
   - Search bar in toolbar
   - Action buttons in toolbar
   - Background visibility during scroll

4. **Tab Bar**
   - All tabs visible
   - Selected state appearance
   - Badge appearance (if any)

---

## Maintenance

### Weekly
- Run snapshot tests locally
- Update if legitimate changes

### Per Release
- Full snapshot test suite
- Archive old references if major redesign
- Document visual changes in release notes

---

## Related Documentation

- [NavigationSnapshotTests.swift](/ios/moviegenius/moviegeniusTests/NavigationSnapshotTests.swift)
- [NAVIGATION_TEST_PLAN.md](/ios/testing/NAVIGATION_TEST_PLAN.md)
- [swift-snapshot-testing docs](https://github.com/pointfreeco/swift-snapshot-testing)
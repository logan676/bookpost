# iOS Badge UI Gap Analysis Document

Comparative analysis based on design mockups (`stitch_badge_detail_screen`) and current iOS native client implementation.

## Implementation Status (Updated 2025-12-14)

### iOS Frontend Improvements:
- Badge data model extension (tier, rarity, lore, requirements)
- 3D metallic card component (BadgeMetallicCard)
- Detail page three-info tags (Date/Category/Tier)
- Multiple requirements list (Requirements)
- LORE section
- EARNED label
- Grouping and filtering by rarity
- Top statistics card (Read count/Level/Milestone)

### Backend API Improvements (Added 2025-12-14):
- Database Schema added new fields (tier, rarity, lore, xpValue, requirements JSONB)
- Routes Zod Schema updated to support new fields
- Badge Service returns new field data
- Auto-calculation of tier/rarity/xpValue (fallback logic)
- Support for multiple requirements list (requirements array)
- Some default badges have lore text added

---

## 1. Badge List Page (BadgesView)

### 1.1 Top Statistics Card

| Design Requirement | Current Implementation | Gap | Priority |
|-------------------|------------------------|-----|----------|
| Display total badges (12/50) | Implemented (`totalEarned/totalBadges`) | - | - |
| Display read count (1,240 Read) | Not implemented | Need to add reading statistics display | P1 |
| Display user level (Lv5) | Not implemented | Need to add user level display | P1 |
| Next milestone progress (Next Milestone: Level 6) | Not implemented | Need to add milestone progress bar and text | P2 |
| Progress ring chart | Implemented (circular progress ring) | Design uses number+small icon, consider optimizing | P3 |

**Improvement Suggestions:**
```
Design Layout:
+-----------------------------------------+
|  12/50        1,240         Lv5        |
|  Earned       Read         Level       |
|-----------------------------------------|
|  Next Milestone: Level 6   80%         |
+-----------------------------------------+
```

### 1.2 Category Filter

| Design Requirement | Current Implementation | Gap | Priority |
|-------------------|------------------------|-----|----------|
| Filter by rarity (All/Gold/Silver) | Filter by category | Design uses material/rarity, current uses functional category | P1 |
| Filter style (rounded pill) | Implemented | Style basically matches | - |

**Improvement Suggestions:**
- Add rarity filter: `All | Gold | Silver | Bronze/Iron`
- Rarity mapping: Gold=Legendary, Silver=Epic, Bronze=Rare, Iron=Common

### 1.3 Badge Grouping Display

| Design Requirement | Current Implementation | Gap | Priority |
|-------------------|------------------------|-----|----------|
| Group by rarity (Legendary/Epic/Common) | Group by status (Earned/In Progress) | Different grouping logic | P1 |
| Group title with star icon (Legendary (Gold)) | Simple text title | Need to add rarity icon and color | P2 |
| Gold/Silver/Bronze material background cards | No material card background | Need to add 3D material card background | P1 |

**Design Grouping Style:**
```
Legendary (Gold)          <- Gold title
+--------+ +--------+
|        | |        |    <- Gold border cards
| Badge  | | Badge  |
| Name   | | Name   |
+--------+ +--------+

Epic (Silver)             <- Silver title
+--------+ +--------+
|        | |        |    <- Silver border cards
| Badge  | | Badge  |
+--------+ +--------+

Common (Iron)             <- Gray title
+--------+ +--------+
|        | |        |    <- Gray border cards
| Badge  | | Badge  |
| 5/10   | | 500 XP |    <- Progress display
+--------+ +--------+
```

### 1.4 Badge Card Design

| Design Requirement | Current Implementation | Gap | Priority |
|-------------------|------------------------|-----|----------|
| 3D border card | Flat card | Need to add 3D metallic border effect | P1 |
| Gold/Silver/Bronze material background | No material effect | Need to display different materials based on rarity | P1 |
| Circular badge floating above card | Has 3D badge effect | But not floating above card | P2 |
| Progress display in card (5/10 or 500 XP) | Implemented | Style can be optimized | P3 |

---

## 2. Badge Detail Page (EnhancedBadgeDetailSheet)

### 2.1 Top Large Badge Display

| Design Requirement | Current Implementation | Gap | Priority |
|-------------------|------------------------|-----|----------|
| Gold border large 3D badge | Implemented (Interactive3DBadgeView) | Basically matches | - |
| Badge glow effect | Implemented (ambient glow) | Can enhance glow intensity | P3 |
| "EARNED" label | Not implemented | Need to add earned label above badge | P1 |
| Dragon head/decorative elements (DragonBadge) | Not implemented | Design has decorative pattern at top, currently none | P2 |

**Design Badge Area:**
```
        DragonBadge

    +-------------------+
    |    EARNED         |  <- Green earned label
    |                   |
    |    +-------+      |
    |   /         \     |  <- Large 3D gold badge
    |  |   Badge   |    |     with glow effect
    |   \_________/     |
    |                   |
    +-------------------+
```

### 2.2 Badge Information Area

| Design Requirement | Current Implementation | Gap | Priority |
|-------------------|------------------------|-----|----------|
| Badge name (Scholar of the Ancients) | Implemented | - | - |
| Badge description | Implemented | - | - |
| **Three info tags** | Not implemented | **Key gap** | **P0** |
| - Start Date (Oct 24) | Scattered display | Need tag-style display | P1 |
| - Category (Legendary) | Rarity not shown | Need to add rarity tag | P1 |
| - Tier (Gold) | Tier not shown | Need to add tier tag | P1 |

**Design Info Tag Layout:**
```
+--------------+--------------+--------------+
|  Start Date  |   Category   |     Tier     |
|    Oct 24    |  Legendary   |     Gold     |
+--------------+--------------+--------------+
```

### 2.3 Requirements List

| Design Requirement | Current Implementation | Gap | Priority |
|-------------------|------------------------|-----|----------|
| Multiple requirements list | Single progress bar | **Key gap** - Need to support multiple requirements | **P0** |
| Individual progress for each requirement | Not implemented | Need to display independent progress for each requirement | P0 |
| Completed requirements checkmark | Not implemented | Need to add completion status indicator | P1 |
| Progress numbers (10/90) | Has progress display | Need to support multiple progress items | P1 |
| "Completed" label | Not implemented | Need to show completion label when done | P2 |

**Design Requirements Layout:**
```
Requirements                      Completed
---------------------------------------------
 Read 3 History Genre Books       Done
  You've explored the chronicles...

 Highlight 50 Passages            10/90
  [progress bar]
```

### 2.4 LORE Section

| Design Requirement | Current Implementation | Gap | Priority |
|-------------------|------------------------|-----|----------|
| LORE title area | Completely not implemented | Need to add lore/story section | P1 |
| Quote-wrapped text style | Not implemented | Need to add quote style | P2 |
| Lore/background story content | Not implemented | Backend needs to support lore field | P1 |

**Design LORE Layout:**
```
LORE
---------------------------------------------
"Knowledge of the past is the key to the
future. By uncovering the secrets of old, you
carry the torch of civilization forward."
```

### 2.5 Bottom Action Button

| Design Requirement | Current Implementation | Gap | Priority |
|-------------------|------------------------|-----|----------|
| "Show off Badge" button | Has share button | Different text and style | P2 |
| Fixed bottom position | In scroll area | Consider fixing at bottom | P3 |
| Button style (rounded rectangle + icon) | Basically matches | - | - |

---

## 3. Data Model Improvement Requirements

### 3.1 Badge Model Extension

Need to add the following fields to support design features:

```swift
struct Badge {
    // Existing fields...

    // New fields
    let tier: BadgeTier           // Gold/Silver/Bronze/Iron
    let rarity: BadgeRarity       // Legendary/Epic/Rare/Common
    let lore: String?             // Lore/background story
    let requirements: [BadgeRequirement]  // Multiple requirements list
    let startDate: Date?          // Start date
    let xpValue: Int?             // XP value
}

enum BadgeTier: String, Codable {
    case gold, silver, bronze, iron
}

enum BadgeRarity: String, Codable {
    case legendary, epic, rare, common
}

struct BadgeRequirement: Codable {
    let id: Int
    let description: String
    let current: Int
    let target: Int
    let isCompleted: Bool
}
```

### 3.2 User Statistics Data

Need to retrieve the following data for top statistics card:

```swift
struct UserBadgeStats {
    let totalRead: Int            // Total read count
    let userLevel: Int            // User level
    let nextMilestone: String     // Next milestone name
    let milestoneProgress: Double // Milestone progress percentage
}
```

---

## 4. Priority Summary

### P0 (Must Implement - Core Functionality Gap)
1. **Multiple requirements list** - Requirements section supports displaying multiple progress bars
2. **Three info tags** - Start Date / Category / Tier tag display

### P1 (Important - Major Visual Gap)
3. Badge card 3D material background (Gold/Silver/Bronze)
4. Group by rarity (Legendary/Epic/Common)
5. Filter by rarity (Gold/Silver)
6. "EARNED" earned label
7. LORE section
8. Top statistics card - Read count and user level

### P2 (Medium - Experience Optimization)
9. Group title star style (Legendary)
10. Badge floating above card effect
11. Top decorative element (DragonBadge)
12. Next milestone progress

### P3 (Low Priority - Detail Polish)
13. Progress ring optimization
14. Glow effect enhancement
15. Bottom button fixed position

---

## 5. Implementation Suggestions

### 5.1 Card Material Effect Implementation

```swift
struct BadgeMetallicCard: View {
    let tier: BadgeTier

    var metallicGradient: LinearGradient {
        switch tier {
        case .gold:
            return LinearGradient(
                colors: [
                    Color(hex: "FFD700"),
                    Color(hex: "FFA500"),
                    Color(hex: "B8860B")
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        case .silver:
            return LinearGradient(
                colors: [
                    Color(hex: "C0C0C0"),
                    Color(hex: "A8A8A8"),
                    Color(hex: "808080")
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        // ... bronze, iron
        }
    }
}
```

### 5.2 Info Tag Component

```swift
struct BadgeInfoTag: View {
    let title: String
    let value: String

    var body: some View {
        VStack(spacing: 4) {
            Text(title)
                .font(.caption2)
                .foregroundColor(.secondary)
            Text(value)
                .font(.subheadline)
                .fontWeight(.medium)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
        .background(Color(.systemGray6))
        .cornerRadius(8)
    }
}
```

### 5.3 Requirement List Component

```swift
struct RequirementRow: View {
    let requirement: BadgeRequirement

    var body: some View {
        HStack {
            // Completion status icon
            Image(systemName: requirement.isCompleted ? "checkmark.circle.fill" : "circle")
                .foregroundColor(requirement.isCompleted ? .green : .gray)

            VStack(alignment: .leading, spacing: 4) {
                Text(requirement.description)
                    .font(.subheadline)

                if !requirement.isCompleted {
                    ProgressView(value: Double(requirement.current), total: Double(requirement.target))
                        .tint(.orange)
                }
            }

            Spacer()

            // Progress/completion label
            if requirement.isCompleted {
                Text("Done")
                    .font(.caption)
                    .foregroundColor(.green)
            } else {
                Text("\(requirement.current)/\(requirement.target)")
                    .font(.caption)
                    .foregroundColor(.orange)
            }
        }
    }
}
```

---

## 6. Backend API Improvement Requirements

To support the above UI improvements, the backend API needs to return the following additional fields:

1. **Badge Response** additions:
   - `tier`: string (gold/silver/bronze/iron)
   - `rarity`: string (legendary/epic/rare/common)
   - `lore`: string (lore text)
   - `requirements`: array (multiple requirements)
   - `xp_value`: number

2. **User Statistics API** additions:
   - Total read count
   - User level
   - Next milestone information

---

*Document Generated: 2025-12-14*
*Based on Design: stitch_badge_detail_screen/screen.png, screen copy.png*

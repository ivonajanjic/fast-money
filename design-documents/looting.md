# Looting Game Mode: "Destroy"

## Feature Overview
The **"Destroy" Game Mode** is a secondary interaction triggered when a player lands on a "Destroy" wedge on the main spin wheel. It serves as a mock social interaction where players must pass a trivia gate to "loot" a ghost player's room for coin rewards.

---

## Purpose of the Feature
* **Skill-Based Gate:** Introduces a layer of player agency via trivia before granting high-value rewards.
* **Social Simulation:** Mimics the "raid" mechanics found in social casino games using "ghost" rooms for a victimless prototype experience.
* **Economic Variety:** Provides a variable reward outcome (50–200 coins) to keep the core loop engaging.

---

## User Stories
* **As a player**, I want my wheel landing to lead to a mini-game so that the gameplay feels varied.
* **As a player**, I want to answer a trivia question to prove my skill and unlock the ability to destroy an object.
* **As a system**, I need to award a small consolation prize if the player fails the trivia so they don't feel entirely punished for a "Destroy" land.

---

## Functional Design Requirements
* **Trigger:** The mode must activate immediately when the spin wheel stops on a "Destroy" wedge.
* **Trivia Gate:**
    * Present one question with two possible answers.
    * **Success:** Player proceeds to the "Select Card" screen.
    * **Failure:** Player is "Blocked," receives a small coin consolidation prize, and the mode ends.
* **Looting Interaction:**
    * Display three face-down cards marked with "?".
    * The player selects one card to reveal a destroyed object (emoji-based).
* **Reward Logic:** * Rewards are randomized between **50 and 200 coins** regardless of the object revealed.
    * The UI must display: "You destroyed [Owner]'s [Object] and got $[Amount]".

---

## Non-Functional Design Requirements
* **Visual Consistency:** The UI should use dark backgrounds, gold-accented cards, and emoji-based icons for objects.
* **Emoji Fallback:** If a specific object emoji is unavailable, the system should default to a random house-related emoji.
* **State Management:** The "destroyed" state is cosmetic and does not need to persist once the player returns to the home screen.

---

## Technical Information

### JSON Schema (`players_rooms.json`)
Cursor should generate this file to populate the "ghost rooms".

```json
{
  "rooms": [
    {
      "id": 1,
      "owner_name": "Vishakh",
      "objects": [
        {"name": "Controller", "emoji": "🎮"},
        {"name": "PC", "emoji": "🖥️"},
        {"name": "Bed", "emoji": "🛌"}
      ]
    },
    {
      "id": 2,
      "owner_name": "DesignBuddy",
      "objects": [
        {"name": "Laptop", "emoji": "💻"},
        {"name": "Coffee", "emoji": "☕"},
        {"name": "Desk", "emoji": "🗄️"}
      ]
    }
  ]
}
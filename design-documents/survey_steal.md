# survey_steal.md

## I. Feature Overview
**Survey Steal** is a high-stakes, rapid-fire mini-game triggered via the Spin Wheel. The player is presented with a Family Feud board that is already partially solved (2 or 3 out of 5 slots filled). To successfully "steal" the board and claim a **2x point multiplier**, the player must identify all remaining correct answers from a fixed pool of options within **20 seconds** without a single mistake.

## II. Purpose of the Feature
* **Engagement Spikes:** To introduce a high-tension "micro-session" within the larger game loop.
* **Strategic Catch-up:** To give players a chance to swing the score significantly through "perfect play."
* **Skill Differentiation:** To reward players who can quickly process survey categories and filter out decoys under pressure.

## III. User Stories
* **As a player,** I want to see a rival's name (e.g., "Vishakh’s Board") to feel the satisfaction of "stealing" their points.
* **As a player,** I want to see the remaining empty slots on the board so I know exactly how many correct answers I need to find.
* **As a player,** I need the board to reveal an answer the moment I tap it so I can move to the next one instantly.
* **As a system,** I must terminate the session immediately if an incorrect answer is chosen, as there are no "second chances" in a Steal.

## IV. Functional Design Requirements
### 1. Game State & Initialization
* **Board Setup:** Pull a survey with exactly **5 total answers**.
* **Pre-fill Logic:** Randomly reveal **2 or 3** of the top answers.
* **Option Generation:** Populate a grid of **6 buttons** containing:
    * The remaining (2 or 3) correct answers.
    * The remainder filled with "Distractor" (incorrect) answers.
* **Timer:** A **20-second** countdown begins immediately upon the UI becoming interactable.

### 2. Player Interaction
* **Input:** Tapping an option button.
* **Any-Order Selection:** Players are not required to guess answers in their ranked order (#1 through #5).
* **Instant Feedback:** * **Correct Tap:** The corresponding board slot flips immediately to reveal the text and points.
    * **Incorrect Tap:** Display a "Strike" (Red X) and immediately trigger the **Fail State**.

### 3. Win/Loss Conditions
* **Win State:** All 5 board slots are revealed before the timer reaches 0.0s.
    * **Reward:** Total Board Points × 2.
* **Fail State:** Triggered by an incorrect tap OR the timer hitting 0.
    * **Result:** 0 points awarded for the mini-game; return to the main game/wheel.

## V. Non-Functional Design Requirements
* **UI Responsiveness:** Button tap-to-reveal latency must be sub-100ms.
* **Visual Polish:** Use distinct animations for a "Steal Success" vs. a "Steal Fail" to emphasize the high stakes.
* **State Integrity:** If the player force-closes the app, the "Spin" is consumed and the Steal is marked as a Fail.

## VI. Technical Information
* **Component Structure:**
    * `StealHeader`: Displays Rival Name and 20s Timer.
    * `StealBoard`: The 5-slot scoreboard.
    * `OptionGrid`: The 8-button input area.
* **Logic Flow:**
    1.  `Init`: Select Survey -> Mask 2/3 answers -> Shuffle 8 options.
    2.  `Listen`: Monitor taps.
    3.  `Update`: If Correct -> `UpdateBoard` -> `CheckWin`.
    4.  `Terminate`: If Incorrect or `Time == 0` -> `ClearComponent`.
# Jackpot Mode (Fast Money) - Design Specification

## I. Feature Overview
The **Jackpot Mode** is a high-stakes, 5-question finale based on the "Fast Money" round[cite: 1]. Players must navigate five sequential survey questions under intense time pressure to reach a total of **100 points** to win a grand prize of **3500 coins**.

## II. Purpose of the Feature
*  **Endgame Challenge:** Provides a high-difficulty, high-reward mode to complement the existing mini-games[cite: 1].
* **Drama & Suspense:** Uses a "blind" reveal phase to keep the player in suspense until the final tap.
*  **Skill-Based Speed:** Tests the player's ability to quickly identify top-ranked survey answers from the pool[cite: 3].

## III. User Stories
* **As a player,** I want a dedicated 10-second timer for each question to feel the pressure of the Jackpot round.
* **As a player,** I want the game to automatically move forward if I run out of time so I don't lose the whole session on one missed answer.
* **As a player,** I want to manually tap each board slot at the end to reveal my points one by one.
* **As a system,** I need to verify if the total points meet the 100-point threshold before awarding the 3500 coin jackpot.

## IV. Functional Design Requirements
### 1. The Quiz Phase
* **Question Source:** Pull 5 random questions from `survey_pool.json`[cite: 3, 4].
* **Timer:** A 10-second countdown per question.
* **Auto-Advance:** If the timer reaches 0s, the current question is marked as 0 points, and the game advances to the next question.
*  **Interaction:** Tapping an answer immediately transitions to the next question with a smooth animation[cite: 2, 5].
* **Points Visibility:** Points earned are **hidden** from the player during this phase.

### 2. The Reveal Phase (Summary Board)
* **Board Display:** Shows 5 rows representing the 5 questions asked.
* **Manual Reveal:** The point value for each answer remains hidden until the player **taps the screen** to reveal them one by one.
*  **Scoring Logic:** Points are based on the survey weights in the data pool[cite: 3].
* **Win Condition:** Total Points >= 100.
*  **Reward:** * **Win:** 3500 coins added to the persistent player balance[cite: 2].
    * **Loss:** 0 coins (All-or-Nothing).

## V. Non-Functional Design Requirements
*  **Visual Identity:** Adhere to the dark theme (#1c1c1e) and gold accent (#d4a853)[cite: 5].
*  **Animations:** Use `react-native-reanimated` for the board entry and the staggered point reveal[cite: 2].
* **Feedback:** Visual gold flash or celebration effect on hitting the 100-point mark.

## VI. Technical Information
*  **Tech Stack:** Expo SDK 54, React Native (TypeScript), and NativeWind (Tailwind CSS)[cite: 2].
*  **State Management:** Implement via the custom `game-store.ts` using the singleton pattern and pub/sub for real-time updates[cite: 4, 5].
*  **Navigation:** Add `/jackpot` route and integrate into the `SpinWheel` weights/debug menu[cite: 2].
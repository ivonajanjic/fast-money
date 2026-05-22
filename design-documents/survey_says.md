# Feature: "Survey Says" Game Mode

## Feature Overview
A high-stakes search-and-reveal game based on survey data. Players are presented with 8 options and must identify the 5 "on-the-board" answers before hitting 3 strikes or running out of time.

## Purpose of the Feature
To provide a skill-based, high-tension reward mechanic that rewards players for anticipating popular opinions, mimicking the classic Family Feud board reveal.

## User Stories
* As a player, I want to see a question and 8 possible answers so I can test my intuition.
* As a player, I want to see the "Survey Board" update in real-time when I find a correct answer.
* As a player, I want a "First Try Bonus" if I am skilled enough to find the #1 answer immediately.
* As a system, I need to track strikes and end the round if the player fails three times.

## Functional Design Requirements
* **Round Structure:** 1 Question per round.
* **The Board:** Displays 5 hidden slots. When a correct answer is selected, it occupies its specific rank/slot on the board and reveals its point value.
* **Option Pool:** 8 total choices presented to the player (5 correct, 3 incorrect).
* **Strike System:** * Incorrect pick = 1 Strike.
    * 3 Strikes = Round ends immediately.
* **The Timer:** 60-second hard stop. If the timer hits 0, the round ends.
* **Scoring Logic:**
    * **Standard:** 1 Point = 1 Coin.
    * **First Try Bonus:** If the player's **very first selection** in the round is the #1 ranked answer, grant a flat +50 coin bonus instantly.
* **Payout Logic:** Total points accumulated from revealed answers are added to the `player_balance` at the end of the round. (Zero Floor applies: if they get 0 points, balance is unchanged).

## Technical Information
* **JSON Schema Requirement:** * The system requires a pool of 100 questions.
    * Each object must contain: `question`, `options` (array of 8 objects).
    * Each option object must contain: `text`, `points` (integer), and `is_correct` (boolean).
* **State Management:** Track `current_strikes` (0-3) and `revealed_answers` (array) per round.
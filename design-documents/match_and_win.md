## I. Feature Overview
**Match and Win** is a luck-based "Pick-em" mini-game. Players interact with a 4x3 grid of face-down cards to find three identical symbols. The first triplet completed awards the player a specific amount of points added to their current match score.

## II. Purpose of the Feature
* **Dopamine Hit:** Provides a guaranteed win state to balance the high-difficulty "Survey Steal" mode.
* **Tension via Weighting:** Uses a weighted card deck to make the highest reward feel elusive and valuable.
* **Visual Polish:** Showcases high-quality animations and "near-miss" transparency to encourage future play.

## III. User Stories
* **As a player,** I want to tap cards at my own pace until I complete a set of three.
* **As a player,** I want to see which symbols I am close to matching at the top of the screen.
* **As a player,** I want to see where the other rewards were hidden after I win so I can see how close I was to a better prize.
* **As a system,** I need to distribute 12 cards using a specific weighted logic to control reward frequency.

## IV. Functional Design Requirements
### 1. Weighted Deck Composition
The board consists of exactly **12 cards**. Upon initialization, the system must populate the grid with:
* **3 x Crown Icons:** The "Grand Prize" (Hardest to find).
* **5 x Money Bag Icons:** The "Mid-tier Prize" (Most likely to be matched).
* **4 x Coin Icons:** The "Base Prize."

### 2. Gameplay Mechanics
* **Interaction:** Unlimited taps. The player continues flipping cards until any single symbol reaches a count of 3.
* **The "First-to-Three" Rule:** The game ends immediately when the 3rd instance of any symbol is revealed.
* **Real-time Tracking:** The UI header must update immediately as cards are flipped, showing the progress of each tier (Crowns, Bags, Coins).

### 3. End State & Reveal
* **Win Condition:** Once a triplet is formed, the corresponding points are awarded.
* **Reveal Logic:** All remaining face-down cards must flip over automatically. 
* **Visual Style:** The 3 cards that formed the winning triplet remain at 100% opacity; all other 9 cards fade to **50% opacity** to highlight the winning path.

### 4. Reward Scaling (Points)
* **3 Crowns:** 300 Points.
* **3 Money Bags:** 200 Points.
* **3 Coins:** 100 Points.

## V. Non-Functional Design Requirements
* **Persistence:** If the app is closed during the game, the state is saved. Upon return, the player continues from the same board.
* **Responsiveness:** Card flip animations must trigger instantly upon tap.

## VI. Technical Information
* **Randomization:** The 12-card array (3 Crowns, 5 Bags, 4 Coins) must be shuffled using a Fisher-Yates or similar algorithm at the start of the session.
* **State Management:**
    * `revealed_indices`: Array of cards already flipped.
    * `match_counts`: Object tracking {crown: X, bag: Y, coin: Z}.
/* It started getting confusing where I am reading/writing to the game state, and thus the state started to get inconsistent.
    Creating a bucket to hold it so I can overwrite the gameState object whilst still preserving a reference to the containing bucket.
    Now several components can read a shared game state.
 */
export const stateBucket = {
    currentGameState: null,
    timerWorker: null
}

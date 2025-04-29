// --- Game Setup & Constants ---

// Constants
const LETTER_POOL = "ABCDEFGHIJKLMNOPRSTUVWY".split('');
const VOWELS = "AEIOU".split('');
const REQUIRED_LETTERS = 12;
const LETTERS_PER_SIDE = 3;
const MIN_TOTAL_VOWELS = 3;
const MAX_VOWELS_PER_SIDE = 2;
const MIN_WORD_LENGTH = 3;
const MAX_GENERATION_ATTEMPTS = 200; // Safety limit for letter generation

// Global variables to hold the current letters on the board
let topLetters = [];
let leftLetters = [];
let rightLetters = [];
let bottomLetters = [];
let allAvailableLetters = []; // Combined list of letters currently on the board

// Store all sides configuration (references the global letter arrays)
const allSides = {
    top: topLetters,
    left: leftLetters,
    right: rightLetters,
    bottom: bottomLetters
};

// --- Game State Variables ---

let usedWords = []; // Array to store valid words played for the current board
let currentWord = ""; // String to hold the word being built by clicking
let currentPath = []; // Array to store {letter, element, x, y} objects for line drawing
let lastLetterOfPreviousWord = null; // Last letter of the last successfully submitted word

// --- DOM Element References ---


// Get references once the DOM is loaded
let currentWordSpan, usedWordsDisplay, messageDisplay, lineCanvas, ctx, typedWordInput, sideMenu, hamburgerButton;

// Function to initialize DOM references after DOM is loaded
function initializeDOMReferences() {
    currentWordSpan = document.querySelector("#current-word-display span");
    usedWordsDisplay = document.getElementById("used-words");
    messageDisplay = document.getElementById("message");
    lineCanvas = document.getElementById("line-canvas");
    ctx = lineCanvas ? lineCanvas.getContext("2d") : null; // Get canvas context safely
    typedWordInput = document.getElementById("word-input-typed");
    sideMenu = document.getElementById("side-menu"); // For hamburger menu
    hamburgerButton = document.getElementById("hamburger-button"); // For hamburger menu

    // Check if essential elements were found
    if (!currentWordSpan || !usedWordsDisplay || !messageDisplay || !lineCanvas || !ctx || !typedWordInput) {
        console.error("Essential DOM elements not found! Check HTML IDs.");
        alert("Error initializing game elements. Please check the HTML structure.");
        // Potentially disable game functionality here
    }
}


// --- Utility Functions ---

/**
 * Shuffles an array in place using the Fisher-Yates algorithm.
 * @param {Array} array - The array to shuffle.
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // Swap elements
    }
}

/**
 * Counts vowels in an array of letters.
 * @param {Array<string>} letterArray - Array of uppercase letters.
 * @returns {number} The number of vowels found.
 */
function countVowels(letterArray) {
    let count = 0;
    if (!letterArray) return 0; // Handle potential null/undefined input
    for (const letter of letterArray) {
        if (VOWELS.includes(letter)) {
            count++;
        }
    }
    return count;
}

/**
 * Finds which side a letter belongs to based on current global arrays.
 * @param {string} letter - The uppercase letter to find.
 * @returns {string|null} Side name ('top', 'left', 'right', 'bottom') or null.
 */
function findSide(letter) {
    for (const sideName in allSides) {
        if (allSides[sideName].includes(letter)) {
            return sideName;
        }
    }
    // This might happen temporarily during board setup/clearing, handle gracefully
    // console.warn(`Letter ${letter} not found on any side.`);
    return null;
}

/**
 * Displays a message to the user in the message area.
 * @param {string} msg - The message to display.
 */
function showMessage(msg) {
    if (messageDisplay) {
        messageDisplay.innerText = msg;
    }
}

/** Clears the message display area. */
function clearMessage() {
    if (messageDisplay) {
        messageDisplay.innerText = "";
    }
}

// --- Board Setup and Letter Generation ---

/**
 * Generates a new set of 12 unique letters, meeting all constraints,
 * and assigns them to the global side arrays. Retries entire process if needed.
 */
function generateNewLetters() {
    if (LETTER_POOL.length < REQUIRED_LETTERS) {
        console.error("Letter pool is too small!");
        return false; // Indicate failure
    }

    let assignmentOk = false;
    let selectedLetters = [];
    let totalVowelCount = 0;
    let masterAttempts = 0;

    // Loop until a valid assignment is found or max attempts reached
    while (!assignmentOk && masterAttempts < MAX_GENERATION_ATTEMPTS) {
        masterAttempts++;

        // Select 12 unique letters ensuring >= MIN_TOTAL_VOWELS
        totalVowelCount = 0;
        let selectionAttempts = 0;
        while (totalVowelCount < MIN_TOTAL_VOWELS) {
            if (selectionAttempts++ > MAX_GENERATION_ATTEMPTS) { // Prevent infinite loop here too
                 console.error(`Failed to generate initial set with ${MIN_TOTAL_VOWELS}+ vowels.`);
                 return false; // Indicate failure
            }
            shuffleArray(LETTER_POOL);
            selectedLetters = LETTER_POOL.slice(0, REQUIRED_LETTERS);
            totalVowelCount = countVowels(selectedLetters);
        }

        // Shuffle the selected 12 letters and tentatively assign
        shuffleArray(selectedLetters);
        const tempTop = selectedLetters.slice(0, LETTERS_PER_SIDE);
        const tempLeft = selectedLetters.slice(LETTERS_PER_SIDE, 2 * LETTERS_PER_SIDE);
        const tempRight = selectedLetters.slice(2 * LETTERS_PER_SIDE, 3 * LETTERS_PER_SIDE);
        const tempBottom = selectedLetters.slice(3 * LETTERS_PER_SIDE, 4 * LETTERS_PER_SIDE);

        // Check vowel count per side constraint
        if (countVowels(tempTop) <= MAX_VOWELS_PER_SIDE &&
            countVowels(tempLeft) <= MAX_VOWELS_PER_SIDE &&
            countVowels(tempRight) <= MAX_VOWELS_PER_SIDE &&
            countVowels(tempBottom) <= MAX_VOWELS_PER_SIDE)
        {
            // Assignment is valid, update global arrays
            topLetters.length = 0; leftLetters.length = 0; rightLetters.length = 0; bottomLetters.length = 0;
            topLetters.push(...tempTop);
            leftLetters.push(...tempLeft);
            rightLetters.push(...tempRight);
            bottomLetters.push(...tempBottom);
            assignmentOk = true; // Valid assignment found, exit the main while loop
        }
        // If not assignmentOk, the main while loop continues
    } // End while(!assignmentOk)

    if (!assignmentOk) {
        console.error(`Failed to generate a valid board after ${MAX_GENERATION_ATTEMPTS} attempts.`);
        // Consider a fallback, like using the last attempt even if invalid, or a default board
        // For now, just signal failure
        return false;
    }

    // Update the combined list of available letters
    allAvailableLetters = [...topLetters, ...leftLetters, ...rightLetters, ...bottomLetters];
    console.log("New Letters Generated:", allSides, `(Vowels Total: ${totalVowelCount})`);
    return true; // Indicate success
}

/**
 * Creates the letter buttons on the board and adds click listeners.
 * Uses the current global letter arrays.
 */
function setupBoard() {
    const sides = [
        { id: "top-side", letters: topLetters },
        { id: "left-side", letters: leftLetters },
        { id: "right-side", letters: rightLetters },
        { id: "bottom-side", letters: bottomLetters }
    ];

    sides.forEach(side => {
        const container = document.getElementById(side.id);
        if (!container) {
            console.error(`HTML Error: Container not found for side: ${side.id}`);
            return;
        }
        container.innerHTML = ""; // Clear previous buttons

        if (!side.letters || side.letters.length === 0) {
            // This might happen if generateNewLetters failed
            console.warn(`No letters available for side: ${side.id}`);
            return;
        }

        side.letters.forEach(letter => {
            const button = document.createElement("button");
            button.className = "letter-button";
            button.innerText = letter;
            button.id = `letter-${letter}`; // ID for potential direct access
            button.onclick = () => handleLetterClick(letter, button); // Add click handler
            container.appendChild(button);
        });
    });

    // Ensure canvas is sized correctly after buttons might affect layout
    setTimeout(resizeCanvas, 0); // Defer execution slightly
}

// --- Canvas and Path Drawing ---

/** Sets canvas dimensions based on its container AND updates path coordinates */
function resizeCanvas() {
    const container = lineCanvas.parentElement;
    if (!container || !lineCanvas) return;

    const currentWidth = lineCanvas.width;
    const currentHeight = lineCanvas.height;
    const newWidth = container.clientWidth;
    const newHeight = container.clientHeight;

    if (currentWidth !== newWidth || currentHeight !== newHeight) {
        lineCanvas.width = newWidth;
        lineCanvas.height = newHeight;
        updatePathCoordinates(); // Recalculate coordinates based on new layout
        redrawLines(); // Redraw lines with updated coordinates
    }
}

/** Recalculates canvas coordinates for points currently in currentPath. */
function updatePathCoordinates() {
    if (!lineCanvas) return;
    const canvasRect = lineCanvas.getBoundingClientRect();

    currentPath.forEach(point => {
        // Find the button element again using its ID
        const buttonElement = document.getElementById(`letter-${point.letter}`);
        if (buttonElement) {
            point.element = buttonElement; // Update element reference
            const rect = buttonElement.getBoundingClientRect();
            // Calculate center relative to canvas top-left
            point.x = rect.left + rect.width / 2 - canvasRect.left;
            point.y = rect.top + rect.height / 2 - canvasRect.top;
        } else {
            point.x = undefined; // Mark coordinates as invalid if element disappears
            point.y = undefined;
        }
    });
}

/** Clears the canvas and redraws lines based on the currentPath */
function redrawLines() {
    if (!ctx) { console.error("Canvas context not available"); return; }

    ctx.clearRect(0, 0, lineCanvas.width, lineCanvas.height); // Clear canvas

    if (currentPath.length < 2) return; // Need at least two points for a line

    ctx.beginPath();
    // Ensure starting point has valid coordinates
    if (currentPath[0].x === undefined || currentPath[0].y === undefined) {
        console.warn("Path starting point missing coordinates, attempting update...");
        updatePathCoordinates();
        if (currentPath[0].x === undefined || currentPath[0].y === undefined) {
             console.error("Cannot draw line, path start coordinates invalid after update.");
             return;
         }
    }
    ctx.moveTo(currentPath[0].x, currentPath[0].y);
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#55f"; // Blue lines

    // Draw lines to subsequent points
    for (let i = 1; i < currentPath.length; i++) {
         if (currentPath[i].x !== undefined && currentPath[i].y !== undefined) {
             ctx.lineTo(currentPath[i].x, currentPath[i].y);
         } else {
             console.warn(`Path point ${i} (${currentPath[i].letter}) missing coordinates. Skipping line segment.`);
             // Consider stopping the line here if a point is invalid
             // ctx.stroke(); // Draw up to the last valid point
             // return;
         }
    }
    ctx.stroke(); // Render the full path
}

/** Highlights the buttons in the current click path */
 function highlightPath() {
    // Remove previous highlights
    document.querySelectorAll('.letter-button.selected, .letter-button.last-selected').forEach(el => {
        el.classList.remove('selected', 'last-selected');
    });

    // Add highlight to current path
    currentPath.forEach((point, index) => {
        // Find the element by ID each time
        const buttonElement = document.getElementById(`letter-${point.letter}`);
        if (buttonElement) {
            buttonElement.classList.add('selected');
            // Add special style to the last letter
            if(index === currentPath.length - 1){
                buttonElement.classList.add('last-selected');
            }
        }
    });
 }

// --- Game Logic and Input Handling ---

/** Handles clicking on a letter button (for click path). */
function handleLetterClick(letter, buttonElement) {
    clearMessage(); // Clear previous messages on new click

   // Cannot click the same letter twice in a row
    if (currentPath.length > 0 && currentPath[currentPath.length - 1].letter === letter) {
        return; // Ignore click
    }

    // Cannot click a letter from the same side as the previous letter
    if (currentPath.length > 0) {
        const previousLetter = currentPath[currentPath.length - 1].letter;
        const previousSide = findSide(previousLetter);
        const currentSide = findSide(letter);
        if (currentSide && previousSide && currentSide === previousSide) {
            showMessage(`Cannot use two letters from the same side consecutively`);
            return;
        }
    }

    // Rule 3: First letter must match the end of the previous word (if applicable)
    if (currentWord === "" && lastLetterOfPreviousWord && letter !== lastLetterOfPreviousWord) {
         showMessage(`Word must start with "${lastLetterOfPreviousWord}"`);
         return;
    }

    // Rule 4: If starting a new word chain (currentWord has only the required start letter),
    // the next click cannot be from the same side as that start letter.
    if (currentWord.length === 1 && lastLetterOfPreviousWord) {
         if (findSide(letter) === findSide(lastLetterOfPreviousWord)) {
            showMessage(`Cannot use two letters from the same side consecutively`);
            return;
        }
    }

    // --- Update State and UI ---
    currentWord += letter;

    // Calculate coordinates relative to the canvas
    const rect = buttonElement.getBoundingClientRect();
    const canvasRect = lineCanvas.getBoundingClientRect();
    const x = rect.left + rect.width / 2 - canvasRect.left;
    const y = rect.top + rect.height / 2 - canvasRect.top;

    // Store letter, element reference, and calculated coordinates
    currentPath.push({ letter: letter, element: buttonElement, x: x, y: y });

    // Update UI
    updateCurrentWordDisplay();
    redrawLines();
    highlightPath();
}

/** Updates the display showing the word currently being built by clicks */
function updateCurrentWordDisplay() {
    if (currentWordSpan) {
        currentWordSpan.innerText = currentWord;
    }
}

/** Deletes the last letter added via clicking */
function deleteLastClickedLetter() {
    // Can only delete if the word has more letters than the required starting letter
    if (currentPath.length > 1 || (currentPath.length === 1 && !lastLetterOfPreviousWord)) {
        currentPath.pop(); // Remove last entry from path
        currentWord = currentPath.map(p => p.letter).join(''); // Rebuild word string

        // Update UI
        updateCurrentWordDisplay();
        redrawLines();
        highlightPath();
        clearMessage();
    } else if (currentPath.length === 1 && lastLetterOfPreviousWord) {
        // Don't delete the required starting letter
        showMessage(`Word must start with "${lastLetterOfPreviousWord}"`);
    }
}

/**
 * Validates a word (either clicked or typed) against basic game rules.
 * Uses the current global allAvailableLetters.
 * @param {string} word - The uppercase word to validate.
 * @returns {boolean} True if valid according to game rules, false otherwise.
 */
function validateWordRules(word) {
    // Rule: Basic checks
    if (!word || word.length < MIN_WORD_LENGTH) {
        showMessage(`Too short`);
        return false;
    }
    if (!/^[A-Z]+$/.test(word)) {
        showMessage("Not available on the board");
        return false;
    }

    // Rule: Starting letter constraint
    if (lastLetterOfPreviousWord && word[0] !== lastLetterOfPreviousWord) {
        showMessage(`Word must start with "${lastLetterOfPreviousWord}"`);
        return false;
    }

    // Rule: All letters must be on the current board
    for (let char of word) {
        if (!allAvailableLetters.includes(char)) {
            showMessage(`Not available on the board`);
            return false;
        }
    }

    // Rule: Adjacent letters must be from different sides
    for (let i = 0; i < word.length - 1; i++) {
        const currentSide = findSide(word[i]);
        const nextSide = findSide(word[i + 1]);
        if (!currentSide || !nextSide) {
            // Should not happen if previous check passed
            console.error("Side validation error - letter not found? Word:", word, "Letters:", word[i], word[i+1]);
            showMessage("Internal error validating sides.");
            return false;
        }
        if (currentSide === nextSide) {
            showMessage(`Cannot use two letters from the same side consecutively`);
            return false;
        }
    }

    // Rule: Word must not have been used already in this game
    if (usedWords.includes(word)) {
        showMessage(`Word "${word}" has already been used`);
        return false;
    }

    return true; // Passed all game rules
}

/**
 * Checks word validity using the Dictionary API.
 * Returns a Promise that resolves if the word is valid, rejects otherwise.
 * @param {string} wordToCheck - The word (lowercase) to check.
 * @returns {Promise<object>} Resolves with API data if valid, rejects otherwise.
 */
function checkWordWithAPI(wordToCheck) {
    showMessage("Checking dictionary...");
    if (!wordToCheck) {
        // Immediately reject if word is empty to prevent API call
        showMessage("Too short");
        return Promise.reject(new Error("Empty word provided"));
    }

    return fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${wordToCheck}`)
        .then(response => {
            if (response.ok) { // Status 200-299
                return response.json(); // Word found
            }
            if (response.status === 404) { // Word not found by API
                throw new Error('WordNotFound');
            }
            // Other HTTP errors (server error, etc.)
            throw new Error(`HTTP error! status: ${response.status}`);
        })
        .catch(error => {
            // Handle the specific errors or generic ones
            if (error.message === 'WordNotFound') {
                showMessage(`Not in word list`);
            } else {
                showMessage("Error checking word validity. Check connection?");
                console.error("API Error:", error);
            }
            return Promise.reject(error); // Propagate rejection so submit function knows it failed
        });
}

/**
 * Updates the game state after a word is fully validated AND sets up the start
 * for the next word click path.
 * @param {string} validWord - The valid uppercase word.
 */
function updateGameState(validWord) {
     // Add word to the list of used words for this board
     usedWords.push(validWord);
     usedWordsDisplay.innerText = "Used Words: " + usedWords.join(", ");

     // Set the required starting letter for the next word
     lastLetterOfPreviousWord = validWord[validWord.length - 1];

     // Reset the click path to start with the new required letter
     currentWord = lastLetterOfPreviousWord;
     currentPath = []; // Clear previous path points

     const nextStartButton = document.getElementById(`letter-${lastLetterOfPreviousWord}`);
     if (nextStartButton) {
         // Calculate coordinates *now* for the starting point of the next path
         const rect = nextStartButton.getBoundingClientRect();
         const canvasRect = lineCanvas.getBoundingClientRect();
         const x = rect.left + rect.width / 2 - canvasRect.left;
         const y = rect.top + rect.height / 2 - canvasRect.top;
         // Initialize the path with the starting letter's info
         currentPath.push({ letter: lastLetterOfPreviousWord, element: nextStartButton, x: x, y: y });
     } else {
         // Fallback if button element not found (shouldn't happen with valid letters)
         console.error(`Could not find button element for starting letter: ${lastLetterOfPreviousWord}`);
         currentWord = ""; // Reset word if we can't find the start button
     }

     // Update displays for the new starting state
     updateCurrentWordDisplay();
     redrawLines(); // Will clear lines as path has only 1 point
     highlightPath(); // Will highlight only the starting letter
}

/** Handles submission of the word (either clicked or typed) */
function submitWord() {
    let wordToSubmit = "";
    let isTyped = false;

    // Determine which word to submit (typed takes precedence)
    const typedValue = typedWordInput.value.trim().toUpperCase();
    if (typedValue.length > 0) {
        wordToSubmit = typedValue;
        isTyped = true;
    } else if (currentWord.length > 0) {
        wordToSubmit = currentWord;
        // Word built by clicking needs at least 2 letters if it's chained
        if (wordToSubmit.length < 2 && lastLetterOfPreviousWord) {
            showMessage("Too short");
            return;
        }
    } else {
        // Neither typed nor clicked word has content
        showMessage("Too short");
        return;
    }

    // Validate game rules first
    if (!validateWordRules(wordToSubmit)) {
        return; // Stop if rules fail
    }

    // Check against dictionary API
    checkWordWithAPI(wordToSubmit.toLowerCase()) // API check needs lowercase
        .then(data => {
            // API check successful! Word is valid.
            // console.log("API Data for valid word:", data); // Optional logging
            clearMessage(); // Clear "Checking..." message
            updateGameState(wordToSubmit); // Update game state

            // Clear the input method that was used
            if (isTyped) {
                typedWordInput.value = "";
            }
            // Click path is reset automatically by updateGameState
        })
        .catch(() => {
            // API check failed or other error occurred
            // Error message is already shown by checkWordWithAPI
            // Do nothing here, let the user correct the word or clear
        });
}

// --- Game Control Functions ---

/** Clears only the current click path/word attempt, resetting to last required letter if applicable. */
function clearCurrentClickPath() {
    currentWord = ""; // Clear the string
    currentPath = []; // Clear the path points

    // If chaining words, reset to the required starting letter
    if (lastLetterOfPreviousWord) {
        currentWord = lastLetterOfPreviousWord;
        const startButton = document.getElementById(`letter-${lastLetterOfPreviousWord}`);
        if (startButton) {
            // Calculate coordinates when resetting
            const rect = startButton.getBoundingClientRect();
            const canvasRect = lineCanvas.getBoundingClientRect();
            const x = rect.left + rect.width / 2 - canvasRect.left;
            const y = rect.top + rect.height / 2 - canvasRect.top;
            currentPath.push({ letter: lastLetterOfPreviousWord, element: startButton, x: x, y: y });
        }
    }

    // Update visuals
    updateCurrentWordDisplay();
    redrawLines(); // Clears lines or shows just the start point
    highlightPath(); // Clears highlights or shows just the start point
    clearMessage(); // Clear any error messages
}


/** Clears the current game board progress (used words, constraints) but keeps the current letters. */
function clearBoardProgress() {
    usedWords = []; // Clear used words for this board
    lastLetterOfPreviousWord = null; // Reset starting constraint
    usedWordsDisplay.innerText = "Used Words:";
    typedWordInput.value = ""; // Clear typed input

    clearCurrentClickPath(); // Reset click path state completely
}


/** Resets the entire game state AND generates a new board with new letters. */
function restartGame() {
    showMessage("Generating new board...");
    if (generateNewLetters()) { // Check if generation was successful
        clearBoardProgress(); // Reset state variables for the new board
        setupBoard(); // Draw the board with the new letters
        showMessage("New board ready");
        // Optional: Clear message after a delay
        // setTimeout(clearMessage, 1500);
    } else {
         showMessage("Error generating new board. Please try again.");
    }
}

// --- Hamburger Menu Functions ---

/**
 * Toggles the side menu open/closed by adding/removing the 'open' class.
 */
function toggleMenu() {
    // Add this check:
    if (!sideMenu) {
        console.error("Side menu element not found!");
        showMessage("Error: Menu cannot be opened."); // Show user message
        return; // Stop if the menu element doesn't exist
    }
    // Original line:
    sideMenu.classList.toggle('open');
    console.log("Toggled menu. Current classes:", sideMenu.className); // Add log
}

/** Calls restartGame and then closes the menu */
function restartGameAndCloseMenu() {
    restartGame(); // Call the existing restart function
    // Only toggle if menu is actually open
    if (sideMenu && sideMenu.classList.contains('open')) {
        toggleMenu(); // Close the menu
    }
}

// --- Event Listeners ---

// Run initialization code after the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeDOMReferences(); // Get references to DOM elements

    // Check if initialization failed
    if (!ctx) return; // Exit if canvas context wasn't found

    // Add listener for window resize to adjust canvas
    window.addEventListener('resize', resizeCanvas);

    // Add event listener for the 'Enter' key on the TYPED input field
    if (typedWordInput) {
        typedWordInput.addEventListener("keypress", function(event) {
            if (event.key === "Enter") {
                event.preventDefault(); // Prevent default form submission behavior
                submitWord(); // Use the generic submit function
            }
        });
    }

    // Add listener for hamburger menu toggle (if elements exist)
    // if (hamburgerButton && sideMenu) {
    //     hamburgerButton.addEventListener('click', toggleMenu);
    // }

    // --- Initial Game Setup ---
    generateNewLetters(); // Generate the first set of letters (meeting constraints)
    setupBoard(); // Draw the initial board with generated letters
});

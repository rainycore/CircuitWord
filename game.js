// --- Game Setup ---
// Define the letters available on each side of the board
const topLetters = ['A', 'T', 'E'];
const leftLetters = ['M', 'P', 'S'];
const rightLetters = ['R', 'O', 'N'];
const bottomLetters = ['C', 'I', 'D'];
// Store all letters grouped by side for easy lookup
const allSides = {
    top: topLetters,
    left: leftLetters,
    right: rightLetters,
    bottom: bottomLetters
};

// --- Game State Variables ---
let usedWords = []; // Array to store valid words played
let usedLetters = new Set(); // Set to store unique letters used across all words
let lastLetter = null; // Stores the last letter of the previously played word

// --- DOM Element References ---
// Get references to HTML elements needed for interaction
const wordInput = document.getElementById("word-input");
const usedWordsDisplay = document.getElementById("used-words");
const messageDisplay = document.getElementById("message");

// --- Functions ---

/**
 * Creates the letter buttons and displays them on the board.
 * Also resets the visual state of letters based on usedLetters.
 */
function setupBoard() {
    // Define the structure for iterating through sides
    const sides = [
        { id: "top-side", letters: topLetters },
        { id: "left-side", letters: leftLetters },
        { id: "right-side", letters: rightLetters },
        { id: "bottom-side", letters: bottomLetters }
    ];

    // Populate each side container with letter buttons
    sides.forEach(side => {
        const container = document.getElementById(side.id);
        if (!container) {
            console.error(`Container not found: ${side.id}`);
            return; // Skip if container doesn't exist
        }
        container.innerHTML = ""; // Clear previous letters from the container
        side.letters.forEach(letter => {
            const div = document.createElement("div");
            div.className = "letter-button"; // Assign class for styling
            div.innerText = letter;
            div.id = `letter-${letter}`; // Assign unique ID for styling used letters
            container.appendChild(div);
        });
    });

    // Ensure all letter buttons reflect the current usedLetters state
    resetLetterStyles();
}

/**
 * Updates the visual style of all letter buttons based on the usedLetters set.
 */
function resetLetterStyles() {
    const allLetterButtons = document.querySelectorAll('.letter-button');
    allLetterButtons.forEach(button => {
        const letter = button.innerText;
        if (usedLetters.has(letter)) {
            button.classList.add('used-letter'); // Apply 'used' style
        } else {
            button.classList.remove('used-letter'); // Remove 'used' style
        }
    });
}


/**
 * Finds which side a letter belongs to.
 * @param {string} letter - The uppercase letter to find.
 * @returns {string|null} The side name ('top', 'left', 'right', 'bottom') or null if not found.
 */
function findSide(letter) {
    // Iterate through the side definitions
    for (const sideName in allSides) {
        // Check if the letter exists in the current side's array
        if (allSides[sideName].includes(letter)) {
            return sideName; // Return the name of the side
        }
    }
    return null; // Should not happen if letter validation is correct
}

/**
 * Validates the submitted word based on game rules AFTER it has been verified as a real word by the API.
 * @param {string} word - The uppercase word to validate.
 */
function validateWord(word) {
    // 1. Check starting letter constraint (if not the first word)
    if (lastLetter && word[0] !== lastLetter) {
        showMessage(`Word must start with "${lastLetter}"`);
        return; // Invalid starting letter
    }

    // 2. Check if all letters are available on the board
    const availableLetters = [...topLetters, ...leftLetters, ...rightLetters, ...bottomLetters];
    for (let char of word) {
        // Check if letter exists on the board (redundant if API checks spelling, but safe)
        if (!availableLetters.includes(char)) {
            showMessage(`Invalid letter used: "${char}"`);
            return;
        }
        // Letter reuse is allowed based on previous change (no check here)
    }

    // 3. Check adjacent letters constraint (must be from different sides)
    for (let i = 0; i < word.length - 1; i++) {
        const currentSide = findSide(word[i]);
        const nextSide = findSide(word[i + 1]);
        // Check if both letters were found and if they are on the same side
        if (currentSide && nextSide && currentSide === nextSide) {
            showMessage(`Adjacent letters "${word[i]}" and "${word[i + 1]}" are from the same side!`);
            return; // Invalid adjacent letters
        }
    }

    // --- Word is valid according to game rules ---

    // 4. Add word to the used list and update the display
    usedWords.push(word);
    usedWordsDisplay.innerText = "Used Words: " + usedWords.join(", ");

    // 5. Mark letters as used in the game state and update their visual style
    word.split("").forEach(char => {
        usedLetters.add(char); // Add letter to the set of used letters
        const element = document.getElementById(`letter-${char}`);
        if (element) {
            element.classList.add("used-letter"); // Apply CSS class
        }
    });

    // 6. Update the last letter constraint for the next word
    lastLetter = word[word.length - 1];

    // 7. Clear the input field and any previous messages
    wordInput.value = "";
    clearMessage();
}

/**
 * Handles word submission: checks length, calls API for validity, then calls game validation.
 */
function submitWord() {
    // Get word, trim whitespace, convert to lowercase for API check
    const word = wordInput.value.trim().toLowerCase();

    // Basic length check
    if (word.length < 3) {
        showMessage("Word must be at least 3 letters long!");
        return;
    }

    // Basic check for non-alphabetic characters
    if (!/^[a-z]+$/.test(word)) {
         showMessage("Word must contain only letters.");
         return;
    }

    showMessage("Checking word..."); // Provide feedback to the user

    // --- API Call Section using DictionaryAPI.dev ---
    fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`)
        .then(response => {
            // Check the HTTP status code
            if (response.ok) { // Status 200-299 means success (word found)
                return response.json(); // Parse the JSON data (though we might not need it)
            } else if (response.status === 404) { // Status 404 means word not found
                throw new Error('WordNotFound'); // Throw a specific error type
            } else { // Other HTTP errors (e.g., 500 server error)
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        })
        .then(data => {
            // If we reach here, the response status was OK (2xx), meaning the word exists
            console.log("API Data for valid word:", data); // Optional: view the definition data
            clearMessage(); // Clear "Checking word..." message
            validateWord(word.toUpperCase()); // Proceed with game logic validation
        })
        .catch(error => {
            // Handle the different types of errors
            if (error.message === 'WordNotFound') {
                showMessage(`"${word.toUpperCase()}" is not a valid dictionary word!`);
            } else { // Handle network errors or other HTTP errors
                showMessage("Error checking word validity. Check connection or API status.");
                console.error("API Error:", error); // Log the actual error
            }
        });
}

/**
 * Resets the game state to its initial values and redraws the board.
 */
function restartGame() {
    usedWords = []; // Clear used words array
    usedLetters.clear(); // Clear used letters set
    lastLetter = null; // Reset last letter constraint
    wordInput.value = ""; // Clear input field
    usedWordsDisplay.innerText = "Used Words:"; // Reset display
    clearMessage(); // Clear any error messages
    setupBoard(); // Redraw board to reset letter styles
}

/**
 * Displays a message to the user in the message area.
 * @param {string} msg - The message to display.
 */
function showMessage(msg) {
    messageDisplay.innerText = msg;
}

/**
 * Clears the message display area.
 */
function clearMessage() {
    messageDisplay.innerText = "";
}

// --- Event Listeners ---

// Add event listener for the 'Enter' key on the input field
wordInput.addEventListener("keypress", function(event) {
    // Check if the key pressed was 'Enter'
    if (event.key === "Enter") {
        event.preventDefault(); // Prevent default form submission behavior (if inside a form)
        submitWord(); // Call the submit function
    }
});

// --- Initial Game Setup ---
// Call setupBoard() when the script loads to draw the initial game board
setupBoard();

// --- Game Setup ---
const topLetters = ['A', 'T', 'E'];
const leftLetters = ['M', 'P', 'S'];
const rightLetters = ['R', 'O', 'N'];
const bottomLetters = ['C', 'I', 'D'];
const allSides = { top: topLetters, left: leftLetters, right: rightLetters, bottom: bottomLetters };

// --- Game State Variables ---
let usedWords = [];
let currentWord = ""; // String to hold the word being built
let currentPath = []; // Array to store {letter, element, x, y} objects for line drawing
let lastLetterOfPreviousWord = null; // Renamed from lastLetter for clarity

// --- DOM Element References ---
const currentWordSpan = document.querySelector("#current-word-display span");
const usedWordsDisplay = document.getElementById("used-words");
const messageDisplay = document.getElementById("message");
const lineCanvas = document.getElementById("line-canvas");
const ctx = lineCanvas.getContext("2d");

// --- Functions ---

/**
 * Sets canvas dimensions based on its container.
 */
function resizeCanvas() {
    const container = lineCanvas.parentElement; // Assumes canvas is direct child of game-container
    lineCanvas.width = container.clientWidth;
    lineCanvas.height = container.clientHeight;
    // Redraw lines if needed after resize (optional)
     redrawLines();
}

/**
 * Creates the letter buttons and adds click listeners.
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
        if (!container) return;
        container.innerHTML = ""; // Clear previous
        side.letters.forEach(letter => {
            const button = document.createElement("button"); // Use BUTTON element
            button.className = "letter-button";
            button.innerText = letter;
            button.id = `letter-${letter}`;
            button.onclick = () => handleLetterClick(letter, button); // Add click handler
            container.appendChild(button);
        });
    });
    resizeCanvas(); // Set initial canvas size
}

/**
 * Finds which side a letter belongs to.
 * @param {string} letter - The uppercase letter to find.
 * @returns {string|null} The side name ('top', 'left', 'right', 'bottom') or null.
 */
function findSide(letter) {
    for (const sideName in allSides) {
        if (allSides[sideName].includes(letter)) {
            return sideName;
        }
    }
    return null;
}

/**
 * Handles clicking on a letter button.
 * @param {string} letter - The letter that was clicked.
 * @param {HTMLElement} buttonElement - The button element that was clicked.
 */
function handleLetterClick(letter, buttonElement) {
    clearMessage(); // Clear previous messages

    // Rule: Cannot click the same letter twice in a row (implicit in Letter Boxed)
    if (currentPath.length > 0 && currentPath[currentPath.length - 1].letter === letter) {
        return; // Ignore click if it's the same as the last letter
    }

    // Rule: Cannot click a letter from the same side as the previous letter
    if (currentPath.length > 0) {
        const previousLetter = currentPath[currentPath.length - 1].letter;
        if (findSide(letter) === findSide(previousLetter)) {
            showMessage(`Cannot use two letters ("${previousLetter}", "${letter}") from the same side consecutively.`);
            return;
        }
    }

    // Rule: First letter must match the end of the previous word (if applicable)
    if (currentWord === "" && lastLetterOfPreviousWord && letter !== lastLetterOfPreviousWord) {
         showMessage(`Word must start with "${lastLetterOfPreviousWord}"`);
         return;
    }

    // Add letter to current word and path
    currentWord += letter;
    const rect = buttonElement.getBoundingClientRect();
    const canvasRect = lineCanvas.getBoundingClientRect();
    // Calculate center coordinates relative to the canvas
    const x = rect.left + rect.width / 2 - canvasRect.left;
    const y = rect.top + rect.height / 2 - canvasRect.top;

    currentPath.push({ letter: letter, element: buttonElement, x: x, y: y });

    // Update display and draw lines
    updateCurrentWordDisplay();
    redrawLines();

    // Optional: Highlight selected letters
    highlightPath();
}

/**
 * Updates the display showing the word currently being built.
 */
function updateCurrentWordDisplay() {
    currentWordSpan.innerText = currentWord;
}

/**
 * Clears the canvas and redraws lines based on the currentPath.
 */
function redrawLines() {
    ctx.clearRect(0, 0, lineCanvas.width, lineCanvas.height); // Clear canvas
    if (currentPath.length < 2) return; // Need at least two points for a line

    ctx.beginPath();
    ctx.moveTo(currentPath[0].x, currentPath[0].y);
    ctx.lineWidth = 3; // Line thickness
    ctx.strokeStyle = "#55f"; // Line color (blue)

    for (let i = 1; i < currentPath.length; i++) {
        ctx.lineTo(currentPath[i].x, currentPath[i].y);
    }
    ctx.stroke(); // Draw the path
}

/**
 * Highlights the buttons in the current path (optional styling).
 */
 function highlightPath() {
    // Remove previous highlights
    document.querySelectorAll('.letter-button.selected, .letter-button.last-selected').forEach(el => {
        el.classList.remove('selected', 'last-selected');
    });
    // Add highlight to current path
    currentPath.forEach((point, index) => {
        point.element.classList.add('selected');
        // Add special style to the last letter
        if(index === currentPath.length - 1){
            point.element.classList.add('last-selected');
        }
    });
 }

/**
 * Clears the currently formed word and path.
 */
function clearCurrentWord() {
    currentWord = "";
    currentPath = [];
    updateCurrentWordDisplay();
    redrawLines(); // Clears the canvas
    highlightPath(); // Clears highlights
    clearMessage();
}

/**
 * Validates the completed word (game rules, excluding API check).
 * @param {string} word - The uppercase word to validate.
 * @returns {boolean} True if valid according to game rules, false otherwise.
 */
function validateWordRules(word) {
    // Rule: Word length
    if (word.length < 3) {
        showMessage("Word must be at least 3 letters long!");
        return false;
    }

    // Rule: First letter must match the end of the previous word
    if (lastLetterOfPreviousWord && word[0] !== lastLetterOfPreviousWord) {
        showMessage(`Word must start with "${lastLetterOfPreviousWord}"`);
        return false;
    }

    // Rule: Adjacent letters from different sides (already enforced by handleLetterClick, but good to double-check)
    for (let i = 0; i < word.length - 1; i++) {
        const currentSide = findSide(word[i]);
        const nextSide = findSide(word[i + 1]);
        if (!currentSide || !nextSide || currentSide === nextSide) {
             // This check should ideally not fail if handleLetterClick is correct
            console.error("Adjacent letter rule failed validation - check handleLetterClick logic");
            showMessage(`Invalid sequence: "${word[i]}" and "${word[i+1]}"`);
            return false;
        }
    }
    return true; // Passed all game rules
}

/**
 * Handles word submission: checks game rules, calls API, updates game state.
 */
function submitCurrentWord() {
    const wordToSubmit = currentWord; // Get word from clicks

    // Check game rules first
    if (!validateWordRules(wordToSubmit)) {
        return; // Stop if basic game rules fail
    }

    showMessage("Checking dictionary..."); // Provide feedback

    // --- API Call Section using DictionaryAPI.dev ---
    fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${wordToSubmit.toLowerCase()}`)
        .then(response => {
            if (response.ok) {
                return response.json();
            } else if (response.status === 404) {
                throw new Error('WordNotFound');
            } else {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        })
        .then(data => {
            // Word exists in dictionary
            console.log("API Data for valid word:", data);
            clearMessage();

            // --- Update Game State ---
            usedWords.push(wordToSubmit);
            usedWordsDisplay.innerText = "Used Words: " + usedWords.join(", ");
            lastLetterOfPreviousWord = wordToSubmit[wordToSubmit.length - 1]; // Update constraint

            // Clear current word for next turn
            clearCurrentWord();

            // Check for win condition (optional)
            // e.g., if all letters from all sides have been used at least once
        })
        .catch(error => {
            if (error.message === 'WordNotFound') {
                showMessage(`"${wordToSubmit}" is not a valid dictionary word!`);
            } else {
                showMessage("Error checking word validity. Check connection?");
                console.error("API Error:", error);
            }
             // Don't clear the word if API check fails, allow user to Clear manually
        });
}


/**
 * Resets the entire game state.
 */
function restartGame() {
    usedWords = [];
    lastLetterOfPreviousWord = null;
    usedWordsDisplay.innerText = "Used Words:";
    clearCurrentWord(); // Clears current word, path, canvas, highlights, message
    // No need to call setupBoard unless letters change
}

/**
 * Displays a message to the user.
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
// Add listener for window resize to adjust canvas
window.addEventListener('resize', resizeCanvas);

// --- Initial Game Setup ---
setupBoard(); // Draw the initial board and set canvas size


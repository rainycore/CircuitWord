// --- Game Setup ---
const topLetters = ['A', 'T', 'E'];
const leftLetters = ['M', 'P', 'S'];
const rightLetters = ['R', 'O', 'N'];
const bottomLetters = ['C', 'I', 'D'];
const allSides = { top: topLetters, left: leftLetters, right: rightLetters, bottom: bottomLetters };
const allAvailableLetters = [...topLetters, ...leftLetters, ...rightLetters, ...bottomLetters]; // Cache all letters

// --- Game State Variables ---
let usedWords = [];
let currentWord = ""; // For click path
let currentPath = []; // For click path
let lastLetterOfPreviousWord = null;

// --- DOM Element References ---
const currentWordSpan = document.querySelector("#current-word-display span");
const usedWordsDisplay = document.getElementById("used-words");
const messageDisplay = document.getElementById("message");
const lineCanvas = document.getElementById("line-canvas");
const ctx = lineCanvas.getContext("2d");
const typedWordInput = document.getElementById("word-input-typed"); // Reference to the new input

// --- Functions ---

/** Sets canvas dimensions based on its container. */
function resizeCanvas() {
    const container = lineCanvas.parentElement;
    if (!container) return;
    lineCanvas.width = container.clientWidth;
    lineCanvas.height = container.clientHeight;
    redrawLines(); // Redraw lines after resize
}

/** Creates the letter buttons and adds click listeners. */
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
        container.innerHTML = "";
        side.letters.forEach(letter => {
            const button = document.createElement("button");
            button.className = "letter-button";
            button.innerText = letter;
            button.id = `letter-${letter}`;
            button.onclick = () => handleLetterClick(letter, button);
            container.appendChild(button);
        });
    });
    resizeCanvas();
}

/** Finds which side a letter belongs to. */
function findSide(letter) {
    for (const sideName in allSides) {
        if (allSides[sideName].includes(letter)) {
            return sideName;
        }
    }
    return null;
}

/** Handles clicking on a letter button (for click path). */
function handleLetterClick(letter, buttonElement) {
    clearMessage();
    if (currentPath.length > 0 && currentPath[currentPath.length - 1].letter === letter) return;
    if (currentPath.length > 0) {
        const previousLetter = currentPath[currentPath.length - 1].letter;
        if (findSide(letter) === findSide(previousLetter)) {
            showMessage(`Cannot use two letters ("${previousLetter}", "${letter}") from the same side consecutively.`);
            return;
        }
    }
    if (currentWord === "" && lastLetterOfPreviousWord && letter !== lastLetterOfPreviousWord) {
         showMessage(`Word must start with "${lastLetterOfPreviousWord}"`);
         return;
    }

    currentWord += letter;
    const rect = buttonElement.getBoundingClientRect();
    const canvasRect = lineCanvas.getBoundingClientRect();
    const x = rect.left + rect.width / 2 - canvasRect.left;
    const y = rect.top + rect.height / 2 - canvasRect.top;
    currentPath.push({ letter: letter, element: buttonElement, x: x, y: y });
    updateCurrentWordDisplay();
    redrawLines();
    highlightPath();
}

/** Updates the display showing the word currently being built by clicks. */
function updateCurrentWordDisplay() {
    currentWordSpan.innerText = currentWord;
}

/** Clears the canvas and redraws lines based on the currentPath (for click path). */
function redrawLines() {
    // Ensure canvas context is valid
    if (!ctx) {
        console.error("Canvas context not available");
        return;
    }
    ctx.clearRect(0, 0, lineCanvas.width, lineCanvas.height);
    if (currentPath.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(currentPath[0].x, currentPath[0].y);
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#55f"; // Blue lines
    for (let i = 1; i < currentPath.length; i++) {
        ctx.lineTo(currentPath[i].x, currentPath[i].y);
    }
    ctx.stroke();
}

/** Highlights the buttons in the current click path. */
 function highlightPath() {
    document.querySelectorAll('.letter-button.selected, .letter-button.last-selected').forEach(el => {
        el.classList.remove('selected', 'last-selected');
    });
    currentPath.forEach((point, index) => {
        // Check if element exists before adding class
        if (point.element) {
            point.element.classList.add('selected');
            if(index === currentPath.length - 1){
                point.element.classList.add('last-selected');
            }
        }
    });
 }

/** Clears the currently formed word and path from clicks. */
function clearCurrentWord() {
    currentWord = "";
    currentPath = [];
    updateCurrentWordDisplay();
    redrawLines();
    highlightPath();
    clearMessage();
}

/**
 * Validates a word (either clicked or typed) against basic game rules.
 * @param {string} word - The uppercase word to validate.
 * @returns {boolean} True if valid according to game rules, false otherwise.
 */
function validateWordRules(word) {
    // Rule: Word length
    if (!word || word.length < 3) {
        showMessage("Word must be at least 3 letters long!");
        return false;
    }
     // Basic check for non-alphabetic characters
    if (!/^[A-Z]+$/.test(word)) {
         showMessage("Word must contain only letters.");
         return false;
    }
    // Rule: First letter must match the end of the previous word
    if (lastLetterOfPreviousWord && word[0] !== lastLetterOfPreviousWord) {
        showMessage(`Word must start with "${lastLetterOfPreviousWord}"`);
        return false;
    }
    // Rule: Check if all letters exist on the board
    for (let char of word) {
        if (!allAvailableLetters.includes(char)) {
            showMessage(`Letter "${char}" is not available on the board.`);
            return false;
        }
    }
    // Rule: Adjacent letters from different sides
    for (let i = 0; i < word.length - 1; i++) {
        const currentSide = findSide(word[i]);
        const nextSide = findSide(word[i + 1]);
        if (!currentSide || !nextSide) {
             console.error("Could not find side for letter:", word[i], word[i+1]);
             showMessage("Internal error validating sides."); // Should not happen
             return false;
        }
        if (currentSide === nextSide) {
            showMessage(`Adjacent letters "${word[i]}" and "${word[i + 1]}" are from the same side!`);
            return false;
        }
    }
     // Rule: Check if word was already used
    if (usedWords.includes(word)) {
        showMessage(`Word "${word}" has already been used!`);
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
    // Ensure wordToCheck is not empty before fetching
    if (!wordToCheck) {
        return Promise.reject(new Error("Empty word provided to API check"));
    }
    return fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${wordToCheck}`)
        .then(response => {
            if (response.ok) return response.json(); // Word found
            if (response.status === 404) throw new Error('WordNotFound'); // Word not found
            throw new Error(`HTTP error! status: ${response.status}`); // Other error
        })
        .catch(error => {
            // Handle errors and reject the promise
            if (error.message === 'WordNotFound') {
                showMessage(`"${wordToCheck.toUpperCase()}" is not a valid dictionary word!`);
            } else {
                showMessage("Error checking word validity. Check connection?");
                console.error("API Error:", error);
            }
            return Promise.reject(error); // Propagate rejection
        });
}

/**
 * Updates the game state after a word is fully validated.
 * @param {string} validWord - The valid uppercase word.
 */
function updateGameState(validWord) {
     usedWords.push(validWord);
     usedWordsDisplay.innerText = "Used Words: " + usedWords.join(", ");
     lastLetterOfPreviousWord = validWord[validWord.length - 1];
     // Letters are always visually available in this version
}

/**
 * Handles submission of the word built by clicking letters.
 */
function submitClickedWord() {
    const wordToSubmit = currentWord; // Get word from click path

    if (!validateWordRules(wordToSubmit)) {
        return; // Stop if basic game rules fail
    }

    checkWordWithAPI(wordToSubmit.toLowerCase()) // API check needs lowercase
        .then(data => { // Only runs if API check was successful
            console.log("API Data for valid word:", data);
            clearMessage();
            updateGameState(wordToSubmit); // Update state with the valid word
            clearCurrentWord(); // Clear click-related state for next word
        })
        .catch(() => {
             // Error message already shown by checkWordWithAPI
             // Do nothing here, let user clear manually or try again
        });
}

/**
 * Handles submission of the word typed into the input field.
 */
function submitTypedWord() {
    const wordToSubmit = typedWordInput.value.trim().toUpperCase(); // Get typed word

    // Perform all game rule validations for the typed word
    if (!validateWordRules(wordToSubmit)) {
        return;
    }

    checkWordWithAPI(wordToSubmit.toLowerCase()) // API check needs lowercase
         .then(data => {
            console.log("API Data for valid word:", data);
            clearMessage();
            updateGameState(wordToSubmit); // Update state with the valid word
            typedWordInput.value = ""; // Clear the typed input field
         })
         .catch(() => {
            // Error message shown by checkWordWithAPI
            // Do not clear typed input on error, let user fix it
         });
}


/**
 * Resets the entire game state.
 */
function restartGame() {
    usedWords = [];
    lastLetterOfPreviousWord = null;
    usedWordsDisplay.innerText = "Used Words:";
    typedWordInput.value = ""; // Clear typed input as well
    clearCurrentWord(); // Clears click path word, canvas, highlights, message
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

// Add event listener for the 'Enter' key on the TYPED input field
typedWordInput.addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        event.preventDefault(); // Prevent default form submission behavior
        submitTypedWord(); // Call the submit function for typed words
    }
});

// --- Initial Game Setup ---
// Call setupBoard() when the script loads to draw the initial game board
setupBoard();

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
let currentPath = []; // For click path - Array of {letter, element, x, y}
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
    if (!ctx) { console.error("Canvas context not available"); return; }
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
        if (point.element) {
            point.element.classList.add('selected');
            if(index === currentPath.length - 1){
                point.element.classList.add('last-selected');
            }
        }
    });
 }

/** Clears the currently formed word and path from clicks. */
function clearClickedPath() { // Renamed from clearCurrentWord
    currentWord = "";
    currentPath = [];
    updateCurrentWordDisplay();
    redrawLines();
    highlightPath();
    clearMessage();
}

/** NEW FUNCTION: Deletes the last letter added via clicking */
function deleteLastClickedLetter() {
    if (currentPath.length > 0) {
        // Remove the last element from the path array
        currentPath.pop();
        // Rebuild the currentWord string from the modified path
        currentWord = currentPath.map(p => p.letter).join('');

        // Update display, redraw lines, update highlights
        updateCurrentWordDisplay();
        redrawLines();
        highlightPath();
        clearMessage(); // Clear any previous messages
    }
}


/**
 * Validates a word (either clicked or typed) against basic game rules.
 * @param {string} word - The uppercase word to validate.
 * @returns {boolean} True if valid according to game rules, false otherwise.
 */
function validateWordRules(word) {
    if (!word || word.length < 3) { showMessage("Word must be at least 3 letters long!"); return false; }
    if (!/^[A-Z]+$/.test(word)) { showMessage("Word must contain only letters."); return false; }
    if (lastLetterOfPreviousWord && word[0] !== lastLetterOfPreviousWord) { showMessage(`Word must start with "${lastLetterOfPreviousWord}"`); return false; }
    for (let char of word) { if (!allAvailableLetters.includes(char)) { showMessage(`Letter "${char}" is not available on the board.`); return false; } }
    for (let i = 0; i < word.length - 1; i++) {
        const currentSide = findSide(word[i]);
        const nextSide = findSide(word[i + 1]);
        if (!currentSide || !nextSide) { console.error("Could not find side for letter:", word[i], word[i+1]); showMessage("Internal error validating sides."); return false; }
        if (currentSide === nextSide) { showMessage(`Adjacent letters "${word[i]}" and "${word[i + 1]}" are from the same side!`); return false; }
    }
    if (usedWords.includes(word)) { showMessage(`Word "${word}" has already been used!`); return false; }
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
    if (!wordToCheck) { return Promise.reject(new Error("Empty word provided to API check")); }
    return fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${wordToCheck}`)
        .then(response => {
            if (response.ok) return response.json();
            if (response.status === 404) throw new Error('WordNotFound');
            throw new Error(`HTTP error! status: ${response.status}`);
        })
        .catch(error => {
            if (error.message === 'WordNotFound') { showMessage(`Not in word list.`); }
            else { showMessage("Error checking word validity. Check connection?"); console.error("API Error:", error); }
            return Promise.reject(error);
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
}

/** Handles submission of the word built by clicking letters. */
function submitClickedWord() {
    const wordToSubmit = currentWord;
    if (!validateWordRules(wordToSubmit)) { return; }
    checkWordWithAPI(wordToSubmit.toLowerCase())
        .then(data => {
            console.log("API Data for valid word:", data);
            clearMessage();
            updateGameState(wordToSubmit);
            clearClickedPath(); // Use the renamed function to clear the path
        })
        .catch(() => { /* Error message handled in checkWordWithAPI */ });
}

/** Handles submission of the word typed into the input field. */
function submitTypedWord() {
    const wordToSubmit = typedWordInput.value.trim().toUpperCase();
    if (!validateWordRules(wordToSubmit)) { return; }
    checkWordWithAPI(wordToSubmit.toLowerCase())
         .then(data => {
            console.log("API Data for valid word:", data);
            clearMessage();
            updateGameState(wordToSubmit);
            typedWordInput.value = "";
         })
         .catch(() => { /* Error message handled in checkWordWithAPI */ });
}

/** Resets the entire game state. */
function restartGame() {
    usedWords = [];
    lastLetterOfPreviousWord = null;
    usedWordsDisplay.innerText = "Used Words:";
    typedWordInput.value = "";
    clearClickedPath(); // Use renamed function
    // No need to call setupBoard unless letters change
}

/** Displays a message to the user. */
function showMessage(msg) { messageDisplay.innerText = msg; }
/** Clears the message display area. */
function clearMessage() { messageDisplay.innerText = ""; }

// --- Event Listeners ---
window.addEventListener('resize', resizeCanvas);
typedWordInput.addEventListener("keypress", function(event) {
    if (event.key === "Enter") { event.preventDefault(); submitTypedWord(); }
});

// --- Initial Game Setup ---
setupBoard();

// --- Game Setup ---
const topLetters = ['A', 'T', 'E']; // Example - Will be randomized
const leftLetters = ['M', 'P', 'S']; // Example
const rightLetters = ['R', 'O', 'N']; // Example
const bottomLetters = ['C', 'I', 'D']; // Example
const allSides = { top: topLetters, left: leftLetters, right: rightLetters, bottom: bottomLetters };
let allAvailableLetters = []; // Will be populated by generateNewLetters
const LETTER_POOL = "ABCDEFGHIJKLMNOPRSTUVWY".split(''); // Example pool

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
const typedWordInput = document.getElementById("word-input-typed");

// --- Functions ---

/** Shuffles an array in place */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

/** Generates 12 unique letters and assigns them to sides */
function generateNewLetters() {
    if (LETTER_POOL.length < 12) { console.error("Letter pool too small!"); return; }
    shuffleArray(LETTER_POOL);
    const selectedLetters = LETTER_POOL.slice(0, 12);
    topLetters.length = 0; leftLetters.length = 0; rightLetters.length = 0; bottomLetters.length = 0;
    topLetters.push(...selectedLetters.slice(0, 3));
    leftLetters.push(...selectedLetters.slice(3, 6));
    rightLetters.push(...selectedLetters.slice(6, 9));
    bottomLetters.push(...selectedLetters.slice(9, 12));
    allAvailableLetters = [...topLetters, ...leftLetters, ...rightLetters, ...bottomLetters];
    console.log("New Letters:", allSides);
}

/** Sets canvas dimensions */
function resizeCanvas() {
    const container = lineCanvas.parentElement;
    if (!container) return;
    lineCanvas.width = container.clientWidth;
    lineCanvas.height = container.clientHeight;
    redrawLines();
}

/** Creates letter buttons */
function setupBoard() {
    const sides = [
        { id: "top-side", letters: topLetters }, { id: "left-side", letters: leftLetters },
        { id: "right-side", letters: rightLetters }, { id: "bottom-side", letters: bottomLetters }
    ];
    sides.forEach(side => {
        const container = document.getElementById(side.id);
        if (!container) return;
        container.innerHTML = "";
        if (!side.letters || side.letters.length === 0) { return; }
        side.letters.forEach(letter => {
            const button = document.createElement("button");
            button.className = "letter-button"; button.innerText = letter; button.id = `letter-${letter}`;
            button.onclick = () => handleLetterClick(letter, button);
            container.appendChild(button);
        });
    });
    resizeCanvas();
}

/** Finds which side a letter belongs to */
function findSide(letter) {
    for (const sideName in allSides) { if (allSides[sideName].includes(letter)) { return sideName; } } return null;
}

/** Handles clicking on a letter button */
function handleLetterClick(letter, buttonElement) {
    clearMessage();
    if (currentPath.length > 0 && currentPath[currentPath.length - 1].letter === letter) return;
    if (currentPath.length > 0) {
        const previousLetter = currentPath[currentPath.length - 1].letter;
        if (findSide(letter) === findSide(previousLetter)) {
            showMessage(`Cannot use two letters ("${previousLetter}", "${letter}") from the same side consecutively.`); return;
        }
    }
    if (currentWord === "" && lastLetterOfPreviousWord && letter !== lastLetterOfPreviousWord) {
         showMessage(`Word must start with "${lastLetterOfPreviousWord}"`); return;
    }
    if (currentWord.length === 1 && lastLetterOfPreviousWord) {
         if (findSide(letter) === findSide(lastLetterOfPreviousWord)) {
            showMessage(`Cannot use two letters ("${lastLetterOfPreviousWord}", "${letter}") from the same side consecutively.`); return;
        }
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

/** Updates the display showing the word currently being built by clicks */
function updateCurrentWordDisplay() { currentWordSpan.innerText = currentWord; }

/** Clears the canvas and redraws lines based on the currentPath */
function redrawLines() {
    if (!ctx) { console.error("Canvas context not available"); return; }
    ctx.clearRect(0, 0, lineCanvas.width, lineCanvas.height);
    if (currentPath.length < 2) return;
    ctx.beginPath(); ctx.moveTo(currentPath[0].x, currentPath[0].y); ctx.lineWidth = 3; ctx.strokeStyle = "#55f";
    for (let i = 1; i < currentPath.length; i++) { ctx.lineTo(currentPath[i].x, currentPath[i].y); } ctx.stroke();
}

/** Highlights the buttons in the current click path */
 function highlightPath() {
    document.querySelectorAll('.letter-button.selected, .letter-button.last-selected').forEach(el => { el.classList.remove('selected', 'last-selected'); });
    currentPath.forEach((point, index) => {
        if (point.element) {
            point.element.classList.add('selected');
            if(index === currentPath.length - 1){ point.element.classList.add('last-selected'); }
        }
    });
 }

/** Deletes the last letter added via clicking */
function deleteLastClickedLetter() {
    if (currentPath.length > 1 || (currentPath.length === 1 && !lastLetterOfPreviousWord)) {
        currentPath.pop(); currentWord = currentPath.map(p => p.letter).join('');
        updateCurrentWordDisplay(); redrawLines(); highlightPath(); clearMessage();
    } else if (currentPath.length === 1 && lastLetterOfPreviousWord) {
        showMessage(`Next word must start with "${lastLetterOfPreviousWord}"`);
    }
}

/** Validates a word against basic game rules */
function validateWordRules(word) {
    if (!word || word.length < 3) { showMessage("Word must be at least 3 letters long!"); return false; }
    if (!/^[A-Z]+$/.test(word)) { showMessage("Word must contain only letters."); return false; }
    if (lastLetterOfPreviousWord && word[0] !== lastLetterOfPreviousWord) { showMessage(`Word must start with "${lastLetterOfPreviousWord}"`); return false; }
    for (let char of word) { if (!allAvailableLetters.includes(char)) { showMessage(`Letter "${char}" is not available on the board.`); return false; } }
    for (let i = 0; i < word.length - 1; i++) {
        const currentSide = findSide(word[i]); const nextSide = findSide(word[i + 1]);
        if (!currentSide || !nextSide) { console.error("Side validation error"); showMessage("Internal error."); return false; }
        if (currentSide === nextSide) { showMessage(`Adjacent letters "${word[i]}" and "${word[i + 1]}" are from the same side!`); return false; }
    }
    if (usedWords.includes(word)) { showMessage(`Word "${word}" has already been used!`); return false; }
    return true;
}

/** Checks word validity using the Dictionary API */
function checkWordWithAPI(wordToCheck) {
    showMessage("Checking dictionary...");
    if (!wordToCheck) { return Promise.reject(new Error("Empty word provided")); }
    return fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${wordToCheck}`)
        .then(response => {
            if (response.ok) return response.json();
            if (response.status === 404) throw new Error('WordNotFound');
            throw new Error(`HTTP error! status: ${response.status}`);
        })
        .catch(error => {
            if (error.message === 'WordNotFound') { showMessage(`"${wordToCheck.toUpperCase()}" is not a valid dictionary word!`); }
            else { showMessage("Error checking word validity."); console.error("API Error:", error); }
            return Promise.reject(error);
        });
}

/** Updates the game state after a word is fully validated */
function updateGameState(validWord) {
     usedWords.push(validWord);
     usedWordsDisplay.innerText = "Used Words: " + usedWords.join(", ");
     lastLetterOfPreviousWord = validWord[validWord.length - 1];
     // Reset click path to start with the new required letter
     currentWord = lastLetterOfPreviousWord; currentPath = [];
     const nextStartButton = document.getElementById(`letter-${lastLetterOfPreviousWord}`);
     if (nextStartButton) {
         const rect = nextStartButton.getBoundingClientRect(); const canvasRect = lineCanvas.getBoundingClientRect();
         const x = rect.left + rect.width / 2 - canvasRect.left; const y = rect.top + rect.height / 2 - canvasRect.top;
         currentPath.push({ letter: lastLetterOfPreviousWord, element: nextStartButton, x: x, y: y });
     } else { currentWord = ""; } // Fallback
     updateCurrentWordDisplay(); redrawLines(); highlightPath();
}

/** Handles submission of the word (either clicked or typed) */
function submitWord() {
    let wordToSubmit = "";
    let isTyped = false;

    // Prioritize typed word if it has content
    const typedValue = typedWordInput.value.trim().toUpperCase();
    if (typedValue.length > 0) {
        wordToSubmit = typedValue;
        isTyped = true;
    } else if (currentWord.length > 0) { // Otherwise use clicked word
        wordToSubmit = currentWord;
         // Validation requires more than just the starting letter for clicked words
         if (wordToSubmit.length < 2 && lastLetterOfPreviousWord) {
            showMessage("Word is too short!");
            return;
         }
    } else {
        showMessage("No word entered!"); // Neither typed nor clicked
        return;
    }

    // Validate game rules
    if (!validateWordRules(wordToSubmit)) { return; }

    // Check API
    checkWordWithAPI(wordToSubmit.toLowerCase())
        .then(data => {
            console.log("API Data for valid word:", data);
            clearMessage();
            updateGameState(wordToSubmit); // Update state and setup next word start

            // Clear the input method used
            if (isTyped) {
                typedWordInput.value = "";
            } else {
                // The updateGameState function already resets the click path correctly
            }
        })
        .catch(() => { /* Error message handled in checkWordWithAPI */ });
}


/** NEW FUNCTION: Clears the current game board state but keeps letters */
function clearCurrentGame() {
    usedWords = []; // Clear used words for this board
    lastLetterOfPreviousWord = null; // Reset starting constraint
    usedWordsDisplay.innerText = "Used Words:";
    typedWordInput.value = ""; // Clear typed input

    // Clear current click path completely
    currentWord = "";
    currentPath = [];
    updateCurrentWordDisplay();
    redrawLines();
    highlightPath();
    clearMessage();
    // NOTE: Does NOT call generateNewLetters() or setupBoard()
}


/** Resets the entire game state AND generates new letters */
function restartGame() {
    // Generate and assign new letters
    generateNewLetters();
    // Reset game state variables completely
    clearCurrentGame(); // Use clearCurrentGame to reset state vars
    // Redraw the board with the new letters
    setupBoard(); // This now uses the new letters
}

/** Displays a message to the user */
function showMessage(msg) { messageDisplay.innerText = msg; }
/** Clears the message display area */
function clearMessage() { messageDisplay.innerText = ""; }

// --- Event Listeners ---
window.addEventListener('resize', resizeCanvas);
// Listen for Enter on the typed input
typedWordInput.addEventListener("keypress", function(event) {
    if (event.key === "Enter") { event.preventDefault(); submitWord(); } // Use generic submit
});
// Optional: Listen for Enter globally if needed (might interfere)
// document.addEventListener("keypress", function(event) {
//    if (event.key === "Enter" && document.activeElement !== typedWordInput) {
//        submitWord(); // Submit clicked word if Enter pressed outside input
//    }
// });

// --- Initial Game Setup ---
generateNewLetters(); // Generate the first set of letters
setupBoard(); // Draw the initial board with generated letters

// --- Game Setup ---
const LETTER_POOL = "ABCDEFGHIJKLMNOPRSTUVWY".split(''); // Example pool
const VOWELS = "AEIOU".split('');

// Global variables to hold the current letters on the board
let topLetters = [];
let leftLetters = [];
let rightLetters = [];
let bottomLetters = [];
let allAvailableLetters = [];

const allSides = { top: topLetters, left: leftLetters, right: rightLetters, bottom: bottomLetters };

// --- Game State Variables ---
let usedWords = [];
let currentWord = "";
let currentPath = [];
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

/** Counts vowels in an array of letters */
function countVowels(letterArray) {
    let count = 0;
    for (const letter of letterArray) {
        if (VOWELS.includes(letter)) {
            count++;
        }
    }
    return count;
}


/**
 * Generates a new set of 12 unique letters, ensuring at least 3 vowels total
 * AND no more than 2 vowels per side, and assigns them to the sides.
 */
function generateNewLetters() {
    if (LETTER_POOL.length < 12) { console.error("Letter pool too small!"); return; }

    let selectedLetters = [];
    let totalVowelCount = 0;
    let selectionAttempts = 0;
    const MAX_ATTEMPTS = 100; // Safety limit

    // 1. Select 12 unique letters with at least 3 vowels total
    while (totalVowelCount < 3 && selectionAttempts < MAX_ATTEMPTS) {
        shuffleArray(LETTER_POOL);
        selectedLetters = LETTER_POOL.slice(0, 12); // Already unique
        totalVowelCount = countVowels(selectedLetters);
        selectionAttempts++;
    }

    if (selectionAttempts >= MAX_ATTEMPTS && totalVowelCount < 3) {
        console.error("Failed to generate initial set with 3+ vowels.");
        // Handle error or use the last set? For now, use the last one.
    }

    // 2. Assign these 12 letters to sides, ensuring max 2 vowels per side
    let assignmentAttempts = 0;
    let assignmentOk = false;
    while (!assignmentOk && assignmentAttempts < MAX_ATTEMPTS) {
        shuffleArray(selectedLetters); // Shuffle the *selected* 12 letters for assignment

        // Tentatively assign
        const tempTop = selectedLetters.slice(0, 3);
        const tempLeft = selectedLetters.slice(3, 6);
        const tempRight = selectedLetters.slice(6, 9);
        const tempBottom = selectedLetters.slice(9, 12);

        // Check vowel count per side
        if (countVowels(tempTop) <= 2 &&
            countVowels(tempLeft) <= 2 &&
            countVowels(tempRight) <= 2 &&
            countVowels(tempBottom) <= 2)
        {
            // Assignment is valid, update global arrays
            topLetters.length = 0; leftLetters.length = 0; rightLetters.length = 0; bottomLetters.length = 0;
            topLetters.push(...tempTop);
            leftLetters.push(...tempLeft);
            rightLetters.push(...tempRight);
            bottomLetters.push(...tempBottom);
            assignmentOk = true; // Exit the loop
        }
        assignmentAttempts++;
    }

     if (!assignmentOk) {
        console.error("Failed to assign letters with max 2 vowels per side.");
        // Fallback: Use the last attempted assignment even if it violates the rule
        // This might happen if the initial 12 letters make it impossible (e.g., 8 vowels selected)
        // A more robust solution might re-select the initial 12 letters.
        if (!topLetters.length) { // Ensure letters are assigned if fallback needed
             topLetters.push(...selectedLetters.slice(0, 3));
             leftLetters.push(...selectedLetters.slice(3, 6));
             rightLetters.push(...selectedLetters.slice(6, 9));
             bottomLetters.push(...selectedLetters.slice(9, 12));
        }
    }

    // Update the combined list of available letters
    allAvailableLetters = [...topLetters, ...leftLetters, ...rightLetters, ...bottomLetters];
    console.log("New Letters:", allSides, `(Vowels Total: ${totalVowelCount})`);
}


/** Sets canvas dimensions based on its container. */
function resizeCanvas() {
    const container = lineCanvas.parentElement;
    if (!container) return;
    lineCanvas.width = container.clientWidth;
    lineCanvas.height = container.clientHeight;
    redrawLines();
}

/** Creates the letter buttons and adds click listeners. Uses current global letter arrays. */
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

/** Finds which side a letter belongs to based on current global arrays. */
function findSide(letter) {
    for (const sideName in allSides) { if (allSides[sideName].includes(letter)) { return sideName; } } return null;
}

/** Handles clicking on a letter button (for click path). */
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

/** Updates the display showing the word currently being built by clicks. */
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
    const typedValue = typedWordInput.value.trim().toUpperCase();
    if (typedValue.length > 0) { wordToSubmit = typedValue; isTyped = true; }
    else if (currentWord.length > 0) { wordToSubmit = currentWord; if (wordToSubmit.length < 2 && lastLetterOfPreviousWord) { showMessage("Word is too short!"); return; } }
    else { showMessage("No word entered!"); return; }

    if (!validateWordRules(wordToSubmit)) { return; }

    checkWordWithAPI(wordToSubmit.toLowerCase())
        .then(data => {
            console.log("API Data for valid word:", data);
            clearMessage();
            updateGameState(wordToSubmit);
            if (isTyped) { typedWordInput.value = ""; } // Clear typed input only if it was used
            // Click path is reset by updateGameState
        })
        .catch(() => { /* Error message handled in checkWordWithAPI */ });
}

/** Clears the current game board state but keeps letters */
function clearCurrentGame() {
    usedWords = []; lastLetterOfPreviousWord = null;
    usedWordsDisplay.innerText = "Used Words:"; typedWordInput.value = "";
    currentWord = ""; currentPath = [];
    updateCurrentWordDisplay(); redrawLines(); highlightPath(); clearMessage();
}

/** Resets the entire game state AND generates new letters */
function restartGame() {
    generateNewLetters(); // Generate new letters (meeting constraints)
    clearCurrentGame(); // Reset state variables
    setupBoard(); // Draw the board with the new letters
}

/** Displays a message to the user */
function showMessage(msg) { messageDisplay.innerText = msg; }
/** Clears the message display area */
function clearMessage() { messageDisplay.innerText = ""; }

// --- Event Listeners ---
window.addEventListener('resize', resizeCanvas);
typedWordInput.addEventListener("keypress", function(event) {
    if (event.key === "Enter") { event.preventDefault(); submitWord(); }
});

// --- Initial Game Setup ---
generateNewLetters(); // Generate the first set of letters (meeting constraints)
setupBoard(); // Draw the initial board with generated letters


// --- Game Setup ---
const LETTER_POOL = "ABCDEFGHIJKLMNOPRSTUVWY".split('');
const VOWELS = "AEIOU".split('');
let topLetters = [], leftLetters = [], rightLetters = [], bottomLetters = [];
let allAvailableLetters = [];
const allSides = { top: topLetters, left: leftLetters, right: rightLetters, bottom: bottomLetters };

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
const typedWordInput = document.getElementById("word-input-typed");

// --- Functions ---

/** Shuffles an array */
function shuffleArray(array) { /* ... (implementation as before) ... */
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}
/** Counts vowels */
function countVowels(letterArray) { /* ... (implementation as before) ... */
    let count = 0;
    for (const letter of letterArray) { if (VOWELS.includes(letter)) { count++; } }
    return count;
}
/** Generates new letters meeting constraints */
function generateNewLetters() { /* ... (implementation as before) ... */
    if (LETTER_POOL.length < 12) { console.error("Letter pool too small!"); return; }
    let selectedLetters = []; let totalVowelCount = 0; let selectionAttempts = 0;
    const MAX_ATTEMPTS = 100;
    while (totalVowelCount < 3 && selectionAttempts < MAX_ATTEMPTS) {
        shuffleArray(LETTER_POOL); selectedLetters = LETTER_POOL.slice(0, 12);
        totalVowelCount = countVowels(selectedLetters); selectionAttempts++;
    }
    if (selectionAttempts >= MAX_ATTEMPTS && totalVowelCount < 3) { console.error("Failed to generate initial set with 3+ vowels."); }
    let assignmentAttempts = 0; let assignmentOk = false;
    while (!assignmentOk && assignmentAttempts < MAX_ATTEMPTS) {
        shuffleArray(selectedLetters);
        const tempTop = selectedLetters.slice(0, 3); const tempLeft = selectedLetters.slice(3, 6);
        const tempRight = selectedLetters.slice(6, 9); const tempBottom = selectedLetters.slice(9, 12);
        if (countVowels(tempTop) <= 2 && countVowels(tempLeft) <= 2 && countVowels(tempRight) <= 2 && countVowels(tempBottom) <= 2) {
            topLetters.length = 0; leftLetters.length = 0; rightLetters.length = 0; bottomLetters.length = 0;
            topLetters.push(...tempTop); leftLetters.push(...tempLeft); rightLetters.push(...tempRight); bottomLetters.push(...tempBottom);
            assignmentOk = true;
        }
        assignmentAttempts++;
    }
     if (!assignmentOk) {
        console.error("Failed to assign letters with max 2 vowels per side.");
        if (!topLetters.length) { // Ensure letters are assigned if fallback needed
             topLetters.push(...selectedLetters.slice(0, 3)); leftLetters.push(...selectedLetters.slice(3, 6));
             rightLetters.push(...selectedLetters.slice(6, 9)); bottomLetters.push(...selectedLetters.slice(9, 12));
        }
    }
    allAvailableLetters = [...topLetters, ...leftLetters, ...rightLetters, ...bottomLetters];
    console.log("New Letters:", allSides, `(Vowels Total: ${totalVowelCount})`);
}
/** Sets canvas dimensions */
function resizeCanvas() { /* ... (implementation as before) ... */
    const container = lineCanvas.parentElement; if (!container) return;
    lineCanvas.width = container.clientWidth; lineCanvas.height = container.clientHeight; redrawLines();
}
/** Creates letter buttons */
function setupBoard() { /* ... (implementation as before) ... */
    const sides = [ { id: "top-side", letters: topLetters }, { id: "left-side", letters: leftLetters }, { id: "right-side", letters: rightLetters }, { id: "bottom-side", letters: bottomLetters } ];
    sides.forEach(side => { const container = document.getElementById(side.id); if (!container) return; container.innerHTML = ""; if (!side.letters || side.letters.length === 0) { return; }
        side.letters.forEach(letter => { const button = document.createElement("button"); button.className = "letter-button"; button.innerText = letter; button.id = `letter-${letter}`; button.onclick = () => handleLetterClick(letter, button); container.appendChild(button); });
    });
    resizeCanvas();
}
/** Finds which side a letter belongs to */
function findSide(letter) { /* ... (implementation as before) ... */
    for (const sideName in allSides) { if (allSides[sideName].includes(letter)) { return sideName; } } return null;
}
/** Handles clicking on a letter button */
function handleLetterClick(letter, buttonElement) { /* ... (implementation as before) ... */
    clearMessage();
    if (currentPath.length > 0 && currentPath[currentPath.length - 1].letter === letter) return;
    if (currentPath.length > 0) { const previousLetter = currentPath[currentPath.length - 1].letter; if (findSide(letter) === findSide(previousLetter)) { showMessage(`Cannot use two letters ("${previousLetter}", "${letter}") from the same side consecutively.`); return; } }
    if (currentWord === "" && lastLetterOfPreviousWord && letter !== lastLetterOfPreviousWord) { showMessage(`Word must start with "${lastLetterOfPreviousWord}"`); return; }
    if (currentWord.length === 1 && lastLetterOfPreviousWord) { if (findSide(letter) === findSide(lastLetterOfPreviousWord)) { showMessage(`Cannot use two letters ("${lastLetterOfPreviousWord}", "${letter}") from the same side consecutively.`); return; } }
    currentWord += letter; const rect = buttonElement.getBoundingClientRect(); const canvasRect = lineCanvas.getBoundingClientRect(); const x = rect.left + rect.width / 2 - canvasRect.left; const y = rect.top + rect.height / 2 - canvasRect.top;
    currentPath.push({ letter: letter, element: buttonElement, x: x, y: y }); updateCurrentWordDisplay(); redrawLines(); highlightPath();
}
/** Updates the display showing the word currently being built by clicks */
function updateCurrentWordDisplay() { currentWordSpan.innerText = currentWord; }
/** Clears the canvas and redraws lines based on the currentPath */
function redrawLines() { /* ... (implementation as before) ... */
    if (!ctx) { console.error("Canvas context not available"); return; } ctx.clearRect(0, 0, lineCanvas.width, lineCanvas.height); if (currentPath.length < 2) return;
    ctx.beginPath(); ctx.moveTo(currentPath[0].x, currentPath[0].y); ctx.lineWidth = 3; ctx.strokeStyle = "#55f"; for (let i = 1; i < currentPath.length; i++) { ctx.lineTo(currentPath[i].x, currentPath[i].y); } ctx.stroke();
}
/** Highlights the buttons in the current click path */
 function highlightPath() { /* ... (implementation as before) ... */
    document.querySelectorAll('.letter-button.selected, .letter-button.last-selected').forEach(el => { el.classList.remove('selected', 'last-selected'); });
    currentPath.forEach((point, index) => { if (point.element) { point.element.classList.add('selected'); if(index === currentPath.length - 1){ point.element.classList.add('last-selected'); } } });
 }

/** Deletes the last letter added via clicking */
function deleteLastClickedLetter() { /* ... (implementation as before) ... */
    if (currentPath.length > 1 || (currentPath.length === 1 && !lastLetterOfPreviousWord)) { currentPath.pop(); currentWord = currentPath.map(p => p.letter).join(''); updateCurrentWordDisplay(); redrawLines(); highlightPath(); clearMessage(); }
    else if (currentPath.length === 1 && lastLetterOfPreviousWord) { showMessage(`Next word must start with "${lastLetterOfPreviousWord}"`); }
}

/** Validates a word against basic game rules */
function validateWordRules(word) { /* ... (implementation as before) ... */
    if (!word || word.length < 3) { showMessage("Word must be at least 3 letters long!"); return false; } if (!/^[A-Z]+$/.test(word)) { showMessage("Word must contain only letters."); return false; } if (lastLetterOfPreviousWord && word[0] !== lastLetterOfPreviousWord) { showMessage(`Word must start with "${lastLetterOfPreviousWord}"`); return false; }
    for (let char of word) { if (!allAvailableLetters.includes(char)) { showMessage(`Letter "${char}" is not available on the board.`); return false; } }
    for (let i = 0; i < word.length - 1; i++) { const currentSide = findSide(word[i]); const nextSide = findSide(word[i + 1]); if (!currentSide || !nextSide) { console.error("Side validation error"); showMessage("Internal error."); return false; } if (currentSide === nextSide) { showMessage(`Adjacent letters "${word[i]}" and "${word[i + 1]}" are from the same side!`); return false; } }
    if (usedWords.includes(word)) { showMessage(`Word "${word}" has already been used!`); return false; } return true;
}
/** Checks word validity using the Dictionary API */
function checkWordWithAPI(wordToCheck) { /* ... (implementation as before) ... */
    showMessage("Checking dictionary..."); if (!wordToCheck) { return Promise.reject(new Error("Empty word provided")); }
    return fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${wordToCheck}`) .then(response => { if (response.ok) return response.json(); if (response.status === 404) throw new Error('WordNotFound'); throw new Error(`HTTP error! status: ${response.status}`); }) .catch(error => { if (error.message === 'WordNotFound') { showMessage(`"${wordToCheck.toUpperCase()}" is not a valid dictionary word!`); } else { showMessage("Error checking word validity."); console.error("API Error:", error); } return Promise.reject(error); });
}
/** Updates the game state after a word is fully validated */
function updateGameState(validWord) { /* ... (implementation as before) ... */
     usedWords.push(validWord); usedWordsDisplay.innerText = "Used Words: " + usedWords.join(", "); lastLetterOfPreviousWord = validWord[validWord.length - 1];
     currentWord = lastLetterOfPreviousWord; currentPath = []; const nextStartButton = document.getElementById(`letter-${lastLetterOfPreviousWord}`);
     if (nextStartButton) { const rect = nextStartButton.getBoundingClientRect(); const canvasRect = lineCanvas.getBoundingClientRect(); const x = rect.left + rect.width / 2 - canvasRect.left; const y = rect.top + rect.height / 2 - canvasRect.top; currentPath.push({ letter: lastLetterOfPreviousWord, element: nextStartButton, x: x, y: y }); }
     else { currentWord = ""; } updateCurrentWordDisplay(); redrawLines(); highlightPath();
}
/** Handles submission of the word (either clicked or typed) */
function submitWord() { /* ... (implementation as before) ... */
    let wordToSubmit = ""; let isTyped = false; const typedValue = typedWordInput.value.trim().toUpperCase();
    if (typedValue.length > 0) { wordToSubmit = typedValue; isTyped = true; } else if (currentWord.length > 0) { wordToSubmit = currentWord; if (wordToSubmit.length < 2 && lastLetterOfPreviousWord) { showMessage("Word is too short!"); return; } } else { showMessage("No word entered!"); return; }
    if (!validateWordRules(wordToSubmit)) { return; }
    checkWordWithAPI(wordToSubmit.toLowerCase()) .then(data => { console.log("API Data for valid word:", data); clearMessage(); updateGameState(wordToSubmit); if (isTyped) { typedWordInput.value = ""; } }) .catch(() => { /* Error message handled */ });
}

/** NEW FUNCTION: Clears only the current click path/word attempt */
function clearCurrentClickPath() {
    // Reset only the click-related state
    currentWord = "";
    currentPath = [];

    // If there was a previous word, reset to its last letter
    if (lastLetterOfPreviousWord) {
        currentWord = lastLetterOfPreviousWord;
        const startButton = document.getElementById(`letter-${lastLetterOfPreviousWord}`);
        if (startButton) {
            const rect = startButton.getBoundingClientRect();
            const canvasRect = lineCanvas.getBoundingClientRect();
            const x = rect.left + rect.width / 2 - canvasRect.left;
            const y = rect.top + rect.height / 2 - canvasRect.top;
            currentPath.push({ letter: lastLetterOfPreviousWord, element: startButton, x: x, y: y });
        }
    }

    // Update visuals
    updateCurrentWordDisplay();
    redrawLines();
    highlightPath();
    clearMessage();
}


/** Clears the current game board state but keeps letters */
function clearBoardProgress() { // Renamed from clearCurrentGame
    usedWords = []; // Clear used words for this board
    lastLetterOfPreviousWord = null; // Reset starting constraint
    usedWordsDisplay.innerText = "Used Words:";
    typedWordInput.value = ""; // Clear typed input

    // Use the new function to clear the click path state
    clearCurrentClickPath();
}


/** Resets the entire game state AND generates new letters */
function restartGame() {
    generateNewLetters(); // Generate new letters (meeting constraints)
    clearBoardProgress(); // Reset state variables using the renamed function
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
generateNewLetters();
setupBoard();

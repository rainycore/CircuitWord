const topLetters = ['A', 'T', 'E'];
const leftLetters = ['M', 'P', 'S'];
const rightLetters = ['R', 'O', 'N'];
const bottomLetters = ['C', 'I', 'D'];

let currentWord = "";
let lastSide = null;
let usedWords = [];

function setupBoard() {
    const sides = [
        { id: "top-side", letters: topLetters },
        { id: "left-side", letters: leftLetters },
        { id: "right-side", letters: rightLetters },
        { id: "bottom-side", letters: bottomLetters }
    ];

    sides.forEach(side => {
        const container = document.getElementById(side.id);
        container.innerHTML = "";
        side.letters.forEach(letter => {
            const btn = document.createElement("button");
            btn.className = "letter-button";
            btn.innerText = letter;
            btn.onclick = () => selectLetter(letter, side.id);
            container.appendChild(btn);
        });
    });
}

function selectLetter(letter, side) {
    if (side === lastSide) {
        showMessage("Can't pick two letters from the same side!");
        return;
    }
    currentWord += letter;
    document.getElementById("current-word").innerText = "Current Word: " + currentWord;
    lastSide = side;
    clearMessage();
}

function submitWord() {
    if (currentWord.length < 3) {
        showMessage("Word too short!");
        return;
    }

    // (Later: Add real dictionary check here)

    usedWords.push(currentWord);
    document.getElementById("used-words").innerText = "Used Words: " + usedWords.join(", ");

    // Reset for next word
    lastSide = null;
    currentWord = "";
    document.getElementById("current-word").innerText = "Current Word:";
}

function restartGame() {
    currentWord = "";
    lastSide = null;
    usedWords = [];
    document.getElementById("current-word").innerText = "Current Word:";
    document.getElementById("used-words").innerText = "Used Words:";
    clearMessage();
    setupBoard();
}

function showMessage(msg) {
    document.getElementById("message").innerText = msg;
}

function clearMessage() {
    document.getElementById("message").innerText = "";
}

// Start game
setupBoard();

const topLetters = ['A', 'T', 'E'];
const leftLetters = ['M', 'P', 'S'];
const rightLetters = ['R', 'O', 'N'];
const bottomLetters = ['C', 'I', 'D'];

let usedWords = [];
let usedLetters = new Set();
let lastLetter = null;

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
            const div = document.createElement("div");
            div.className = "letter-button";
            div.innerText = letter;
            container.appendChild(div);
        });
    });
}

function submitWord() {
    const input = document.getElementById("word-input");
    const word = input.value.trim().toUpperCase();

    if (word.length < 3) {
        showMessage("Word too short!");
        return;
    }

    // Rule: If it's not the first word, it must start with the last letter
    if (lastLetter && word[0] !== lastLetter) {
        showMessage(`Word must start with "${lastLetter}"`);
        return;
    }

    // Rule: Must use only available letters
    const availableLetters = [...topLetters, ...leftLetters, ...rightLetters, ...bottomLetters];
    for (let char of word) {
        if (!availableLetters.includes(char)) {
            showMessage(`Invalid letter used: "${char}"`);
            return;
        }
    }

    // (Later: Add real dictionary check here)

    usedWords.push(word);
    document.getElementById("used-words").innerText = "Used Words: " + usedWords.join(", ");
    usedLetters = new Set([...usedLetters, ...word.split("")]);
    lastLetter = word[word.length - 1];
    input.value = "";
    clearMessage();
}

function restartGame() {
    usedWords = [];
    usedLetters.clear();
    lastLetter = null;
    document.getElementById("word-input").value = "";
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

// Start
setupBoard();

// Listen for Enter key
document.getElementById("word-input").addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        submitWord();
    }
});


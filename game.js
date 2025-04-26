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
            div.id = `letter-${letter}`; 
            container.appendChild(div);
        });
    });
}


function validateWord(word) {
    if (lastLetter && word[0] !== lastLetter) {
        showMessage(`Word must start with "${lastLetter}"`);
        return;
    }

    const availableLetters = [...topLetters, ...leftLetters, ...rightLetters, ...bottomLetters];
    for (let char of word) {
        if (!availableLetters.includes(char)) {
            showMessage(`Invalid letter used: "${char}"`);
            return;
        }
    }

    for (let i = 0; i < word.length - 1; i++) {
        const currentSide = findSide(word[i]);
        const nextSide = findSide(word[i + 1]);
        if (currentSide === nextSide) {
            showMessage(`Two adjacent letters "${word[i]}" and "${word[i + 1]}" are from the same side!`);
            return;
        }
    }

    usedWords.push(word);
    document.getElementById("used-words").innerText = "Used Words: " + usedWords.join(", ");
    word.split("").forEach(char => {
        usedLetters.add(char);
        const element = document.getElementById(`letter-${char}`);
        if (element) {
            element.classList.add("used-letter");
        }
    });

    lastLetter = word[word.length - 1];
    document.getElementById("word-input").value = "";
    clearMessage();
}


function submitWord() {
    const input = document.getElementById("word-input");
    const word = input.value.trim().toLowerCase(); // lowercase for API

    if (word.length < 3) {
        showMessage("Word too short!");
        return;
    }

    fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`)
        .then(response => {
            if (!response.ok) {
                throw new Error("Word not found");
            }
            return response.json();
        })
        .then(data => {
            // Word is valid, continue validating game rules
            validateWord(word.toUpperCase()); // convert to UPPERCASE because our board letters are uppercase
        })
        .catch(error => {
            showMessage(`"${word.toUpperCase()}" is not a valid word!`);
        });
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


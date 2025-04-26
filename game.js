const topLetters = ['A', 'T', 'E'];
        const leftLetters = ['M', 'P', 'S'];
        const rightLetters = ['R', 'O', 'N'];
        const bottomLetters = ['C', 'I', 'D'];
        const allSides = {
            top: topLetters,
            left: leftLetters,
            right: rightLetters,
            bottom: bottomLetters
        };

        let usedWords = [];
        let usedLetters = new Set();
        let lastLetter = null; // Stores the last letter of the previously played word

        // --- DOM Elements ---
        const wordInput = document.getElementById("word-input");
        const usedWordsDisplay = document.getElementById("used-words");
        const messageDisplay = document.getElementById("message");

        // --- Functions ---

        /**
         * Creates the letter buttons on the board.
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
                if (!container) {
                    console.error(`Container not found: ${side.id}`);
                    return;
                }
                container.innerHTML = ""; // Clear previous letters
                side.letters.forEach(letter => {
                    const div = document.createElement("div");
                    div.className = "letter-button";
                    div.innerText = letter;
                    div.id = `letter-${letter}`; // Assign unique ID for styling used letters
                    // Restore used state if needed (e.g., if restarting didn't clear usedLetters)
                    if (usedLetters.has(letter)) {
                         div.classList.add("used-letter");
                    }
                    container.appendChild(div);
                });
            });
             // Reset visual state of letters based on usedLetters set
            const allLetterButtons = document.querySelectorAll('.letter-button');
            allLetterButtons.forEach(button => {
                const letter = button.innerText;
                if (usedLetters.has(letter)) {
                    button.classList.add('used-letter');
                } else {
                    button.classList.remove('used-letter');
                }
            });
        }

        /**
         * Finds which side a letter belongs to.
         * @param {string} letter - The letter to find.
         * @returns {string|null} The side name ('top', 'left', 'right', 'bottom') or null if not found.
         */
        function findSide(letter) {
            for (const sideName in allSides) {
                if (allSides[sideName].includes(letter)) {
                    return sideName;
                }
            }
            return null; // Should not happen if letter validation is correct
        }

        /**
         * Validates the word based on game rules after API check.
         * @param {string} word - The uppercase word to validate.
         */
        function validateWord(word) {
            // 1. Check starting letter constraint (if not the first word)
            if (lastLetter && word[0] !== lastLetter) {
                showMessage(`Word must start with "${lastLetter}"`);
                return;
            }

            // 2. Check if all letters are available on the board
            const availableLetters = [...topLetters, ...leftLetters, ...rightLetters, ...bottomLetters];
            for (let char of word) {
                if (!availableLetters.includes(char)) {
                    // This check might be redundant if API ensures valid chars, but good for safety
                    showMessage(`Invalid letter used: "${char}"`);
                    return;
                }
                 // Check if the letter has already been used
                 if (usedLetters.has(char)) {
                    showMessage(`Letter "${char}" has already been used!`);
                    return;
                 }
            }

            // 3. Check adjacent letters constraint (must be from different sides)
            for (let i = 0; i < word.length - 1; i++) {
                const currentSide = findSide(word[i]);
                const nextSide = findSide(word[i + 1]);
                if (currentSide === nextSide) {
                    showMessage(`Adjacent letters "${word[i]}" and "${word[i + 1]}" are from the same side!`);
                    return;
                }
            }

            // --- Word is valid according to game rules ---

            // 4. Add word to used list and update display
            usedWords.push(word);
            usedWordsDisplay.innerText = "Used Words: " + usedWords.join(", ");

            // 5. Mark letters as used and update their style
            word.split("").forEach(char => {
                usedLetters.add(char);
                const element = document.getElementById(`letter-${char}`);
                if (element) {
                    element.classList.add("used-letter");
                }
            });

            // 6. Update the last letter for the next word constraint
            lastLetter = word[word.length - 1];

            // 7. Clear input and message
            wordInput.value = "";
            clearMessage();
        }

        /**
         * Handles word submission: checks length, calls API, then calls game validation.
         */
        function submitWord() {
            const word = wordInput.value.trim().toLowerCase(); // Use lowercase for API

            if (word.length < 3) {
                showMessage("Word must be at least 3 letters long!");
                return;
            }

            showMessage("Checking word..."); // Provide feedback

            // --- API Call Section ---
            fetch(`https://api.datamuse.com/words?sp=${word}&max=1`) // Query API
                .then(response => {
                    if (!response.ok) { // Check for HTTP errors
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json(); // Parse JSON
                })
                .then(data => {
                    // Check if API returned the exact word (case-insensitive check done by API)
                    if (data.length === 0 || data[0].word !== word) {
                        showMessage(`"${word.toUpperCase()}" is not a valid word!`);
                        return; // Stop if not a real word
                    }
                    // Word is valid according to API, proceed with game rule validation
                    clearMessage(); // Clear "Checking word..." message
                    validateWord(word.toUpperCase()); // Pass uppercase word to game logic
                })
                .catch(error => { // Handle network/API errors
                    showMessage("Error checking word validity. Check connection?");
                    console.error("API Error:", error);
                });
        }

        /**
         * Resets the game state.
         */
        function restartGame() {
            usedWords = [];
            usedLetters.clear();
            lastLetter = null;
            wordInput.value = "";
            usedWordsDisplay.innerText = "Used Words:";
            clearMessage();
            setupBoard(); // Redraw board to reset letter styles
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

        // Listen for Enter key in the input field
        wordInput.addEventListener("keypress", function(event) {
            if (event.key === "Enter") {
                event.preventDefault(); // Prevent default form submission if applicable
                submitWord();
            }
        });

        // --- Initial Setup ---
        setupBoard(); // Draw the initial board

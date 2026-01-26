/**
 * CircuitWord Game Logic - Refactored for Keyboard & Click Interactivity
 */

class CircuitWord {
    constructor() {
        // --- Constants ---
        this.CONFIG = {
            CONSONANTS: "BCDFGHJKLMNPQRSTVWXYZ".split(''),
            VOWELS: "AEIOU".split(''),
            REQUIRED_LETTERS: 12,
            LETTERS_PER_SIDE: 3,
            MIN_TOTAL_VOWELS: 3,
            MAX_VOWELS_PER_SIDE: 2,
            MIN_WORD_LENGTH: 3,
            MAX_GEN_ATTEMPTS: 200,
            API_URL: "https://api.dictionaryapi.dev/api/v2/entries/en/"
        };

        // --- State ---
        this.state = {
            sides: { top: [], left: [], right: [], bottom: [] },
            allLetters: [],
            usedWords: [],
            litButtons: new Set(),
            currentWord: "",
            currentPath: [],
            lastLetter: null 
        };

        this.dom = {};
        this.canvasCtx = null;
        
        this.resizeCanvas = this.resizeCanvas.bind(this);
    }

    init() {
        this.cacheDOM();
        this.bindEvents();
        this.generateNewGame();
        
        window.addEventListener('resize', this.resizeCanvas);
        setTimeout(this.resizeCanvas, 0);
    }

    cacheDOM() {
        this.dom = {
            container: document.querySelector(".game-container"),
            canvas: document.getElementById("line-canvas"),
            sides: {
                top: document.getElementById("top-side"),
                left: document.getElementById("left-side"),
                right: document.getElementById("right-side"),
                bottom: document.getElementById("bottom-side")
            },
            currentWord: document.querySelector("#current-word-display span"),
            usedWords: document.getElementById("used-words"),
            message: document.getElementById("message"),
            statsLetters: document.getElementById("letters-progress"),
            statsWords: document.getElementById("words-count"),
            input: document.getElementById("word-input-typed"),
            menu: document.getElementById("side-menu"),
            menuMessage: document.getElementById("custom-letter-message")
        };
        
        if (this.dom.canvas) {
            this.canvasCtx = this.dom.canvas.getContext("2d");
        }
    }

    bindEvents() {
        // Game UI Controls
        document.getElementById("submit-button").addEventListener("click", () => this.submitWord());
        document.getElementById("delete-last-button").addEventListener("click", () => this.deleteLastLetter());
        document.getElementById("clear-current-button").addEventListener("click", () => this.clearCurrentPath());
        document.getElementById("restart-game-button").addEventListener("click", () => this.clearBoardProgress());

        // Menu Controls
        document.getElementById("hamburger-button").addEventListener("click", () => this.toggleMenu());
        document.getElementById("new-board-button").addEventListener("click", () => {
            this.generateNewGame();
            this.toggleMenu();
        });
        document.getElementById("set-custom-button").addEventListener("click", () => this.setCustomBoard());

        // Global Keyboard Input
        document.addEventListener("keydown", (e) => {
            // Prevent game input if user is typing in menu fields
            if (e.target.tagName === 'INPUT' && e.target.id !== 'word-input-typed') return;

            const key = e.key.toUpperCase();

            if (/^[A-Z]$/.test(key)) {
                this.handleLetterInput(key);
            } else if (e.key === "Backspace") {
                this.deleteLastLetter();
            } else if (e.key === "Enter") {
                this.submitWord();
            }
        });
    }

    // --- Game Logic: Generation ---

    generateNewGame() {
        this.showMessage("Generating new board...");
        const pool = [...this.CONFIG.CONSONANTS, ...this.CONFIG.VOWELS, ...this.CONFIG.VOWELS, ...this.CONFIG.VOWELS];
        
        let attempts = 0;
        let success = false;

        while (!success && attempts < this.CONFIG.MAX_GEN_ATTEMPTS) {
            attempts++;
            this.shuffleArray(pool);
            const selection = Array.from(new Set(pool)).slice(0, this.CONFIG.REQUIRED_LETTERS);
            
            if (selection.length < this.CONFIG.REQUIRED_LETTERS) continue;

            const vowelsCount = selection.filter(l => this.CONFIG.VOWELS.includes(l)).length;
            if (vowelsCount < this.CONFIG.MIN_TOTAL_VOWELS) continue;

            this.shuffleArray(selection);
            const sides = {
                top: selection.slice(0, 3),
                left: selection.slice(3, 6),
                right: selection.slice(6, 9),
                bottom: selection.slice(9, 12)
            };

            const isValid = Object.values(sides).every(side => 
                side.filter(l => this.CONFIG.VOWELS.includes(l)).length <= this.CONFIG.MAX_VOWELS_PER_SIDE
            );

            if (isValid) {
                this.state.sides = sides;
                this.state.allLetters = selection;
                success = true;
            }
        }

        if (success) {
            this.resetGameState();
            this.renderBoard();
            this.showMessage("New board ready");
        } else {
            this.generateNewGame(); 
        }
    }

    setCustomBoard() {
        const inputs = ['top', 'left', 'right', 'bottom'].map(id => 
            document.getElementById(`custom-${id}`).value.trim().toUpperCase()
        );
        const allLetters = inputs.join('').split('');
        
        if (allLetters.length !== 12) return this.showMenuMessage("Must have exactly 12 letters.");
        if (new Set(allLetters).size !== 12) return this.showMenuMessage("Letters must be unique.");
        if (!allLetters.every(l => /^[A-Z]$/.test(l))) return this.showMenuMessage("Invalid characters.");

        this.state.sides = {
            top: inputs[0].split(''),
            left: inputs[1].split(''),
            right: inputs[2].split(''),
            bottom: inputs[3].split('')
        };
        this.state.allLetters = allLetters;
        
        this.resetGameState();
        this.renderBoard();
        this.toggleMenu();
    }

    resetGameState() {
        this.state.usedWords = [];
        this.state.litButtons.clear();
        this.state.lastLetter = null;
        this.clearCurrentPath();
        this.updateStats();
        this.dom.usedWords.innerHTML = "";
    }

    clearBoardProgress() {
        this.resetGameState();
        document.querySelectorAll('.letter-button').forEach(btn => btn.classList.remove('used'));
        this.showMessage("Board reset");
    }

    // --- Unified Input Handling ---

    handleLetterInput(letter) {
        this.clearMessage();
        const btnElement = document.getElementById(`btn-${letter}`);

        if (!btnElement) {
            return this.showMessage(`"${letter}" is not on the board`);
        }

        if (this.state.currentPath.length > 0) {
            const last = this.state.currentPath[this.state.currentPath.length - 1];
            if (last.letter === letter) return;

            if (this.findSide(last.letter) === this.findSide(letter)) {
                return this.showMessage("Cannot use same side consecutively");
            }
        }

        if (this.state.currentPath.length === 0 && this.state.lastLetter) {
            if (letter !== this.state.lastLetter) {
                return this.showMessage(`Must start with "${this.state.lastLetter}"`);
            }
        }

        this.addToPath(letter, btnElement);
    }

    addToPath(letter, element) {
        this.state.currentWord += letter;
        this.state.currentPath.push({ letter, element });
        this.updateUI();
    }

    deleteLastLetter() {
        const minLength = this.state.lastLetter ? 1 : 0;
        if (this.state.currentPath.length > minLength) {
            this.state.currentPath.pop();
            this.state.currentWord = this.state.currentPath.map(p => p.letter).join('');
            this.updateUI();
        } else if (this.state.lastLetter) {
            this.showMessage(`Must start with "${this.state.lastLetter}"`);
        }
    }

    clearCurrentPath() {
        this.state.currentWord = "";
        this.state.currentPath = [];
        if (this.state.lastLetter) {
            const btn = document.getElementById(`btn-${this.state.lastLetter}`);
            if (btn) this.addToPath(this.state.lastLetter, btn);
        } else {
            this.updateUI();
        }
    }

    async submitWord() {
        let word = this.state.currentWord;
        if (word.length < this.CONFIG.MIN_WORD_LENGTH) return this.showMessage("Too short");
        if (this.state.usedWords.includes(word)) return this.showMessage("Already used");

        try {
            this.showMessage("Checking...");
            const response = await fetch(`${this.CONFIG.API_URL}${word.toLowerCase()}`);
            if (!response.ok) throw new Error("Unknown word");
            this.handleSuccess(word);
        } catch (e) {
            this.showMessage("Not in word list");
        }
    }

    handleSuccess(word) {
        this.state.usedWords.push(word);
        this.state.lastLetter = word[word.length - 1];
        
        [...word].forEach(l => {
            const btn = document.getElementById(`btn-${l}`);
            if (btn && !this.state.litButtons.has(l)) {
                btn.classList.add("used");
                this.state.litButtons.add(l);
            }
        });

        const chip = document.createElement("span");
        chip.className = "word-chip";
        chip.innerText = word.toLowerCase();
        this.dom.usedWords.appendChild(chip);

        this.updateStats();
        this.clearCurrentPath();
        this.showMessage("");
        
        if (this.state.litButtons.size === 12) {
            this.showMessage(`🎉 Puzzle Solved in ${this.state.usedWords.length} words!`);
        }
    }

    // --- UI Rendering ---

    renderBoard() {
        Object.entries(this.state.sides).forEach(([sideName, letters]) => {
            const container = this.dom.sides[sideName];
            container.innerHTML = "";
            letters.forEach(letter => {
                const btn = document.createElement("button");
                btn.className = "letter-button";
                btn.id = `btn-${letter}`;
                btn.innerText = letter;
                btn.addEventListener("click", () => this.handleLetterInput(letter));
                container.appendChild(btn);
            });
        });
        
        setTimeout(() => {
            this.resizeCanvas();
            this.clearCurrentPath();
        }, 50);
    }

    updateUI() {
        this.dom.currentWord.innerText = this.state.currentWord;
        document.querySelectorAll('.letter-button').forEach(b => b.classList.remove('selected', 'last-selected'));
        this.state.currentPath.forEach((p, idx) => {
            p.element.classList.add('selected');
            if (idx === this.state.currentPath.length - 1) p.element.classList.add('last-selected');
        });
        this.drawLines();
    }

    resizeCanvas() {
        if (!this.dom.canvas) return;
        this.dom.canvas.width = this.dom.container.clientWidth;
        this.dom.canvas.height = this.dom.container.clientHeight;
        this.drawLines();
    }

    drawLines() {
        const ctx = this.canvasCtx;
        const path = this.state.currentPath;
        if (!ctx || path.length < 2) {
            if (ctx) ctx.clearRect(0, 0, this.dom.canvas.width, this.dom.canvas.height);
            return;
        }

        ctx.clearRect(0, 0, this.dom.canvas.width, this.dom.canvas.height);
        const canvasRect = this.dom.canvas.getBoundingClientRect();
        ctx.beginPath();
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#38bdf8";

        const getCenter = (el) => {
            const r = el.getBoundingClientRect();
            return {
                x: r.left + r.width / 2 - canvasRect.left,
                y: r.top + r.height / 2 - canvasRect.top
            };
        };

        const start = getCenter(path[0].element);
        ctx.moveTo(start.x, start.y);
        for (let i = 1; i < path.length; i++) {
            const pt = getCenter(path[i].element);
            ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();
    }

    updateStats() {
        this.dom.statsLetters.innerText = `Letters used: ${this.state.litButtons.size} / 12`;
        this.dom.statsWords.innerText = `Words: ${this.state.usedWords.length}`;
    }

    findSide(letter) {
        for (const [side, letters] of Object.entries(this.state.sides)) {
            if (letters.includes(letter)) return side;
        }
        return null;
    }

    showMessage(msg) { this.dom.message.innerText = msg; }
    clearMessage() { this.dom.message.innerText = ""; }
    showMenuMessage(msg) {
        this.dom.menuMessage.innerText = msg;
        setTimeout(() => this.dom.menuMessage.innerText = "", 3000);
    }
    toggleMenu() { this.dom.menu.classList.toggle('open'); }
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.game = new CircuitWord();
    window.game.init();
});
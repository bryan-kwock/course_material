class WordPuzzleGame {
    constructor() {
        this.level = 1;
        this.completed = 0;
        this.currentWord = null;
        this.revealedPieces = 0;
        this.totalPieces = 1;
        this.usedWords = new Set();
        this.currentImageUrl = '';
        this.lives = 5;
        this.maxLives = 5;
        this.correctCount = 0;
        this.wrongCount = 0;
        this.wrongWords = [];

        this.initElements();
        this.bindEvents();
        this.startLevel();
    }

    initElements() {
        this.puzzleGrid = document.getElementById('puzzle-grid');
        this.backgroundImage = document.getElementById('background-image');
        this.letterInputs = document.getElementById('letter-inputs');
        this.wordMeaning = document.getElementById('word-meaning');
        this.levelDisplay = document.getElementById('level');
        this.completedDisplay = document.getElementById('completed');
        this.totalDisplay = document.getElementById('total');
        this.hintBtn = document.getElementById('hint-btn');
        this.skipBtn = document.getElementById('skip-btn');
        this.restartBtn = document.getElementById('restart-btn');
    }

    bindEvents() {
        this.hintBtn.addEventListener('click', () => this.giveHint());
        this.skipBtn.addEventListener('click', () => this.nextWord());
        this.restartBtn.addEventListener('click', () => this.restart());
    }

    // 获取随机背景图片 (使用 Picsum Photos)
    loadRandomImage() {
        return new Promise((resolve) => {
            // 使用 Picsum Photos 随机图片
            const id = Math.floor(Math.random() * 1000);
            const imageUrl = `https://picsum.photos/1200/800?random=${id}`;
            this.currentImageUrl = imageUrl;
            this.backgroundImage.src = imageUrl;
            // 等待图片加载完成
            this.backgroundImage.onload = () => resolve();
            this.backgroundImage.onerror = () => {
                // 如果加载失败，使用纯色背景
                this.currentImageUrl = '';
                resolve();
            };
            setTimeout(() => resolve(), 5000); // 超时处理
        });
    }

    startLevel() {
        this.totalPieces = this.level * this.level;
        this.completed = 0;
        this.revealedPieces = 0;
        this.lives = this.maxLives;
        this.updateDisplay();
        this.updateHearts();
        this.loadRandomImage().catch(() => {}).finally(() => {
            this.createPuzzleGrid();
            this.nextWord();
        });
    }

    fillCorrectAnswer() {
        const inputs = Array.from(this.letterInputs.querySelectorAll('input'));
        const word = this.currentWord.word.toLowerCase();
        for (let i = 0; i < inputs.length; i++) {
            inputs[i].value = word[i];
            inputs[i].classList.add('correct');
        }
    }

    createPuzzleGrid() {
        this.puzzleGrid.innerHTML = '';
        this.puzzleGrid.style.gridTemplateColumns = `repeat(${this.level}, 1fr)`;
        this.puzzleGrid.style.gridTemplateRows = `repeat(${this.level}, 1fr)`;

        const n = this.level;
        for (let row = 0; row < n; row++) {
            for (let col = 0; col < n; col++) {
                const piece = document.createElement('div');
                piece.className = 'puzzle-piece';
                const index = row * n + col;
                piece.dataset.index = index;
                piece.dataset.row = row;
                piece.dataset.col = col;

                // 不显示背景，只有揭开后才显示
                this.puzzleGrid.appendChild(piece);
            }
        }
    }

    getRandomWord() {
        // 根据难度过滤单词: 关卡越高，允许更长的单词
        const minLength = 2;
        const maxLength = 2 + Math.floor(this.level * 1.5);
        const availableWords = wordList.filter(w =>
            !this.usedWords.has(w.word) &&
            w.word.length >= minLength &&
            w.word.length <= maxLength
        );

        if (availableWords.length === 0) {
            this.usedWords.clear();
            return this.getRandomWord();
        }

        const randomIndex = Math.floor(Math.random() * availableWords.length);
        return availableWords[randomIndex];
    }

    nextWord() {
        this.currentWord = this.getRandomWord();
        this.usedWords.add(this.currentWord.word);
        this.wordMeaning.textContent = this.currentWord.meaning;
        this.createInputBoxes();
    }

    createInputBoxes() {
        this.letterInputs.innerHTML = '';
        const word = this.currentWord.word.toLowerCase();

        for (let i = 0; i < word.length; i++) {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'letter-input';
            input.maxLength = 1;

            if (i === 0) {
                // 首字母已经给出
                input.value = word[0];
                input.classList.add('correct');
                input.disabled = true;
            }

            input.dataset.index = i;
            input.dataset.correct = word[i];

            input.addEventListener('input', (e) => this.handleInput(e));
            input.addEventListener('keydown', (e) => this.handleKeydown(e));

            this.letterInputs.appendChild(input);

            if (i === 1) {
                input.focus();
            }
        }
    }

    handleInput(e) {
        const input = e.target;
        const value = input.value.toLowerCase();

        // 自动跳到下一个
        if (value.length === 1) {
            this.focusNext(input);
        }
    }

    handleKeydown(e) {
        // 退格键处理
        if (e.key === 'Backspace' && e.target.value === '') {
            e.preventDefault();
            this.focusPrev(e.target);
        }
        // 回车键检查单词
        if (e.key === 'Enter') {
            this.checkWord();
        }
    }

    focusNext(current) {
        const inputs = Array.from(this.letterInputs.querySelectorAll('input'));
        const index = inputs.indexOf(current);
        if (index < inputs.length - 1) {
            inputs[index + 1].focus();
        } else {
            inputs[index].focus();
        }
    }

    focusPrev(current) {
        const inputs = Array.from(this.letterInputs.querySelectorAll('input'));
        const index = inputs.indexOf(current);
        if (index > 1) { // 不能修改第一个字母
            inputs[index - 1].value = '';
            inputs[index - 1].focus();
        }
    }

    checkWord() {
        const inputs = Array.from(this.letterInputs.querySelectorAll('input'));
        let allCorrect = true;

        inputs.forEach(input => {
            const value = (input.value || '').toLowerCase();
            const correct = input.dataset.correct;
            if (value === correct) {
                input.classList.add('correct');
                input.classList.remove('incorrect');
            } else {
                input.classList.add('incorrect');
                input.classList.remove('correct');
                allCorrect = false;
            }
        });

        if (allCorrect) {
            this.correctCount++;
            this.onWordCorrect();
        } else {
            this.wrongCount++;
            this.wrongWords.push({
                word: this.currentWord.word,
                meaning: this.currentWord.meaning
            });
            this.lives--;
            this.updateHearts();
            // 提示正确答案
            const answer = this.currentWord.word;
            alert(`答错了！正确答案是: ${answer}`);

            if (this.lives <= 0) {
                this.gameOver();
            } else {
                // 答错不揭开图片，直接进入下一题
                this.nextWord();
            }
        }
    }

    updateHearts() {
        const heartsEl = document.getElementById('hearts');
        heartsEl.textContent = '❤️ '.repeat(this.lives).trim();
    }

    checkWordComplete() {
        const inputs = this.letterInputs.querySelectorAll('input');
        return Array.from(inputs).every(input => input.disabled);
    }

    onWordCorrect() {
        this.completed++;
        this.revealedPieces++;
        this.updateDisplay();
        this.revealOnePiece();

        if (this.revealedPieces >= this.totalPieces) {
            setTimeout(() => this.levelComplete(), 500);
        } else {
            setTimeout(() => this.nextWord(), 600);
        }
    }

    revealOnePiece() {
        const pieces = Array.from(this.puzzleGrid.querySelectorAll('.puzzle-piece:not(.revealed)'));
        if (pieces.length === 0) return;

        const randomIndex = Math.floor(Math.random() * pieces.length);
        const piece = pieces[randomIndex];
        const row = parseInt(piece.dataset.row);
        const col = parseInt(piece.dataset.col);
        const n = this.level;

        // 计算背景位置，每个切片只显示对应区域
        const xPercent = (col / (n - 1)) * 100;
        const yPercent = (row / (n - 1)) * 100;
        piece.style.backgroundImage = `url(${this.currentImageUrl})`;
        piece.style.backgroundPosition = `${xPercent}% ${yPercent}%`;
        piece.style.backgroundSize = `${n * 100}% ${n * 100}%`;
        piece.style.backgroundRepeat = 'no-repeat';

        piece.classList.add('revealed');
    }

    giveHint() {
        const uncompleted = Array.from(this.letterInputs.querySelectorAll('input:not(:disabled)'));
        if (uncompleted.length === 0) return;

        const randomIndex = Math.floor(Math.random() * uncompleted.length);
        const input = uncompleted[randomIndex];
        const correct = input.dataset.correct;
        input.value = correct;
        input.classList.add('correct');
        input.disabled = true;

        if (this.checkWordComplete()) {
            this.onWordCorrect();
        }
    }

    updateDisplay() {
        this.levelDisplay.textContent = this.level;
        this.completedDisplay.textContent = this.completed;
        this.totalDisplay.textContent = this.totalPieces;
    }

    levelComplete() {
        const modal = document.createElement('div');
        modal.className = 'level-complete';
        modal.innerHTML = `
            <h2>恭喜! 关卡 ${this.level} 完成!</h2>
            <p>你已经解锁了整幅图片</p>
        `;
        const btn = document.createElement('button');
        btn.textContent = '进入下一关';
        btn.addEventListener('click', () => {
            document.body.removeChild(modal);
            this.level++;
            this.startLevel();
        });
        modal.appendChild(btn);
        document.body.appendChild(modal);
    }

    gameOver() {
        const modal = document.createElement('div');
        modal.className = 'level-complete game-over-modal';
        modal.style.maxHeight = '80vh';
        modal.style.overflowY = 'auto';

        let wrongListHtml = '';
        if (this.wrongWords.length > 0) {
            wrongListHtml = `
                <div style="text-align: left; margin: 15px 0; max-height: 300px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; border-radius: 6px;">
                    <h3 style="margin-bottom: 10px;">错词列表:</h3>
                    <ul style="list-style: none; padding: 0;">
                        ${this.wrongWords.map(w => `<li style="padding: 5px 0;"><strong>${w.word}</strong> - ${w.meaning}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        modal.innerHTML = `
            <h2>游戏结束</h2>
            <p><strong>当前关卡:</strong> ${this.level}</p>
            <p><strong>答对单词:</strong> ${this.correctCount}</p>
            <p><strong>答错单词:</strong> ${this.wrongCount}</p>
            ${wrongListHtml}
        `;

        const btnContainer = document.createElement('div');
        btnContainer.style.display = 'flex';
        btnContainer.style.gap = '15px';
        btnContainer.style.justifyContent = 'center';
        btnContainer.style.marginTop = '20px';

        if (this.wrongWords.length > 0) {
            const saveBtn = document.createElement('button');
            saveBtn.textContent = '保存错词';
            saveBtn.style.background = '#28a745';
            saveBtn.addEventListener('click', () => this.saveWrongWords());
            btnContainer.appendChild(saveBtn);
        }

        const restartBtn = document.createElement('button');
        restartBtn.textContent = '重新开始';
        restartBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
            this.restart();
        });
        btnContainer.appendChild(restartBtn);

        modal.appendChild(btnContainer);
        document.body.appendChild(modal);
    }

    saveWrongWords() {
        let text = `错词本\n答对: ${this.correctCount} | 答错: ${this.wrongCount}\n\n`;
        this.wrongWords.forEach(w => {
            text += `${w.word} - ${w.meaning}\n`;
        });

        const blob = new Blob([text], {type: 'text/plain'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `wrong-words-${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    restart() {
        this.level = 1;
        this.usedWords.clear();
        this.correctCount = 0;
        this.wrongCount = 0;
        this.wrongWords = [];
        this.lives = this.maxLives;
        this.updateHearts();
        this.startLevel();
    }
}

// 游戏初始化
document.addEventListener('DOMContentLoaded', () => {
    new WordPuzzleGame();
});

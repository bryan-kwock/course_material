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

        // 自定义单词列表模式
        this.customWordMode = false;
        this.customWords = [];
        this.wordStatus = new Map(); // word -> {correct: boolean, wrongCount: number}
        this.pendingWords = []; // 待学习单词（错误的会重复出现）

        this.initElements();
        this.bindUploadEvents();
    }

    initElements() {
        this.uploadPanel = document.getElementById('upload-panel');
        this.gameContainer = document.getElementById('game-container');
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

    bindUploadEvents() {
        document.getElementById('start-default').addEventListener('click', () => {
            this.startDefaultGame();
        });
        document.getElementById('start-custom').addEventListener('click', () => {
            this.startCustomGame();
        });
        document.getElementById('excel-file').addEventListener('change', (e) => {
            this.handleFileUpload(e);
        });
    }

    async handleFileUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const fileName = file.name.toLowerCase();

        if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
            // Excel 文件
            const reader = new FileReader();
            reader.onload = (e) => {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, {type: 'array'});
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, {header: 1});

                this.customWords = jsonData
                    .filter(row => row.length >= 2 && row[0] && row[1])
                    .map(row => ({
                        word: String(row[0]).trim().toLowerCase(),
                        meaning: String(row[1]).trim()
                    }));

                if (this.customWords.length === 0) {
                    alert('Excel文件中没有找到有效的单词数据，请检查格式');
                } else {
                    alert(`成功加载 ${this.customWords.length} 个单词`);
                }
            };
            reader.readAsArrayBuffer(file);
        } else if (fileName.endsWith('.csv')) {
            // CSV 文件 - 尝试多种编码
            const arrayBuffer = await file.arrayBuffer();
            let words = [];
            // 先尝试 UTF-8
            try {
                const text = new TextDecoder('utf-8').decode(arrayBuffer);
                words = this.parseCSV(text);
            } catch (e) {
                // 如果失败，尝试 GBK
                try {
                    const text = new TextDecoder('gbk').decode(arrayBuffer);
                    words = this.parseCSV(text);
                } catch (e2) {
                    words = [];
                }
            }

            // 如果还是空，尝试 gbk 解码使用默认方式
            if (words.length === 0) {
                try {
                    const text = new TextDecoder('gb18030').decode(arrayBuffer);
                    words = this.parseCSV(text);
                } catch (e) {
                    // 最后尝试 ISO-8859-1
                    const text = new TextDecoder('iso-8859-1').decode(arrayBuffer);
                    words = this.parseCSV(text);
                }
            }

            this.customWords = words;

            if (this.customWords.length === 0) {
                alert('CSV文件中没有找到有效的单词数据，请检查格式');
            } else {
                alert(`成功加载 ${this.customWords.length} 个单词`);
            }
        }
    }

    parseCSV(text) {
        const lines = text.split(/\r?\n/);
        return lines
            .map(line => line.trim())
            .filter(line => line)
            .map(line => {
                // 处理逗号分隔，支持引号
                const parts = line.split(',').map(p => p.trim());
                return {
                    word: (parts[0] || '').trim().toLowerCase(),
                    meaning: (parts[1] || '').trim()
                };
            })
            .filter(item => item.word && item.meaning);
    }

    bindGameEvents() {
        this.hintBtn.addEventListener('click', () => this.giveHint());
        this.skipBtn.addEventListener('click', () => this.nextWord());
        this.restartBtn.addEventListener('click', () => this.restart());
    }

    startDefaultGame() {
        this.customWordMode = false;
        this.uploadPanel.style.display = 'none';
        this.gameContainer.style.display = 'block';
        this.initElements();
        this.bindGameEvents();
        this.lives = this.maxLives;
        this.updateHearts();
        this.startLevel();
    }

    startCustomGame() {
        if (this.customWords.length === 0) {
            alert('请先上传Excel文件');
            return;
        }

        this.customWordMode = true;
        this.customWords.forEach(w => {
            this.wordStatus.set(w.word, {correct: false, wrongCount: 0});
        });
        this.pendingWords = [...this.customWords];
        this.correctCount = 0;
        this.wrongCount = 0;
        this.wrongWords = [];
        this.lives = this.maxLives;

        this.uploadPanel.style.display = 'none';
        this.gameContainer.style.display = 'block';
        this.initElements();
        this.bindGameEvents();
        this.updateHearts();
        this.startLevel();
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
        // 保留当前生命值，不重置
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
        if (this.customWordMode) {
            // 自定义模式：只从未答对的单词中选
            if (this.pendingWords.length === 0) {
                return null;
            }
            const randomIndex = Math.floor(Math.random() * this.pendingWords.length);
            return this.pendingWords[randomIndex];
        }

        // 默认模式：根据难度过滤单词: 关卡越高，允许更长的单词
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

        // 自定义模式下，如果所有单词都答对了，通关
        if (this.customWordMode && !this.currentWord) {
            this.allWordsComplete();
            return;
        }

        if (!this.customWordMode) {
            this.usedWords.add(this.currentWord.word);
        }
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
            if (this.customWordMode) {
                this.markWordCorrect(this.currentWord.word);
            }
            this.onWordCorrect();
        } else {
            this.wrongCount++;
            if (this.customWordMode) {
                this.markWordWrong(this.currentWord.word);
            } else {
                this.wrongWords.push({
                    word: this.currentWord.word,
                    meaning: this.currentWord.meaning
                });
            }
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

    markWordCorrect(word) {
        const status = this.wordStatus.get(word);
        status.correct = true;
        // 从待学习列表移除
        this.pendingWords = this.pendingWords.filter(w => w.word !== word);
    }

    markWordWrong(word) {
        const status = this.wordStatus.get(word);
        status.wrongCount = (status.wrongCount || 0) + 1;
        // 保留在待学习列表，会继续出现
        this.wrongWords.push({
            word: word,
            meaning: this.currentWord.meaning
        });
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
        const goNext = () => {
            document.body.removeChild(modal);
            document.removeEventListener('keydown', handleEnter);
            this.level++;
            this.startLevel();
        };
        const handleEnter = (e) => {
            if (e.key === 'Enter') {
                goNext();
            }
        };
        btn.addEventListener('click', goNext);
        document.addEventListener('keydown', handleEnter);
        modal.appendChild(btn);
        document.body.appendChild(modal);
        btn.focus();
    }

    allWordsComplete() {
        const modal = document.createElement('div');
        modal.className = 'level-complete';
        modal.innerHTML = `
            <h2>🎉 恭喜!</h2>
            <h3>你已经掌握了所有单词!</h3>
            <p><strong>总单词数:</strong> ${this.customWords.length}</p>
            <p><strong>答对:</strong> ${this.correctCount}</p>
            <p><strong>答错次数:</strong> ${this.wrongCount}</p>
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
        // 回到初始选择界面
        this.customWordMode = false;
        this.customWords = [];
        this.wordStatus.clear();
        this.pendingWords = [];
        this.usedWords.clear();
        this.correctCount = 0;
        this.wrongCount = 0;
        this.wrongWords = [];
        this.level = 1;
        this.lives = this.maxLives;

        this.uploadPanel.style.display = 'block';
        this.gameContainer.style.display = 'none';
    }
}

// 游戏初始化
document.addEventListener('DOMContentLoaded', () => {
    new WordPuzzleGame();
});

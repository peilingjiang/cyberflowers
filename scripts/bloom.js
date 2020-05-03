/*
    Cyberflowers
    Peiling Jiang
    2020
    Pixel by Pixel Daniel Rozin
*/

let logMsg = {
    d: "=== d data ===============",
    0: "--- 0 language learned ---",
    1: "--- 1 sketch preload -----",
    2: "--- 2 sketch setup -------",
    3: "--- 3 sentiment ready ----",
    c: "___ c CLICKED ____________",
    h: "___ h HOVERED ____________"
};

/* External libraries: jQuery, p5, ml5 */

// en
// let ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz".split("");

let pageLang; // Language of the page

let sketch = (s) => {
    // Parse data from data.json
    let data;
    let dataReady = false;
    fetch(chrome.extension.getURL("scripts/data.json"))
        .then((response) => response.json())
        .then((json) => {
            data = json;
            dataReady = true;
            console.log(logMsg.d);
        });

    // let colorChoices = s.random(findChoices([0, 1, 2])); /* Two colors */
    let colorChoices = [s.random([0, 1, 2])]; /* One color */

    let c; // Canvas
    let frameRate = 60;
    let scale = 1; // Scale of drawings on canvas

    let flowers = []; // Array of all flowers
    let flowersNum = 0;

    let saoMode = false; /* 扫模式 */
    let lastMouseX = 0;
    let lastMouseY = 0;
    let mouseDistBuffer = 80;
    let rectList;
    let selectionInfo = {}; // Char index info of rects

    let saveButton;
    let saveCount = 0;

    let sentimentReady = false;
    const sentiment = ml5.sentiment("movieReviews", () => {
        sentimentReady = true;
        console.log(logMsg[3]);
    });

    s.setFont = () => {
        switch (pageLang) {
            case "en":
                s.textFont("Times");
                s.textStyle(s.NORMAL);
                break;
        }
    };

    // let clicked = false;
    let dragged = false;

    s.setup = () => {
        c = s.createCanvas(
            document.documentElement.scrollWidth,
            document.documentElement.scrollHeight
        );
        c.position(0, 0);
        s.frameRate(frameRate);
        s.angleMode(s.DEGREES);

        console.log(logMsg[2]);

        /* create saveButton */
        // TODO: Also save the original page as background (maybe)
        saveButton = s.createButton("Pick Cyberflowers");
        saveButton.id("saveButtonCyberFlowers");
        saveButton.mousePressed(saveIt);
    };

    s.draw = () => {
        s.clear();
        for (let i = 0; i < flowersNum; i++) {
            flowers[i].bloom();
        }
    };

    s.windowResized = () => {
        s.resizeCanvas(
            document.documentElement.scrollWidth,
            document.documentElement.scrollHeight
        );
    };

    s.mouseWheel = () => {
        if (saoMode) {
            // Rebuild rectList
            rectList = window.getSelection().getRangeAt(0).getClientRects();
        }
    };

    s.mouseClicked = () => {
        if (!dragged && saoMode) {
            setTimeout(() => {
                saoMode = false;
                selectionInfo = {};
            }, 100);
        }
    };

    s.mouseDragged = () => {
        dragged = true;
    };

    s.mouseReleased = () => {
        setTimeout(() => {
            // clicked = false;
            dragged = false;
        }, 300);
        if (dragged && validSelection()) {
            /* saoMode assumes all chars have equal length */
            saoMode = true;
            // console.log(window.getSelection());
            // console.log(window.getSelection().getRangeAt(0).getClientRects());
            let selection = window.getSelection(); // Local
            // Get rectList of selection rects
            rectList = window.getSelection().getRangeAt(0).getClientRects();
            let totalWidth = 0;
            for (let i = 0; i < rectList.length; i++)
                totalWidth += rectList[i].width;

            let tempStart = 0;
            let startOffset = s.min(selection.focusOffset, selection.anchorOffset);
            let endOffset = s.max(selection.focusOffset, selection.anchorOffset);
            for (let i = 0; i < rectList.length; i++) {
                // Build info list of starting and end offsets of each block
                selectionInfo[i] = [
                    s.floor(s.map(tempStart, 0, totalWidth, startOffset, endOffset)), /* Start offset */
                    s.floor(s.map(tempStart + rectList[i].width, 0, totalWidth, startOffset, endOffset)) /* End offset */
                ];
                tempStart += rectList[i].width;
            }
        }
    };

    let pageX = 0;
    let pageY = 0;

    s.mouseMoved = () => {
        pageX = s.mouseX - $(window).scrollLeft();
        pageY = s.mouseY - $(window).scrollTop();
        if (saoMode && (s.dist(pageX, pageY, lastMouseX, lastMouseY) > mouseDistBuffer) && rectList.length) {
            sowFlowerHover();
        }
    };

    let sowFlowerHover = () => {
        if ((pageLang in data) && dataReady && sentimentReady) {
            for (let i = 0; i < rectList.length; i++) {
                if (
                    pageX >= rectList[i].left && pageX <= rectList[i].right &&
                    pageY >= rectList[i].top && pageY < rectList[i].bottom
                ) {
                    let hoverInd = s.map(
                        pageX - rectList[i].left,
                        0, rectList[i].width,
                        selectionInfo[i][0], selectionInfo[i][1]
                    );
                    let text = window.getSelection().focusNode.wholeText;

                    if (text.charAt((hoverInd >> 1) << 1) in data[pageLang]) {
                        console.log(logMsg.h);
                        flowers.push(new Flower(s.mouseX, s.mouseY, pageLang, text.charAt((hoverInd >> 1) << 1), getSentimentScore(text, hoverInd)));
                        flowersNum++;
                        lastMouseX = pageX;
                        lastMouseY = pageY;
                    }
                    break;
                }
            }
        }
    };

    $("p, textarea, span, h1, h2, h3, h4, h5, h6, q, cite, blockquote, a, em, i, b, strong").click(() => {
        // clicked = true;
        if (!dragged && !saoMode)
            sowFlowerClicked(s.mouseX, s.mouseY);
        return false;
    });

    let sowFlowerClicked = (x, y) => {
        /* Must be clicked by a real cursor */
        if ((pageLang in data) && dataReady && sentimentReady) {
            let selection = window.getSelection();
            let charIndex = selection.focusOffset;
            let text = selection.focusNode.wholeText;

            if (text.charAt((charIndex >> 1) << 1) in data[pageLang]) {
                let sentimentScore = getSentimentScore(text, charIndex);
                // Sow seed for new flower
                console.log(logMsg.c);
                flowers.push(new Flower(x, y, pageLang, text.charAt((charIndex >> 1) << 1), sentimentScore));
                flowersNum++;
            }
        }
    };

    let getSentimentScore = (t, ind) => {
        /* Truncate the text to 70 chars at most */
        return sentiment.predict(t.slice(s.constrain(ind - 35, 0, ind), s.constrain(ind + 35, ind, t.length))).score;
    };

    class Flower {
        constructor(x, y, lang, char, sentiment) {
            /*
                lang: language
                char: the root character
                sentiment: [0, 1] sentiment of text around
            */

            this.x = x;
            this.y = y;
            this.lang = lang;
            this.char = char;
            this.sentiment = sentiment;

            this.t = 0; // For bloom animation
            this.bloomTime = s.int(0.3 * frameRate * s.map(sentiment, 0, 1, 1.2, 0.8) + s.random(-frameRate / 6, frameRate / 6)); // Total bloom time base 1 sec
            this.progress = 0;

            /* [offset, angle (in times), height] */
            this.offset = data[lang][char][0]; // Offset of char in flower
            this.angle = data[lang][char][1]; // How many times rotated!
            this.height = data[lang][char][2]; // Height in standard size

            /* Different sentiment mapped range from tune file */
            this.radiusScale = scale * s.map(s.abs(sentiment - 0.5), 0, 0.5, 5, 9); // Size of flower

            this.baseColorSet;
            this.buildBaseColorSet();
        }

        buildBaseColorSet() {
            let thisChoice = s.random(colorChoices);
            let baseColor = [
                s.map(this.sentiment, 0, 1, data.color.negative[thisChoice][0], data.color.positive[thisChoice][0]),
                s.map(this.sentiment, 0, 1, data.color.negative[thisChoice][1], data.color.positive[thisChoice][1]),
                s.map(this.sentiment, 0, 1, data.color.negative[thisChoice][2], data.color.positive[thisChoice][2])
            ];
            this.baseColorSet = [];
            for (let i = 0; i < this.angle; i++)
                this.baseColorSet.push([
                    s.constrain(baseColor[0] + s.random(-17, 17), 0, 255),
                    s.constrain(baseColor[1] + s.random(-17, 17), 0, 255),
                    s.constrain(baseColor[2] + s.random(-17, 17), 0, 255)
                ]);
        }

        bloom() {
            if (this.progress >= 1) {
                this.display();
                return;
            }
            // Calc progress
            this.progress = this.t / this.bloomTime;
            // MODE 2
            s.push();
            s.textSize(this.radiusScale * this.height * s.map(this.progress, 0, 1, 0.9, 1));
            s.translate(this.x, this.y);
            for (let i = 0; i < s.floor(this.angle * this.progress); i++) {
                s.push();
                s.fill(
                    this.baseColorSet[i][0],
                    this.baseColorSet[i][1],
                    this.baseColorSet[i][2],
                    225 - 7 * i
                );
                s.rotate(i * 360 / this.angle);
                s.translate(this.radiusScale * this.offset[0], this.radiusScale * this.offset[1]);
                s.text(this.char, 0, 0);
                s.pop();
            }
            s.pop();

            this.t++;
        }

        display() {
            s.push();
            s.textSize(this.radiusScale * this.height);
            s.translate(this.x, this.y);
            for (let i = 0; i < this.angle; i++) {
                s.push();
                s.fill(
                    this.baseColorSet[i][0],
                    this.baseColorSet[i][1],
                    this.baseColorSet[i][2],
                    225 - 7 * i
                );
                s.rotate(i * 360 / this.angle);
                s.translate(this.radiusScale * this.offset[0], this.radiusScale * this.offset[1]);
                s.text(this.char, 0, 0);
                s.pop();
            }
            s.pop();
        }
    }

    let validSelection = () => {
        // Check if it is a valid selection
        return (
            window.getSelection().anchorNode &&
            window.getSelection().focusNode &&
            (window.getSelection().focusOffset != window.getSelection().anchorOffset)
        );
    };

    let saveIt = () => {
        s.saveCanvas(c, document.title + '_' + saveCount.toString(), "png");
        saveCount++;
    };
};

let findChoices = (a) => {
    let returner = [];
    for (let i = 0; i < a.length - 1; i++) {
        let temp = a.slice(i, i + 1);
        for (let j = i + 1; j < a.length; j++) {
            returner.push(temp.concat(a.slice(j, j + 1)));
        }
    }
    return returner;
};

let windowFlowerSketch = new p5(sketch);

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    console.log(logMsg[0]);
    pageLang = msg.data;
    windowFlowerSketch.setFont();
});
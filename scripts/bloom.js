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
    3: "--- 3 sentiment ready ----"
};

/* External libraries: jQuery, p5, ml5 */

// en
let ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz".split("");

let sketch = (s) => {
    // Parse data from data.json
    let data;
    let dataReady = false;
    fetch(chrome.extension.getURL('scripts/data.json'))
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

    let sentimentReady = false;
    const sentiment = ml5.sentiment('movieReviews', () => {
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

    s.setup = () => {
        c = s.createCanvas(
            document.documentElement.scrollWidth,
            document.documentElement.scrollHeight
        );
        c.position(0, 0);
        s.frameRate(frameRate);
        s.angleMode(s.DEGREES);

        console.log(logMsg[2]);
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

    $("p, textarea, span, h1, h2, h3, h4, h5, h6, q, cite, blockquote, a, em, i, b, strong").click(() => {
        sowFlower(s.mouseX, s.mouseY);
        return false;
    });

    let sowFlower = (x, y) => {
        /* Must be clicked by a real cursor */
        if ((pageLang in data) && dataReady && sentimentReady) {
            let selection = window.getSelection();
            let charIndex = selection.focusOffset;
            let text = selection.focusNode.wholeText;

            if (text.charAt((charIndex >> 1) << 1) in data[pageLang]) {
                let sentimentScore = sentiment.predict(text.slice(s.constrain(charIndex - 30, 0, charIndex), s.constrain(charIndex + 30, charIndex, text.length))).score; // Truncate the text to 60 chars at most

                // Sow seed for new flower
                flowers.push(new Flower(x, y, pageLang, text.charAt((charIndex >> 1) << 1), sentimentScore));
                flowersNum++;
            }
        }
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

let pageLang;
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    console.log(logMsg[0]);
    pageLang = msg.data;
    windowFlowerSketch.setFont();
});
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

let pageLang;
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    console.log(logMsg[0]);
    pageLang = msg.data;
    windowFlowerSketch.setFont();
});

// en
let ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz".split("");

let sketch = (s) => {
    // Parse data from data.json
    let data;
    fetch(chrome.extension.getURL('scripts/data.json'))
        .then((response) => response.json())
        .then((json) => {
            data = json;
            console.log(logMsg.d);
        });

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
                s.textFont("Times New Roman");
                s.textFont("Times");
                s.textStyle(s.NORMAL);
                break;
        }
    }

    s.setup = () => {
        c = s.createCanvas(
            document.documentElement.scrollWidth,
            document.documentElement.scrollHeight
        );
        c.position(0, 0);
        s.frameRate(frameRate);
        s.angleMode(s.DEGREES);

        console.log(logMsg[2]);
    }

    s.draw = () => {
        s.clear();
        for (let i = 0; i < flowersNum; i++) {
            flowers[i].bloom();
        }
    };

    /* From tune file */
    // s.mouseClicked = () => {
    //     let tempChar = s.random(ALPHABET);
    //     if ((pageLang in data) && (tempChar in data[pageLang])) {
    //         flowers.push(new Flower(s.mouseX, s.mouseY, pageLang, tempChar, s.random(0, 1)));
    //         flowersNum++;
    //     }
    // };

    $("p, textarea, span, h1, h2, h3, h4, h5, h6, q, cite, blockquote, a, em, i, b, strong").click(() => {
        if (sentimentReady && (pageLang in data)) {
            let selection = window.getSelection();
            let charIndex = selection.focusOffset;
            let text = selection.focusNode.wholeText;
            if (text.charAt((charIndex >> 1) << 1) in data[pageLang]) {
                let sentimentScore = sentiment.predict(text.slice(s.constrain(charIndex - 30, 0, charIndex), s.constrain(charIndex + 30, charIndex, text.length))).score; // Truncate the text to 60 chars at most

                flowers.push(new Flower(s.mouseX, s.mouseY, pageLang, text.charAt((charIndex >> 1) << 1), sentimentScore));
                flowersNum++;
            }
        }
        return false;
    });

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

            this.t = 0; // For bloom animation
            this.bloomTime = s.int(0.3 * frameRate * s.map(sentiment, 0, 1, 1.2, 0.8) + s.random(-frameRate / 6, frameRate / 6)); // Total bloom time base 1 sec
            this.progress = 0;

            /* [offset, angle (in times), height] */
            this.offset = data[lang][char][0]; // Offset of char in flower
            this.angle = data[lang][char][1]; // How many times rotated!
            this.height = data[lang][char][2]; // Height in standard size
            /* Different sentiment mapped range from tune file */
            this.radiusScale = scale * s.map(s.abs(sentiment - 0.5), 0, 0.5, 5, 12); // Size of flower

            this.baseColor = s.random(data.color[s.floor(sentiment * 10)]);
            this.baseColorSet;
            this.buildBaseColorSet();
        }

        buildBaseColorSet() {
            this.baseColorSet = [];
            for (let i = 0; i < this.angle; i++)
                this.baseColorSet.push([
                    s.constrain(this.baseColor[0] + s.random(-17, 17), 0, 255),
                    s.constrain(this.baseColor[1] + s.random(-17, 17), 0, 255),
                    s.constrain(this.baseColor[2] + s.random(-17, 17), 0, 255)
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

let windowFlowerSketch = new p5(sketch);
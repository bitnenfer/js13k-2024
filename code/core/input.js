const KeyCode = {
    KEY_SPACE: 32,
    KEY_ENTER: 13,
    KEY_ESCAPE: 27,
    KEY_LEFT: 37,
    KEY_UP: 38,
    KEY_RIGHT: 39,
    KEY_DOWN: 40,
    KEY_W: 87,
    KEY_A: 65,
    KEY_S: 83,
    KEY_D: 68,
    KEY_Q: 81,
    KEY_E: 69,
    KEY_LSHIFT: 16
};

const Input = {
    preventDefaultKeys: [32],
    init: (canvas) => {
        Input.Mouse.lastX = canvas.width / 2;
        Input.Mouse.lastY = canvas.height / 2;
        window.oncontextmenu = (e) => false;
        canvas.onmousemove = (e) => {
            Input.Mouse.x = e.clientX - canvas.offsetLeft;
            Input.Mouse.y = e.clientY - canvas.offsetTop;

        };
        canvas.onmousedown = (e) => {
            if (Input.Mouse.btns[0] < 0) {
                Input.Mouse.btns[1] = e.button;
            }
            Input.Mouse.btns[0] = e.button;
            Input.Mouse.btns[2] = -1;
            e.preventDefault();
        };
        canvas.onmouseup = (e) => {
            Input.Mouse.btns[0] = -1;
            Input.Mouse.btns[1] = -1;
            Input.Mouse.btns[2] = e.button;
            e.preventDefault();
        };
        window.onkeydown = (e) => {
            const kc = e.keyCode;
            if (!Input.Keyboard.keysDown[kc]) {
                Input.Keyboard.keysClicked[kc] = true;
            }
            Input.Keyboard.keysDown[kc] = true;
            if (Input.preventDefaultKeys.indexOf(kc) >= 0) {
                e.preventDefault();
            }
            Input.Keyboard.keysUp[kc] = false;
        };
        window.onkeyup = (e) => {
            const kc = e.keyCode;
            Input.Keyboard.keysClicked[kc] = false;
            Input.Keyboard.keysDown[kc] = false;
            Input.Keyboard.keysUp[kc] = true;
            if (Input.preventDefaultKeys.indexOf(kc) >= 0) {
                e.preventDefault();
            }
        };
    },
    Mouse: { x: 0, y: 0, firstFrame: true, lastX: 0, lastY: 0, btns: [-1, -1, -1], down: (btn) => btn === Input.Mouse.btns[0], click: (btn) => {
        if (Input.Mouse.btns[1] === btn) {
            Input.Mouse.btns[1] = -1;
            return true;
        }
        return false;
    }, up: (btn) => {
        if (Input.Mouse.btns[2] === btn) {
            Input.Mouse.btns[2] = -1;
            return true;
        }
        return false;
    }},
    Keyboard: { keysDown: {}, keysUp: {}, keysClicked: {}, down: (key) => Input.Keyboard.keysDown[key], click: (key) => {
        if (Input.Keyboard.keysClicked[key]) {
            Input.Keyboard.keysClicked[key] = false;
            return true;
        }
        return false;
    }, up: (key) => {
        if (Input.Keyboard.keysUp[key]) {
            Input.Keyboard.keysUp[key] = false;
            return true;
        }
        return false;
    }}
};


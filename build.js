const fs = require('fs');
const path = require('path');
const child_process = require('child_process');
const args = process.argv;
const isDebugBuild = !!args.find((e) => e === '--debug');
const isWatch = !!args.find((e) => e === '--watch');
const isPacked = !!args.find((e) => e === '--pack');

if (!isDebugBuild) {
    const missingDep = [];
    if (!fs.existsSync('build/')) missingDep.push('- Missing directory build/.');
    if (!fs.existsSync('build/shader_minifier.exe')) missingDep.push('- build/shader_minifier.exe => (https://github.com/laurentlb/shader-minifier/releases).');
    if (!fs.existsSync('build/closure-compiler-v20220405.jar')) missingDep.push('- build/closure-compiler-v20220405.jar => (https://mvnrepository.com/artifact/com.google.javascript/closure-compiler/v20220405).');
    if (!fs.existsSync('build/7za.exe')) missingDep.push('- build/7za.exe => (https://7-zip.org/download.html).');
    if (isPacked && !fs.existsSync('build/RegPack/bin/regpack')) missingDep.push('- build/RegPack/bin/regpack => (https://github.com/Siorki/RegPack).');

    if (missingDep.length > 0) {
        console.error('Missing dependencies:');
        console.error(missingDep.join('\n'));
        return;
    }
}

function getSize(sizeInBytes) {
    if (sizeInBytes < 1024) {
        return `${sizeInBytes} B`;
    } else if (sizeInBytes < 1024 * 1024) {
        return `${(sizeInBytes / 1024).toFixed(4)} KiB`;
    } else if (sizeInBytes < 1024 * 1024 * 1024) {
        return `${(sizeInBytes / 1024 / 1024).toFixed(4)} MiB`;
    }
    return `${sizeInBytes} B`;
}

function getJSContent() {
    let contents = ['\n'];
    const readRecContent = (dir) => {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            if (stat.isDirectory()) {
                readRecContent(filePath);
            } else if (stat.isFile() && path.extname(file) == '.js') {
                const content = fs.readFileSync(filePath, { encoding: 'utf8' });
                contents.push(`// ==== Begin: ${filePath} ====`);
                contents.push(content);
                contents.push(`// ==== End: ${filePath} ====`);
            }
        }
    };

    readRecContent('code');
    return contents.join('\n');
}

function readJSCode(isDebug) {
    let jsContent = getJSContent();
    const shaderStr = extractShaderStrings(jsContent);
    
    if (isDebug) {
        for (const shaderName of shaderStr) {
            const fullShaderPath = shaderName.replace('$(SHADERS)/', 'shaders/');
            const shaderCode = fs.readFileSync(fullShaderPath, { encoding: 'utf-8' });
            jsContent = jsContent.replace(shaderName, shaderCode);
        }
    } else {
        if (!fs.existsSync('out/shaders/')) {
            fs.mkdirSync('out/shaders/');
        }
        for (const shaderName of shaderStr) {
            const fullShaderPath = shaderName.replace('$(SHADERS)/', 'shaders\\');
            console.log(`Minifying shader ${fullShaderPath}`);
            child_process.execSync(`build\\shader_minifier.exe ${fullShaderPath} --format text --preserve-externals -o out\\${fullShaderPath}`);
            const shaderCode = fs.readFileSync('out\\' + fullShaderPath, { encoding: 'utf-8' });
            jsContent = jsContent.replace(shaderName, shaderCode);
        }
    }

    return jsContent;
}

function extractShaderStrings (code) {
    const regex = /\$\(\s*SHADERS\s*\)\/[^\s'"\`]+/g;
    const matches = code.match(regex);
    return matches || [];
};

function buildDebugGame() {
    if (!fs.existsSync('out')) {
        fs.mkdirSync('out');
    }

    const indexContent = fs.readFileSync('code/index.html', { encoding: 'utf8' });
    const jsContent = readJSCode(true);

    const mergedContent = indexContent.replace('${JS_CODE}', 'console.log("DEBUG GAME");\n' + jsContent);

    fs.writeFileSync('out/index.html', mergedContent, { encoding: 'utf8', flush: true });
    const fileStat = fs.statSync('out/index.html');
    console.log(`index.html file size is ${getSize(fileStat.size)}`);
}

function buildReleaseGame() {
    if (!fs.existsSync('out')) {
        fs.mkdirSync('out');
    }

    const jsContent = readJSCode(false);
    fs.writeFileSync('out/game.js', jsContent, { encoding: 'utf8', flush: true });

    child_process.execSync(`java -jar build/closure-compiler-v20220405.jar --compilation_level ADVANCED --language_out=ES_NEXT --js out/game.js --js_output_file out/game-compiled.js`);
    let compiledFileName = 'out/game-compiled.js';
    if (isPacked) {
        const regPackOpts = ''
        + '--wrapInSetInterval 0 '
        + '--crushTiebreakerFactor 1 '
        + '--reassignVars 1 '
        + '--crushGainFactor 2 '
        + '--crushLengthFactor 1 '
        + '--crushCopiesFactor 0 ';
        child_process.execSync(`node build\\RegPack\\bin\\regpack ${regPackOpts} out/game-compiled.js > out/game-packed.js`);
        compiledFileName = 'out/game-packed.js';
    }

    const indexContent = fs.readFileSync('code/index.html', { encoding: 'utf8' });
    const jsCompiledContent = fs.readFileSync(compiledFileName, { encoding: 'utf8' });
    const mergedContent = indexContent.replace('${JS_CODE}', jsCompiledContent);
    fs.writeFileSync('out/index.html', mergedContent, { encoding: 'utf8', flush: true });
    child_process.execSync(`build\\7za.exe a -tzip out\\game.zip out\\index.html`);
    const zipFileStat = fs.statSync('out/game.zip');
    console.log(`game.zip file size is ${getSize(zipFileStat.size)}`);
}

if (isDebugBuild) {
    buildDebugGame();
    if (isWatch) {
        fs.watch('code', { recursive: true }, (evt, file) => {
            if (isDebugBuild) {
                buildDebugGame();
            }
        });
        fs.watch('shaders', { recursive: true }, (evt, file) => {
            if (isDebugBuild) {
                buildDebugGame();
            }
        });
    }
} else {
    buildReleaseGame();
}

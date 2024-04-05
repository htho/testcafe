const expect                = require('chai').expect;
const globby                = require('globby');
const path                  = require('path');
const fs                    = require('fs');
const { isFunction }        = require('lodash');
const del                   = require('del');
const config                = require('./config.js');
const { readPngFile }       = require('../../lib/utils/promisified-functions');
const { parseUserAgent }    = require('../../lib/utils/parse-user-agent');
const { MARK_RIGHT_MARGIN } = require('../../lib/screenshots/constants.js');
const { readFile }          = require('fs/promises');


const SCREENSHOTS_PATH               = config.testScreenshotsDir;
const SCREENSHOTS_META_PATH          = config.testScreenshotsMetaFile;
const THUMBNAILS_DIR_NAME            = 'thumbnails';
const ERRORS_DIR_NAME                = 'errors';
const TASK_DIR_RE                    = /\d{4,4}-\d{2,2}-\d{2,2}_\d{2,2}-\d{2,2}-\d{2,2}/;
const SCREENSHOT_FILE_NAME_RE        = /[\\/]\d+.png$/;
const CUSTOM_SCREENSHOT_FILE_NAME_RE = /\.png$/;
const TEST_DIR_NAME_RE               = /test-\d+/;
const RUN_DIR_NAME_RE                = /run-\d+/;
const GREEN_PIXEL                    = [0, 255, 0, 255];
const RED_PIXEL                      = [255, 0, 0, 255];

const VIDEOS_PATH      = config.testVideosDir;
const VIDEO_FILES_GLOB = path.posix.join(VIDEOS_PATH, '**', '*');

function getPixel (png, x, y) {
    const baseIndex = (png.width * y + x) * 4;

    return png.data.slice(baseIndex, baseIndex + 4);
}

function hasPixel (png, refPixel, x, y) {
    const pngPixel = getPixel(png, x, y);

    // NOTE: A display might use a color profile.
    // Color profiles for Displays might lead to problems,
    // where #FF000000 actually is ##FE000000.
    // The test would fail, although the color matches.
    const binPngPixel = pngPixel.map(binaryByte);
    const binRefPixel = refPixel.map(binaryByte);

    return binPngPixel.every((v, i) => binRefPixel[i] === v);
}

function binaryByte (value) {
    return value > 128;
}

function getScreenshotFilesCount (dir, customPath) {
    const list             = fs.readdirSync(dir);
    const screenshotRegExp = customPath ? CUSTOM_SCREENSHOT_FILE_NAME_RE : SCREENSHOT_FILE_NAME_RE;

    let results  = 0;
    let stat     = null;
    let filePath = null;

    list.forEach(function (file) {
        filePath = path.join(dir, file);
        stat     = fs.statSync(filePath);

        if (stat && stat.isDirectory() && file === THUMBNAILS_DIR_NAME)
            results += getScreenshotFilesCount(filePath, customPath);
        else if (screenshotRegExp.test(filePath))
            results++;
    });
    return results;
}

async function readScreenshotMeta () {
    const metaFile = await readFile(config.testScreenshotsMetaFile);

    return JSON.parse(metaFile.toString());
}

async function checkScreenshotFileCropped (filePath) {
    const png = await readPngFile(filePath);
    const meta = await readScreenshotMeta();
    const devicePixelRatio = meta.devicePixelRatio;

    // NOTE: The implementation is parametric.
    // It depends on the actual size of the screenshot
    // and the devicePixelRatio.

    // NOTE: Follwoing comments will use actual values
    // in relation to this (16:9) "image".
    // These values are used to explain/verify the
    // parameters used to determine the corners
    // of the sceenshot.
    //
    //   0123456789abcdef  <- Column-Index
    // 0 RrrrrrrrrrrrrrrR
    // 1 rrrrrrrrrrrrrrrr  R/r: red pixel
    // 2 rrRrrrrrrrrrrRrr  G/g: green pixel
    // 3 rrrGggggggggGrrr  R/G: pixels checked
    // 4 rrrggggggggggrrr  .  : rounded corner in macOS
    // 5 rrrGggggggggGrrr
    // 6 rrRrrrrrrrrrrRrr
    // 7 RrrrrrrrrrrrrrrR
    // 8 .RrrrrrrrrrrrrR.

    // width = 16
    const width = png.width;

    // xMax = 15
    const xMax = width - 1;

    // height = 9
    const height = png.height;

    // yMax = 8
    const yMax = height - 1;

    // safeBorder = 1
    const safeBorder = MARK_RIGHT_MARGIN * devicePixelRatio;

    // innerMargin = 3
    const innerMargin = 50 * devicePixelRatio;

    // lastInnerMargin = 2
    const lastInnerMargin = innerMargin - 1;


    // topLeft    = { outer: [0, 0], lastOuter: [2              , 2              ], inner: [3          , 3          ] };
    const topLeft = { outer: [0, 0], lastOuter: [lastInnerMargin, lastInnerMargin], inner: [innerMargin, innerMargin] };

    // topLeft     = { outer: [15  , 0], lastOuter: [12                    , 2              ], inner: [12                , 3          ] };
    const topRight = { outer: [xMax, 0], lastOuter: [xMax - lastInnerMargin, lastInnerMargin], inner: [xMax - innerMargin, innerMargin] };

    // roundedBottomLeft    = { outerTop: [0, 7                ], outerRight: [1         , 8   ], lastOuter: [2              , 6                     ], inner: [3          , 5                 ] };
    const roundedBottomLeft = { outerTop: [0, yMax - safeBorder], outerRight: [safeBorder, yMax], lastOuter: [lastInnerMargin, yMax - lastInnerMargin], inner: [innerMargin, yMax - innerMargin] };

    // roundedBottomRight    = { outerTop: [15  , 7                ], outerLeft: [14               , 8   ], lastOuter: [13                    , 6                     ], inner: [12                , 5                 ] };
    const roundedBottomRight = { outerTop: [xMax, yMax - safeBorder], outerLeft: [xMax - safeBorder, yMax], lastOuter: [xMax - lastInnerMargin, yMax - lastInnerMargin], inner: [xMax - innerMargin, yMax - innerMargin] };

    // NOTE: sometimes an appearing dialog can cover an edge of the browser. Try to check all edges
    return (
        hasPixel(png, RED_PIXEL, ...topLeft.outer) && hasPixel(png, RED_PIXEL, ...topLeft.lastOuter) && hasPixel(png, GREEN_PIXEL, ...topLeft.inner) ||
        hasPixel(png, RED_PIXEL, ...topRight.outer) && hasPixel(png, RED_PIXEL, ...topRight.lastOuter) && hasPixel(png, GREEN_PIXEL, ...topRight.inner) ||
        hasPixel(png, RED_PIXEL, ...roundedBottomLeft.outerTop) && hasPixel(png, RED_PIXEL, ...roundedBottomLeft.outerRight) && hasPixel(png, RED_PIXEL, ...roundedBottomLeft.lastOuter) && hasPixel(png, GREEN_PIXEL, ...roundedBottomLeft.inner) ||
        hasPixel(png, RED_PIXEL, ...roundedBottomRight.outerTop) && hasPixel(png, RED_PIXEL, ...roundedBottomRight.outerLeft) && hasPixel(png, RED_PIXEL, ...roundedBottomRight.lastOuter) && hasPixel(png, GREEN_PIXEL, ...roundedBottomRight.inner)
    );
}

function checkScreenshotFileFullPage (filePath) {
    return readPngFile(filePath)
        .then(function (png) {
            const width  = png.width;
            const height = png.height;

            const expectedHeight = 5000;

            return height === expectedHeight &&
                hasPixel(png, RED_PIXEL, 0, 0) &&
                hasPixel(png, RED_PIXEL, width - 1, height - 1) &&
                hasPixel(png, GREEN_PIXEL, 0, height - 1) &&
                hasPixel(png, GREEN_PIXEL, width - 1, 0);
        });
}

async function checkScreenshotFileIsNotWhite (filePath) {
    const png = await readPngFile(filePath);
    const binaryPngData = png.data.map(binaryByte);

    return binaryPngData.includes(Buffer.from(RED_PIXEL).map(binaryByte)) &&
        binaryPngData.includes(Buffer.from(GREEN_PIXEL).map(binaryByte));
}

function isDirExists (folderPath) {
    let exists = false;

    try {
        exists = fs.statSync(folderPath).isDirectory();
    }
    catch (e) {
        exists = false;
    }

    return exists;
}

function checkTestDir (testDirPath, forError, expectedSubDirCount, expectedScreenshotCount) {
    const subDirs = fs
        .readdirSync(testDirPath)
        .filter(function (file) {
            return isDirExists(path.join(testDirPath, file));
        });

    if (subDirs.length !== expectedSubDirCount)
        return false;

    let dirPath = null;

    return subDirs.every(function (dir) {
        dirPath = forError ? path.join(testDirPath, dir, ERRORS_DIR_NAME) : path.join(testDirPath, dir);

        return getScreenshotFilesCount(dirPath) === expectedScreenshotCount;
    });
}

function checkScreenshotImages (forError, customPath, predicate, expectedScreenshotsCount = config.browsers.length) {
    if (!isDirExists(SCREENSHOTS_PATH))
        return false;

    const taskDirs = fs.readdirSync(SCREENSHOTS_PATH);

    if (!taskDirs || !taskDirs[0] || taskDirs.length !== 1)
        return false;

    const taskDirPath = path.join(SCREENSHOTS_PATH, taskDirs[0]);

    let list = [];

    if (forError) {
        const testDirs = fs.readdirSync(taskDirPath);

        if (!testDirs || !testDirs[0] || testDirs.length !== 1)
            return false;

        const testDirPath = path.join(taskDirPath, testDirs[0]);
        const browserDirs = fs.readdirSync(testDirPath);

        browserDirs.forEach(function (browserDir) {
            const errorDirPath    = path.join(testDirPath, browserDir, 'errors');
            const screenshotFiles = fs.readdirSync(errorDirPath);

            const screenshotPaths = screenshotFiles.map(function (screenshotFile) {
                return path.join(errorDirPath, screenshotFile);
            });

            list = list.concat(screenshotPaths);
        });
    }
    else {
        if (taskDirPath.indexOf(customPath) < 0)
            return false;

        list = fs.readdirSync(taskDirPath).map(function (screenshotFile) {
            return path.join(taskDirPath, screenshotFile);
        });
    }

    if (list.length < config.browsers.length)
        return false;

    list = list.filter(function (filePath) {
        return filePath.match(CUSTOM_SCREENSHOT_FILE_NAME_RE);
    });

    return Promise
        .all(list.map(function (filePath) {
            return predicate(filePath);
        }))
        .then(function (checkResults) {
            let actualScreenshotsCount = 0;

            for (let i = 0; i < checkResults.length; i++)
                actualScreenshotsCount += checkResults[i] ? 1 : 0;

            return actualScreenshotsCount === expectedScreenshotsCount;
        });
}

exports.errorInEachBrowserContains = function errorInEachBrowserContains (testErrors, message, errorIndex) {
    if (testErrors instanceof Error)
        throw testErrors;

    // NOTE: if errors are the same in different browsers
    if (Array.isArray(testErrors))
        expect(testErrors[errorIndex]).contains(message);

    //NOTE: if they are different
    else {
        Object.keys(testErrors).forEach(function (key) {
            expect(testErrors[key][errorIndex]).contains(message);
        });
    }
};

exports.errorInEachBrowserContainsRegExp = function errorInEachBrowserContains (testErrors, messageRE, errorIndex) {
    if (testErrors instanceof Error)
        throw testErrors;

    // NOTE: if errors are the same in different browsers
    if (Array.isArray(testErrors))
        expect(messageRE.test(testErrors[errorIndex])).equals(true);

    //NOTE: if they are different
    else {
        Object.keys(testErrors).forEach(function (key) {
            expect(messageRE.test(testErrors[key][errorIndex])).equals(true);
        });
    }
};

exports.errorInEachBrowserNotContains = function errorInEachBrowserNotContains (testErrors, message, errorIndex) {
    if (testErrors instanceof Error)
        throw testErrors;

    // NOTE: if errors are the same in different browsers
    if (Array.isArray(testErrors))
        expect(testErrors[errorIndex]).not.contains(message);

    //NOTE: if the are different
    else {
        Object.keys(testErrors).forEach(function (key) {
            expect(testErrors[key][errorIndex]).not.contains(message);
        });
    }
};

exports.isScreenshotDirExists = function () {
    return isDirExists(SCREENSHOTS_PATH);
};

exports.checkScreenshotsCreated = function ({ forError, customPath, screenshotsCount, runDirCount, browsersCount, baseDir }) {
    const expectedSubDirCount     = browsersCount || config.browsers.length;
    const expectedScreenshotCount = screenshotsCount || 2;

    baseDir = baseDir || SCREENSHOTS_PATH;

    if (!isDirExists(baseDir))
        return false;

    const taskDirs = fs.readdirSync(baseDir);

    if (!taskDirs || !taskDirs[0] || taskDirs.length !== 1)
        return false;

    const taskDirPath = path.join(baseDir, taskDirs[0]);

    if (customPath) {
        const customDirExists = taskDirPath.includes(customPath);
        const hasScreenshots  = getScreenshotFilesCount(taskDirPath, customPath) ===
                              expectedScreenshotCount * expectedSubDirCount;

        return customDirExists && hasScreenshots;
    }

    if (!TASK_DIR_RE.test(taskDirs[0]))
        return false;

    const testDirs = fs.readdirSync(taskDirPath);

    if (!testDirs || !testDirs.length || testDirs.length !== 1)
        return false;

    let basePath  = null;
    let dirs      = null;
    let dirNameRE = null;
    let dirPath   = null;

    if (runDirCount) {
        basePath  = path.join(taskDirPath, testDirs[0]);
        dirs      = fs.readdirSync(basePath);
        dirNameRE = RUN_DIR_NAME_RE;

        if (!dirs || !dirs.length || dirs.length !== runDirCount)
            return false;
    }
    else {
        basePath  = taskDirPath;
        dirs      = testDirs;
        dirNameRE = TEST_DIR_NAME_RE;
    }

    return dirs.every(function (dir) {
        if (!dirNameRE.test(dir))
            return false;

        dirPath = path.join(basePath, dir);
        return checkTestDir(dirPath, forError, expectedSubDirCount, expectedScreenshotCount);
    });
};

exports.checkScreenshotsCropped = function (forError, customPath) {
    return checkScreenshotImages(forError, customPath, checkScreenshotFileCropped);
};

exports.checkScreenshotIsNotWhite = function (forError, customPath) {
    return checkScreenshotImages(forError, customPath, checkScreenshotFileIsNotWhite);
};

exports.checkScreenshotFileFullPage = function (forError, customPath) {
    return checkScreenshotImages(forError, customPath, checkScreenshotFileFullPage);
};

exports.isScreenshotsEqual = function (customPath, referenceImagePathGetter) {
    return checkScreenshotImages(false, customPath, async function (screenshotFilePath) {
        const screenshotContent = await readPngFile(screenshotFilePath);

        const referenceImagePath = isFunction(referenceImagePathGetter)
            ? referenceImagePathGetter(screenshotFilePath)
            : referenceImagePathGetter;

        const referenceImageContent = await readPngFile(referenceImagePath);

        for (let x = 0; x < referenceImageContent.width; x++) {
            for (let y = 0; y < referenceImageContent.height; y++) {
                const refPixel = getPixel(referenceImageContent, x, y);

                if (!hasPixel(screenshotContent, refPixel, x, y)) return false;
            }
        }
        return true;
    });
};

exports.checkScreenshotsDimensions = async function (dimensions, screenshotCount) {
    const comparisonInfo = {
        screenshots: [],
    };

    comparisonInfo.result = await checkScreenshotImages(false, '', function (screenshotFilePath) {
        return readPngFile(screenshotFilePath)
            .then(png => {
                comparisonInfo.screenshots.push({
                    path:       screenshotFilePath,
                    dimensions: {
                        width:  png.width,
                        height: png.height,
                    },
                });

                return dimensions.width === png.width
                    && dimensions.height === png.height;
            });
    }, screenshotCount);

    return comparisonInfo;
};

function removeDir (dirPath) {
    if (isDirExists(dirPath))
        return del(dirPath);

    return Promise.resolve();
}

exports.removeScreenshotDir = (dir = SCREENSHOTS_PATH) => removeDir(dir);

exports.removeScreenshotsMetaFile = (dir = SCREENSHOTS_META_PATH) => del(dir);

exports.removeVideosDir = () => removeDir(VIDEOS_PATH);

exports.getVideoFilesList = () => {
    return globby(VIDEO_FILES_GLOB, { nodir: true });
};

exports.checkUserAgent = function (errs, alias) {
    const isErrorsArray = config.currentEnvironment.browsers.length === 1 && Array.isArray(errs);

    if (!isErrorsArray)
        errs = errs[alias];

    if (!isErrorsArray && !errs)
        throw new Error('Error for "' + alias + '" haven\'t created');

    const parsedUA = parseUserAgent(errs[0]);
    const prettyUA = parsedUA.prettyUserAgent.toLowerCase();

    expect(prettyUA.indexOf(alias)).eql(0, prettyUA + ' doesn\'t start with "' + alias + '"');
};

exports.SCREENSHOTS_PATH = SCREENSHOTS_PATH;

exports.THUMBNAILS_DIR_NAME = THUMBNAILS_DIR_NAME;

exports.hasPixel = hasPixel;

exports.GREEN_PIXEL = GREEN_PIXEL;
exports.RED_PIXEL   = RED_PIXEL;

#!/bin/bash

EXTENSION_NAME="gemini-url-quickopen"
VERSION="1.0.0"

build_for_browser() {
    local BROWSER=$1
    local BUILD_DIR="dist/${BROWSER}"
    local OUTPUT_FILE="${EXTENSION_NAME}-${VERSION}-${BROWSER}.zip"

    echo "Building for ${BROWSER}..."

    rm -rf "${BUILD_DIR}"
    mkdir -p "${BUILD_DIR}"

    cp background.js "${BUILD_DIR}/"
    cp options.html "${BUILD_DIR}/"
    cp options.js "${BUILD_DIR}/"
    cp content.js "${BUILD_DIR}/"
    cp -r icons "${BUILD_DIR}/"
    cp "${BROWSER}/manifest.json" "${BUILD_DIR}/manifest.json"

    cd "${BUILD_DIR}"
    zip -r "../../${OUTPUT_FILE}" .
    cd ../..

    echo "Build complete: ${OUTPUT_FILE}"
    echo ""
}

for BROWSER in chrome firefox; do
    build_for_browser "${BROWSER}"
done

echo "All builds complete!"
echo ""
echo "To install Chrome extension:"
echo "1. Open chrome://extensions"
echo "2. Enable Developer mode"
echo "3. Click 'Load unpacked' and select the dist/chrome folder"
echo ""
echo "To install Firefox extension (temporary):"
echo "1. Open Firefox, go to about:debugging"
echo "2. Click 'This Firefox' on the left"
echo "3. Click 'Load Temporary Add-on...'"
echo "4. Select dist/firefox/manifest.json"

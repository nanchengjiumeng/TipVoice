#!/bin/bash

echo "Building extension..."
pnpm build

echo ""
echo "Extension built successfully!"
echo ""
echo "To test the extension:"
echo "1. Open Chrome and go to chrome://extensions/"
echo "2. Enable 'Developer mode' (toggle in top right)"
echo "3. Click 'Load unpacked'"
echo "4. Select the 'dist' folder from this project"
echo "5. The extension should now be loaded!"
echo ""
echo "For development with hot reload:"
echo "1. Run 'pnpm dev' to start the dev server"
echo "2. Load the extension from the 'dist' folder"
echo "3. Changes to content scripts and background will auto-reload"
echo "4. For popup/manager changes, rebuild and reload the extension"
echo ""
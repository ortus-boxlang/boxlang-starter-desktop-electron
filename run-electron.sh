#!/bin/bash

# Set app name environment variable
export ELECTRON_APP_NAME="BoxLang Starter Desktop"

# Run electron with development environment
NODE_ENV=development npx electron .electron/main.js

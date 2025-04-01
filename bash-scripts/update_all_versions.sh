#!/bin/bash

# Check if version argument is provided
if [ -z "$1" ]; then
    echo "Please provide a version number in format <x.x.x>"
    exit 1
fi

# Validate version format
if [[ ! "$1" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Version format <$1> isn't correct, proper format is <x.x.x>"
    exit 1
fi

# Update package.json files
find . -name 'package.json' -not -path '*/node_modules/*' -exec bash -c '
    current_version=$(grep -o "\"version\": \"[^\"]*" "$0" | cut -d"\"" -f4)
    perl -i -pe"s/\"version\": \"$current_version\"/\"version\": \"'$1'\"/" "$0"
' {} \;

# Update manifest.json files
find . -name 'manifest.json' -not -path '*/node_modules/*' -exec bash -c '
    current_version=$(grep -o "\"version\": \"[^\"]*" "$0" | cut -d"\"" -f4)
    perl -i -pe"s/\"version\": \"$current_version\"/\"version\": \"'$1'\"/" "$0"
' {} \;

echo "Updated all version numbers to $1"

# Run build
pnpm build

echo "Build completed" 
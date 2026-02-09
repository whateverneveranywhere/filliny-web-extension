#!/bin/bash
# Optimized Claude Code hook for fast ESLint formatting on file changes.
# Memory-efficient linting with file-specific validation only.
# Adapted for filliny-app (uses bun as package manager).

set -euo pipefail

# Performance limits
MAX_FILE_SIZE_KB=500  # Skip files larger than 500KB
LINT_TIMEOUT=10       # Reduced from 30s
CACHE_DIR="${CLAUDE_PROJECT_DIR}/.claude/.cache"

# Read JSON input efficiently
INPUT=$(cat)

# Extract data using jq
HOOK_EVENT=$(echo "$INPUT" | jq -r '.hook_event_name // ""')
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // ""')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""')

# Check if we have required environment variable
if [ -z "${CLAUDE_PROJECT_DIR:-}" ]; then
    echo "Error: CLAUDE_PROJECT_DIR not set" >&2
    exit 1
fi

# Create cache directory
mkdir -p "$CACHE_DIR" 2>/dev/null || true

# Function to check if file should be linted with size limits
is_lintable_file() {
    local file_path="$1"

    # Check if file path is provided and exists
    [ -n "$file_path" ] && [ -f "$file_path" ] || return 1

    # Check file size limit (prevent processing huge files)
    local file_size_kb=$(du -k "$file_path" 2>/dev/null | cut -f1)
    [ "${file_size_kb:-0}" -le "$MAX_FILE_SIZE_KB" ] || {
        echo "⚠️ Skipping large file ($file_size_kb KB > $MAX_FILE_SIZE_KB KB): $file_path" >&2
        return 1
    }

    # Check for supported extensions
    case "$file_path" in
        *.ts|*.tsx|*.js|*.jsx) ;;
        *) return 1 ;;
    esac

    # Skip certain patterns
    case "$file_path" in
        */node_modules/*|*/dist/*|*/build/*|*/.claude/*|*/migrations/*) return 1 ;;
        *.d.ts|*cloudflare-env.d.ts) return 1 ;;
    esac

    return 0
}

# Function to get file modification hash for caching
get_file_hash() {
    local file_path="$1"
    # Use file modification time + size for simple cache key
    stat -f "%m_%z" "$file_path" 2>/dev/null || echo "nocache"
}

# Function to run optimized ESLint fix
run_eslint_fix() {
    local file_path="$1"
    local project_dir="$2"

    # Make file path relative to project directory
    local rel_path=$(realpath --relative-to="$project_dir" "$file_path" 2>/dev/null || echo "$file_path")
    local cache_key=$(echo "$rel_path" | tr '/' '_')
    local file_hash=$(get_file_hash "$file_path")
    local cache_file="$CACHE_DIR/eslint_${cache_key}_${file_hash}"

    # Check cache to avoid repeated linting
    if [ -f "$cache_file" ]; then
        echo "✅ ESLint: $rel_path (cached)"
        return 0
    fi

    # Change to project directory
    cd "$project_dir"

    # Run ESLint with reduced timeout and memory limits (using bun)
    local lint_output
    if lint_output=$(timeout "${LINT_TIMEOUT}s" bun run lint:fix "$rel_path" 2>&1); then
        echo "✅ ESLint fix applied to $rel_path"
        # Cache successful result
        touch "$cache_file" 2>/dev/null || true
        return 0
    else
        local exit_code=$?

        # Handle timeout specifically
        if [ $exit_code -eq 124 ]; then
            echo "⏱️ ESLint timeout for $rel_path (file too complex)" >&2
            return 0  # Don't block for timeouts
        fi

        # Check if it's just warnings
        if echo "$lint_output" | grep -q "error"; then
            echo "❌ ESLint errors in $rel_path" >&2
            echo "$lint_output" | head -10 >&2  # Limit output
            return 2
        else
            echo "⚠️ ESLint warnings in $rel_path (fixed what could be fixed)"
            # Cache warning result
            touch "$cache_file" 2>/dev/null || true
            return 0
        fi
    fi
}

# Function to run lightweight TypeScript validation (file-specific only)
run_lightweight_ts_check() {
    local file_path="$1"
    local project_dir="$2"

    # Skip full type checking - too memory intensive
    # Instead just check syntax with tsc --noEmit on single file
    local rel_path=$(realpath --relative-to="$project_dir" "$file_path" 2>/dev/null || echo "$file_path")

    cd "$project_dir"

    # Quick syntax check only (much faster and less memory) - using bunx
    if timeout 5s bunx tsc --noEmit --skipLibCheck "$file_path" 2>/dev/null; then
        echo "✅ TypeScript syntax valid for $rel_path"
        return 0
    else
        # Don't fail the entire hook for TS errors - let the developer handle them
        echo "⚠️ TypeScript syntax issues in $rel_path (not blocking)" >&2
        return 0  # Changed to 0 to not block
    fi
}

# Clean old cache files (keep cache size reasonable)
cleanup_cache() {
    # Remove cache files older than 1 hour
    find "$CACHE_DIR" -name "eslint_*" -mmin +60 -delete 2>/dev/null || true
}

# Main logic - optimized for speed and low memory usage
if [ "$HOOK_EVENT" = "PostToolUse" ] && [[ "$TOOL_NAME" =~ ^(Write|Edit|MultiEdit)$ ]]; then
    if is_lintable_file "$FILE_PATH"; then
        # Clean up old cache entries periodically
        cleanup_cache

        # Run ESLint fix (now with caching and size limits)
        if ! run_eslint_fix "$FILE_PATH" "$CLAUDE_PROJECT_DIR"; then
            exit 2  # Block execution with error feedback
        fi

        # Run lightweight TypeScript syntax check for TS files only
        case "$FILE_PATH" in
            *.ts|*.tsx)
                # Only run lightweight check, don't block for TS errors
                run_lightweight_ts_check "$FILE_PATH" "$CLAUDE_PROJECT_DIR"
                ;;
        esac

        echo "🚀 Fast lint completed for $(basename "$FILE_PATH")"
    fi
fi

exit 0

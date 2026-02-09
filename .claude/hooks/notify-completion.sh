#!/bin/bash
# Optimized Claude Code notification hook - lightweight completion sounds.
# Fast notification with minimal resource usage.

set -euo pipefail

# Read JSON input efficiently
INPUT=$(cat)

# Extract hook event name using jq
HOOK_EVENT=$(echo "$INPUT" | jq -r '.hook_event_name // ""')
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // ""')

# Optimized notification sound function
play_notification_sound() {
    local system=$(uname -s)

    case "$system" in
        "Darwin")
            # macOS - use fastest available method
            afplay "/System/Library/Sounds/Ping.aiff" 2>/dev/null &
            ;;
        "Linux")
            # Linux - simplified and faster
            if command -v paplay >/dev/null 2>&1; then
                paplay "/usr/share/sounds/sound-icons/prompt.wav" 2>/dev/null &
            else
                echo -e "\a"
            fi
            ;;
        "MINGW"*|"CYGWIN"*|"MSYS"*)
            # Windows - lightweight beep
            echo -e "\a"
            ;;
        *)
            # Fallback - bell character
            echo -e "\a"
            ;;
    esac
    # Don't wait for sound to finish
}

# Simplified event handling
case "$HOOK_EVENT" in
    "Stop")
        play_notification_sound
        echo "✅ Claude task complete"
        ;;
    *)
        # For any other event, just exit quietly
        exit 0
        ;;
esac

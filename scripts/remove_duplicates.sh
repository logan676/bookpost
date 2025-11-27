#!/bin/bash

# Script to remove duplicate files with (1), (2), etc. suffixes
# Only removes if original file exists and sizes match

TARGET_DIR="/Volumes/杂志/杂志"
LOG_FILE="/tmp/duplicate_removal.log"

# Counters
TOTAL_CHECKED=0
DUPLICATES_REMOVED=0
SPACE_SAVED=0

echo "========================================="
echo "Duplicate File Removal Script"
echo "========================================="
echo "Started at: $(date)"
echo "Target directory: $TARGET_DIR"
echo "Log file: $LOG_FILE"
echo ""

# Clear log file
> "$LOG_FILE"

log() {
    echo "$1" | tee -a "$LOG_FILE"
}

# Function to format bytes to human readable
format_size() {
    local bytes=$1
    if [ "$bytes" -ge 1073741824 ]; then
        echo "$(echo "scale=2; $bytes / 1073741824" | bc) GB"
    elif [ "$bytes" -ge 1048576 ]; then
        echo "$(echo "scale=2; $bytes / 1048576" | bc) MB"
    elif [ "$bytes" -ge 1024 ]; then
        echo "$(echo "scale=2; $bytes / 1024" | bc) KB"
    else
        echo "$bytes bytes"
    fi
}

# Find files with (1), (2), (3), etc. pattern
log "Searching for duplicate files..."
log ""

# Use find to locate files with (N) pattern
find "$TARGET_DIR" -type f \( -name "*\(1\)*" -o -name "*\(2\)*" -o -name "*\(3\)*" -o -name "*\(4\)*" -o -name "*\(5\)*" \) ! -name "._*" 2>/dev/null | while read -r dup_file; do
    ((TOTAL_CHECKED++))

    # Extract the original filename by removing (N) pattern
    # Handle cases like "file(1).pdf" -> "file.pdf"
    dir=$(dirname "$dup_file")
    basename=$(basename "$dup_file")

    # Remove (1), (2), etc. from filename
    original_basename=$(echo "$basename" | sed -E 's/\([0-9]+\)//')
    original_file="$dir/$original_basename"

    # Check if original file exists
    if [ -f "$original_file" ]; then
        # Get file sizes
        dup_size=$(stat -f%z "$dup_file" 2>/dev/null)
        orig_size=$(stat -f%z "$original_file" 2>/dev/null)

        # Check if sizes match (indicating true duplicate)
        if [ "$dup_size" = "$orig_size" ]; then
            log "DUPLICATE FOUND:"
            log "  Original: $original_file"
            log "  Duplicate: $dup_file"
            log "  Size: $(format_size $dup_size)"

            # Remove the duplicate
            if rm "$dup_file" 2>/dev/null; then
                log "  STATUS: REMOVED"
                ((DUPLICATES_REMOVED++))
                SPACE_SAVED=$((SPACE_SAVED + dup_size))
            else
                log "  STATUS: FAILED TO REMOVE"
            fi
            log ""
        else
            log "SIZE MISMATCH (not a true duplicate):"
            log "  Original: $original_file ($(format_size $orig_size))"
            log "  File: $dup_file ($(format_size $dup_size))"
            log "  STATUS: SKIPPED"
            log ""
        fi
    fi
done

# Summary
echo ""
echo "========================================="
echo "Summary"
echo "========================================="
echo "Completed at: $(date)"
echo "Duplicates removed: $DUPLICATES_REMOVED"
echo "Space saved: $(format_size $SPACE_SAVED)"
echo ""
echo "Log file: $LOG_FILE"

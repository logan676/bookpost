#!/bin/bash

# Script to remove ad pages (673.5 x 879 pts) from magazine PDFs
# The ad page is wider than standard pages and needs to be removed

MAGAZINE_DIR="/Volumes/杂志/杂志/月报更新1"
LOG_FILE="/tmp/magazine_ad_removal.log"
AD_WIDTH_MIN=670  # The ad page width range in pts
AD_WIDTH_MAX=680

# Initialize counters
TOTAL_PDFS=0
PROCESSED_PDFS=0
SKIPPED_PDFS=0
FAILED_PDFS=0

echo "========================================="
echo "Magazine Ad Page Removal Script"
echo "========================================="
echo "Started at: $(date)"
echo "Magazine directory: $MAGAZINE_DIR"
echo "Log file: $LOG_FILE"
echo ""

# Clear log file
> "$LOG_FILE"

log() {
    echo "$1" | tee -a "$LOG_FILE"
}

# Function to process a single PDF
process_pdf() {
    local pdf_path="$1"
    local pdf_name=$(basename "$pdf_path")

    log ""
    log "----------------------------------------"
    log "Processing: $pdf_name"

    # Get total pages
    local total_pages=$(pdfinfo "$pdf_path" 2>/dev/null | grep "Pages:" | awk '{print $2}')
    if [ -z "$total_pages" ] || [ "$total_pages" -eq 0 ]; then
        log "  ERROR: Could not read PDF info"
        ((FAILED_PDFS++))
        return 1
    fi
    log "  Total pages: $total_pages"

    # Find pages with ad dimensions (673.5 width, between 670-680)
    local ad_pages=()
    local page_info=$(pdfinfo -f 1 -l "$total_pages" "$pdf_path" 2>/dev/null | grep -E "Page.*size")

    while IFS= read -r line; do
        # Extract page number and width
        local page_num=$(echo "$line" | grep -oE "Page +[0-9]+" | grep -oE "[0-9]+")
        local width=$(echo "$line" | grep -oE "[0-9]+\.?[0-9]* x" | grep -oE "^[0-9]+\.?[0-9]*")

        # Check if width matches ad page (670-680 pts)
        if [ ! -z "$width" ] && [ ! -z "$page_num" ]; then
            local width_int=$(printf "%.0f" "$width")
            if [ "$width_int" -ge "$AD_WIDTH_MIN" ] && [ "$width_int" -le "$AD_WIDTH_MAX" ]; then
                ad_pages+=("$page_num")
                log "  Found ad page: $page_num (width: $width pts)"
            fi
        fi
    done <<< "$page_info"

    # Check if any ad pages found
    if [ ${#ad_pages[@]} -eq 0 ]; then
        log "  No ad pages found. Skipping."
        ((SKIPPED_PDFS++))
        return 0
    fi

    log "  Ad pages to remove: ${ad_pages[*]}"

    # Build page range string for qpdf (excluding ad pages)
    # Convert ad_pages array to associative array for O(1) lookup
    declare -A ad_set
    for page in "${ad_pages[@]}"; do
        ad_set[$page]=1
    done

    local keep_ranges=()
    local range_start=1
    local in_range=false

    for ((p=1; p<=total_pages; p++)); do
        if [ -z "${ad_set[$p]}" ]; then
            # This page should be kept
            if [ "$in_range" = false ]; then
                range_start=$p
                in_range=true
            fi
        else
            # This is an ad page - close current range if any
            if [ "$in_range" = true ]; then
                if [ $range_start -eq $((p-1)) ]; then
                    keep_ranges+=("$range_start")
                else
                    keep_ranges+=("$range_start-$((p-1))")
                fi
                in_range=false
            fi
        fi
    done

    # Close final range if still open
    if [ "$in_range" = true ]; then
        if [ $range_start -eq $total_pages ]; then
            keep_ranges+=("$range_start")
        else
            keep_ranges+=("$range_start-$total_pages")
        fi
    fi

    # Join ranges with commas
    local keep_pages=$(IFS=,; echo "${keep_ranges[*]}")

    if [ -z "$keep_pages" ]; then
        log "  ERROR: Would remove all pages. Skipping."
        ((FAILED_PDFS++))
        return 1
    fi

    log "  Pages to keep: $keep_pages"

    # Create temporary output file
    local temp_output="/tmp/temp_$(date +%s)_$RANDOM.pdf"

    # Use qpdf to extract only the pages we want to keep
    log "  Running qpdf..."
    if qpdf "$pdf_path" --pages "$pdf_path" "$keep_pages" -- "$temp_output" 2>/dev/null; then
        # Replace original with cleaned version
        mv "$temp_output" "$pdf_path"
        log "  SUCCESS: Removed ${#ad_pages[@]} ad page(s)"

        # Verify new page count
        local new_pages=$(pdfinfo "$pdf_path" 2>/dev/null | grep "Pages:" | awk '{print $2}')
        log "  New page count: $new_pages (was $total_pages)"
        ((PROCESSED_PDFS++))
    else
        log "  ERROR: qpdf failed"
        rm -f "$temp_output"
        ((FAILED_PDFS++))
        return 1
    fi

    return 0
}

# Find all PDFs and process them
log "Searching for PDF files..."
echo ""

# Use find to locate all PDFs, excluding macOS resource forks
while IFS= read -r -d '' pdf_file; do
    ((TOTAL_PDFS++))
    process_pdf "$pdf_file"
done < <(find "$MAGAZINE_DIR" -type f -name "*.pdf" ! -name "._*" -print0 2>/dev/null)

# Summary
echo ""
echo "========================================="
echo "Summary"
echo "========================================="
echo "Completed at: $(date)"
echo "Total PDFs found: $TOTAL_PDFS"
echo "Processed (ad pages removed): $PROCESSED_PDFS"
echo "Skipped (no ad pages): $SKIPPED_PDFS"
echo "Failed: $FAILED_PDFS"
echo ""
echo "Log file: $LOG_FILE"

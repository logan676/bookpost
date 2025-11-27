#!/bin/bash

# Script to remove ad pages containing specific text from magazine PDFs
# Target text: 微信号:50058298 or 50058298

MAGAZINE_DIR="/Volumes/杂志/杂志"
LOG_FILE="/tmp/magazine_ad_removal_v2.log"
AD_TEXT="50058298"

# Initialize counters
TOTAL_PDFS=0
PROCESSED_PDFS=0
SKIPPED_PDFS=0
FAILED_PDFS=0

echo "========================================="
echo "Magazine Ad Page Removal Script v2"
echo "========================================="
echo "Started at: $(date)"
echo "Magazine directory: $MAGAZINE_DIR"
echo "Log file: $LOG_FILE"
echo "Looking for text: $AD_TEXT"
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

    # Find pages containing the ad text
    local ad_pages=""
    local ad_count=0

    for ((page=1; page<=total_pages; page++)); do
        # Extract text from this page only
        local page_text=$(pdftotext -f "$page" -l "$page" "$pdf_path" - 2>/dev/null)

        # Check if the ad text is present
        if echo "$page_text" | grep -q "$AD_TEXT"; then
            if [ -z "$ad_pages" ]; then
                ad_pages="$page"
            else
                ad_pages="$ad_pages,$page"
            fi
            ((ad_count++))
            log "  Found ad text on page: $page"
        fi
    done

    # Check if any ad pages found
    if [ "$ad_count" -eq 0 ]; then
        log "  No ad pages found. Skipping."
        ((SKIPPED_PDFS++))
        return 0
    fi

    log "  Ad pages to remove: $ad_pages (count: $ad_count)"

    # Build page range string for qpdf (excluding ad pages)
    # Convert comma-separated ad_pages to exclude them
    local keep_pages=""
    local in_range=0
    local range_start=0

    # Convert ad_pages string to array for easier checking
    IFS=',' read -ra AD_ARRAY <<< "$ad_pages"

    for ((p=1; p<=total_pages; p++)); do
        local is_ad=0
        for ad in "${AD_ARRAY[@]}"; do
            if [ "$p" -eq "$ad" ]; then
                is_ad=1
                break
            fi
        done

        if [ "$is_ad" -eq 0 ]; then
            # This page should be kept
            if [ "$in_range" -eq 0 ]; then
                range_start=$p
                in_range=1
            fi
        else
            # This is an ad page - close current range if any
            if [ "$in_range" -eq 1 ]; then
                if [ $range_start -eq $((p-1)) ]; then
                    if [ -z "$keep_pages" ]; then
                        keep_pages="$range_start"
                    else
                        keep_pages="$keep_pages,$range_start"
                    fi
                else
                    if [ -z "$keep_pages" ]; then
                        keep_pages="$range_start-$((p-1))"
                    else
                        keep_pages="$keep_pages,$range_start-$((p-1))"
                    fi
                fi
                in_range=0
            fi
        fi
    done

    # Close final range if still open
    if [ "$in_range" -eq 1 ]; then
        if [ $range_start -eq $total_pages ]; then
            if [ -z "$keep_pages" ]; then
                keep_pages="$range_start"
            else
                keep_pages="$keep_pages,$range_start"
            fi
        else
            if [ -z "$keep_pages" ]; then
                keep_pages="$range_start-$total_pages"
            else
                keep_pages="$keep_pages,$range_start-$total_pages"
            fi
        fi
    fi

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
        mv "$temp_output" "$pdf_path" 2>/dev/null || cp "$temp_output" "$pdf_path"
        rm -f "$temp_output"
        log "  SUCCESS: Removed $ad_count ad page(s)"

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

#!/bin/bash
PPTX_PATH=$1
OUTPUT_DIR=$2

# Ensure output directory exists
mkdir -p "$OUTPUT_DIR"

# Step 1: Convert PPTX to PDF using LibreOffice
# We run it in a headless environment. It outputs to the specified outdir.
export HOME=/tmp
libreoffice --headless --nologo --nofirststartwizard --convert-to pdf --outdir "$OUTPUT_DIR" "$PPTX_PATH"

# Extract the filename without extension to find the generated PDF
FILENAME=$(basename -- "$PPTX_PATH")
BASENAME="${FILENAME%.*}"
PDF_PATH="$OUTPUT_DIR/$BASENAME.pdf"

if [ ! -f "$PDF_PATH" ]; then
    echo "Error: PDF conversion failed."
    exit 1
fi

# Step 2: Convert the multipage PDF into individual high-res JPG slides
# pdftocairo (part of poppler-utils) is highly reliable for this.
pdftocairo -jpeg -r 150 "$PDF_PATH" "$OUTPUT_DIR/Slide"

# Step 3: Cleanup the temporary PDF
rm "$PDF_PATH"

echo "SUCCESS"

param (
    [string]$PptxPath,
    [string]$OutputDir
)

try {
    # Ensure PowerPoint is running in the background invisibly
    $ppt = New-Object -ComObject PowerPoint.Application

    # Convert paths to absolute
    $absolutePptxPath = (Resolve-Path $PptxPath).Path
    $absoluteOutputDir = (Resolve-Path $OutputDir).Path

    # Open presentation invisibly
    $presentation = $ppt.Presentations.Open($absolutePptxPath, $false, $false, $false)

    # Export to JPG (ppSaveAsJPG = 17)
    $presentation.SaveAs($absoluteOutputDir, 17)

    $presentation.Close()
    $ppt.Quit()
    
    # Release COM objects
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($presentation) | Out-Null
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($ppt) | Out-Null
    [System.GC]::Collect()
    [System.GC]::WaitForPendingFinalizers()

    Write-Output "SUCCESS"
} catch {
    Write-Error $_.Exception.Message
    if ($presentation) { $presentation.Close() }
    if ($ppt) { $ppt.Quit() }
    exit 1
}

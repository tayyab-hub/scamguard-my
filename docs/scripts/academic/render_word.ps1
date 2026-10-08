param([string]$InputPath, [string]$PdfPath, [switch]$UpdateAndSave)
$ErrorActionPreference = 'Stop'
$rubricWord = $null
$rubricDocument = $null
try {
    $rubricWord = New-Object -ComObject Word.Application
    $rubricWord.Visible = $false
    $rubricWord.DisplayAlerts = 0
    $rubricWord.AutomationSecurity = 3
    $rubricDocument = $rubricWord.Documents.Open($InputPath, $false, (-not $UpdateAndSave), $false)
    if ($UpdateAndSave) {
        $null = $rubricDocument.Fields.Update()
        foreach ($rubricToc in $rubricDocument.TablesOfContents) { $rubricToc.Update() }
        foreach ($rubricFigures in $rubricDocument.TablesOfFigures) { $rubricFigures.Update() }
        $rubricDocument.Repaginate()
        $null = $rubricDocument.Fields.Update()
        $rubricDocument.Save()
    }
    $rubricDocument.ExportAsFixedFormat($PdfPath, 17)
    Write-Output ('Rendered pages: ' + $rubricDocument.ComputeStatistics(2))
} finally {
    if ($rubricDocument) { $rubricDocument.Close(0); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($rubricDocument) }
    if ($rubricWord) { $rubricWord.Quit(); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($rubricWord) }
}

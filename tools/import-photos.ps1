<#
  Copies photos from a folder into the website's image slots.

  USAGE (from the project folder, in PowerShell):
    .\tools\import-photos.ps1 -Source "C:\Users\hp\Pictures\hamza"            # fills gallery-01 ... gallery-12
    .\tools\import-photos.ps1 -Source "C:\...\hamza" -Prefix journey -Max 4   # fills journey-1 ... journey-4
    .\tools\import-photos.ps1 -Source "C:\...\hamza\best.jpg" -Slot hero      # one file into one named slot

  Photos are copied (originals are never touched) in file-name order.
  Existing files in images\ are NOT overwritten unless you add -Force.
#>
param(
  [Parameter(Mandatory = $true)][string]$Source,
  [string]$Prefix = "gallery",
  [int]$Max = 12,
  [string]$Slot,
  [switch]$Force
)

$ErrorActionPreference = "Stop"
$root   = Split-Path -Parent $PSScriptRoot
$target = Join-Path $root "images"
New-Item -ItemType Directory -Force -Path $target | Out-Null

$exts = @(".jpg", ".jpeg", ".png", ".webp", ".avif")

function Copy-Slot($file, $name) {
  # remove an older copy of this slot that has a different extension, so the right one wins
  foreach ($e in $exts) {
    $old = Join-Path $target ($name + $e)
    if ((Test-Path $old) -and ($e -ne $file.Extension.ToLower())) {
      if ($Force) { Remove-Item $old } else { Write-Warning "$name$e already exists (use -Force to replace). Skipping $name."; return }
    }
  }
  $dest = Join-Path $target ($name + $file.Extension.ToLower())
  if ((Test-Path $dest) -and -not $Force) { Write-Warning "$($name + $file.Extension.ToLower()) already exists (use -Force to replace). Skipping."; return }
  Copy-Item $file.FullName $dest -Force
  Write-Host ("  {0,-34} -> images\{1}" -f $file.Name, (Split-Path $dest -Leaf))
}

if ($Slot) {
  if (-not (Test-Path $Source -PathType Leaf)) { throw "With -Slot, -Source must be a single image file." }
  $f = Get-Item $Source
  if ($exts -notcontains $f.Extension.ToLower()) { throw "Unsupported file type: $($f.Extension)" }
  Copy-Slot $f $Slot
  return
}

if (-not (Test-Path $Source -PathType Container)) { throw "Source folder not found: $Source" }
$files = Get-ChildItem $Source -File | Where-Object { $exts -contains $_.Extension.ToLower() } | Sort-Object Name | Select-Object -First $Max
if (-not $files) { throw "No images (jpg, png, webp, avif) found in $Source" }

$i = 1
foreach ($f in $files) {
  $n = if ($Prefix -eq "gallery") { "{0}-{1:00}" -f $Prefix, $i } else { "{0}-{1}" -f $Prefix, $i }
  Copy-Slot $f $n
  $i++
}
Write-Host "`nDone. Open index.html to see them."

Add-Type -AssemblyName System.Drawing

function Export-LogoNoBlack {
  param(
    [string]$SourcePath,
    [string]$OutputPath,
    [int]$OutputSize = 0
  )

  $cream = [System.Drawing.Color]::FromArgb(255, 255, 248, 231) # #FFF8E7
  $img = [System.Drawing.Image]::FromFile($SourcePath)
  $size = if ($OutputSize -gt 0) { $OutputSize } else { $img.Width }

  $bmp = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $g.Clear($cream)
  $g.DrawImage($img, 0, 0, $size, $size)
  $g.Dispose()
  $img.Dispose()

  # Replace black corner pixels with cream background
  for ($y = 0; $y -lt $size; $y++) {
    for ($x = 0; $x -lt $size; $x++) {
      $p = $bmp.GetPixel($x, $y)
      if ($p.R -le 18 -and $p.G -le 18 -and $p.B -le 18) {
        $bmp.SetPixel($x, $y, $cream)
      }
    }
  }

  $bmp.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

$root = Split-Path -Parent $PSScriptRoot
$src = Join-Path $root "public\logo.jpg"
$out = Join-Path $root "public\logo.png"
$favicon = Join-Path $root "public\favicon.png"
$tauriIcon = Join-Path $root "src-tauri\icons\icon.png"

Export-LogoNoBlack -SourcePath $src -OutputPath $out
Export-LogoNoBlack -SourcePath $out -OutputPath $favicon -OutputSize 192
Copy-Item -Force $out $tauriIcon
Write-Output "Logo saved without black corners."

/**
 * 将 Logo 四角黑边裁掉，输出透明圆角 PNG，并更新 favicon / Tauri 图标源图
 * 用法: node scripts/process-logo.mjs
 */
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const srcJpg = join(root, 'public', 'logo.jpg');
const outPng = join(root, 'public', 'logo.png');
const faviconPng = join(root, 'public', 'favicon.png');
const tauriIcon = join(root, 'src-tauri', 'icons', 'icon.png');

// 用 PowerShell + System.Drawing 做圆角透明裁切（Windows 环境）
const ps = `
Add-Type -AssemblyName System.Drawing
$src = '${srcJpg.replace(/\\/g, '\\\\')}'
$out = '${outPng.replace(/\\/g, '\\\\')}'
$img = [System.Drawing.Image]::FromFile($src)
$size = $img.Width
$radius = [int]($size * 0.235)
$bmp = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
$g.Clear([System.Drawing.Color]::Transparent)
$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$path.AddArc(0, 0, $radius * 2, $radius * 2, 180, 90)
$path.AddArc($size - $radius * 2, 0, $radius * 2, $radius * 2, 270, 90)
$path.AddArc($size - $radius * 2, $size - $radius * 2, $radius * 2, $radius * 2, 0, 90)
$path.AddArc(0, $size - $radius * 2, $radius * 2, $radius * 2, 90, 90)
$path.CloseFigure()
$g.SetClip($path)
$g.DrawImage($img, 0, 0, $size, $size)
$g.Dispose()
$img.Dispose()
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Output 'ok'
`;

execSync(`powershell -NoProfile -Command "${ps.replace(/"/g, '\\"').replace(/\n/g, '; ')}"`, {
  stdio: 'inherit',
  cwd: root,
});

// 生成小尺寸 favicon
const psFavicon = `
Add-Type -AssemblyName System.Drawing
$src = '${outPng.replace(/\\/g, '\\\\')}'
$out = '${faviconPng.replace(/\\/g, '\\\\')}'
$img = [System.Drawing.Image]::FromFile($src)
$size = 192
$radius = [int]($size * 0.235)
$bmp = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.Clear([System.Drawing.Color]::Transparent)
$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$path.AddArc(0, 0, $radius * 2, $radius * 2, 180, 90)
$path.AddArc($size - $radius * 2, 0, $radius * 2, $radius * 2, 270, 90)
$path.AddArc($size - $radius * 2, $size - $radius * 2, $radius * 2, $radius * 2, 0, 90)
$path.AddArc(0, $size - $radius * 2, $radius * 2, $radius * 2, 90, 90)
$path.CloseFigure()
$g.SetClip($path)
$g.DrawImage($img, 0, 0, $size, $size)
$g.Dispose()
$img.Dispose()
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
`;

execSync(`powershell -NoProfile -Command "${psFavicon.replace(/"/g, '\\"').replace(/\n/g, '; ')}"`, {
  stdio: 'inherit',
  cwd: root,
});

copyFileSync(outPng, tauriIcon);
console.log('Logo processed → public/logo.png, favicon.png, src-tauri/icons/icon.png');
console.log('Run: npx tauri icon public/logo.png');

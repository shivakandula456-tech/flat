param(
  [int]$Port = 8087
)

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$prefix = "http://localhost:$Port/"
$mime = @{
  ".html" = "text/html; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".js"   = "text/javascript; charset=utf-8"
  ".mjs"  = "text/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".svg"  = "image/svg+xml"
  ".png"  = "image/png"
  ".jpg"  = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".webp" = "image/webp"
  ".mp4"  = "video/mp4"
  ".md"   = "text/plain; charset=utf-8"
  ".ico"  = "image/x-icon"
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
try {
  $listener.Start()
} catch {
  Write-Error "Could not start the preview server on $prefix. Is the port already in use? $($_.Exception.Message)"
  exit 1
}

Write-Host "Flat 501 - static preview"
Write-Host "  Root: $root"
Write-Host "  URL:  $prefix"
Write-Host "  Stop: Ctrl+C"

$rootFull = [System.IO.Path]::GetFullPath($root).TrimEnd('\')
$rootPrefix = $rootFull + '\'

while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
  } catch {
    break
  }

  $urlPath = $ctx.Request.Url.AbsolutePath
  try {
    if ($ctx.Request.HttpMethod -ne "GET" -and $ctx.Request.HttpMethod -ne "HEAD") {
      $ctx.Response.StatusCode = 405
      $ctx.Response.Headers.Add("Allow", "GET, HEAD")
      $ctx.Response.Close()
      continue
    }

    $decoded = [System.Uri]::UnescapeDataString($urlPath).TrimStart('/')
    if ($decoded -eq "") { $decoded = "index.html" }
    $full = [System.IO.Path]::GetFullPath((Join-Path $root $decoded))
    if (-not $full.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
      $ctx.Response.StatusCode = 403
      $ctx.Response.Close()
      continue
    }

    if (Test-Path -LiteralPath $full -PathType Container) {
      $full = Join-Path $full "index.html"
    }
    if (-not (Test-Path -LiteralPath $full -PathType Leaf)) {
      $ctx.Response.StatusCode = 404
      $bytes = [System.Text.Encoding]::UTF8.GetBytes("404 - $decoded not found")
      $ctx.Response.ContentType = "text/plain; charset=utf-8"
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
      $ctx.Response.Close()
      continue
    }

    $ext = [System.IO.Path]::GetExtension($full).ToLowerInvariant()
    $contentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { "application/octet-stream" }
    $fs = [System.IO.File]::OpenRead($full)
    try {
      $length = $fs.Length
      $start = 0
      $end = $length - 1
      $isPartial = $false
      $rangeHeader = $ctx.Request.Headers["Range"]
      if ($rangeHeader -and $rangeHeader -match "^bytes=(\d*)-(\d*)$") {
        $isPartial = $true
        if ($Matches[1] -ne "") { $start = [long]$Matches[1] }
        if ($Matches[2] -ne "") { $end = [long]$Matches[2] }
        if ($end -ge $length) { $end = $length - 1 }
        if ($start -gt $end -or $start -ge $length) {
          $ctx.Response.StatusCode = 416
          $ctx.Response.Headers.Add("Content-Range", "bytes */$length")
          $ctx.Response.Close()
          continue
        }
        $ctx.Response.StatusCode = 206
        $ctx.Response.Headers.Add("Content-Range", "bytes $start-$end/$length")
      } else {
        $ctx.Response.StatusCode = 200
      }

      $count = $end - $start + 1
      $ctx.Response.ContentType = $contentType
      $ctx.Response.ContentLength64 = $count
      $ctx.Response.Headers.Add("Accept-Ranges", "bytes")
      $ctx.Response.Headers.Add("Cache-Control", "no-store")
      if ($ctx.Request.HttpMethod -eq "HEAD") {
        $ctx.Response.Close()
        continue
      }

      $fs.Seek($start, [System.IO.SeekOrigin]::Begin) | Out-Null
      $buffer = New-Object byte[] 65536
      $remaining = $count
      while ($remaining -gt 0) {
        $read = $fs.Read($buffer, 0, [Math]::Min($buffer.Length, $remaining))
        if ($read -le 0) { break }
        $ctx.Response.OutputStream.Write($buffer, 0, $read)
        $remaining -= $read
      }
      $ctx.Response.Close()
    } finally {
      $fs.Close()
    }
  } catch {
    try {
      $ctx.Response.StatusCode = 500
      $ctx.Response.Close()
    } catch {}
  }
}

$listener.Stop()

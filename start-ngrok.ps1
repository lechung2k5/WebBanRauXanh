<#
.SYNOPSIS
    Script tự động khởi chạy Ngrok trỏ tới Spring Boot (Port 8080) và sinh link Webhook SePay.
.PARAMETER Port
    Cổng local cần public ra ngoài Internet (Mặc định: 8080).
.EXAMPLE
    .\start-ngrok.ps1
    .\start-ngrok.ps1 -Port 8080
#>
[CmdletBinding()]
param (
    [int]$Port = 8080
)

# Đặt mã hóa UTF-8 cho console
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "   HoNa Fresh - Khởi Chạy Ngrok Tunnel Cho SePay Webhook   " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Green
Write-Host ""

# 1. Kiểm tra ngrok đã được cài đặt chưa
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$localNgrok = Join-Path $scriptDir "tools\ngrok.exe"
$ngrokPath = $null

if (Test-Path $localNgrok) {
    $ngrokPath = $localNgrok
} else {
    $ngrokCmd = Get-Command ngrok -ErrorAction SilentlyContinue
    if ($ngrokCmd) {
        $ngrokPath = $ngrokCmd.Source
    }
}

if (-not $ngrokPath) {
    Write-Host "[!] Không tìm thấy lệnh 'ngrok' trong hệ thống (PATH) hoặc thư mục tools." -ForegroundColor Red
    Write-Host "    Vui lòng cài đặt Ngrok bằng một trong các cách sau:" -ForegroundColor Yellow
    Write-Host "    Cách 1 (Khuyên dùng - Windows winget):" -ForegroundColor Cyan
    Write-Host "        winget install ngrok.ngrok" -ForegroundColor White
    Write-Host "    Cách 2 (Chocolatey):" -ForegroundColor Cyan
    Write-Host "        choco install ngrok" -ForegroundColor White
    Write-Host "    Cách 3 (Tải file .zip trực tiếp):" -ForegroundColor Cyan
    Write-Host "        https://ngrok.com/download" -ForegroundColor White
    Write-Host ""
    Write-Host "    Sau khi cài xong, cấu hình authtoken tài khoản SePay/Ngrok:" -ForegroundColor Yellow
    Write-Host "        ngrok config add-authtoken <YOUR_AUTHTOKEN>" -ForegroundColor White
    Write-Host ""
    Write-Host "Nhấn Enter để thoát..."
    Read-Host
    exit 1
}

Write-Host "[+] Tìm thấy ngrok tại: $ngrokPath" -ForegroundColor Green
Write-Host "[+] Đang khởi chạy Ngrok tunnel trỏ về cổng $Port (Spring Boot)..." -ForegroundColor Cyan

# 2. Khởi chạy tiến trình ngrok
$ngrokProcess = Get-Process ngrok -ErrorAction SilentlyContinue
if (-not $ngrokProcess) {
    Start-Process -FilePath $ngrokPath -ArgumentList "http $Port" -WindowStyle Minimized
    Write-Host "[+] Đã kích hoạt tiến trình ngrok (cửa sổ thu nhỏ)." -ForegroundColor Gray
} else {
    Write-Host "[*] Tiến trình ngrok đã đang chạy trong hệ thống." -ForegroundColor Yellow
}

# 3. Lấy thông tin Public URL từ API nội bộ của Ngrok (http://127.0.0.1:4040/api/tunnels)
Write-Host "[+] Đang kết nối tới Ngrok API (http://127.0.0.1:4040) để lấy Public URL..." -ForegroundColor Cyan

$publicUrl = $null
$maxRetries = 15
$retryCount = 0

while (-not $publicUrl -and $retryCount -lt $maxRetries) {
    Start-Sleep -Seconds 1
    $retryCount++
    try {
        $tunnels = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -TimeoutSec 3 -ErrorAction Stop
        if ($tunnels.tunnels) {
            # Ưu tiên lấy URL có giao thức HTTPS
            $httpsTunnel = $tunnels.tunnels | Where-Object { $_.public_url -like "https://*" } | Select-Object -First 1
            if ($httpsTunnel) {
                $publicUrl = $httpsTunnel.public_url
            } else {
                $publicUrl = $tunnels.tunnels[0].public_url
            }
        }
    } catch {
        # Đợi thêm nếu ngrok chưa khởi động xong socket API
    }
}

if (-not $publicUrl) {
    Write-Host "[X] Không thể kết nối tới Ngrok API tại http://127.0.0.1:4040." -ForegroundColor Red
    Write-Host "    Vui lòng kiểm tra xem bạn đã thêm authtoken ngrok chưa:" -ForegroundColor Yellow
    Write-Host "        ngrok config add-authtoken <TOKEN>" -ForegroundColor White
    exit 1
}

# 4. Ghép endpoint Webhook SePay
$webhookUrl = "$publicUrl/api/v1/sepay/webhook"

# 5. Tự động copy vào clipboard
try {
    Set-Clipboard -Value $webhookUrl
    $copied = $true
} catch {
    $copied = $false
}

# 6. In kết quả trực quan
Write-Host ""
Write-Host "================================================================================" -ForegroundColor Green
Write-Host "                       NGROK TUNNEL SẴN SÀNG KẾT NỐI                            " -ForegroundColor Green
Write-Host "================================================================================" -ForegroundColor Green
Write-Host "  Local Backend Port : http://localhost:$Port" -ForegroundColor Gray
Write-Host "  Ngrok Public Host  : $publicUrl" -ForegroundColor Cyan
Write-Host "  SePay Webhook URL  : $webhookUrl" -ForegroundColor Yellow
Write-Host "================================================================================" -ForegroundColor Green
if ($copied) {
    Write-Host "  [OK] ĐÃ TỰ ĐỘNG COPY LINK WEBHOOK VÀO CLIPBOARD (BỘ NHỚ TẠM)!" -ForegroundColor Green
    Write-Host "  Bạn chỉ cần nhấn Ctrl + V để dán vào cấu hình Webhook trên SePay Dashboard." -ForegroundColor White
} else {
    Write-Host "  Vui lòng bôi đen và copy URL trên dán vào SePay Dashboard." -ForegroundColor Yellow
}
Write-Host "================================================================================" -ForegroundColor Green
Write-Host ""
if ([Environment]::UserInteractive -and $Host.Name -notmatch "Default Host") {
    Write-Host "Nhấn phím bất kỳ để đóng màn hình này (Ngrok vẫn tiếp tục chạy ngầm)..." -ForegroundColor Gray
    try {
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    } catch {
        # ignore
    }
}


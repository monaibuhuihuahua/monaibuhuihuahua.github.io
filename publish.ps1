$ErrorActionPreference = "Stop"

$repoPath = "C:\Users\a2556\Desktop\blog"
Set-Location -Path $repoPath

$status = git status --porcelain

if ([string]::IsNullOrWhiteSpace(($status | Out-String))) {
  Write-Host "没有新的改动可提交。"
  exit 0
}

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$message = "auto update: $timestamp"

git add .
git commit -m $message
git push

Write-Host "已自动提交并推送。"

@echo off
chcp 65001 > nul
title HBC 오피스 어드벤처 서버
cd /d "%~dp0"
where node > nul 2>&1
if errorlevel 1 (
  echo [오류] Node.js 가 설치되어 있지 않습니다. https://nodejs.org 에서 LTS 버전을 설치해 주세요.
  pause
  exit /b 1
)
node server\server.js
pause

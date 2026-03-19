Output demo.gif

Set Shell "bash"
Set FontSize 15
Set Width 880
Set Height 500
Set Padding 16
Set Theme "Catppuccin Mocha"
Set TypingSpeed 35ms

Type "# Scaffold an MCP server in seconds"
Enter
Sleep 800ms

Type "npx create-mcpx my-weather-server \"
Enter
Type "  --language typescript \"
Enter
Type "  --clients claude-desktop,cursor \"
Enter
Type "  --features tests,docker"
Sleep 400ms
Enter
Sleep 6s

Type "ls my-weather-server/"
Enter
Sleep 1.5s

Type "head -30 my-weather-server/README.md"
Enter
Sleep 3s

Type "cd my-weather-server && npm install -s && npm test"
Sleep 400ms
Enter
Sleep 15s

Sleep 2s

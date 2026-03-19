Output demo.gif

Set Shell "bash"
Set FontSize 15
Set Width 880
Set Height 500
Set Padding 16
Set Theme "Catppuccin Mocha"
Set TypingSpeed 35ms
Set CursorBlink false
Set WindowBar Colorful
Set WindowBarSize 40

Type `cd /tmp && rm -rf demo-run && mkdir demo-run && cd demo-run && clear`
Enter
Sleep 500ms

Type "# Scaffold an MCP server in seconds"
Enter
Sleep 800ms

Type@50ms "create-mcpx my-server --language typescript --clients claude-desktop,cursor --features tests,docker"
Sleep 400ms
Enter
Sleep 4s

Type "ls my-server/"
Enter
Sleep 1.5s

Type "head -30 my-server/README.md"
Enter
Sleep 4s

Type "cd my-server && npm install --silent && npm test"
Sleep 400ms
Enter
Sleep 15s

Sleep 2s

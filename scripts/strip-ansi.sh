#!/bin/sh
# Strip ANSI escape sequences, carriage returns, and null bytes from stdin
stdbuf -oL sed -e 's/\x1b\[[0-9;]*[a-zA-Z]//g' -e 's/\x1b([^\\]*\\//g' -e 's/\r//g' | stdbuf -oL tr -d '\000'

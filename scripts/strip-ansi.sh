#!/bin/sh
# Strip ANSI escape sequences, carriage returns, and null bytes from stdin
LC_ALL=C sed -e 's/\x1b\[[0-9;]*[a-zA-Z]//g' -e 's/\x1b([^\\]*\\//g' -e 's/\r//g' | tr -d '\000'

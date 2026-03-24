#!/bin/sh
# Find a free port by binding to port 0 and reading the assigned port
python3 -c "import socket; s=socket.socket(); s.bind(('',0)); print(s.getsockname()[1]); s.close()"

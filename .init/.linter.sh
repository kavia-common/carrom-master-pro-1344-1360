#!/bin/bash
cd /home/kavia/workspace/code-generation/carrom-master-pro-1344-1360/carrom_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi


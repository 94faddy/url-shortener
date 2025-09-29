#!/bin/bash

APPSECRET="9lot"

echo "🛑 Stopping 9lot..."

pm2 delete $APPSECRET 2>/dev/null

echo "✅ PM2 processes stopped."

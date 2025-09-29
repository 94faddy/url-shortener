#!/bin/bash

WEBAPP="9lot"

echo "🛑 Stopping old PM2 processes if running..."
pm2 delete $WEBAPP 2>/dev/null

echo "🚀 Starting 9lot..."
pm2 start npm --name "$WEBAPP" -- run dev

echo "💾 Saving PM2 process list..."
pm2 save

echo "✅ System started with PM2!"

echo -e "\n📜 Opening logs for $WEBAPP...\n"
pm2 logs $WEBAPP --lines 50

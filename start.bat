pm2 start ./bin/www --max-memory-restart 500M  --restart-delay=3000 && pm2 monit

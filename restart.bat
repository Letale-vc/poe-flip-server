pm2 delete ./bin/www && pm2 start ./bin/www --max-memory-restart 500M  --restart-delay=3000

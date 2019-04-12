npm set prefix=$HOME/.npm-global

echo $@

if [ $# -eq 0 ]
then exec /bin/bash
else exec "$@"
fi

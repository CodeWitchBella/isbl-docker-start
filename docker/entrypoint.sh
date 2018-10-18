
USER_ID=${LOCAL_USER_ID:-9001}

echo "Starting with UID : $USER_ID"
useradd --shell /bin/bash -u $USER_ID -o -c "" -d /home/user -m user -k /etc/skel
export HOME=/home/user

pushd $1
mkdir -p frontend/node_modules backend/node_modules
chown user frontend/node_modules backend/node_modules
cp npm-token $HOME/.npmrc
shift

while [ "$1" != "--" ]
do
  chown user $1
  shift
done
shift

popd

npm set prefix=$HOME/.npm-global
chown user $HOME/.npmrc $HOME/.npm-global -R

chown user /var/run/docker.sock

echo $@

if [ $# -eq 0 ]
then exec /usr/bin/gosu user /bin/bash
else exec /usr/bin/gosu user "$@"
fi

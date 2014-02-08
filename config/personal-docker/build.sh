if [ "$(id -u)" != "0" ]; then
   echo "This script must be run as root" 1>&2
   exit 1
fi
docker pull d4l3k/websync
docker build -t websyncpersonal .

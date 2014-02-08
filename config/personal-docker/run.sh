if [ "$(id -u)" != "0" ]; then
   echo "This script must be run as root" 1>&2
   exit 1
fi
docker run -i -p 4567:4567 -p 4568:4568 -u root -t websyncpersonal $*

# set path to app that will be used to configure unicorn, 
# note the trailing slash in this example
@dir = "./"

worker_processes 4
working_directory @dir

timeout 30

# Specify path to socket unicorn listens to, 
# we will use this in our nginx.conf later
listen 4569, :backlog => 64

# Set process id path
pid "#{@dir}tmp/pids/unicorn.pid"

# Set log file paths
stderr_path "#{@dir}log/unicorn.stderr.log"
stdout_path "#{@dir}log/unicorn.stdout.log"

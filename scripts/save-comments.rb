require 'bundler/setup'
require 'redis'
require 'json'
require 'yaml'

$redis = Redis.new
filename = "comments.yaml"

data = $redis.lrange "chatter", 0, -1

all_data = []

data.each do |comment|
  json = JSON.parse(comment)
  all_data << json
end

File.open(filename + '.yaml', "w") do |f|
  f.write(all_data.to_yaml)
end

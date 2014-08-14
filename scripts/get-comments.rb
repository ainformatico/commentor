require 'bundler/setup'
require 'redis'
require 'json'

$redis = Redis.new

data = $redis.lrange "chatter", 0, -1

data.each do |comment|
  json = JSON.parse(comment)
  puts ""
  puts "#{json['username']} => #{json['message']}"
  puts ""
  puts "#########################"
end

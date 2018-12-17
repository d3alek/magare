ADMIN_USER=test-admin
ADMIN_PASSWORD=test-admin-password
CONTAINER_NAME=test-couchdb

TEST_USER=test-user
TEST_USER_PASSWORD=test-user-password

ANOTHER_USER=another-user
ANOTHER_USER_PASSWORD=another-user-password

# Check for running container
ALREADY_RUNNING=$(docker ps -f "name=$CONTAINER_NAME" -q)

if [ -z "$ALREADY_RUNNING" ]; then

  ALREADY_CREATED=$(docker ps -a -f "name=$CONTAINER_NAME" -q)

  if [ -n "$ALREADY_CREATED" ]; then
    echo "couchdb named $CONTAINER_NAME already exists, removing it first"
    docker rm $CONTAINER_NAME
  fi

  echo "Starting a new couchdb named $CONTAINER_NAME"
  docker run -e COUCHDB_USER=$ADMIN_USER -e COUCHDB_PASSWORD=$ADMIN_PASSWORD -d --name $CONTAINER_NAME -p 5984:5984 couchdb

  sleep 10

  TEST_COUCHDB_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $CONTAINER_NAME);
  TEST_COUCHDB_ADDR=http://$ADMIN_USER:$ADMIN_PASSWORD@$TEST_COUCHDB_IP:5984

  # Create _users database
  curl -X PUT $TEST_COUCHDB_ADDR/_users

  # Put two users in it

  curl -X PUT $TEST_COUCHDB_ADDR/_users/org.couchdb.user:$TEST_USER -d "{\"name\": \"$TEST_USER\", \"password\": \"$TEST_USER_PASSWORD\", \"roles\": [], \"type\": \"user\"}"

  curl -X PUT $TEST_COUCHDB_ADDR/_users/org.couchdb.user:$ANOTHER_USER -d "{\"name\": \"$ANOTHER_USER\", \"password\": \"$ANOTHER_USER_PASSWORD\", \"roles\": [], \"type\": \"user\"}"
fi


TEST_COUCHDB_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $CONTAINER_NAME);
echo "$TEST_COUCHDB_IP:5984/"
